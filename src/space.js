import {
  REJECTED,
  SOMETHING_CHANGED,
  SUB,
  SUP,

  ENABLED,
  ENABLE_EMPTY_CHECK,

  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_PROPAGATORS,
} from './helpers';

import {
  config_clone,
  config_create,
  config_generateVars,
} from './config';

import {
  domain_getValue,
  domain_isRange,
  domain_isSolved,
  domain_min,
} from './domain';

import {
  fdvar_clone,
  fdvar_isSolved,
} from './fdvar';

import propagator_stepAny from './propagators/step_any';
import propagator_isSolved from './propagators/is_solved';

// BODY_START

/**
 * @param {$config} config
 * @returns {$space}
 */
function space_createRoot(config) {
  if (typeof config === 'undefined' || config === null) {
    config = config_create();
  }

  return space_createNew(config, [], {}, [], 0, 0);
}

/**
 * @param {$config} config
 * @returns {Space}
 */
function space_createFromConfig(config) {
  ASSERT(config._class === 'config');

  let space = space_createRoot(config);
  space_initFromConfig(space);
  return space;
}

/**
 * Create a space node that is a child of given space node
 *
 * @param {Space} space
 * @returns {Space}
 */
function space_createClone(space) {
  ASSERT(space._class === 'space');

  let unsolvedNames = [];
  let cloneVars = {};

  let vars = space.vars;
  let unsolvedPropagators = [];
  let props = space.unsolved_propagators;
  for (let i = 0; i < props.length; i++) {
    let propagator = props[i];
    if (!propagator_isSolved(vars, propagator)) {
      unsolvedPropagators.push(propagator);
    }
  }

  space_pseudoCloneVars(space.config.all_var_names, vars, cloneVars, unsolvedNames);
  return space_createNew(space.config, unsolvedPropagators, cloneVars, unsolvedNames, space._depth + 1, space._child_count++);
}

/**
 * Create a new config with the configuration of the given Space
 * Basically clones its config but updates the `initial_vars` with fresh state
 *
 * @param {Space} space
 * @returns {Space}
 */
function space_toConfig(space) {
  ASSERT(space._class = 'space');

  let varsForClone = {};
  let names = space.config.all_var_names;
  let fdvars = space.vars;
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    let fdvar = fdvars[name];
    let dom = fdvar.dom;
    if (domain_isSolved(dom)) {
      dom = domain_getValue(dom);
    } else if (domain_isRange(dom, SUB, SUP)) {
      dom = undefined;
    } else {
      dom = dom.slice(0);
    }
    varsForClone[name] = dom;
  }

  return config_clone(space.config, varsForClone);
}

/**
 * Note: it's pseudo because solved vars are not cloned but copied...
 *
 * @param {string[]} allNames
 * @param {Fdvar[]} parentVars
 * @param {Fdvar[]} cloneVars
 * @param {Fdvar[]} cloneUnsolvedVarNames
 */
function space_pseudoCloneVars(allNames, parentVars, cloneVars, cloneUnsolvedVarNames) {
  for (let i = 0; i < allNames.length; i++) {
    let varName = allNames[i];
    let fdvar = parentVars[varName];
    if (fdvar.was_solved) {
      cloneVars[varName] = fdvar;
    } else { // copy by reference
      cloneVars[varName] = fdvar_clone(fdvar);
      cloneUnsolvedVarNames.push(varName);
    }
  }
}

/**
 * Concept of a space that holds config, some fdvars, and some propagators
 *
 * @param {$config} config
 * @param {Object[]} unsolvedPropagators
 * @param {Fdvar[]} vars
 * @param {string[]} unsolvedVarNames
 * @param {number} _depth
 * @param {number} _child
 * @returns {$space}
 */
function space_createNew(config, unsolvedPropagators, vars, unsolvedVarNames, _depth, _child) {
  ASSERT(unsolvedPropagators instanceof Array, 'props should be an array', unsolvedPropagators);
  ASSERT(vars && typeof vars === 'object', 'vars should be an object', vars);
  ASSERT(unsolvedVarNames instanceof Array, 'unsolvedVarNames should be an array', unsolvedVarNames);

  return ({
    _class: 'space',
    // search graph metrics
    _depth,
    _child,
    _child_count: 0,

    config,

    vars,
    unsolvedVarNames,
    unsolvedPropagators, // by references from space.config.propagators

    next_distribution_choice: 0
  });
}

