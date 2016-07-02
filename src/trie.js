import {
  ASSERT,
  THROW,
} from './helpers';

// BODY_START

/**
 * Create a new trie and, optionally, initialize it
 * with given values as keys and their index as value.
 *
 * @param {string[]} [valuesByIndex] If exists, adds all values in array as keys, index as values
 * @returns {$trie}
 */
function trie_create(valuesByIndex) {
  let root = {}; // we use this as a hash so can't assign `_class` to it safely
  if (valuesByIndex) {
    for (let i = 0, n = valuesByIndex.length; i < n; ++i) {
      trie_add(root, valuesByIndex[i], i);
    }
  }
  return root;
}

/**
 * Add given key to given trie with given non-undefined value
 *
 * @param {$trie} trieRoot
 * @param {string} key
 * @param {*} value Cannot be `undefined`
 */
function trie_add(trieRoot, key, value) {
  ASSERT(value !== undefined, 'TRIE_CANNOT_ADD_UNDEFINED_VALUE');
  if (key === '$') THROW('Invalid special symbol; $');
  key = String(key); // or key = key + ''; ?
  return _trie_add(trieRoot, key, value, 0, key.length);
}
function _trie_add(branch, key, value, index, len) {
  if (index >= len) {
    ASSERT(branch.$ === undefined || branch.$ === value, 'SAME_KEY_SHOULD_NOT_HAVE_DIFF_VALUES');
    return branch.$ = value;
  }
  let c = key.charCodeAt(index);
  let o = branch[c];
  if (!branch[c]) {
    o = {};
    branch[c] = o;
  }
  return _trie_add(o, key, value, index + 1, len);
}

/**
 * A value exists if it can be found and has a value other than undefined.
 * Basically does `trie_get(tree, value) !== undefined`...
 *
 * @param {$trie} root
 * @param {string} key
 * @returns {boolean}
 */
function trie_has(root, key) {
  return trie_get(root, key) !== undefined;
}

/**
 * Return the value of given key, or undefined if not found
 *
 * @param {$trie} root
 * @param {string} key
 * @returns {*}
 */
function trie_get(root, key) {
  if (key === '$') THROW('Invalid key -- special symbol; $');
  key = String(key); // or key = key + ''; ?
  return _trie_get(root, key, 0, key.length);
}
function _trie_get(branch, str, index, len) {
  if (index >= len) return branch.$;
  let c = str.charCodeAt(index);
  let o = branch[c];
  if (!o) return undefined;
  return _trie_get(o, str, index + 1, len);
}

// BODY_STOP

export {
  trie_add,
  trie_create,
  trie_get,
  trie_has,
};
