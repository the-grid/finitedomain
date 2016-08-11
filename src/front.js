// This class represents the "search front", manually maintained in a buffer.
// In depth first search the front can be represented in a linear array that
// continuously grows and shrinks. Because it only needs to maintain the
// previous branch from which was branched for every step of the way.
// Grow when branching, shrink when backtracking.
// The goal of this class is to reduce pressure on the GC. It replaces a
// model where part of these branches were maintained in their own arrays.
// The model is simply a buffer with nodes, each node starts with a cell
// that represents its size and then that many cells. During construction
// a node may already have values while its length is not updated.
// The nodes can only be reconstructed by walking from front to back, like
// a singly linked list. Assuming, of course, the node lengths are properly
// set.

import {
  ASSERT,
  THROW,
} from './helpers';

// BODY_START

const FRONT_DEFAULT_SIZE = 100;
const FRONT_FIRST_NODE_OFFSET = 0;

/**
 * @param {number} [size]
 * @returns {$front}
 */
function front_create(size) {
  ASSERT(FRONT_DEFAULT_SIZE > 0, 'build check');
  let front = {
    _class: '$front',
    lastNodeIndex: 0,
    buffer: new Uint16Array(size || FRONT_DEFAULT_SIZE),
  };

  ASSERT(!void (front._nodes = 0)); // total added nodes, not total nodes in model because we cant know this
  ASSERT(!void (front._grows = '[' + (size || FRONT_DEFAULT_SIZE) + ']'));

  return front;
}

/**
 * Moves the node pointer forward. Ensures the buffer has
 * at least as much space to fit the entire previous node
 * but does not copy/clone it. It's length starts at zero..
 *
 * @param {$front} front
 * @returns {number} the new nodeIndex
 */
function front_addNode(front) {
  ASSERT(front._class === '$front');

  ASSERT(!void (++front._nodes));
  //console.log('front_addNode');
  let lastOffset = front.lastNodeIndex;
  let lastLen = front.buffer[lastOffset];
  if (!lastLen && lastOffset !== FRONT_FIRST_NODE_OFFSET) THROW('E_LAST_NODE_EMPTY'); // search should end if a list is empty so a node after an empty lis is an error. exception: first space.
  let newOffset = lastOffset + 1 + lastLen; // +1 = cell containing length
  front.lastNodeIndex = newOffset;

  let buf = front.buffer;
  let bufLen = buf.length;
  let requiredLen = newOffset + 1 + lastLen;
  if (requiredLen >= bufLen) {
    front_grow(front, Math.floor(Math.max(requiredLen, bufLen + 1, bufLen * 1.1)));
  }
  return newOffset;
}

/**
 * Grow the buffer of the front to given size. Will simply
 * replace the internal buffer with a new buffer and copy
 * the old buffer into it.
 *
 * @param {$front} front
 * @param {number} size
 */
function front_grow(front, size) {
  ASSERT(front._class === '$front');
  ASSERT(typeof size === 'number');
  ASSERT(size > front.buffer.length, 'buffer should only grow in our model');

  ASSERT(!void (front._grows += ' ' + size));
  let oldBuf = front.buffer;
  front.buffer = new Uint16Array(size);
  //console.log('growing from '+bufLen+' to '+buf.length)
  front.buffer.set(oldBuf);
}

/**
 * Returns the size of given node. This size excludes the size of the cell
 * that maintains the size, since the caller most likely doesn't care about
 * that internal artifact.
 *
 * @param {$front} front
 * @param {number} nodeIndex
 */
function front_getSizeOf(front, nodeIndex) {
  ASSERT(front._class === '$front');
  ASSERT(typeof nodeIndex === 'number');

  return _front_getSizeOf(front.buffer, nodeIndex);
}
/**
 * Same as front_getSizeOf except it expects the buffer immediately.
 *
 * @param {TypedArray} buffer
 * @param {number} nodeIndex
 */
function _front_getSizeOf(buffer, nodeIndex) {
  ASSERT(!buffer._class);
  ASSERT(nodeIndex >= 0, 'node should be >=0 (was ' + nodeIndex + ')');
  ASSERT(nodeIndex < buffer.length);
  ASSERT(nodeIndex + buffer[nodeIndex] < buffer.length);

  return buffer[nodeIndex];
}

/**
 * Set the size of given node to length. This length should
 * not include the cell size for the length value (so just the
 * number of elements that the node contains)..
 *
 * @param {$front} front
 * @param {number} nodeIndex
 * @param {number} length
 */
function front_setSizeOf(front, nodeIndex, length) {
  ASSERT(front._class === '$front');

  return _front_setSizeOf(front.buffer, nodeIndex, length);
}
/**
 * Same as front_setSizeOf except it expects the buffer immediately.
 *
 * @param {TypedArray} buffer
 * @param {number} nodeIndex
 */
