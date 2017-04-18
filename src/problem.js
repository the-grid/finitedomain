import {
  SUB,
  SUP,

  ASSERT,
  TRACE,
  ASSERT_NORDOM,
  THROW,
} from './helpers';
import {
  domain__debug,
  domain_createRange,
  domain_createValue,
  domain_getValue,
  domain_intersection,
  domain_arrToSmallest,
} from './domain';
import {
  ML_JMP,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  ml_enc8,
  ml_jump,
  ml_validateSkeleton,
  ml_walk,
} from './ml';
import {
  trie_add,
  trie_create,
  trie_get,
} from './trie';

// BODY_START

const MAX_VAR_COUNT = 0xffff; // 16bit

function $addVar($varTrie, $vars, $domains, $constants, $addAlias, $getAnonCounter, $targeted, $targetsFrozen, name, domain, modifier, returnName, returnIndex, _throw) {
  TRACE('addVar', name, domain, modifier, returnName ? '(return name)' : '', returnIndex ? '(return index)' : '');
  if (modifier) {
    if (_throw) _throw('implement me (var mod)');
    THROW('implement me (var mod)');
  }
  if (typeof name === 'number') {
    domain = name;
    name = undefined;
  }

  if (typeof domain === 'number') {
    domain = domain_createValue(domain);
  } else if (domain === undefined) {
    domain = domain_createRange(SUB, SUP);
  } else {
    domain = domain_arrToSmallest(domain);
  }

  let newIndex;

  let v = domain_getValue(domain);
  if (typeof name === 'string' || v < 0 || returnName) {
    let wasAnon = name === undefined;
    if (wasAnon) {
      name = '__' + $getAnonCounter();
      TRACE(' - Adding anonymous var for dom=', domain, '->', name);
    }

    newIndex = $vars.length;

    let prev = trie_add($varTrie, name, newIndex);
    if (prev >= 0) {
      if (_throw) _throw('Dont declare a var after using it', name, prev);
      THROW('Dont declare a var after using it', name, prev);
    }

    $vars.push(name);
    $domains.push(domain);
    $targeted[newIndex] = wasAnon ? false : !$targetsFrozen(); // note: cannot override frozen values since all names must already be declared when using `@custom targets`
  }
  // note: if the name is string but domain is constant, we must add the name here as well and immediately alias it to a constant
  if (v >= 0 && !returnName) { // TODO: we'll phase out the second condition here soon, but right now constants can still end up as regular vars
    // constants are compiled slightly differently
    let constIndex = value2index($constants, v);
    // actual var names must be registered so they can be looked up, then immediately alias them to a constant
    if (newIndex >= 0) $addAlias(newIndex, constIndex, '$addvar');
    newIndex = constIndex;
  }

  // deal with explicitly requested return values...
  if (returnIndex) return newIndex;
  if (returnName) return name;
}
function $name2index($varTrie, $getAlias, name, skipAliasCheck, scanOnly) {
  //ASSERT_LOG2('$name2index', name, skipAliasCheck);
  let varIndex = trie_get($varTrie, name);
  if (!scanOnly && varIndex < 0) THROW('cant use this on constants or vars that have not (yet) been declared', name, varIndex);
  if (!skipAliasCheck && varIndex >= 0) varIndex = $getAlias(varIndex);
  return varIndex;
}
function $addAlias($domains, $aliases, $solveStack, indexOld, indexNew, _origin, noSolveStack) {
  TRACE(' - $addAlias' + (_origin ? ' (from ' + _origin + ')' : '') + ': Mapping index = ', indexOld, '(', domain__debug($domains[indexOld]), ') to index = ', indexNew, '(', indexNew >= $domains.length ? 'some constant' : domain__debug($domains[indexNew]), ')');
  ASSERT(typeof indexOld === 'number', 'old index should be a number', indexOld);
  ASSERT(typeof indexNew === 'number', 'new index should be a number', indexNew);

  if ($aliases[indexOld] === indexNew) {
    TRACE('ignore constant (re)assignments. we may want to handle this more efficiently in the future');
    return;
  }
  ASSERT(indexOld !== indexNew, 'cant make an alias for itself', indexOld, indexNew, _origin);
  ASSERT(indexOld >= 0 && indexOld <= $domains.length, 'should be valid non-constant var index', indexOld, _origin);
  ASSERT(indexNew >= 0, 'should be valid var index', indexNew, _origin);
  //ASSERT($domains[indexOld], 'current domain shouldnt be empty', _origin);
  ASSERT(!indexOld || (indexOld - 1) in $domains, 'dont create gaps...', indexOld);

  $aliases[indexOld] = indexNew;
  $domains[indexOld] = false; // mark as aliased. while this isnt a change itself, it could lead to some dedupes
}
function $getAlias($aliases, index) {
  let alias = $aliases[index]; // TODO: is a trie faster compared to property misses?
  while (alias !== undefined) {
    if (alias === index) THROW('alias is itself?', alias, index);
    index = alias;
    alias = $aliases[index];
  }
  return index;
}
function $getDomain($domains, $constants, $getAlias, varIndex, skipAliasCheck) {
  //ASSERT_LOG2('    - $getDomain', varIndex, skipAliasCheck, $constants[varIndex]);
  if (!skipAliasCheck) varIndex = $getAlias(varIndex);

  // constant var indexes start at the end of the max
  let v = $constants[varIndex];
  if (v !== undefined) {
    ASSERT(SUB <= v && v <= SUP, 'only SUB SUP values are valid here');
    return domain_createValue(v);
  }

  return $domains[varIndex];
}
function _assertSetDomain($domains, $constants, $aliases, $addAlias, $getAlias, varIndex, domain, skipAliasCheck) {
  // there's a bunch of stuff to assert. this function should not be called without ASSERT and should be eliminated as dead code by the minifier...

  // args check
  ASSERT(typeof varIndex === 'number' && varIndex >= 0 && varIndex <= 0xffff, 'valid varindex', varIndex);
  ASSERT_NORDOM(domain);
  ASSERT(skipAliasCheck === undefined || skipAliasCheck === true || skipAliasCheck === false, 'valid skipAliasCheck', skipAliasCheck);

  let currentDomain = $getDomain($domains, $constants, $getAlias, varIndex, false);
  ASSERT(domain_intersection(currentDomain, domain) === domain, 'should not introduce values into the domain that did not exist before', domain__debug(currentDomain), '->', domain__debug(domain));

  return true;
}
function $setDomain($domains, $constants, $aliases, $addAlias, $getAlias, varIndex, domain, skipAliasCheck, emptyHandled) {
  if (!domain) {
    if (emptyHandled) return; // todo...
    THROW('Cannot set to empty domain');
  } // handle elsewhere!
  ASSERT(_assertSetDomain($domains, $constants, $aliases, $addAlias, $getAlias, varIndex, domain, skipAliasCheck));

  let value = domain_getValue(domain);
  if (value >= 0) return _$setToConstant($constants, $addAlias, varIndex, value);
  return _$setToDomain($domains, $constants, $aliases, $getAlias, varIndex, domain, skipAliasCheck);
}
function _$setToConstant($constants, $addAlias, varIndex, value) {
  // check if this isnt already a constant.. this case should never happen
  if ($constants[varIndex] !== undefined) {
    // TOFIX: this needs to be handled better because a regular var may become mapped to a constant and if it becomes empty then this place cant deal/signal with that properly
    if ($constants[varIndex] === value) return;
    THROW('Cant update a constant (only to an empty domain, which should be handled differently)');
  }

  // note: since the constant causes an alias anyways, we dont need to bother with alias lookup here
  // note: call site should assert that the varindex domain actually contained the value!
  let constantIndex = value2index($constants, value);
  $addAlias(varIndex, constantIndex, '$setDomain; because var is now constant ' + value);
}
function _$setToDomain($domains, $constants, $aliases, $getAlias, varIndex, domain, skipAliasCheck) {
  if (skipAliasCheck) {
    // either index was already unaliased by call site or this is solution generating. unalias the var index just in case.
    $aliases[varIndex] = undefined;
  } else {
    varIndex = $getAlias(varIndex);
  }

  ASSERT(varIndex < $domains.length || $constants[varIndex] === domain, 'either the var is not a constant or it is being updated to itself');
  if (varIndex < $domains.length) $domains[varIndex] = domain;
}
function value2index(constants, value) {
  //ASSERT_LOG2('value2index', value, '->', constants['v' + value]);
  ASSERT(value >= SUB && value <= SUP, 'value is OOB', value);

  let constantIndex = constants['v' + value];
  if (constantIndex >= 0) return constantIndex;

  constantIndex = MAX_VAR_COUNT - (constants._count++);
  constants['v' + value] = constantIndex;
  constants[constantIndex] = value;

  return constantIndex;
}