/**
 * @param {Space} space
 */
function space_initFromConfig(space) {
  let config = space.config;
  ASSERT(config, 'should have a config');

  config_generateVars(config, space.vars, space.unsolved_var_names);

  // propagators are immutable so share by reference
  for (let i = 0; i < config.propagators.length; i++) {
    let propagator = config.propagators[i];
    space.unsolved_propagators.push(propagator);
  }
}

/**
 * Run all the propagators until stability point. Returns the number
 * of changes made or throws a 'fail' if any propagator failed.
 *
 * @param {Space} space
 * @returns {boolean}
 */
function space_propagate(space) {
  ASSERT(space._class === 'space');
  let unsolvedPropagators = space.unsolved_propagators;
  ASSERT_PROPAGATORS(unsolvedPropagators);

  do {
    let changed = false;
    for (let i = 0; i < unsolvedPropagators.length; i++) {
      let propDetails = unsolvedPropagators[i];
      let n = propagator_stepAny (propDetails, space); // TODO: if we can get a "solved" state here we can prevent an "is_solved" check later...

      // the domain of either var of a propagator can only be empty if the prop REJECTED
      ASSERT(n === REJECTED || space.vars[propDetails[1][0]].dom.length, 'prop var empty but it didnt REJECT');
      ASSERT(n === REJECTED || !propDetails[1][1] || space.vars[propDetails[1][1]].dom.length, 'prop var empty but it didnt REJECT');
      // if a domain was set empty and the flag is on the property should be set or
      // the unit test setup is unsound and it should be fixed (ASSERT_DOMAIN_EMPTY_SET)
      ASSERT(!ENABLED || !ENABLE_EMPTY_CHECK || space.vars[propDetails[1][0]].dom.length || space.vars[propDetails[1][0]].dom._trace, 'domain empty but not marked');
      ASSERT(!ENABLED || !ENABLE_EMPTY_CHECK || !propDetails[1][1] || space.vars[propDetails[1][1]].dom.length || space.vars[propDetails[1][1]].dom._trace, 'domain empty but not marked');

      if (n === SOMETHING_CHANGED) {
        changed = true;
      } else if (n === REJECTED) {
        return false; // solution impossible
      }
    }

    if (space_abortSearch(space)) {
      return false;
    }
  } while (changed);

  return true;
}

/**
 * @param {Space} space
 * @returns {boolean}
 */
function space_abortSearch(space) {
  ASSERT(space._class === 'space');
  let callback = space.config.timeout_callback;
  if (callback) {
    return callback(space);
  }
  return false;
}

/**
 * Returns true if this space is solved - i.e. when
 * all the fdvars in the space have a singleton domain.
 *
 * This is a *very* strong condition that might not need
 * to be satisfied for a space to be considered to be
 * solved. For example, the propagators may determine
 * ranges for all variables under which all conditions
 * are met and there would be no further need to enumerate
 * those solutions.
 *
 * For weaker tests, use the solve_for_variables function
 * to create an appropriate "is_solved" tester and
 * set the "state.is_solved" field at search time to
 * that function.
 *
 * @param {Space} space
 * @returns {boolean}
 */
function space_isSolved(space) {
  ASSERT(space._class === 'space');
  let vars = space.vars;
  let targetedVars = space.config.targeted_vars;
  let unsolvedNames = space.unsolved_var_names;

  let j = 0;
  for (let i = 0; i < unsolvedNames.length; i++) {
    let name = unsolvedNames[i];
    if (targetedVars === 'all' || targetedVars.indexOf(name) >= 0) {
      let fdvar = vars[name];
      ASSERT(!fdvar.was_solved, 'should not be set yet at this stage'); // we may change this though...
      ASSERT_DOMAIN(fdvar.dom, 'is_solved extra domain validation check');

      if (fdvar_isSolved(fdvar)) {
        fdvar.was_solved = true; // makes space_createClone faster
      } else {
        unsolvedNames[j++] = name;
      }
    }
  }
  unsolvedNames.length = j;

  return j === 0;
}