function _front_setSizeOf(buffer, nodeIndex, length) {
  ASSERT(!buffer._class);
  ASSERT(typeof nodeIndex === 'number');
  ASSERT(typeof length === 'number');
  ASSERT(nodeIndex + 1 + length <= buffer.length, 'NODE_SHOULD_END_INSIDE_BUFFER [' + nodeIndex + ',' + length + ',' + buffer.length + ']');

  buffer[nodeIndex] = length;
}

/**
 * Add a value to the front. Value is inserted at given
 * cell offset wihch is relative to given node offset.
 * Only for the first node this operation may exceed the
 * size of the buffer. In that case the buffer is grown.
 * That is also the reason there is no _front_addCell with
 * buffer argument; too dangerous to make mistakes by
 * caching the buffer.
 * If the buffer is exceeded otherwise an error is thrown.
 * (Because each node in the front should only shrink so
 * there's no need for nodes to be bigger than their predecessor)
 *
 * @param {$front} front
 * @param {number} nodeIndex
 * @param {number} cellOffset
 * @param {number} value
 */
function front_addCell(front, nodeIndex, cellOffset, value) {
  ASSERT(front._class === '$front');
  ASSERT(typeof nodeIndex === 'number');
  ASSERT(typeof cellOffset === 'number');
  ASSERT(typeof value === 'number');
  // dont abstract this. when adding cells or nodes the buffer should not be cached!

  let bufLen = front.buffer.length;
  let cellIndex = nodeIndex + 1 + cellOffset;
  // initial size of front may not be big enough to hold all indexes. other nodes should be.
  if (nodeIndex === FRONT_FIRST_NODE_OFFSET && cellIndex >= bufLen) {
    front_grow(front, Math.floor(Math.max(cellIndex + 1, bufLen * 1.1)));
  }
  ASSERT(cellIndex < front.buffer.length, 'cellIndex should be within buffer');
  front.buffer[cellIndex] = value;
}

/**
 * Return value of cell relative to given node.
 *
 * @param {$front} front
 * @param {number} nodeIndex
 * @param {number} cellOffset
 * @returns {number}
 */
function front_getCell(front, nodeIndex, cellOffset) {
  return _front_getCell(front.buffer, nodeIndex, cellOffset);
}
/**
 * Same as front_getCell except it expects the buffer immediately.
 *
 * @param {TypedArray} buffer
 * @param {number} nodeIndex
 */
function _front_getCell(buf, nodeIndex, cellOffset) {
  ASSERT(typeof nodeIndex === 'number', 'node must be number');
  ASSERT(typeof cellOffset === 'number', 'cell must be number');
  ASSERT(nodeIndex >= 0 && nodeIndex <= buf.length, 'node must not be OOB');
  ASSERT(cellOffset >= 0, 'cell must not be OOB');
  ASSERT(nodeIndex + 1 + cellOffset < buf.length, 'target cell should be within bounds');

  return buf[nodeIndex + 1 + cellOffset];
}

/**
 * @param {$front} front
 * @param {Object} [options]
 * @property {boolean} options.buf If true will do a pretty and raw print of the buffer
 * @property {boolean} options.bufPretty If true will do a pretty print of the buffer
 * @property {boolean} options.bufRaw If true will do a raw print of the buffer
 */
function _front_debug(front, options = {}) {
  console.log('##');
  console.log('Unsolved Vars Front:');
  console.log('Cells:', front.buffer.length);
  if (front._nodes !== 'undefined') console.log('Nodes:', front._nodes, '(added at some point, not currently containing)');
  if (front._grows !== 'undefined') console.log('Grows:', front._grows);
  console.log('');
  if (options.bufPretty || options.buf) {
    let buf = front.buffer;
    let next = 0;
    let nodes = 0;
    while (next <= front.lastNodeIndex) {
      ++nodes;
      let len = buf[next++];
      let s = next + ' [' + len + ']:';
      for (let i = 0; i < len; ++i) {
        s += ' ' + buf[next + i];
      }
      next += len;
      console.log(s);
    }
    console.log('Current node count:', nodes);
  }
  if (options.bufRaw || options.buf) {
    console.log('Raw buffer (' + front.buffer.length + '): [' + [].join.call(front.buffer, ',') + ']');
  }
  console.log('##');
}

// BODY_STOP

export {
  FRONT_DEFAULT_SIZE,
  FRONT_FIRST_NODE_OFFSET,

  front_addCell,
  front_addNode,
  front_create,
  _front_debug,
  front_getCell,
  _front_getCell,
  front_getSizeOf,
  _front_getSizeOf,
  front_setSizeOf,
  _front_setSizeOf,
};

