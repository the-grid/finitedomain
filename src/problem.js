import {
  SUB,
  SUP,

  ASSERT,
  ASSERT_LOG2,
  THROW,
  TRACE_ADD,
} from './helpers';
import {
  domain__debug,
  domain_createRange,
  domain_createValue,
  domain_min,
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

function $addVar($varTrie, $vars, $domains, $getAnonCounter, name, domain, modifier, returnName, returnIndex) {
  ASSERT_LOG2('addVar', name, domain, modifier, returnName ? '(return name)' : '', returnIndex ? '(return index)' : '');
  if (modifier) THROW('implement me (var mod)');
  if (typeof name === 'number') {
    domain = name;
    name = undefined;
  }
  if (name === undefined) {
    name = '__' + $getAnonCounter();
    ASSERT_LOG2(' - Adding anonymous var for dom=', domain, '->', name);
  }
  if (typeof domain === 'number') {
    domain = domain_createValue(domain);
  } else if (domain === undefined) {
    domain = domain_createRange(SUB, SUP);
  } else {
    domain = domain_arrToSmallest(domain);
  }

  let newIndex = $vars.length;
  trie_add($varTrie, name, newIndex);
  $vars.push(name);
  $domains.push(domain);
  if (returnIndex) return newIndex;
  if (returnName) return name; // return a name when explicitly asked for.
}
function $getVar($varTrie, name) {
  return trie_get($varTrie, name);
}
function $addAlias($domains, $aliases, $solveStack, indexOld, indexNew) {
  ASSERT(indexOld !== indexNew, 'cant make an alias for itself');
  $aliases[indexOld] = indexNew;

  ASSERT_LOG2(' - Mapping', indexOld, 'to be an alias for', indexNew);
  TRACE_ADD(indexOld, domain__debug($domains[indexOld]), domain__debug($domains[indexNew]), 'now alias of ' + indexNew);
  $solveStack.push((domains, force) => {
    ASSERT_LOG2(' - alias; ensuring', indexNew, 'and', indexOld, 'result in same value');
    ASSERT_LOG2('   - domain =', domain__debug(domains[indexNew]), 'forcing choice to min(d)=', domain_min(domains[indexNew]));
    // ensure A and B end up with the same value, regardless of how A is reduced
    ASSERT(domains[indexOld] === false, 'B should be marked as an alias');
    domains[indexOld] = domains[indexNew] = domain_createValue(domain_min(domains[indexNew]));
  });
  ASSERT(!void ($solveStack[$solveStack.length - 1]._target = indexOld));
  ASSERT(!void ($solveStack[$solveStack.length - 1]._meta = 'alias(' + indexNew + ' -> ' + indexOld + ')'));
  $domains[indexOld] = false; // mark as aliased. this is not a change per se.
}
function $getAlias($aliases, index) {
  let alias = $aliases[index];
  if (alias === index) throw new Error('alias is itself?', alias, index);
  if (alias === undefined) {
    throw new Error('alias for ' + index + ' does not exist... ');
  }
  return alias;
}

function problem_create() {
  let anonCounter = 0;
  let varTrie = trie_create();
  let varNames = [];
  let domains = [];
  let aliases = {};
  let solveStack = [];

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

    addVar: $addVar.bind(undefined, varTrie, varNames, domains, _ => ++anonCounter),
    getVar: $getVar.bind(undefined, varTrie),
    addAlias: $addAlias.bind(undefined, domains, aliases, solveStack),
    getAlias: $getAlias.bind(undefined, aliases),
  };
}

function problem_from(parentProblem) {
  ASSERT_LOG2(' - problem_from(): sweeping parent and generating clean child problem');
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
  ASSERT_LOG2('ML len:', len, 'parent content len:', (stopOffset - lastJumpSize === lastJumpOffset) ? lastJumpOffset + 1 : stopOffset, ', child content len:', childOffset);
  ASSERT(childMl[childOffset - 1] === ML_STOP, 'expecting last copied op to be a STOP', childOffset, childMl[childOffset - 1], childMl);
  if (childOffset < len) {
    ASSERT_LOG2(' - there are', len - childOffset - 1, 'available bytes left, compiling a jump and moving the STOP back');
    ml_jump(childMl, childOffset - 1, len - childOffset);
    ml_enc8(childMl, len - 1, ML_STOP);
  }
  ASSERT_LOG2('PML:', parentMl);
  ASSERT_LOG2('CML:', childMl);
  ASSERT(ml_validateSkeleton(childMl, 'after streaming to a child ml'));

  return childProblem;
}

// BODY_STOP

export {
  problem_create,
  problem_from,
};