/**
 * Returns an object whose field names are the fdvar names
 * and whose values are the solved values. The space *must*
 * be already in a solved state for this to work.
 *
 * @param {Space} space
 * @returns {Object}
 */
function space_solution(space) {
  ASSERT(space._class === 'space');
  let result = {};
  let vars = space.vars;
  let allVarNames = space.config.all_var_names;
  for (let i = 0; i < allVarNames.length; i++) {
    let varName = allVarNames[i];
    space_getsetVarSolveState(varName, vars, result);
  }
  return result;
}

/**
 * @param {Space} space
 * @param {string[]} varNames List of var names to query the solution for
 * @param {boolean} [complete=false] Return false if at least one var could not be solved?
 * @returns {Object}
 */
function space_solutionFor(space, varNames, complete = false) { // todo implement memorize flag
  ASSERT(space._class === 'space');
  let vars = space.vars;
  let result = {};
  for (let i = 0; i < varNames.length; i++) {
    let varName = varNames[i];
    let value = false;
    if (vars[varName]) {
      value = space_getsetVarSolveState(varName, vars, result);
    }

    if (complete && value === false) {
      return false;
    }

    result[varName] = value;
  }

  return result;
}

/**
 * @param {string} varName
 * @param {Fdvar[]} vars
 * @param result
 * @returns {number|number[]|boolean} The solve state for given var name, also put into result
 */
function space_getsetVarSolveState(varName, vars, result) {
  // Don't include the temporary variables in the "solution".
  // Temporary variables take the form of a numeric property
  // of the object, so we test for the varName to be a number and
  // don't include those variables in the result.
  let domain = vars[varName].dom;
  let value = domain;
  if (domain.length === 0) {
    value = false;
  } else if (domain_isSolved(domain)) {
    value = domain_min(domain);
  }
  result[varName] = value;

  return value;
}

// __REMOVE_BELOW_FOR_DIST__

//# ## Debugging

// debug stuff (should be stripped from dist)

/**
 * @param {Space} space
 * @returns {string}
 */
function __space_toSolverTestCase(space) {
  ASSERT(space._class === 'space');
  let things = ['S = new Solver {}\n'];

  for (let name in space.vars) {
    things.push(`space_add_var space, '${name}', [${space.vars[name].dom.join(', ')}]`);
  }
  things.push('');

  space.unsolved_propagators.forEach(function(c) {
    if (c[0] === 'reified') {
      return things.push(`S._cacheReified '${c[2]}', '${c[1].join('\', \'')}'`);
    } else if (c[0] === 'ring') {
      switch (c[2]) {
        case 'plus':
          // doesnt really exist. merely artifact of ring
          return things.push(`propagator_addPlus S, '${c[1].join('\', \'')}'`);
        case 'min':
          // doesnt really exist. merely artifact of plus
          return things.push(`# S.minus '${c[1].join('\', \'')}' # (artifact from .plus)`);
        case 'mul':
          // doesnt really exist. merely artifact of ring
          return things.push(`propagator_addMul S, '${c[1].join('\', \'')}'`);
        case 'div':
          // doesnt really exist. merely artifact of ring
          return things.push(`# S.divby '${c[1].join('\', \'')}' # (artifact from .mul)`);
        default:
          return ASSERT(false, 'unknown ring op name', c[2]);
      }
    } else {
      return things.push(`S.${c[0]} '${c[1].join('\', \'')}'`);
    }
  });

  things.push('\nexpect(S.solve({max:10000}).length).to.eql 666');

  return things.join('\n');
}

/**
 * @param {Space} space
 * @returns {string}
 */
