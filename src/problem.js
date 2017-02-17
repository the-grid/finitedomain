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
  $solveStack.push(domains => {
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

function problem_create(dsl) {
  let anonCounter = 0;
  let varTrie = trie_create();
  let varNames = [];
  let domains = [];
  let aliases = {};
  let solveStack = [];

  return {
    _dsl: dsl,

    varTrie,
    varNames,
    domains,
    aliases,
    solveStack,

    input: undefined, // obj: see dsltoml
    mlString: '',
    ml: undefined,

    addVar: $addVar.bind(undefined, varTrie, varNames, domains, _ => ++anonCounter),
    getVar: $getVar.bind(undefined, varTrie),
    addAlias: $addAlias.bind(undefined, domains, aliases, solveStack),
    getAlias: $getAlias.bind(undefined, aliases),
  };
}

// BODY_STOP

export {
  problem_create,
};
