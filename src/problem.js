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
  domain_containsValue,
  domain_createRange,
  domain_createValue,
  domain_getValue,
  domain_isSolved,
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
  if ($aliases[indexOld] === indexNew) return; // ignore constant (re)assignments. we may want to handle this more efficiently in the future
  TRACE(' - $addAlias' + (_origin ? ' (from ' + _origin + ')' : '') + ': Mapping index = ', indexOld, '(', domain__debug($domains[indexOld]), ') to index = ', indexNew, '(', indexNew >= $domains.length ? 'some constant' : domain__debug($domains[indexNew]), ')');
  ASSERT(indexOld !== indexNew, 'cant make an alias for itself', indexOld, indexNew, _origin);
  ASSERT(indexOld >= 0 && indexOld <= $domains.length, 'should be valid non-constant var index', indexOld, _origin);
  ASSERT(indexNew >= 0, 'should be valid var index', indexNew, _origin);
  //ASSERT($domains[indexOld], 'current domain shouldnt be empty', _origin);
  ASSERT(!indexOld || (indexOld - 1) in $domains, 'dont create gaps...', indexOld);

  let oldDomain = $domains[indexOld];
  $aliases[indexOld] = indexNew;
  $domains[indexOld] = false; // mark as aliased. while this isnt a change itself, it could lead to some dedupes

  // NOTE: there are very few cases where this will be false, but one example is the pseudo xnor case where two booly variables are equal the boolean sense but not the absolute value `(A !^ B)`
  if (!noSolveStack) {
    $solveStack.push((_, force, getDomain, setDomain) => {
      // note: getDomain may pull from a different array than $domains!
      // note: indexes may be aliased since declaring this callback so either refresh them or dont pass true to getDomain
      let domain = getDomain(indexNew);
      TRACE(' - $solveStack for $addAlias; ensuring', indexNew, 'and', indexOld, 'result in same value.');
      TRACE('   - old domain:', domain__debug(oldDomain));
      TRACE('   - new domain:', domain__debug(domain), domain_isSolved(domain) ? '' : 'forcing choice so we can be certain both vars have the same value');
      // ensure both indexes end up with the same value, regardless of how the target is reduced
      // only way to do that is to make sure the var is solved (otherwise two different values could be picked from the solution...)
      let v = force(indexNew);
      ASSERT(domain_containsValue(oldDomain, v), 'old domain should contain resulting value', _origin);
      ASSERT(getDomain(indexOld, true) === false, 'old index should be marked as an alias', 'old index:', indexOld, ', current old domain:', domain__debug(getDomain(indexOld, true)), 'or', domain__debug($domains[indexOld]), 'same $domains?', $domains === _, _origin);
      setDomain(indexOld, domain_createValue(v));
    });
  }
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
function $setDomain($domains, $constants, $addAlias, $getAlias, varIndex, domain, skipAliasCheck) {
  ASSERT(arguments.length >= 2, 'at least two args');
  ASSERT(typeof varIndex === 'number' && varIndex >= 0 && varIndex <= 0xffff, 'valid varindex', varIndex);
  ASSERT_NORDOM(domain);
  ASSERT(skipAliasCheck === undefined || skipAliasCheck === true || skipAliasCheck === false, 'valid skipAliasCheck', skipAliasCheck);
  //ASSERT(forSolution || $domains[varIndex] !== false, 'index should be unaliased unless we are solving the var', varIndex, $domains[varIndex], forSolution);
  ASSERT(!$domains[varIndex] || !domain_isSolved($domains[varIndex]), 'current domain should not be a constant');

  //ASSERT_LOG2(' - $setDomain', varIndex, domain__debug(domain), skipAliasCheck);
  let value = domain_getValue(domain);
  if (value >= 0) {
    // check if this isnt already a constant.. this case should never happen
    if ($constants[varIndex] !== undefined) {
      if ($constants[varIndex] === value) return; // TOFIX: this needs to be handled better because a regular var may become mapped to a constant and if it becomes empty then this place cant deal/signal with that properly
      THROW('Cant update a constant (only to an empty domain, which should be handled differently)');
    }

    let constantIndex = value2index($constants, value);
    $addAlias(varIndex, constantIndex, '$setDomain; because var is now constant ' + value);
    return constantIndex;
  }

  if (!skipAliasCheck) varIndex = $getAlias(varIndex);
  if (domain === 0) {
    // make sure we're not overriding a constant...
    if (varIndex in $domains) $domains[varIndex] = domain;
  } else {
    ASSERT(!varIndex || varIndex in $domains, 'do not create gaps', varIndex, domain__debug(domain));
    $domains[varIndex] = domain;
  }
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

  let addAlias = $addAlias.bind(undefined, domains, aliases, solveStack);
  let getAlias = $getAlias.bind(undefined, aliases);
  let name2index = $name2index.bind(undefined, varTrie, getAlias);

  let targeted = [];
  let targetsFrozen = false; // false once a targets directive is parsed

  return {
    varTrie,
    varNames,
    domains,
    aliases,
    solveStack,

    input: { // see dsltoml
      varstrat: 'default',
      valstrat: 'default',
      dsl: '',
      valdist: undefined, // arbitrary json to be defined in detail
    },
    ml: undefined, // Buffer
    mapping: undefined, // var index in (this) child to var index of parent

    addVar: $addVar.bind(undefined, varTrie, varNames, domains, constants, addAlias, _ => ++anonCounter, targeted, _ => targetsFrozen),
    getVar: name2index, // deprecated
    name2index,
    addAlias,
    getAlias,
    getDomain: $getDomain.bind(undefined, domains, constants, getAlias),
    setDomain: $setDomain.bind(undefined, domains, constants, addAlias, getAlias),
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
