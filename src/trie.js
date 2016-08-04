// NOTE: THIS IS NOT A GENERIC TRIE IMPLEMENTATION
// It's specifically geared towards the use within finitedomain
// Input strings are assumed to be limited to ascii 32-132

import {
  ASSERT,
  THROW,
} from './helpers';

// BODY_START

const TRIE_ROOT_OFFSET = 0;
const TRIE_BUCKET_COUNT = 10; // 10 digits
const TRIE_NODE_SIZE = TRIE_BUCKET_COUNT + 1; // inc value

const TRIE_INITIAL_SIZE = 16 * 1024;
const TRIE_MINIMAL_GROWTH = 4 * 1024;

const TRIE_KEY_NOT_FOUND = -1;

// every trie node needs space for 10 jumps + 1 leaf value (must be capable of containing `size(Trie)-1`) so initially 11 bytes, later 12 bytes and then 22 bytes once the number of nodes exceeds 255

/**
 * Create a new trie and, optionally, initialize it
 * with given values as keys and their index as value.
 * Check `trie_add` for assumed key composition restrictions
 *
 * @param {string[]} [valuesByIndex] If exists, adds all values in array as keys, index as values
 * @param {number} [initialLength] Hint to help control memory consumption for large/small tries
 * @param {number} [initialBitsize] Hint to set bitsize explicitly. One of: 8 16 32 64
 * @returns {$trie}
 */
function trie_create(valuesByIndex, initialLength, initialBitsize) {
  let size = (initialLength | 0) || TRIE_INITIAL_SIZE;
  if (!size) THROW('fixme'); // blabla it's possible the constant is not yet initialized due to minification. dont initialize a trie in module global space
  let bits = (initialBitsize | 0) || trie_getValueBitsize(size);
  let buf = trie_createBuffer(size, bits);

  // have to use a wrapper because the buffer ref may change when it grows
  // otherwise we could just store the meta data inside the buffer. but at
  // least this is easier to read :)
  let trie = {
    _class: '$trie',
    buffer: buf,
    bits: bits, // 8 16 32 (64?)
    lastNode: TRIE_ROOT_OFFSET, // pointer to last node in the buffer
    count: 0, // number of keys in the Trie

    // __REMOVE_BELOW_FOR_DIST__
    // debug stats... any use should be wrapped in ASSERT so that it's use gets removed in a dist
    _mallocs: '' + buf.length, // malloc steps in a string
    _adds: 0, // number of trie_add calls
    _addSteps: 0, // sum of steps taken in all trie_add calls
    _hass: 0, // number of trie_has calls
    _gets: 0, // number of trie_get calls (and also contains has)
    _getSteps: 0, // sum of steps for all gets on this trie
    // __REMOVE_ABOVE_FOR_DIST__
  };

  if (valuesByIndex) {
    for (let i = 0, n = valuesByIndex.length; i < n; ++i) {
      trie_add(trie, valuesByIndex[i], i);
    }
  }

  return trie;
}

/**
 * Create a buffer
 *
 * @param {number} size Length of the buffer
 * @param {number} bits One of: 8 16 32 64
 * @returns {TypedArray}
 */
function trie_createBuffer(size, bits) {
  switch (bits) {
    case 8:
      return new Uint8Array(size);
    case 16:
      return new Uint16Array(size);
    case 32:
      return new Uint32Array(size);
    case 64:
      return new Float64Array(size); // let's hope not ;)
  }
  THROW('Unsupported bit size');
}

/**
 * Reserve a part of the Trie memory to represent a node in the Trie.
 *
 * In this particular implementation nodes are of fixed width. It's
 * a field of 10 address cells and one value cell.
 *
 * Address cells point to other nodes. If zero, there is none (because
 * that would be the root node) and a search ends in not found.
 *
 * Value cells that are zero (default) are also "not found".
 *
 * @returns {Uint16Array}
 */
function trie_addNode(trie) {
  let newNodePtr = trie.lastNode + TRIE_NODE_SIZE;
  trie.lastNode = newNodePtr;
  // technically the `while` is valid (instead of an `if`) but only
  // if the buffer could grow by a smaller amount than the node size...
  while (newNodePtr + TRIE_NODE_SIZE >= trie.buffer.length) trie_grow(trie);
  return newNodePtr;
}

/**
 * Allocate more size for this Trie
 *
 * Basically creates a new buffer with a larger size and then copies
 * the current buffer into it. If the new size exceeds the max size
 * of the current type (16bit/32bit) then the buffer is converted to
 * a bigger bit size automagically.
 * The trie buffer reference will be updated with the new buffer
 *
 * @param {$trie} trie
 */