function __space_toSpaceTestCase(space) {
  ASSERT(space._class === 'space');
  let things = ['S = space_createRoot()\n'];

  for (let name in space.vars) {
    things.push(`space_add_var S, '${name}', [${space.vars[name].dom.join(', ')}]`);
  }
  things.push('');

  things.push(`S.unsolved_propagators = [\n  ${space.unsolved_propagators.map(JSON.stringify).join('\n  ').replace(/"/g, '\'')}\n]`);

  things.push('\nexpect(space_propagate S).to.eql true');

  return things.join('\n');
}

/**
 * @param {Space} space
 * @returns {string}
 */
function __space_debugString(space) {
  ASSERT(space._class === 'space');
  try {
    var things = ['## ## ## ##'];

    things.push('Config:');
    things.push(`- config.var_filter_func: ${space.config.var_filter_func}`);
    things.push(`- config.next_var_func: ${space.config.next_var_func}`);
    things.push(`- config.next_value_func: ${space.config.next_value_func}`);
    things.push(`- config.targeted_vars: ${space.config.targeted_vars}`);

    things.push(`$ars (#{space.config.all_var_names.length}x):`);

    let { vars } = space;
    /*
     for name, fdvar of vars
     options = space.config.var_dist_options[name]
     things.push "  #{name}: [#{fdvar.dom.join(', ')}] #{options and ('Options: '+JSON.stringify(options)) or ''}"

     things.push 'config.var_dist_options:'
     for key, val of space.config.var_dist_options
     things.push "  #{key}: #{JSON.stringify val}"
     */

    things.push(`$ar (#{space.config.all_var_names.length}x):`);
    things.push(`  ${space.config.all_var_names}`);
    things.push(`$nsolved vars (#{space.unsolved_var_names.length}x):`);
    things.push(`  ${space.unsolved_var_names}`);

    things.push(`$ropagators (#{space.unsolved_propagators.length}x):`);

    /*
     space.unsolved_propagators.forEach (p) ->
     try
     solved = propagator_isSolved vars, p
     catch e
     solved = '(unknown; crashes when checked)'

     a = p[1]?[0]
     b = p[1]?[1]
     c = p[1]?[2]
     if p[0] is 'reified'
     things.push "  #{p[0]}: '#{p[2]}', '#{p[1].join '\', \''}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[2]} [#{vars[b]?.dom or 'FAIL'}] -> [#{vars[c]?.dom or 'FAIL'}] | solved: #{solved}"
     else if p[0] is 'ring'
     things.push "  #{p[0]}: '#{p[2]}', '#{p[1].join '\', \''}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[2]} [#{vars[b]?.dom or 'FAIL'}] -> [#{vars[c]?.dom or 'FAIL'}] | solved: #{solved}"
     else
     things.push "  #{p[0]} '#{p[1].join ', '}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[0]} [#{vars[b]?.dom or 'FAIL'}] | solved: #{solved}"
     */
    if (!space.unsolved_propagators.length) {
      things.push('  - none');
    }

    things.push('## ## ## ##');
  } catch (e) {
    things.push(`(Crashed inside __space_debugString!)(${e.toString()})`);
    throw new Error(things.join('\n'));
  }

  return things.join('\n');
}

/**
 * @param {Space} space
 * @returns {string[]}
 */
function __space_debugVarDomains(space) {
  let things = [];
  for (let name in space.vars) {
    things.push(name+': ['+space.vars[name].dom+']');
  }
  return things;
}

/**
 * @param {Space} space
 * @returns {string[]}
 */
function __space_getUnsolved(space) {
  let vars = space.vars;
  let unsolved_names = [];
  for (let name in vars) {
    let fdvar = vars[name];
    if (!fdvar_isSolved(fdvar)) {
      unsolved_names.push(name);
    }
  }
  return unsolved_names;
}

// __REMOVE_ABOVE_FOR_DIST__

// BODY_STOP

export {
  space_createClone,
  space_createFromConfig,
  space_createRoot,
  space_initFromConfig,
  space_isSolved,
  space_propagate,
  space_solution,
  space_solutionFor,
  space_toConfig,

  // debugging
  __space_debugString
  __space_debugVarDomains,
  __space_getUnsolved,
  __space_toSolverTestCase,
  __space_toSpaceTestCase,
};
