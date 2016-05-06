import {
  ASSERT,
  THROW
} from './helpers';

import {
  config_add_propagator,
  config_add_var_anon
} from './config';

// BODY_START

/**
 * Adds propagators which reify the given operator application
 * to the given boolean variable.
 *
 * `opname` is a string giving the name of the comparison
 * operator to reify. Currently, 'eq', 'neq', 'lt', 'lte', 'gt' and 'gte'
 * are supported.
 *
 * `leftVarName` and `rightVarName` are the arguments accepted
 * by the comparison operator. These must be existing FDVars in S.vars.
 *
 * `boolName` is the name of the boolean variable to which to
 * reify the comparison operator. Note that this boolean
 * variable must already have been declared. If this argument
 * is omitted from the call, then the `reified` function can
 * be used in "functional style" and will return the name of
 * the reified boolean variable which you can pass to other
 * propagator creator functions.
 *
 * @param {$config} config
 * @param {string} opname
 * @param {string} leftVarName
 * @param {string} rightVarName
 * @param {string} boolName
 * @returns {string}
 */
function propagator_addReified(config, opname, leftVarName, rightVarName, boolName) {
  ASSERT(config._class === 'config');
  ASSERT(typeof leftVarName === 'string' || typeof leftVarName === 'number', 'expecting leftVarName', leftVarName);
  ASSERT(typeof rightVarName === 'string' || typeof rightVarName === 'number', 'expecting rightVarName', rightVarName);
  ASSERT(typeof boolName === 'string' || typeof boolName === 'number' || typeof boolName === 'undefined', 'expecting boolName to be string, number, or undefined', boolName);

  switch (opname) {
    case 'eq':
      var nopname = 'neq';
      break;

    case 'neq':
      nopname = 'eq';
      break;

    case 'lt':
      nopname = 'gte';
      break;

    case 'gt':
      nopname = 'lte';
      break;

    case 'lte':
      nopname = 'gt';
      break;

    case 'gte':
      nopname = 'lt';
      break;

    default:
      THROW(`add_reified: Unsupported operator '${opname}'`);
  }

  if (!boolName) {
    boolName = config_add_var_anon(config, 0, 1);
  }
  // TOFIX: trigger this check later somehow. it's not super relevant, mostly a safety procedure
  //else if fdvar_constrain(space.vars[boolName], domain_create_bool()) is REJECTED
  //  THROW 'boolean var should start with a domain containing zero, one, or both'

  if (typeof leftVarName === 'number') {
    leftVarName = config_add_var_anon(config, leftVarName);
    if (typeof rightVarName === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof rightVarName === 'number') {
    rightVarName = config_add_var_anon(config, rightVarName);
    if (typeof leftVarName === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  config_add_propagator(config, ['reified', [leftVarName, rightVarName, boolName], opname, nopname]);
  return boolName;
}

/**
 * @param {$config} config
 * @param {string[]} varNames
 * @param {Function} callback
 */
function propagator_addCallback(config, varNames, callback) {
  ASSERT(config._class === 'config');
  config_add_propagator(config, ['callback', varNames, callback]);
}

/**
 * Domain equality propagator. Creates the propagator
 * in given config.
 * Can pass in vars or numbers that become anonymous
 * vars. Must at least pass in one var because the
 * propagator would be useless otherwise.
 *
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 * @returns {*}
 */
function propagator_addEq(config, v1name, v2name) {
  ASSERT(config._class === 'config');
  ASSERT(typeof v1name === 'string' || typeof v1name === 'number', 'expecting var name 1', v1name);
  ASSERT(typeof v2name === 'string' || typeof v2name === 'number', 'expecting var name 2', v2name);

  if (typeof v1name === 'number') {
    v1name = config_add_var_anon(config, v1name);
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof v2name === 'number') {
    let t = config_add_var_anon(config, v2name);
    // swap such that v1 is the solved var. order is irrelevant to eq itself.
    v2name = v1name;
    v1name = t;
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  config_add_propagator(config, ['eq', [v1name, v2name]]);
  // return either operand var. this allows you to chain eqs -> .eq(.eq(A, B), C)
  // doesnt really matter which operand since they should be equal
  // (though you should probably try to make v1 solved the fastest)
  return v1name;
}

/**
 * Less than propagator. See general propagator nores
 * for fdeq which also apply to this one.
 *
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 */
function propagator_addLt(config, v1name, v2name) {
  ASSERT(config._class === 'config');
  ASSERT(typeof v1name === 'string' || typeof v1name === 'number', 'expecting var name 1', v1name);
  ASSERT(typeof v2name === 'string' || typeof v2name === 'number', 'expecting var name 2', v2name);

  if (typeof v1name === 'number') {
    v1name = config_add_var_anon(config, v1name);
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof v2name === 'number') {
    v2name = config_add_var_anon(config, v2name);
    if (typeof v1name === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  config_add_propagator(config, ['lt', [v1name, v2name]]);
}

/**
 * Greater than propagator.
 *
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 */
function propagator_addGt(config, v1name, v2name) {
  // _swap_ v1 and v2 because: a>b is b<a
  propagator_addLt(config, v2name, v1name);
}

/**
 * Less than or equal to propagator.
 *
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 */
function propagator_addLte(config, v1name, v2name) {
  ASSERT(config._class === 'config');
  ASSERT(typeof v1name === 'string' || typeof v1name === 'number', 'expecting var name 1', v1name);
  ASSERT(typeof v2name === 'string' || typeof v2name === 'number', 'expecting var name 2', v2name);

  if (typeof v1name === 'number') {
    v1name = config_add_var_anon(config, v1name);
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof v2name === 'number') {
    v2name = config_add_var_anon(config, v2name);
    if (typeof v1name === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  config_add_propagator(config, ['lte', [v1name, v2name]]);
}

/**
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 * @param {string} resultName
 * @returns {string}
 */
function propagator_addMul(config, v1name, v2name, resultName) {
  ASSERT(config._class === 'config');
  ASSERT(typeof v1name === 'string' || typeof v1name === 'number', 'expecting var name 1', v1name);
  ASSERT(typeof v2name === 'string' || typeof v2name === 'number', 'expecting var name 2', v2name);

  if (typeof resultName === 'undefined') {
    resultName = config_add_var_anon(config);
  } else if (typeof resultName === 'number') {
    resultName = config_add_var_anon(config, resultName);
  } else if (typeof resultName !== 'string') {
    THROW(`expecting result_name to be absent or a number or string: \`${resultName}\``);
  }

  if (typeof v1name === 'number') {
    v1name = config_add_var_anon(config, v1name);
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof v2name === 'number') {
    v2name = config_add_var_anon(config, v2name);
    if (typeof v1name === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  config_add_propagator(config, ['mul', [v1name, v2name, resultName]]);
  return resultName;
}

/**
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 * @param {string} resultName
 * @returns {string}
 */
function propagator_addDiv(config, v1name, v2name, resultName) {
  ASSERT(config._class === 'config');
  ASSERT(typeof v1name === 'string' || typeof v1name === 'number', 'expecting var name 1', v1name);
  ASSERT(typeof v2name === 'string' || typeof v2name === 'number', 'expecting var name 2', v2name);

  if (typeof resultName === 'undefined') {
    resultName = config_add_var_anon(config);
  } else if (typeof resultName === 'number') {
    resultName = config_add_var_anon(config, resultName);
  } else if (typeof resultName !== 'string') {
    THROW(`expecting result_name to be absent or a number or string: \`${resultName}\``);
  }

  if (typeof v1name === 'number') {
    v1name = config_add_var_anon(config, v1name);
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof v2name === 'number') {
    v2name = config_add_var_anon(config, v2name);
    if (typeof v1name === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  config_add_propagator(config, ['div', [v1name, v2name, resultName]]);
  return resultName;
}

/**
 * Greater than or equal to.
 *
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 */
function propagator_addGte(config, v1name, v2name) {
  // _swap_ v1 and v2 because: a>=b is b<=a
  propagator_addLte(config, v2name, v1name);
}

/**
 * Ensures that the two variables take on different values.
 *
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 */
function propagator_addNeq(config, v1name, v2name) {
  ASSERT(config._class === 'config');
  ASSERT(typeof v1name === 'string' || typeof v1name === 'number', 'expecting var name 1', v1name);
  ASSERT(typeof v2name === 'string' || typeof v2name === 'number', 'expecting var name 2', v2name);

  if (typeof v1name === 'number') {
    v1name = config_add_var_anon(config, v1name);
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof v2name === 'number') {
    v2name = config_add_var_anon(config, v2name);
    if (typeof v1name === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  config_add_propagator(config, ['neq', [v1name, v2name]]);
}

/**
 * Takes an arbitrary number of FD variables and adds propagators that
 * ensure that they are pairwise distinct.
 *
 * @param {$config} config
 * @param {string[]} varNames
 */
function propagator_addDistinct(config, varNames) {
  ASSERT(config._class === 'config');
  for (let i = 0; i < varNames.length; i++) {
    let varNameI = varNames[i];
    let iterable = __range__(0, i, false);
    for (let k = 0; k < iterable.length; k++) {
      let j = iterable[k];
      propagator_addNeq(config, varNameI, varNames[j]);
    }
  }
}

/**
 * @param {$config} config
 * @param {string} targetOpName
 * @param {string} invOpName
 * @param {string} v1name
 * @param {string} v2name
 * @param {string} sumName
 * @returns {string}
 */
function _propagator_addRingPlusOrMul(config, targetOpName, invOpName, v1name, v2name, sumName) {
  ASSERT(config._class === 'config');
  ASSERT(typeof v1name === 'string' || typeof v1name === 'number', 'expecting var name 1', v1name);
  ASSERT(typeof v2name === 'string' || typeof v2name === 'number', 'expecting var name 2', v2name);
  ASSERT(typeof sumName === 'string' || typeof sumName === 'number' || typeof sumName === 'undefined', 'expecting sumName to be number, string, or undefined', sumName);

  if (typeof v1name === 'number') {
    v1name = config_add_var_anon(config, v1name);
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof v2name === 'number') {
    v2name = config_add_var_anon(config, v2name);
    if (typeof v1name === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  if (typeof sumName === 'undefined') {
    sumName = config_add_var_anon(config);
  } else if (typeof sumName === 'number') {
    sumName = config_add_var_anon(config, sumName);
  } else if (typeof sumName !== 'string') {
    THROW(`expecting sumname to be absent or a number or string: \`${sumName}\``);
  }

  _propagator_addRing(config, v1name, v2name, sumName, targetOpName);
  _propagator_addRing(config, sumName, v2name, v1name, invOpName);
  _propagator_addRing(config, sumName, v1name, v2name, invOpName);

  return sumName;
}

/**
 * @param {$config} config
 * @param {string} A
 * @param {string} B
 * @param {string} C
 * @param {string} op
 */
function _propagator_addRing(config, A, B, C, op) {
  ASSERT(config._class === 'config');
  ASSERT(typeof A === 'string', 'number/undefined vars should be handled by caller');
  ASSERT(typeof B === 'string', 'number/undefined vars should be handled by caller');
  ASSERT(typeof C === 'string', 'number/undefined vars should be handled by caller');
  config_add_propagator(config, ['ring', [A, B, C], op]);
}

/**
 * Bidirectional addition propagator.
 * Returns the sumname
 *
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 * @param {string} sumname
 */
function propagator_addPlus(config, v1name, v2name, sumname) {
  return _propagator_addRingPlusOrMul(config, 'plus', 'min', v1name, v2name, sumname);
}

/**
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 * @param {string} resultVar
 * @returns {string} same as resultVar if given
 */
function propagator_addMin(config, v1name, v2name, resultVar) {
  ASSERT(config._class === 'config');
  ASSERT(typeof v1name === 'string' || typeof v1name === 'number', 'expecting var name 1', v1name);
  ASSERT(typeof v2name === 'string' || typeof v2name === 'number', 'expecting var name 2', v2name);
  ASSERT(typeof resultVar === 'string' || typeof resultVar === 'number' || typeof resultVar === 'undefined', 'expecting resultVar to be number, string, or undefined', resultVar);

  if (typeof v1name === 'number') {
    v1name = config_add_var_anon(config, v1name);
    if (typeof v2name === 'number') {
      THROW('must pass in at least one var name');
    }
  } else if (typeof v2name === 'number') {
    v2name = config_add_var_anon(config, v2name);
    if (typeof v1name === 'number') {
      THROW('must pass in at least one var name');
    }
  }

  if (typeof resultVar === 'undefined') {
    resultVar = config_add_var_anon(config);
  } else if (typeof resultVar === 'number') {
    resultVar = config_add_var_anon(config, resultVar);
  } else if (typeof resultVar !== 'string') {
    THROW(`expecting result_var to be absent or a number or string: \`${resultVar}\``);
  }

  config_add_propagator(config, ['min', [v1name, v2name, resultVar]]);
  return resultVar;
}

/**
 * Bidirectional multiplication propagator.
 * Returns the sumname
 *
 * @param {$config} config
 * @param {string} v1name
 * @param {string} v2name
 * @param {string} prodName
 * @returns {string} (iirc)
 */
function propagator_addRingMul(config, v1name, v2name, prodName) {
  return _propagator_addRingPlusOrMul(config, 'mul', 'div', v1name, v2name, prodName);
}

/**
 * Sum of N fdvars = resultFDVar
 * Creates as many anonymous vars as necessary.
 * Returns the sumname
 *
 * @param {$config} config
 * @param {string[]} vars
 * @param {string} resultVarName
 * @returns {string}
 */
function propagator_addSum(config, vars, resultVarName) {
  ASSERT(config._class === 'config');
  ASSERT(vars instanceof Array, 'vars should be an array of var names', vars);

  if (!resultVarName) {
    resultVarName = config_add_var_anon(config);
  }

  let len = vars.length;
  switch (len) {
    case 0:
      return THROW('propagator_addSum: Nothing to sum!');

    case 1:
      propagator_addEq(config, vars[0], resultVarName);
      break;

    case 2:
      propagator_addPlus(config, vars[0], vars[1], resultVarName);
      break;

    default: // "divide and conquer" ugh. feels like there is a better way to do this
      ASSERT(len > 2, 'expecting at least 3 elements in the list...', vars);

      let n = Math.floor(vars.length / 2);
      if (n > 1) {
        var t1 = config_add_var_anon(config);
        propagator_addSum(config, vars.slice(0, n), t1);
      } else {
        var t1 = vars[0];
      }

      let t2 = config_add_var_anon(config);

      propagator_addSum(config, vars.slice(n), t2);
      propagator_addPlus(config, t1, t2, resultVarName);
  }

  return resultVarName;
}

/**
 * Product of N fdvars = resultFDvar.
 * Create as many anonymous vars as necessary.
 *
 * @param {$config} config
 * @param {string[]} vars
 * @param {string} resultVarName
 * @returns {string}
 */
function propagator_addProduct(config, vars, resultVarName) {
  ASSERT(config._class === 'config');

  if (!resultVarName) {
    resultVarName = config_add_var_anon(config);
  }

  switch (vars.length) {
    case 0:
      return retval;
      break;

    case 1:
      propagator_addEq(config, vars[0], resultVarName);
      break;

    case 2:
      propagator_addRingMul(config, vars[0], vars[1], resultVarName);
      break;

    default:
      let n = Math.floor(vars.length / 2);
      if (n > 1) {
        var t1 = config_add_var_anon(config);
        propagator_addProduct(config, vars.slice(0, n), t1);
      } else {
        var t1 = vars[0];
      }
      let t2 = config_add_var_anon(config);

      propagator_addProduct(config, vars.slice(n), t2);
      propagator_addRingMul(config, t1, t2, resultVarName);
  }

  return resultVarName;
}

/**
 * @param {$config} config
 * @param {string} varName
 */
function propagator_addMarkov(config, varName) {
  ASSERT(config._class === 'config');
  ASSERT(typeof varName === 'string');
  config_add_propagator(config, ['markov', [varName]]);
}

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}

// BODY_STOP

export default {
  propagator_addCallback,
  propagator_addDistinct,
  propagator_addDiv,
  propagator_addEq,
  propagator_addGt,
  propagator_addGte,
  propagator_addLt,
  propagator_addLte,
  propagator_addMarkov,
  propagator_addMul,
  propagator_addNeq,
  propagator_addPlus,
  propagator_addMin,
  propagator_addProduct,
  propagator_addReified,
  propagator_addRingMul,
  propagator_addSum,

  // for testing
  _propagator_addRing,
  _propagator_addRingPlusOrMul
};
