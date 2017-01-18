// import dsl
// generate ml
// minimize -> reduce constraints
// generate propagators
// stabilize
// exit

import {
  SUB,
  SUP,

  ASSERT,
  ASSERT_LOG2,
  THROW,
  TRACE_ADD,
} from './helpers';
import {
  ml__debug,
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
  MINIMIZER_STABLE,
  MINIMIZER_SOLVED,
  MINIMIZER_REJECTED,

  cr_optimizeConstraints,
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
  trie_create,
  trie_get,
} from './trie';
import {
  counter,
} from './counter';

// BODY_START

function solverSolver(dsl) {
  console.log('<solverSolver>');
  console.time('</solverSolver>');
  ASSERT_LOG2(dsl.slice(0, 1000) + (dsl.length > 1000 ? ' ... <trimmed>' : '') + '\n');

  let varTrie = trie_create();
  let vars = [];
  let aliases = {}; // map old index to new index
  let domains = [];
  let solveStack = [];

  let anonCounter = 0;

  function addVar(name, domain, modifier, returnName, returnIndex) {
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

    let newIndex = vars.length;
    trie_add(varTrie, name, newIndex);
    vars.push(name);
    domains.push(domain);
    if (returnIndex) return newIndex;
    if (returnName) return name; // return a name when explicitly asked for.
  }

  function getVar(name) {
    return trie_get(varTrie, name);
  }

  function addAlias(indexOld, indexNew) {
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

  function getAlias(index) {
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
  let t = '- parsing dsl (' + dsl.length + ')';
  console.time(t);
  let input = dslToMl(dsl, addVar, getVar);
  console.timeEnd(t);

  let mls = input.ml;
  let mlConstraints = Buffer.from(mls, 'binary');

  let deduperAddedAlias;
  let firstLoop = true;
  do {
    ASSERT_LOG2('Minimizing ML...');
    console.time('- minimizing ml');
    let state = minimize(mlConstraints, getVar, addVar, domains, vars, addAlias, getAlias, firstLoop);
    console.timeEnd('- minimizing ml');

    if (state === MINIMIZER_SOLVED || state === MINIMIZER_REJECTED) {
      console.time('ml->dsl:');
      let newdsl = mlToDsl(mlConstraints, vars, domains, getAlias, solveStack);
      console.timeEnd('ml->dsl:');
      ASSERT_LOG2(newdsl);

      if (state === MINIMIZER_SOLVED) return createSolution(vars, domains, getAlias, solveStack);
      if (state === MINIMIZER_REJECTED) return false;
    }

    console.time('dedupe constraints:');
    deduperAddedAlias = deduper(mlConstraints, vars, domains, getAlias, addAlias);
    console.timeEnd('dedupe constraints:');
    firstLoop = false;
  } while (deduperAddedAlias > 0);

  if (deduperAddedAlias < 0) return false; // a contradiction was found... weird! but possible.

  console.time('cut leaf constraint:');
  let cutFailed = cutter(mlConstraints, vars, domains, getAlias, solveStack);
  console.timeEnd('cut leaf constraint:');
  if (cutFailed) return false;

  console.time('- minimizing ml, again');
  let state = minimize(mlConstraints, getVar, addVar, domains, vars, addAlias, getAlias, false);
  console.timeEnd('- minimizing ml, again', state);

  console.time('ml->dsl:');
  let newdsl2 = mlToDsl(mlConstraints, vars, domains, getAlias, solveStack, counter(mlConstraints, vars, domains, getAlias));
  console.timeEnd('ml->dsl:');

  // cutter cant reject, only reduce. may eliminate the last standing constraints.
  let solution;
  if (!ml_hasConstraint(mlConstraints)) solution = createSolution(vars, domains, getAlias, solveStack);

  console.timeEnd('</solverSolver>');

  console.log(newdsl2);

  if (solution) return solution;

  if (input.varstrat === 'throw') {
    // the stats are for tests. dist will never even have this so this should be fine.
    // it's very difficult to ensure optimizations work properly otherwise
    ASSERT(false, `Forcing a choice with strat=throw; debug: ${vars.length} vars, ${ml_countConstraints(mlConstraints)} constraints, current domain state: ${domains.map((d, i) => i + ':' + vars[i] + ':' + domain__debug(d).replace(/[a-z()\[\]]/g, '')).join(': ')} ops: ${ml_getOpList(mlConstraints)} `);
    THROW('Forcing a choice with strat=throw');
  }
  THROW('implement me (solve minimized problem)');
  return false;
}
let Solver = solverSolver; // TEMP

function minimize(mlConstraints, getVar, addVar, domains, names, addAlias, getAlias, firstRun) {
  ASSERT_LOG2('mlConstraints byte code:', mlConstraints);
  ASSERT_LOG2(ml__debug(mlConstraints, 0, 20, domains, names));
  // now we can access the ml in terms of bytes, jeuj
  let state = cr_optimizeConstraints(mlConstraints, getVar, addVar, domains, names, addAlias, getAlias, firstRun);
  if (state === MINIMIZER_SOLVED) {
    ASSERT_LOG2('minimizing solved it!', state); // all constraints have been eliminated
    return state;
  }
  if (state === MINIMIZER_REJECTED) {
    ASSERT_LOG2('minimizing rejected it!', state); // an empty domain was found or a literal failed a test
    return state;
  }
  ASSERT(state === MINIMIZER_STABLE, 'must be one of three options', state);
  ASSERT_LOG2('pre-optimization finished, not yet solved');
}
function createSolution(vars, domains, getAlias, solveStack) {
  ASSERT_LOG2('- createSolution()');
  let solution = {};
  solveStack.reverse().forEach(f => f(domains));
  vars.forEach((name, index) => {
    let d = domains[index];
    while (d === false) {
      ASSERT_LOG2('   - createSolution;', index, 'is an aliased because the domain is', d);
      index = getAlias(index);
      ASSERT_LOG2('   -> alias:', index);
      d = domains[index];
    }

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