function trie_grow(trie) {
  let len = trie.buffer.length;
  let newSize = ~~(len * 1.1); // grow by 10% (an arbitrary number)
  if (len + TRIE_MINIMAL_GROWTH > newSize) newSize = TRIE_MINIMAL_GROWTH + len;

  trie_malloc(trie, newSize);
}

/**
 * Allocate space for a Trie and copy given Trie to it.
 * Will grow bitsize if required, but never shrink it.
 *
 * @param {$trie} trie
 * @param {number} size
 */
function trie_malloc(trie, size) {
  // make sure addressing fits
  let newBits = trie_getValueBitsize(size);

  // dont shrink bit size even if length would allow it; "large" values may require it
  // (our tries dont need to shrink)
  trie.bits = Math.max(trie.bits, newBits);

  let nbuf = trie_createBuffer(size, trie.bits);
  nbuf.set(trie.buffer, 0);
  ASSERT(trie._mallocs += ' ' + nbuf.length);
  trie.buffer = nbuf;
}

/**
 * Return the cell width in bits to fit given value.
 * For example, numbers below 256 can be represented in
 * 8 bits but numbers above it will need at least 16 bits.
 * Max is 64 but you can't pass on larger numbers in JS, anyways :)
 *
 * @param {number} value
 * @returns {number}
 */
function trie_getValueBitsize(value) {
  if (value < 0x100) return 8;
  else if (value < 0x10000) return 16;
  else if (value < 0x100000000) return 32;
  else return 64;
}

/**
 * Add a key/value pair
 *
 * Note: keys and values are of limited structure
 *
 * The key must be a string of ascii in range of 32-131.
 * This key is hashed by turning each character into its
 * ascii ordinal value, stringifying it padded with zero,
 * and hashing each of the two resulting digits. This way
 * we can guarantee that each node in the Trie only
 * requires 10 places (one for each digit) plus a value.
 * That makes reads super fast.
 *
 * @param {$trie} trie
 * @param {string} key
 * @param {number} value Any unsigned 32bit-1 value
 * @returns {number} previous value, or -1 if there wasn't any
 */
function trie_add(trie, key, value) {
  ASSERT(++trie._adds);
  trie_ensureValueFits(trie, value);
  return _trie_add(trie, TRIE_ROOT_OFFSET, key, 0, key.length, value);
}
/**
 * Recursively find the place to add the key. If
 * the trail runs cold, pave it. Clobbers existing
 * values (though in our implementation that current
 * shouldn't really happen...)
 *
 * @param {$trie} trie
 * @param {number} offset
 * @param {string} key
 * @param {number} index Current index of the key being walked
 * @param {number} len Cache of key.length
 * @param {number} value Any unsigned 32bit-1 value
 * @returns {number} the old value, or not found
 */
function _trie_add(trie, offset, key, index, len, value) {
  ASSERT(++trie._addSteps);

  ASSERT(offset >= 0, 'OFFSET_UNSIGNED');
  ASSERT(typeof key === 'string', 'STRING_KEY');
  ASSERT(index >= 0, 'INDEX_UNSIGNED');
  ASSERT(key.length === len, 'KEY_LEN');
  ASSERT(value >= 0, 'VALUE_UNSIGNED');

  // dont create next path part if it would create a leaf node
  if (index >= len) {
    let buf = trie.buffer;
    let valuePtr = offset + TRIE_BUCKET_COUNT;
    let curValue = trie.buffer[valuePtr];
    if (!curValue) ++trie.count;
    buf[valuePtr] = value + 1; // 0 is reserved to mean "unused"
    return curValue - 1;
  }

  let c = key.charCodeAt(index) - 32; // allow all asciis 31 < c < 130 encoded as stringified double digits

  offset = _trie_pavePath(trie, offset, c % 10);
  offset = _trie_pavePath(trie, offset, Math.floor(c / 10));

  return _trie_add(trie, offset, key, index + 1, len, value);
}

/**
 * Add a key/value pair
 *
 * This adds a value under a key that is a number. This
 * way reads and writes take `ceil(log(n)/log(10))` steps.
 * Eg. as many steps as digits in the decimal number.
 *
 * @param {$trie} trie
 * @param {number} key Assumes an unsigned int
 * @param {number} value Any unsigned 32bit-1 value
 * @returns {number} previous value, or -1 if there wasn't any
 */
function trie_addNum(trie, key, value) {
  ASSERT(++trie._adds);
  trie_ensureValueFits(trie, value);
  return _trie_addNum(trie, TRIE_ROOT_OFFSET, key + 1, value);
}
/**
 * Recursively find the place to add the key. If
 * the trail runs cold, pave it. Clobbers existing
 * values (though in our implementation that current
 * shouldn't really happen...)
 *
 * @param {$trie} trie
 * @param {number} offset
 * @param {number} key Assumes an unsigned int >0
 * @param {number} value Any unsigned 32bit-1 value
 * @returns {number} the old value, or not found
 */
