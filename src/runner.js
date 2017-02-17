// import dsl
// generate ml
// minimize -> reduce constraints
// generate propagators
// stabilize
// exit

import {
  $CHANGED,
  $REJECTED,
  $SOLVED,
  $STABLE,
  SUB,
  SUP,

  ASSERT,
  ASSERT_LOG2,
  THROW,
  TRACE_ADD,
} from './helpers';
import {
  ml_countConstraints,
  ml_getOpList,
  ml_hasConstraint,
} from './ml';
import {
  dslToMl,
} from './dsltoml';
import {
  mlToDsl,
} from './mltodsl';
import {
  min_run,
} from './minimizer';
import {
  deduper,
} from './deduper';
import {
  cutter,
} from './cutter';
import {
  domain__debug,
  domain_createRange,
  domain_createValue,
  domain_getValue,
  domain_min,
  domain_arrToSmallest,
  domain_toArr,
} from './domain';
import {
  trie_add,
  trie_get,
} from './trie';
import {
  counter,
} from './counter';
import {
  problem_create,
} from './problem';

// BODY_START

function solverSolver(dsl) {
  console.log('<solverSolver>');
  console.time('</solverSolver>');
  ASSERT_LOG2(dsl.slice(0, 1000) + (dsl.length > 1000 ? ' ... <trimmed>' : '') + '\n');

  let problem = problem_create(dsl);
  // you can destructure it but this way is much easier to grep for usages... let the minifier minify it
  let varTrie = problem.varTrie;
  let varNames = problem.varNames;
  let aliases = problem.aliases; // map old index to new index
  let domains = problem.domains;
  let solveStack = problem.solveStack;

  let anonCounter = 0;

  function $addVar(name, domain, modifier, returnName, returnIndex) {
    ASSERT_LOG2('addVar', name, domain, modifier, returnName ? '(return name)' : '', returnIndex ? '(return index)' : '');
    if (modifier) THROW('implement me (var mod)');
    if (typeof name === 'number') {
      domain = name;
      name = undefined;
    }
    if (name === undefined) {
      name = '__' + (++anonCounter);
      ASSERT_LOG2(' - Adding anonymous var for dom=', domain, '->', name);
    }
    if (typeof domain === 'number') {
      domain = domain_createValue(domain);
    } else if (domain === undefined) {
      domain = domain_createRange(SUB, SUP);
    } else {
      domain = domain_arrToSmallest(domain);
    }

    let newIndex = varNames.length;
    trie_add(varTrie, name, newIndex);
    varNames.push(name);
    domains.push(domain);
    if (returnIndex) return newIndex;
    if (returnName) return name; // return a name when explicitly asked for.
  }

  function $getVar(name) {
    return trie_get(varTrie, name);
  }

  function $addAlias(indexOld, indexNew) {
    ASSERT(indexOld !== indexNew, 'cant make an alias for itself');
    aliases[indexOld] = indexNew;

    ASSERT_LOG2(' - Mapping', indexOld, 'to be an alias for', indexNew);
    TRACE_ADD(indexOld, domain__debug(domains[indexOld]), domain__debug(domains[indexNew]), 'now alias of ' + indexNew);
    solveStack.push(domains => {
      ASSERT_LOG2(' - alias; ensuring', indexNew, 'and', indexOld, 'result in same value');
      ASSERT_LOG2('   - domain =', domain__debug(domains[indexNew]), 'forcing choice to min(d)=', domain_min(domains[indexNew]));
      // ensure A and B end up with the same value, regardless of how A is reduced
      ASSERT(domains[indexOld] === false, 'B should be marked as an alias');
      domains[indexOld] = domains[indexNew] = domain_createValue(domain_min(domains[indexNew]));
    });
    ASSERT(!void (solveStack[solveStack.length - 1]._target = indexOld));
    ASSERT(!void (solveStack[solveStack.length - 1]._meta = 'alias(' + indexNew + ' -> ' + indexOld + ')'));
    domains[indexOld] = false; // mark as aliased. this is not a change per se.
  }

  function $getAlias(index) {
    let alias = aliases[index];
    if (alias === index) throw new Error('alias is itself?', alias, index);
    if (alias === undefined) {
      console.log(JSON.stringify(domains));
      console.log(JSON.stringify(aliases).replace(/"/g, ''));
      throw new Error('alias for ' + index + ' does not exist... ');
    }
    return alias;
  }

  ASSERT_LOG2('Parsing DSL...');
  console.time('- dsl->ml (' + dsl.length + ')');
  let input = dslToMl(dsl, $addVar, $getVar);
  console.timeEnd('- dsl->ml (' + dsl.length + ')');

  let mls = input.mlString;
  let mlConstraints = Buffer.from(mls, 'binary');

  console.time('- all run cycles');
  let runLoops = 0;
  let state = $CHANGED;
  while (state === $CHANGED) {
    ASSERT_LOG2('run loop...');
    state = run_cycle(mlConstraints, $getVar, $addVar, domains, varNames, $addAlias, $getAlias, solveStack, runLoops++);
  }
  console.timeEnd('- all run cycles');

  console.time('- generating solution');
  // cutter cant reject, only reduce. may eliminate the last standing constraints.
  let solution;
  if (state === $SOLVED || (state !== $REJECTED && !ml_hasConstraint(mlConstraints))) {
    solution = createSolution(varNames, domains, $getAlias, solveStack);
  }
  console.timeEnd('- generating solution');

  console.time('ml->dsl');
  let newdsl = mlToDsl(mlConstraints, varNames, domains, $getAlias, solveStack, counter(mlConstraints, varNames, domains, $getAlias));
  console.timeEnd('ml->dsl');

  console.timeEnd('</solverSolver>');

  console.log(newdsl);

  if (solution) return solution;
  if (state === $REJECTED) return false;

  if (input.varstrat === 'throw') {
    // the stats are for tests. dist will never even have this so this should be fine.
    // it's very difficult to ensure optimizations work properly otherwise
    ASSERT(false, `Forcing a choice with strat=throw; debug: ${varNames.length} vars, ${ml_countConstraints(mlConstraints)} constraints, current domain state: ${domains.map((d, i) => i + ':' + varNames[i] + ':' + domain__debug(d).replace(/[a-z()\[\]]/g, '')).join(': ')} ops: ${ml_getOpList(mlConstraints)} `);
    THROW('Forcing a choice with strat=throw');
  }
  THROW('implement me (solve minimized problem)');
  return false;
}
let Solver = solverSolver; // TEMP

function run_cycle(ml, getVar, addVar, domains, vars, addAlias, getAlias, solveStack, runLoops) {
  console.time('- run_cycle #' + runLoops);

  console.time('- minimizer cycle #' + runLoops);
  let state = min_run(ml, getVar, addVar, domains, vars, addAlias, getAlias, runLoops === 0);
  console.timeEnd('- minimizer cycle #' + runLoops);

  if (state === $CHANGED) {
    console.time('- deduper cycle #' + runLoops);
    let deduperAddedAlias = deduper(ml, vars, domains, getAlias, addAlias);
    console.timeEnd('- deduper cycle #' + runLoops);

    if (deduperAddedAlias < 0) {
      state = $REJECTED;
    } else {
      console.time('- cutter cycle #' + runLoops);
      let cutLoops = cutter(ml, vars, domains, addAlias, getAlias, solveStack);
      console.timeEnd('- cutter cycle #' + runLoops);

      if (cutLoops > 1 || deduperAddedAlias) state = $CHANGED;
      else if (cutLoops < 0) state = $REJECTED;
      else state = $STABLE;
    }
  }

  console.timeEnd('- run_cycle #' + runLoops);
  return state;
}

function createSolution(vars, domains, getAlias, solveStack) {
  function getDomain(index) {
    let d = domains[index];
    while (d === false) {
      ASSERT_LOG2('   - createSolution;', index, 'is an aliased because the domain is', d);
      index = getAlias(index);
      ASSERT_LOG2('   -> alias:', index);
      d = domains[index];
    }
    return d;
  }
  ASSERT_LOG2('- createSolution()');
  let solution = {};
  solveStack.reverse().forEach(f => f(domains, getDomain));
  vars.forEach((name, index) => {
    let d = getDomain(index);
    let v = domain_getValue(domains[index]);
    if (v >= 0) d = v;
    else d = domain_toArr(d);
    solution[name] = d;
  });
  ASSERT_LOG2(' -> createSolution results in:', solution);
  return solution;
}

// BODY_STOP

export default solverSolver;
export {
  Solver,
};
