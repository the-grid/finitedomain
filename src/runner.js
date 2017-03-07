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
  domain_createValue,
  domain_getValue,
  domain_min,
  domain_toArr,
  domain_arrToSmallest,
} from './domain';
import {
  counter,
} from './counter';
import {
  problem_create,
  //problem_from,
} from './problem';

// BODY_START

/**
 * @param {string} dsl The input problem
 * @param {Function} Solver This is the main finitedomain export symbol for actual solving
 * @param {Object} options
 * @property {boolean} [options.singleCycle=false] Only do a single-nonloop minimization step before solving? Can be faster but sloppier.
 * @property {boolean} [options.hashNames=true] Hash names in the output dsl (passed on to finitedomain if it comes to that)
 * @property {boolean} [options.repeatUntilStable=false] Keep calling minimize/cutter per cycle until nothing changes?
 */
function solverSolver(dsl, Solver, options = {}) {
  let {
    singleCycle = false,
    repeatUntilStable = true,
    hashNames = true,
  } = options;

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

  let state;
  if (singleCycle) { // only single cycle? usually most dramatic reduction. only runs a single loop of every step.
    console.time('- first minimizer cycle (single loop)');
    state = min_run(mlConstraints, $getVar, $addVar, domains, varNames, $addAlias, $getAlias, true, !repeatUntilStable);
    console.timeEnd('- first minimizer cycle (single loop)');
    ASSERT_LOG2('First minimize pass result:', state);

    console.time('- deduper cycle #');
    let deduperAddedAlias = deduper(mlConstraints, varNames, domains, $getAlias, $addAlias);
    console.timeEnd('- deduper cycle #');

    if (deduperAddedAlias >= 0) {
      console.time('- cutter cycle #');
      cutter(mlConstraints, varNames, domains, $addAlias, $getAlias, solveStack, !repeatUntilStable);
      console.timeEnd('- cutter cycle #');
    }
  } else { // multiple cycles? more expensive, may not be worth the gains
    let runLoops = 0;
    console.time('- all run cycles');
    do {
      ASSERT_LOG2('run loop...');
      state = run_cycle(mlConstraints, $getVar, $addVar, domains, varNames, $addAlias, $getAlias, solveStack, runLoops++, problem);
    } while (state === $CHANGED);
    console.timeEnd('- all run cycles');
  }

  console.time('- generating solution');
  // cutter cant reject, only reduce. may eliminate the last standing constraints.
  let solution;
  if (state === $SOLVED || (state !== $REJECTED && !ml_hasConstraint(mlConstraints))) {
    solution = createSolution(varNames, domains, $getAlias, solveStack, null, options);
  }
  console.timeEnd('- generating solution');

  console.time('ml->dsl');
  let newdsl = mlToDsl(mlConstraints, varNames, domains, $getAlias, solveStack, counter(mlConstraints, varNames, domains, $getAlias), {debug: false, hashNames: hashNames, indexNames: false, groupedConstraints: true});
  console.timeEnd('ml->dsl');

  console.timeEnd('</solverSolver>');

  if (newdsl.length < 1000 || !Solver) console.log('\nResult dsl:\n' + newdsl);

  if (solution) {
    console.log('Did not call finitedomain; already solved');
    return solution;
  }
  if (state === $REJECTED) return false;

  if (problem.input.varstrat === 'throw') {
    // the stats are for tests. dist will never even have this so this should be fine.
    // it's very difficult to ensure optimizations work properly otherwise
    ASSERT(false, `Forcing a choice with strat=throw; debug: ${varNames.length} vars, ${ml_countConstraints(mlConstraints)} constraints, current domain state: ${domains.map((d, i) => i + ':' + varNames[i] + ':' + domain__debug(d).replace(/[a-z()\[\]]/g, '')).join(': ')} ops: ${ml_getOpList(mlConstraints)} `);
    THROW('Forcing a choice with strat=throw');
  }

  if (!Solver) THROW('problem not solved and finitedomain not passed on... Burn!');

  console.error('\n\nSolving remaining problem through finitedomain now...');

  console.log('<FD>');
  console.time('</FD>');
  let fdsolutions = new Solver({log: 1})
    .imp(newdsl)
    .solve({
      log: 1,
      max: 1,
      //vars: solver.config.allVarNames,
      vars: 'all', // TODO
      _debug: false,
    });
  console.timeEnd('</FD>');
  console.log('\n');

  // Now merge the results from fdsolution to construct the final solution
  // we need to map the vars from the dsl back to the original names.
  // "our" vars will be constructed like `$<hash>$` where the hash simply
  // means "our" var index as base36. So all we need to do is remove the
  // dollar signs and parseInt as base 36. Ignore all other vars as they
  // are temporary vars generated by finitedomain. We should not see them
  // anymore once we support targeted vars.

  let fdsolution = fdsolutions[0];
  console.log('fd result:', fdsolution ? 'SOLVED' : 'REJECTED');

  ASSERT_LOG2('fdsolution = ', fdsolution ? Object.keys(fdsolution).length > 100 ? '<supressed; too big>' : fdsolution : 'REJECT');

  if (fdsolution && fdsolution) {
    return createSolution(varNames, domains, $getAlias, solveStack, fdsolution, options);
  }

  return false;
}
let Solver = solverSolver; // TEMP