function _trie_addNum(trie, offset, key, value) {
  ASSERT(++trie._addSteps);

  ASSERT(offset >= 0, 'OFFSET_UNSIGNED');
  ASSERT(typeof key === 'number', 'NUMBER_KEY');
  ASSERT(value >= 0, 'VALUE_UNSIGNED');

  if (key === 0) {
    let buf = trie.buffer;
    let valuePtr = offset + TRIE_BUCKET_COUNT;
    let curValue = trie.buffer[valuePtr];
    if (!curValue) ++trie.count;
    buf[valuePtr] = value + 1; // 0 is reserved to mean "unused"
    return curValue - 1;
  }

  offset = _trie_pavePath(trie, offset, key % 10);
  key = Math.floor(key / 10);

  return _trie_addNum(trie, offset, key, value);
}

/**
 * Make sure the Trie can hold a value of given manitude.
 * If the current bitsize of the trie is too small it will
 * grow the buffer to accomodate the larger size.
 *
 * @param {$trie} trie
 * @param {number} value
 */
function trie_ensureValueFits(trie, value) {
  let bitsNeeded = trie_getValueBitsize(value);
  if (bitsNeeded > trie.bits) {
    trie.bits = bitsNeeded;
    trie_malloc(trie, trie.buffer.length);
  }
}

/**
 * One step of writing a value. Offset should be a node, if
 * the digit has no address yet create it. If a node needs
 * to be created the buffer may be grown to fit the new node.
 * It will return the pointer of the (possibly new) next
 * node for given digit.
 *
 * @param {$trie} trie
 * @param {number} offset Start of a node
 * @param {number} digit Zero through nine
 * @returns {number} new address
 */
function _trie_pavePath(trie, offset, digit) {
  offset += digit;
  let ptr = trie.buffer[offset];
  if (!ptr) {
    ptr = trie_addNode(trie);
    trie.buffer[offset] = ptr;
  }
  return ptr;
}

/**
 * Find the value for given key. See trie_add for more details.
 *
 * @param {$trie} trie
 * @param {string} key
 * @returns {number} -1 if not found, >= 0 otherwise
 */
function trie_get(trie, key) {
  ASSERT(++trie._gets);
  return _trie_get(trie, TRIE_ROOT_OFFSET, key, 0, key.length);
}
/**
 * Recursive function to search for key
 *
 * @param {$trie} trie
 * @param {number} offset Start of a node
 * @param {string} key
 * @param {number} index Current index of the key being walked
 * @param {number} len Cache of key.length
 * @returns {number} -1 if not found or >= 0 otherwise
 */
function _trie_get(trie, offset, key, index, len) {
  ASSERT(++trie._getSteps);

  ASSERT(offset >= 0, 'OFFSET_UNSIGNED');
  ASSERT(typeof key === 'string', 'STRING_KEY');
  ASSERT(index >= 0, 'INDEX_UNSIGNED');
  ASSERT(key.length === len, 'KEY_LEN');

  let buf = trie.buffer;

  if (index >= len) {
    let valuePtr = offset + TRIE_BUCKET_COUNT;
    return buf[valuePtr] - 1;
  }

  let c = key.charCodeAt(index) - 32; // allow all asciis 31 < c < 130 encoded as stringified double digits

  offset = buf[offset + (c % 10)];
  if (!offset) return TRIE_KEY_NOT_FOUND;

  offset = buf[offset + Math.floor(c / 10)];
  if (!offset) return TRIE_KEY_NOT_FOUND;

  return _trie_get(trie, offset, key, index + 1, len);
}
/**
 * See trie_get for more details
 *
 * @param {$trie} trie
 * @param {string} key
 * @returns {boolean}
 */
function trie_has(trie, key) {
  ASSERT(++trie._hass);
  return trie_get(trie, key) !== TRIE_KEY_NOT_FOUND;
}

/**
 * Find the value for given number key.
 * See trie_addNum for more details.
 *
 * @param {$trie} trie
 * @param {number} key Assumed to be an unsigned int >=0
 * @returns {number} -1 if not found, >= 0 otherwise
 */
function trie_getNum(trie, key) {
  ASSERT(++trie._gets);
  return _trie_getNum(trie, TRIE_ROOT_OFFSET, key + 1);
}
/**
 * Recursive function to search for number key
 *
 * @param {$trie} trie
 * @param {number} offset Start of a node
 * @param {number} key Assumed to be an unsigned int >=0
 * @returns {number} -1 if not found or >= 0 otherwise
 */
