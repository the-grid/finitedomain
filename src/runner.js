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
  TRACE,
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
  problem_create,
  //problem_from,
} from './problem';
import {
  bounty_collect,
} from './bounty';

// BODY_START

/**
 * @param {string} dsl The input problem
 * @param {Function} Solver This is the main finitedomain export symbol for actual solving
 * @param {Object} options
 * @property {boolean} [options.singleCycle=false] Only do a single-nonloop minimization step before solving? Can be faster but sloppier.
 * @property {boolean} [options.hashNames=true] Hash names in the output dsl (passed on to finitedomain if it comes to that)
 * @property {boolean} [options.repeatUntilStable=true] Keep calling minimize/cutter per cycle until nothing changes?
 * @property {boolean} [options.debugDsl=false] Extended dsl output?
 * @property {boolean} [options.indexNames=false] Use `_<index>_` for all var names instead of their original name?
 * @property {boolean} [options.groupedConstraints=true] Only when debugDsl=true; below a var decl list all constraints it is part of (in comments)
 * @param {Object} solveOptions Passed on to Solver.solve directly
 */
function preSolver(dsl, Solver, options = {}, solveOptions) {
  //options.hashNames = false;
  //options.repeatUntilStable = true;
  //options.debugDsl = false;
  //options.singleCycle = true;
  //options.indexNames = true;
  //options.groupedConstraints = true;

  console.log('<preSolver>');
  console.time('</preSolver>');
  let r = _preSolver(dsl, Solver, options, solveOptions);
  console.timeEnd('</preSolver>');
  return r;
}
function _preSolver(dsl, Solver, options, solveOptions) {
  let {
    hashNames = true,
    debugDsl = false,
    indexNames = false,
    groupedConstraints = true,
  } = options;

  let problem = problem_create();
  let {
    varNames,
    domains,
  } = problem;

  TRACE(dsl.slice(0, 1000) + (dsl.length > 1000 ? ' ... <trimmed>' : '') + '\n');

  let state = crunch(dsl, problem, options);

  console.time('ml->dsl');
  let bounty = bounty_collect(problem.ml, problem);
  let newdsl = mlToDsl(problem.ml, problem, bounty, {debug: debugDsl, hashNames, indexNames, groupedConstraints});
  console.timeEnd('ml->dsl');

  //console.log(domains.map((d,i) => i+':'+problem.targeted[i]).join(', '));
  // confirm domains has no gaps...
  //console.log(problem.domains)
  //for (let i=0; i<domains.length; ++i) {
  //  ASSERT(i in domains, 'no gaps');
  //  ASSERT(domains[i] !== undefined, 'no pseudo gaps');
  //}


  // cutter cant reject, only reduce. may eliminate the last standing constraints.
  let solution;
  if (state === $SOLVED || (state !== $REJECTED && !ml_hasConstraint(problem.ml))) {
    console.time('- generating early solution');
    solution = createSolution(problem, null, options);
    console.timeEnd('- generating early solution');
  }

  if (newdsl.length < 1000 || !Solver) console.log('\nResult dsl (debugDsl=' + debugDsl + ', hashNames=' + hashNames + ', indexNames=' + indexNames + '):\n' + newdsl);

  if (solution) {
    console.error('<solved without finitedomain>');
    return solution;
  }
  if (state === $REJECTED) {
    console.error('<rejected without finitedomain>');
    TRACE('problem rejected!');
    return false;
  }

  if (problem.input.varstrat === 'throw') {
    // the stats are for tests. dist will never even have this so this should be fine.
    // it's very difficult to ensure optimizations work properly otherwise
    ASSERT(false, `Forcing a choice with strat=throw; debug: ${varNames.length} vars, ${ml_countConstraints(problem.ml)} constraints, current domain state: ${domains.map((d, i) => i + ':' + varNames[i] + ':' + domain__debug(d).replace(/[a-z()\[\]]/g, '')).join(': ')} ops: ${ml_getOpList(problem.ml)} #`);
    THROW('Forcing a choice with strat=throw');
  }

  if (!Solver) THROW('problem not solved and finitedomain not passed on... Burn!');

  console.error('\n\nSolving remaining problem through finitedomain now...');

  console.log('<FD>');
  console.time('</FD>');


  let fdsolutions = new Solver(solveOptions || {log: 1})
    .imp(newdsl)
    .solve(solveOptions || {
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

  TRACE('fdsolution = ', fdsolution ? Object.keys(fdsolution).length > 100 ? '<supressed; too big>' : fdsolution : 'REJECT');

  if (fdsolution && fdsolution) {
    console.error('<solved after finitedomain>');
    return createSolution(problem, fdsolution, options);
  }

  console.error('<rejected after finitedomain>');
  TRACE('problem rejected!');
  return false;
}

function crunch(dsl, problem, options = {}) {
  let {
    singleCycle = false,
    repeatUntilStable = true,
  } = options;

  let {
    varNames,
    domains,
    solveStack,
    $addVar,
    $getVar,
    $addAlias,
    $getAlias,
  } = problem;

  console.time('- dsl->ml');
  dslToMl(dsl, problem);
  let ml = problem.ml;
  console.timeEnd('- dsl->ml');

  console.log('Parsed dsl (' + dsl.length + ' bytes) into ml (' + ml.length + ' bytes)');

  let state;
  if (singleCycle) { // only single cycle? usually most dramatic reduction. only runs a single loop of every step.
    console.time('- first minimizer cycle (single loop)');

    state = min_run(ml, problem, domains, varNames, true, !repeatUntilStable);
    console.timeEnd('- first minimizer cycle (single loop)');
    TRACE('First minimize pass result:', state);

    if (state !== $REJECTED) {
      console.time('- deduper cycle #');
      let deduperAddedAlias = deduper(ml, problem);
      console.timeEnd('- deduper cycle #');

      if (deduperAddedAlias >= 0) {
        console.time('- cutter cycle #');
        cutter(ml, problem, !repeatUntilStable);
        console.timeEnd('- cutter cycle #');
      }
    }
  } else { // multiple cycles? more expensive, may not be worth the gains
    let runLoops = 0;
    console.time('- all run cycles');
    do {
      TRACE('run loop...');
      state = run_cycle(ml, $getVar, $addVar, domains, varNames, $addAlias, $getAlias, solveStack, runLoops++, problem);
    } while (state === $CHANGED);
    console.timeEnd('- all run cycles');
  }

  return state;
}

function run_cycle(ml, getVar, addVar, domains, vars, addAlias, getAlias, solveStack, runLoops, problem) {
  console.time('- run_cycle #' + runLoops);

  console.time('- minimizer cycle #' + runLoops);
  let state = min_run(ml, problem, domains, vars, runLoops === 0);
  console.timeEnd('- minimizer cycle #' + runLoops);

  if (state === $SOLVED) return state;
  if (state === $REJECTED) return state;

  console.time('- deduper cycle #' + runLoops);
  let deduperAddedAlias = deduper(ml, problem);
  console.timeEnd('- deduper cycle #' + runLoops);

  if (deduperAddedAlias < 0) {
    state = $REJECTED;
  } else {
    console.time('- cutter cycle #' + runLoops);
    let cutLoops = cutter(ml, problem, false);
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

function createSolution(problem, fdsolution, options) {
  console.time('createSolution()');

  let {
    hashNames = true,
  } = options;

  let {
    varNames,
    domains,
    solveStack,
    getAlias,
    setDomain,
  } = problem;

  let _getDomain = problem.getDomain;

  function getDomain(index, skipAliasCheck) {
    if (!skipAliasCheck) index = getAlias(index);

    if (fdsolution) {
      let key = hashNames ? '$' + index.toString(36) + '$' : varNames[index];
      let fdval = fdsolution[key];
      if (typeof fdval === 'number') {
        return domain_createValue(fdval);
      } else if (fdval !== undefined) {
        ASSERT(fdval instanceof Array, 'expecting finitedomain to only create solutions as arrays or numbers', fdval);
        return domain_arrToSmallest(fdval);
      }
      // else the var was already solved by fd2 so just read from our local domains array
    }

    return _getDomain(index, true);
  }

  function force(varIndex) {
    let finalVarIndex = getAlias(varIndex);
    let domain = getDomain(finalVarIndex, true); // NOTE: this will take from fdsolution if it contains a value, otherwise from local domains
    ASSERT(domain !== false, 'should fetch "final" domains');
    let v = domain_getValue(domain);
    if (v < 0) {
      TRACE('   - forcing index', varIndex, '(final index=', finalVarIndex, ') to min(' + domain__debug(domain) + '):', domain_min(domain));
      v = domain_min(domain); // arbitrary choice, will want to take strats into account in the future
      setDomain(varIndex, domain_createValue(v), true);
    }
    return v;
  }

  TRACE('\n# createSolution(), solveStack.length=', solveStack.length, ', using fdsolution:', !!fdsolution);
  TRACE(domains.length > 50 ? '' : 'domains:\n' + domains.map((d, i) => '  ' + i + ': ' + domain__debug(d) + ' -> ' + (hashNames ? '$' + i.toString(36) + '$' : varNames[i]) + (fdsolution ? ': ' + fdsolution[(hashNames ? '$' + i.toString(36) + '$' : varNames[i])] : '?')).join('\n'));
  let solution = {};
  solveStack.reverse().forEach(f => f(domains, force, getDomain, setDomain));
  TRACE('domains array:', domains.slice(0, 20).map(domain__debug).join(' '), domains.length > 20 ? '(skipping the rest...)' : '');
  TRACE('mapped domains:', domains.slice(0, 20).map((d, i) => domain__debug(getDomain(i))).join(' '), domains.length > 20 ? '(skipping the rest...)' : '');
  varNames.forEach((name, index) => {
    let d = getDomain(index);
    let v = domain_getValue(d);
    if (v >= 0) d = v;
    else d = domain_toArr(d);
    solution[name] = d;
  });
  console.timeEnd('createSolution()');
  TRACE(' -> createSolution results in:', domains.length > 100 ? '<supressed; too many vars (' + domains.length + ')>' : solution);
  return solution;
}

// BODY_STOP

export default preSolver;
