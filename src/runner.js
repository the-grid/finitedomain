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
} from './helpers';
import {
  ml__debug,
  ml_countConstraints,
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
  domain_arrToSmallest,
  domain_toArr,
} from './domain';
import {
  trie_add,
  trie_create,
  trie_get,
  trie_has,
} from './trie';

// BODY_START

function solverSolver(dsl) {
  console.time('solverSolver');
  ASSERT_LOG2(dsl.slice(0, 1000) + (dsl.length > 1000 ? ' ... <trimmed>' : '') + '\n');

  let varTrie = trie_create();
  let vars = [];
  let aliases = {}; // map old index to new index
  let domains = [];
  let solveStack = [];

  let anonCounter = 0;

  function addVar(name, domain, mod, arti) {
    if (mod) THROW('implement me (var mod)');
    if (typeof name === 'number') {
      domain = name;
      name = undefined;
    }
    if (name === undefined) {
      name = '__' + (++anonCounter);
    }
    if (typeof domain === 'number') {
      domain = domain_createValue(domain);
    } else if (domain === undefined) {
      domain = domain_createRange(SUB, SUP);
    } else {
      domain = domain_arrToSmallest(domain);
    }
    if (!trie_has(varTrie, name)) {
      trie_add(varTrie, name, vars.length);
      vars.push(name);
      domains.push(domain);
    }
    if (arti) return name; // return a name when explicitly asked for.
  }

  function getVar(name) {
    return trie_get(varTrie, name);
  }

  function addAlias(indexOld, indexNew) {
    ASSERT(indexOld !== indexNew, 'cant make an alias for itself');
    aliases[indexOld] = indexNew;
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

  ASSERT_LOG2('Minimizing ML...');
  console.time('- minimizing ml');
  let state = minimize(mlConstraints, getVar, addVar, domains, vars, addAlias, getAlias, solveStack);
  console.timeEnd('- minimizing ml');

  if (state === MINIMIZER_SOLVED || state === MINIMIZER_REJECTED) {
    console.time('ml->dsl:');
    let newdsl = mlToDsl(mlConstraints, vars, domains, getAlias, solveStack);
    console.timeEnd('ml->dsl:');
    console.log(newdsl);

    if (state === MINIMIZER_SOLVED) return createSolution(vars, domains, getAlias, solveStack);
    if (state === MINIMIZER_REJECTED) return false;
  }

  console.time('dedupe constraints:');
  deduper(mlConstraints, vars, domains, getAlias);
  console.timeEnd('dedupe constraints:');

  console.time('cut leaf constraint:');
  cutter(mlConstraints, vars, domains, getAlias, solveStack);
  console.timeEnd('cut leaf constraint:');

  console.time('ml->dsl:');
  let newdsl2 = mlToDsl(mlConstraints, vars, domains, getAlias, solveStack);
  console.timeEnd('ml->dsl:');
  console.log(newdsl2);

  // cutter cant reject, only reduce. may eliminate the last standing constraints.
  if (!ml_hasConstraint(mlConstraints)) return createSolution(vars, domains, getAlias, solveStack);

  if (input.varstrat === 'throw') {
    // the stats are for tests. dist will never even have this so this should be fine.
    // it's very difficult to ensure optimizations work properly otherwise
    ASSERT(false, `Forcing a choice with strat=throw; debug: ${vars.length} vars, ${ml_countConstraints(mlConstraints)} constraints, current domain state: ${domains.map((d, i) => i + ':' + vars[i] + ':' + domain__debug(d).replace(/[a-z()\[\]]/g, '')).join(': ')} `);
    THROW('Forcing a choice with strat=throw');
  }
  THROW('implement me (solve minimized problem)');
  return false;
}
let Solver = solverSolver; // TEMP

function minimize(mlConstraints, getVar, addVar, domains, names, addAlias, getAlias, solveStack) {
  ASSERT_LOG2('mlConstraints byte code:', mlConstraints);
  console.log(ml__debug(mlConstraints, 0, 20, domains, names));
  // now we can access the ml in terms of bytes, jeuj
  let state = cr_optimizeConstraints(mlConstraints, getVar, addVar, domains, names, addAlias, getAlias, solveStack);
  if (state === MINIMIZER_SOLVED) {
    ASSERT_LOG2('minimizing solved it!', state); // all constraints have been eliminated
    return state;
  }
  if (state === MINIMIZER_REJECTED) {
    ASSERT_LOG2('minimizing rejected it!', state); // an empty domain was found or a literal failed a test
    return state;
  }
  ASSERT(state === MINIMIZER_STABLE, 'must be one of three options', state);
  console.error('pre-optimization finished, not yet solved');
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