function _trie_getNum(trie, offset, key) {
  ASSERT(++trie._getSteps);

  ASSERT(offset >= 0, 'OFFSET_UNSIGNED');
  ASSERT(typeof key === 'number', 'NUMBER_KEY');

  let buf = trie.buffer;

  if (key === 0) {
    let valuePtr = offset + TRIE_BUCKET_COUNT;
    return buf[valuePtr] - 1;
  }

  offset = buf[offset + (key % 10)];
  if (!offset) return TRIE_KEY_NOT_FOUND;

  key = Math.floor(key / 10);

  return _trie_getNum(trie, offset, key);
}
/**
 * See trie_getNum for more details
 *
 * @param {$trie} trie
 * @param {number} key Assumed to be unsigned int >= 0
 * @returns {boolean}
 */
function trie_hasNum(trie, key) {
  ASSERT(++trie._hass);
  return trie_getNum(trie, key) !== TRIE_KEY_NOT_FOUND;
}

/**
 * Human readable yay. Does not log, only returns a debug string.
 *
 * @param {$trie} trie
 * @param {boolean} [skipBuffer=false]
 * @returns {string}
 */
function _trie_debug(trie, skipBuffer) {
  /* eslint no-extend-native: "off" */
  let buf = trie.buffer;

  let lastNode = trie.lastNode;

  // patch some es6 stuff for debugging. note: dont do this in prod, it may slow stuff down.
  if (!String.prototype.padStart) {
    String.prototype.padStart = function(n, c) {
      let s = this;
      if (this.length < n) for (let i = 0; i < n - this.length; ++i) s = c + s;
      return s;
    };
  }
  if (!String.prototype.padEnd) {
    String.prototype.padEnd = function(n, c) {
      let s = this;
      if (this.length < n) for (let i = 0; i < n - this.length; ++i) s = s + c;
      return s;
    };
  }
  if (!Array.from) {
    Array.from = function(a) {
      return [].concat.call(a);
    };
  }
  // if one doesnt support them, they probably all dont.
  if (!Uint8Array.prototype.slice) {
    Uint8Array.prototype.slice = Uint16Array.prototype.slice = Uint32Array.prototype.slice = Float64Array.prototype.slice = Array.prototype.slice;
  }

  let pad = 20;
  let npad = 6;
  let s = '' +
    '\n' +
    '###\n' +
    'Key count:'.padEnd(pad, ' ') + trie.count + '\n' +
    'Node count:'.padEnd(pad, ' ') + ((lastNode / TRIE_NODE_SIZE) + 1) + ' (' + (((lastNode / TRIE_NODE_SIZE) + 1) / trie.count) + ' nodes per key)\n' +
    'Buffer length:'.padEnd(pad, ' ') + buf.length + '\n' +
    'Bit size:'.padEnd(pad, ' ') + trie.bits + '\n' +
    'Node len:'.padEnd(pad, ' ') + TRIE_NODE_SIZE + '\n' +
    'Node size:'.padEnd(pad, ' ') + TRIE_NODE_SIZE + '\n' +
    'Last Node:'.padEnd(pad, ' ') + lastNode + '\n' +
    'Unused space:'.padEnd(pad, ' ') + (buf.length - (lastNode + TRIE_NODE_SIZE)) + '\n' +

    // __REMOVE_BELOW_FOR_DIST__
    'Mallocs:'.padEnd(pad, ' ') + trie._mallocs + '\n' +
    'trie_adds:'.padEnd(pad, ' ') + trie._adds + '\n' +
    'Avg key distance:'.padEnd(pad, ' ') + (trie._addSteps / trie._adds) + '\n' +
    'trie_hass:'.padEnd(pad, ' ') + trie._hass + '\n' +
    'trie_gets:'.padEnd(pad, ' ') + trie._gets + '\n' +
    'Avg get distance:'.padEnd(pad, ' ') + trie._getSteps + ' -> ' + (trie._getSteps / trie._gets) + '\n' +
    // __REMOVE_ABOVE_FOR_DIST__

    '\n';

  if (!skipBuffer) {
    s += 'ptr \\ key= 0      1      2      3      4      5      6      7      8      9  ->  value\n\n';

    let ptr = TRIE_ROOT_OFFSET;
    while (ptr <= lastNode) {
      s += String(ptr).padStart(npad, ' ') + ': ' + Array.from(buf.slice(ptr, ptr + TRIE_NODE_SIZE - 1)).map(n => String(n).padStart(npad, ' ')).join(', ') + '  ->  ' + String(buf[ptr + TRIE_NODE_SIZE - 1]).padStart(npad, ' ') + '\n';
      ptr += TRIE_NODE_SIZE;
    }
  }

  s += '###\n\n';

  return s;
}

// BODY_STOP

export {
  TRIE_KEY_NOT_FOUND,

  trie_add,
  trie_addNum,
  trie_create,
  _trie_debug,
  trie_get,
  trie_getNum,
  trie_has,
  trie_hasNum,
};