function problem_create() {
  let anonCounter = 0;
  let varNames = [];
  let varTrie = trie_create(); // name -> index (in varNames)
  let domains = [];
  let constants = {_count: 0};
  let aliases = {};
  let solveStack = [];

  let valdist = []; // 1:1 with varNames. contains json objects {valtype: 'name', ...}

  let addAlias = $addAlias.bind(undefined, domains, aliases, solveStack);
  let getAlias = $getAlias.bind(undefined, aliases);
  let name2index = $name2index.bind(undefined, varTrie, getAlias);

  let targeted = [];
  let targetsFrozen = false; // false once a targets directive is parsed

  return {
    varTrie,
    varNames,
    valdist,
    domains,
    aliases,
    solveStack,

    input: { // see dsltoml
      varstrat: 'default',
      valstrat: 'default',
      dsl: '',
    },
    ml: undefined, // Buffer
    mapping: undefined, // var index in (this) child to var index of parent

    addVar: $addVar.bind(undefined, varTrie, varNames, domains, constants, addAlias, _ => ++anonCounter, targeted, _ => targetsFrozen),
    getVar: name2index, // deprecated
    name2index,
    addAlias,
    getAlias,
    getDomain: $getDomain.bind(undefined, domains, constants, getAlias),
    setDomain: $setDomain.bind(undefined, domains, constants, aliases, addAlias, getAlias),
    isConstant: index => constants[index] !== undefined,
    freezeTargets: varNames => {
      if (targetsFrozen) THROW('Only one `targets` directive supported');
      targetsFrozen = true;
      targeted.fill(false);
      varNames.forEach(name => targeted[name2index(name, true)] = true);
    },

    targeted, // for each element in $domains; true if targeted, false if not targeted
  };
}