function run_cycle(ml, getVar, addVar, domains, vars, addAlias, getAlias, solveStack, runLoops) {
  console.time('- run_cycle #' + runLoops);

  console.time('- minimizer cycle #' + runLoops);
  let state = min_run(ml, getVar, addVar, domains, vars, addAlias, getAlias, runLoops === 0);
  console.timeEnd('- minimizer cycle #' + runLoops);

  if (state === $SOLVED) return state;
  if (state === $REJECTED) return state;

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
    else {
      ASSERT(state === $CHANGED || state === $STABLE, 'minimize state should be either stable or changed here');
    }
  }

  console.timeEnd('- run_cycle #' + runLoops);
  return state;
}

function createSolution(vars, domains, getAlias, solveStack, fdsolution, options) {
  console.time('createSolution()');

  let {
    hashNames = true,
  } = options;

  function getDomain(index) {
    index = getAlias(index);

    if (fdsolution) {
      let key = hashNames ? '$' + index.toString(36) + '$' : vars[index];
      let fdval = fdsolution[key];
      if (typeof fdval === 'number') {
        return domain_createValue(fdval);
      } else if (fdval !== undefined) {
        ASSERT(fdval instanceof Array, 'expecting finitedomain to only create solutions as arrays or numbers', fdval);
        return domain_arrToSmallest(fdval);
      }
      // else the var was already solved by fd2 so just read from our local domains array
    }

    return domains[index];
  }

  function setDomain(index, domain) {
    ASSERT(getAlias(index) === index, 'atm not expecting index to be aliased, but that may change in the future');
    domains[index] = domain;
  }

  function force(varIndex) {
    ASSERT(domains[varIndex] !== false, 'TOFIX: resolve aliases in solveStack');
    let domain = getDomain(varIndex);
    let v = domain_getValue(domain); // NOTE: this will take from fdsolution if it contains a value, otherwise from local domains
    if (v < 0) {
      ASSERT_LOG2('   - forcing index', varIndex, 'to min(' + domain__debug(domain) + '):', domain_min(domain));
      v = domain_min(domain); // arbitrary choice, will want to take strats into account in the future
      domains[varIndex] = domain_createValue(v);
    }
    return v;
  }

  ASSERT_LOG2('\n# createSolution(), solveStack.length=', solveStack.length, ', using fdsolution:', !!fdsolution);
  ASSERT_LOG2(domains.length > 50 ? '' : 'domains:\n' + domains.map((d, i) => '  ' + i + ': ' + domain__debug(d) + ' -> ' + (hashNames ? '$' + i.toString(36) + '$' : vars[i]) + (fdsolution ? ': ' + fdsolution[(hashNames ? '$' + i.toString(36) + '$' : vars[i])] : '?')).join('\n'));
  let solution = {};
  solveStack.reverse().forEach(f => f(domains, force, getDomain, setDomain));
  ASSERT_LOG2(domains.map(domain__debug).join(' '));
  vars.forEach((name, index) => {
    let d = getDomain(index);
    let v = domain_getValue(d);
    if (v >= 0) d = v;
    else d = domain_toArr(d);
    solution[name] = d;
  });
  console.timeEnd('createSolution()');
  ASSERT_LOG2(' -> createSolution results in:', domains.length > 100 ? '<supressed; too many vars (' + domains.length + ')>' : solution);
  return solution;
}

// BODY_STOP

export default solverSolver;
export {
  Solver,
};
