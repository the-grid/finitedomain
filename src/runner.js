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

  ASSERT,
  ASSERT_LOG2,
  THROW,
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
  domain_getValue,
  domain_toArr,
} from './domain';
import {
  counter,
} from './counter';
import {
  problem_create,
  //problem_from,
} from './problem';

// BODY_START

function solverSolver(dsl) {
  console.log('<solverSolver>');
  console.time('</solverSolver>');
  ASSERT_LOG2(dsl.slice(0, 1000) + (dsl.length > 1000 ? ' ... <trimmed>' : '') + '\n');

  let problem = problem_create();
  // you can destructure it but this way is much easier to grep for usages... let the minifier minify it
  let varNames = problem.varNames;
  let domains = problem.domains;
  let solveStack = problem.solveStack;

  let $addVar = problem.addVar;
  let $getVar = problem.getVar;
  let $addAlias = problem.addAlias;
  let $getAlias = problem.getAlias;

  console.time('- dsl->ml');
  dslToMl(dsl, problem, $addVar, $getVar);
  let mlConstraints = problem.ml;
  console.timeEnd('- dsl->ml');

  console.log('Parsed dsl (' + dsl.length + ' bytes) into ml (' + mlConstraints.length + ' bytes)');

  console.time('- all run cycles');
  let runLoops = 0;
  let state = $CHANGED;
  while (state === $CHANGED) {
    ASSERT_LOG2('run loop...');
    state = run_cycle(mlConstraints, $getVar, $addVar, domains, varNames, $addAlias, $getAlias, solveStack, runLoops++, problem);
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

  if (problem.input.varstrat === 'throw') {
    // the stats are for tests. dist will never even have this so this should be fine.
    // it's very difficult to ensure optimizations work properly otherwise
    ASSERT(false, `Forcing a choice with strat=throw; debug: ${varNames.length} vars, ${ml_countConstraints(mlConstraints)} constraints, current domain state: ${domains.map((d, i) => i + ':' + varNames[i] + ':' + domain__debug(d).replace(/[a-z()\[\]]/g, '')).join(': ')} ops: ${ml_getOpList(mlConstraints)} `);
    THROW('Forcing a choice with strat=throw');
  }
  THROW('implement me (solve minimized problem)');
  return false;
}
let Solver = solverSolver; // TEMP

function run_cycle(ml, getVar, addVar, domains, vars, addAlias, getAlias, solveStack, runLoops, problem) {
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