function problem_from(parentProblem) {
  TRACE(' - problem_from(): sweeping parent and generating clean child problem');
  let childProblem = problem_create(parentProblem._dsl);

  let parentMl = parentProblem.ml;
  childProblem.mapping = new Array(parentProblem.varNames.length);
  let len = parentMl.length;
  let childMl = new Buffer(len); // worst case there's a lot of empty space to recycle
  //childMl.fill(0); // note: we shouldnt need to do this. everything but the left-over space is copied over directly. the left-over space is compiled as a full jump which should ignore the remaining contents of the buffer. it may only be a little confusing to debug if you expect that space to be "empty"
  childProblem.ml = childMl;

  let childOffset = 0;
  let lastJumpSize = 0;
  let lastJumpOffset = 0;
  let stopOffset = 0;
  ml_walk(parentMl, 0, (ml, offset, op, sizeof) => {
    switch (op) {
      case ML_JMP:
      case ML_NOOP:
      case ML_NOOP2:
      case ML_NOOP3:
      case ML_NOOP4:
        lastJumpOffset = offset;
        lastJumpSize = sizeof;
        return; // eliminate these
      case ML_STOP:
        stopOffset = offset;
    }

    // copy the bytes to the new problem ml
    // TODO: consolidate consecutive copies (probably faster to do one long copy than 10 short ones?)
    ml.copy(childMl, childOffset, offset, offset + sizeof);
    childOffset += sizeof;
  });
  TRACE('ML len:', len, 'parent content len:', (stopOffset - lastJumpSize === lastJumpOffset) ? lastJumpOffset + 1 : stopOffset, ', child content len:', childOffset);
  ASSERT(childMl[childOffset - 1] === ML_STOP, 'expecting last copied op to be a STOP', childOffset, childMl[childOffset - 1], childMl);
  if (childOffset < len) {
    TRACE(' - there are', len - childOffset - 1, 'available bytes left, compiling a jump and moving the STOP back');
    ml_jump(childMl, childOffset - 1, len - childOffset);
    ml_enc8(childMl, len - 1, ML_STOP);
  }
  TRACE('PML:', parentMl);
  TRACE('CML:', childMl);
  ASSERT(ml_validateSkeleton(childMl, 'after streaming to a child ml'));

  return childProblem;
}

// BODY_STOP

export {
  problem_create,
  problem_from,
};
