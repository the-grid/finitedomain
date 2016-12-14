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
  compilePropagators,
  dslToMl,
  mlToDsl,
} from './compiler';
import {
  MINIMIZER_STABLE,
  MINIMIZER_SOLVED,
  MINIMIZER_REJECTED,

  cr_optimizeConstraints,
  cr_stabilize,
} from './minimizer';
import {
  domain_createRange,
  domain_createValue,
  domain_getValue,
  domain_toList,
  domain_arrToSmallest,
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
  let varTrie = trie_create();
  let vars = [];
  let aliases = {}; // map old index to new index
  let domains = [];

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
  let state = minimize(mlConstraints, getVar, addVar, domains, vars, addAlias, getAlias);
  console.timeEnd('- minimizing ml');
//return
  console.time('ml->dsl:');
  let newdsl = mlToDsl(mlConstraints, vars, domains, getAlias);
  console.timeEnd('ml->dsl:');
  console.log(newdsl);

  //return

  //let state = getState(domains);
  if (state === MINIMIZER_SOLVED) return createSolution(vars, domains, getAlias);
  if (state === MINIMIZER_REJECTED) return false;

  if (input.varstrat === 'throw') THROW('Forcing a choice with strat=throw');
  //
  //let stack = [root];
  //do {
  //  let parent = stack[stack.length - 1];
  //  if (barren(parent)) {
  //    stack.pop();
  //  } else {
  //    // every node that is not a leaf node (solved/rejected) must have children
  //    let child = offspring(parent);
  //    minimize(child);
  //    let state = getState(child);
  //    if (state === SOLVED) return child;
  //    if (state !== REJECTED) stack.push(child);
  //  }
  //} while (stack.length);
  THROW('implement me (solve minimized problem)');
  return false;
}
let Solver = solverSolver; // TEMP

function minimize(mlConstraints, getVar, addVar, domains, names, addAlias, getAlias) {
  ASSERT_LOG2('mlConstraints byte code:', mlConstraints);
  // now we can access the ml in terms of bytes, jeuj
  let state = cr_optimizeConstraints(mlConstraints, getVar, addVar, domains, names, addAlias, getAlias);
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
  return;
  THROW('fail for now');
  let mlPropagators = compilePropagators(mlConstraints);
  cr_stabilize(mlPropagators, domains);
}
//function offspring(parent) {
//  return parent.clone();
//}
//function barren(node) {
//  return node.next_distribution_choice >= 2;
//}
//function getState(domains) {
//  ASSERT_LOG2('getState:', domains.map(domain__debug));
//  let returnValue = RUNNER_SOLVED;
//  domains.some(domain => {
//    if (typeof domain !== 'number') {
//      ASSERT_LOG2('state of', domain, 'is undefined');
//      // any non-soldom halts the function immediately
//      returnValue = undefined;
//      return true;
//    }
//    if (!domain) {
//      ASSERT_LOG2('state of', domain, 'is rejected');
//      // empty domain means rejected
//      returnValue = RUNNER_REJECTED;
//      return true;
//    }
//    if (!domain_isSolved(domain)) {
//      ASSERT_LOG2('state of', domain, 'is undefined');
//      // this domain can only be solved if the soldom flag is set... and it wasn't
//      returnValue = undefined;
//    }
//  });
//  ASSERT_LOG2('-->', returnValue);
//  return returnValue;
//}
function createSolution(vars, domains, getAlias) {
  ASSERT_LOG2('- createSolution()');
  let solution = {};
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
    else d = domain_toList(d);
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
//
//function search(s) {
//  this.params = {};
//  this.stack = [];
//  this.clone = function(){};
//  this.getState = function(){};
//  return solverSolver(s, this.stack);
//}
//function node() {
//  this.names = [];
//  this.domains = [];
//  this.constraints = Buffer.from();
//  this.choice = 0;
//}
