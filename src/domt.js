// domt: domain front. list of domains in the dfs search tree
// the name is picked such that it makes for a unique string to search on

// each node represent the var domains for one space
// each node is: [node cell size n][domain count m][last domain addr][<jump table> to domain offsets [m x relative distance to domain in cells] **][m x domain [element count p][p x element]]
// - cell count: how many cells does this node span in total? makes it easy to jump to the next node quickly
// - domain count: how many domains are there in this jump table? probably static and therefor redundant but let's use it for now. we can always kill it off later
// - <jump table> is special because its values can have special meaning if certain high bits are set:
//   - 31st bit set: value is a numdom, xor off the 31t bit to get the domain
//   - 30th bit set: domain is solved, xor off the 30th bit to get the solved value
//   - 29th bit set: domain was changed since last check. if not set, simply skip the isSolved checks
//   - if completely zero then the domain is rejected
//   - otherwise: value should be a relative jump from the node offset to to the index of the domain of the current (jump table) index.
// - domain: pairs of <lo,hi>. not solved (because that'd only use the jump table) and not numdom (also jump table)

import {
  NO_SUCH_VALUE,
  SMALL_MAX_NUM,
  SUB,
  SUP,

  ASSERT,
  THROW,
} from './helpers';

import {
  domain_arrToNumstr,
  domain_createValue,
  domain_max,
  domain_min,
  domain_size,
  domain_toArr,
  domain_toNumstr,
} from './domain';
// BODY_START

const DOMT_DEFAULT_SIZE = 500 * 1024; // should be dynamic, based on heuristics that use the var count as a base line
const DOMT_DEFAULT_GROWTH = 1.1;
const DOMT_DEFAULT_FIRST_NODE = 0;

const DOMT_NODE_CELL_COUNT = 0;
const DOMT_VAR_COUNT = 1;
const DOMT_JUMP_TABLE = 2;
const DOMT_DOMAIN_HEADER_OFFSET = 0; // to support legibility for accessing the domain length after a "jump"
const DOMT_DOMAIN_LENGTH_OFFSET = 0; // relative to domain header
const DOMT_DOMAIN_BODY_OFFSET = 1; // relative to domain header

ASSERT(DOMT_DOMAIN_HEADER_OFFSET <= DOMT_DOMAIN_LENGTH_OFFSET);
ASSERT(DOMT_DOMAIN_LENGTH_OFFSET < DOMT_DOMAIN_BODY_OFFSET);
ASSERT(DOMT_DOMAIN_HEADER_OFFSET < DOMT_DOMAIN_BODY_OFFSET);

const DOMT_IS_NUMDOM = 1 << 31 >>> 0;
const DOMT_IS_SOLVED = 1 << 30;
const DOMT_HAS_CHANGED = 1 << 29;
const DOMT_MAX_DOM_COUNT = 1 << 24; // i hope we dont get even close to this...

/**
 * Create a new domt structure
 *
 * @param {number} domainCount Number of variables to reserve space for
 * @returns {$domt}
 */
function domt_create(domainCount) {
  ASSERT(isFinite(domainCount), 'expecting domain count');

  if (DOMT_JUMP_TABLE + domainCount > DOMT_DEFAULT_SIZE) THROW('no way (or maybe var count exceeded init size?)');
  let buf = new Uint32Array(DOMT_DEFAULT_SIZE);
  buf[DOMT_DEFAULT_FIRST_NODE + DOMT_NODE_CELL_COUNT] = domainCount + 2; // header + jump table
  buf[DOMT_DEFAULT_FIRST_NODE + DOMT_VAR_COUNT] = domainCount;

  // the rest must be initialized elsewhere... atm
  let domt = {
    _class: '$domt',
    lastNodeIndex: DOMT_DEFAULT_FIRST_NODE,
    buffer: buf,
  };

  ASSERT(!void (domt._maxNodeIndex = DOMT_DEFAULT_FIRST_NODE));
  ASSERT(!void (domt._maxCellSize = 0));
  ASSERT(!void (domt._grows = '[init=' + domt.buffer.length + ']'));
  ASSERT(!void (domt._dupes = 0), 'node duplications');
  ASSERT(!void (domt._replaced = 0), 'domains replaced');

  return domt;
}

/**
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @returns {number}
 */
function domt_sizeOf(domt, nodeIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');

  return domt.buffer[nodeIndex + DOMT_NODE_CELL_COUNT];
}

/**
 * Grow the internal buffer of given domt if the
 * requested size exceeds the current buffer size.
 *
 * @param {$domt} domt
 * @param {number} askSize
 */
function domt_growIf(domt, askSize) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(askSize), 'expecting askSize');

  if (askSize > 256 * 1024 * 1024) THROW('refused to allocated >1GB');

  let oldBuf = domt.buffer;
  let oldLen = oldBuf.length;
  if (askSize > oldLen) {
    let newLen = Math.floor(Math.max(1, askSize, oldLen * DOMT_DEFAULT_GROWTH));
    console.log('growing from', oldLen, 'to', newLen);
    domt.buffer = new Uint32Array(newLen);
    ASSERT(!void (domt._grows += ' ' + newLen));
    domt.buffer.set(oldBuf);
    return true;
  }
  return false;
}

/**
 * Initialize the domain of a var index in the first node
 *
 * @param {$domt} domt
 * @param {number} varIndex
 * @param {$domain} domain
 */
function domt_initDomain(domt, varIndex, domain) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(varIndex), 'expecting var index');

  let buf = domt.buffer;

  let arrdom = domain_toArr(domain);
  let anydom = domain_toNumstr(domain);

  if (arrdom.length === 2 && arrdom[0] === arrdom[1]) {
    buf[DOMT_DEFAULT_FIRST_NODE + DOMT_JUMP_TABLE + varIndex] = DOMT_IS_SOLVED | arrdom[0];
  } else if (typeof anydom === 'number') {
    // anydom may be EMPTY, but that should still work here. search just wont even start if that's the case.
    buf[DOMT_DEFAULT_FIRST_NODE + DOMT_JUMP_TABLE + varIndex] = DOMT_IS_NUMDOM | anydom;
  } else {
    ASSERT(arrdom.length && anydom, 'not expecting rejects here');

    // add domain after jump table and maybe other domains that already follow it
    let nodeSizeBefore = buf[DOMT_DEFAULT_FIRST_NODE + DOMT_NODE_CELL_COUNT];
    let nodeSizeAfter = nodeSizeBefore + DOMT_DOMAIN_BODY_OFFSET + arrdom.length;

    if (domt_growIf(domt, DOMT_DEFAULT_FIRST_NODE + nodeSizeAfter)) {
      buf = domt.buffer;
    }

    buf[DOMT_DEFAULT_FIRST_NODE + DOMT_JUMP_TABLE + varIndex] = nodeSizeBefore; // update jump table
    buf[DOMT_DEFAULT_FIRST_NODE + DOMT_NODE_CELL_COUNT] = nodeSizeAfter; // update node size
    buf[DOMT_DEFAULT_FIRST_NODE + nodeSizeBefore + DOMT_DOMAIN_LENGTH_OFFSET] = arrdom.length; // set length of this buffer
    // now stream domain into the buffer
    let domainOffset = DOMT_DEFAULT_FIRST_NODE + nodeSizeBefore + DOMT_DOMAIN_BODY_OFFSET;
    for (let i = 0, len = arrdom.length; i < len; ++i) {
      buf[domainOffset + i] = arrdom[i];
    }
  }
}

/**
 * Duplicate the (currently) last node of given domt into a new new
 * node of that same domt. Copies domains as is, no cleanup.
 *
 * @param {$domt} domt
 */
function domt_duplicateNode(domt) {
  ASSERT(!void (++domt._dupes));
  domt_verifyNode(domt, domt.lastNodeIndex, 'domt_duplicateNode#before');
  ASSERT(domt._class === '$domt', 'expecting domt');

  let buf = domt.buffer;

  let nodeIndexSrc = domt.lastNodeIndex;
  let cellCountSrc = buf[nodeIndexSrc + DOMT_NODE_CELL_COUNT];
  let nodeIndexDst = nodeIndexSrc + cellCountSrc;

  domt.lastNodeIndex = nodeIndexDst;
  ASSERT(!void (domt._maxNodeIndex = Math.max(domt._maxNodeIndex, nodeIndexDst)));
  ASSERT(!void (domt._maxCellSize = Math.max(domt._maxCellSize, cellCountSrc)));

  if (domt_growIf(domt, nodeIndexDst + cellCountSrc)) {
    buf = domt.buffer;
  }

  let varCount = buf[nodeIndexSrc + DOMT_VAR_COUNT];
  buf[nodeIndexDst + DOMT_VAR_COUNT] = varCount;
  let nextDst$jmp = DOMT_JUMP_TABLE + varCount; // node header + jump table. add domain space below if really used.

  ASSERT(varCount < 0xfffff, 'sanity check, it is unlikely we will ever use more than 0xfffff (>1M) vars...');
  for (let varIndex = 0; varIndex < varCount; ++varIndex) {
    let $jmp = buf[nodeIndexSrc + DOMT_JUMP_TABLE + varIndex];
    if ($jmp & DOMT_IS_NUMDOM) {
      ASSERT($jmp ^ DOMT_IS_NUMDOM, 'nodes with EMPTY should reject, so cloning such one is probably a bug');
      buf[nodeIndexDst + DOMT_JUMP_TABLE + varIndex] = $jmp;
    } else if ($jmp & DOMT_IS_SOLVED) {
      buf[nodeIndexDst + DOMT_JUMP_TABLE + varIndex] = $jmp;
    } else {
      ASSERT(($jmp & (DOMT_IS_NUMDOM | DOMT_IS_SOLVED)) === 0, 'not expecting $jmp to be numdom or solved');
      // add the domain at the end of this node (should be the last node in the domt buffer).
      buf[nodeIndexDst + DOMT_JUMP_TABLE + varIndex] = nextDst$jmp;
      // $jmp is an addr on src. copy it to dst starting at nodeIndex+cellCountDst (dont forget the domain length)
      let domainAddrSrc = nodeIndexSrc + $jmp;
      let domainAddrDst = nodeIndexDst + nextDst$jmp;

      let dlen = buf[domainAddrSrc + DOMT_DOMAIN_LENGTH_OFFSET];
      ASSERT(dlen >= 2, 'domains cant be empty here', dlen);
      ASSERT(dlen % 2 === 0, 'domains must still be pairs', dlen);
      ASSERT(dlen < SUP / 2, 'domain has an upper limit of how many pairs it can contain (found ' + dlen + ')');

      if (domt_growIf(domt, domainAddrDst + DOMT_DOMAIN_BODY_OFFSET + dlen)) {
        buf = domt.buffer;
      }

      buf[domainAddrDst + DOMT_DOMAIN_LENGTH_OFFSET] = dlen;
      for (let j = 0; j < dlen; ++j) {
        buf[domainAddrDst + DOMT_DOMAIN_BODY_OFFSET + j] = buf[domainAddrSrc + DOMT_DOMAIN_BODY_OFFSET + j];
      }
      // add additional space to the cell count
      nextDst$jmp += 1 + dlen; // move pointer to after current domain
    }
  }
  buf[nodeIndexDst + DOMT_NODE_CELL_COUNT] = nextDst$jmp;
  ASSERT(domt.lastNodeIndex === nodeIndexDst, 'should have written this by now');
  domt_verifyNode(domt, domt.lastNodeIndex, 'domt_duplicateNode#after');
}

/**
 * Replace domain of given var index in given node index with given domain.
 * Will optimize the domain if possible. Old domain is clobbered or orphaned.
 *
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @param {number} varIndex
 * @param {$domain} domain
 */
function domt_replaceDomain(domt, nodeIndex, varIndex, domain) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');
  ASSERT(isFinite(varIndex), 'expecting var index');
  ASSERT(!void (domt._replaced = (domt._replaced | 0) + 1), 'domains replaced');

  let buf = domt.buffer;

  let arrdom = domain_toArr(domain);
  let $jmp = buf[nodeIndex + DOMT_JUMP_TABLE + varIndex];

  if (arrdom.length === 2 && arrdom[0] === arrdom[1]) {
    buf[nodeIndex + DOMT_JUMP_TABLE + varIndex] = arrdom[0] | DOMT_IS_SOLVED;
  } else if (arrdom[arrdom.length - 1] <= SMALL_MAX_NUM) {
    ASSERT($jmp ^ DOMT_IS_NUMDOM, 'domains never grow, old domain was EMPTY, replacing it implies missing reject?');
    let numdom = domain_arrToNumstr(arrdom);
    ASSERT(isFinite(numdom));
    buf[nodeIndex + DOMT_JUMP_TABLE + varIndex] = numdom | DOMT_IS_NUMDOM;
  } else {
    // note: solved domains dont "unsolve". numdoms cant grow out of numdom
    // bounds. so we dont have to worry about that. however, a domain can get
    // more ranges ([0,10] -> [0,5,7,10]) which will take up more space. So
    // while we don't have to do "was this a jump table only value before?"
    // checks, we do have to check whether the previously allocated size
    // still suffices for the new size.

    // first check what the current length is of the domain. if the arr length
    // is equal or smaller just replace it and update the length. the unused
    // space is wasted temporarily. otherwise append the domain to the end of
    // the current domt and let the previous space rot away entirely. we'll
    // reclaim it later either way. jump table should be updated in that case.
    let domainAreaOffset = nodeIndex + $jmp + DOMT_DOMAIN_HEADER_OFFSET; // current location of domain contents

    let oldLen = buf[domainAreaOffset + DOMT_DOMAIN_LENGTH_OFFSET];
    let newLen = arrdom.length;
    if (newLen > oldLen) {
      let oldCellCount = buf[nodeIndex + DOMT_NODE_CELL_COUNT];
      // move the domain to a new area after the node. this node is considered to be
      // the last node in the domt so allocating space after it should be no problem.
      // and since we clobber it immediately we don't need to sanitize it first.
      domainAreaOffset = nodeIndex + oldCellCount;

      if (domt_growIf(domt, domainAreaOffset + DOMT_DOMAIN_BODY_OFFSET + newLen)) {
        buf = domt.buffer;
      }

      // expand node to include the new domain area
      buf[nodeIndex + DOMT_NODE_CELL_COUNT] = oldCellCount + DOMT_DOMAIN_BODY_OFFSET + newLen;
      // update the jump table with this new address (relative to nodeIndex!)
      buf[nodeIndex + DOMT_JUMP_TABLE + varIndex] = oldCellCount;
    } else {
    }
    // write the domain, may overwrite an old domain, may not, that's irrelevant now.
    buf[domainAreaOffset + DOMT_DOMAIN_LENGTH_OFFSET] = newLen;
    for (let i = 0, len = arrdom.length; i < len; ++i) {
      buf[domainAreaOffset + DOMT_DOMAIN_BODY_OFFSET + i] = arrdom[i];
    }
    // that should be it...
  }

  //domt_verifyNode(domt, nodeIndex, 'domt_replaceDomain');//domt, '+nodeIndex+', '+varIndex+', '+domain+' (['+arrdom+']) ' + buf.slice(0,30));
}

function domt_verifyNode(domt, nodeIndex, desc) {
  //_domt_debug(domt, true);

  let buf = domt.buffer;
  let lastNodeIndex = domt.lastNodeIndex;
  ASSERT(isFinite(lastNodeIndex) && lastNodeIndex >= 0, 'last node should be >= DOMT_DEFAULT_FIRST_NODE [' + lastNodeIndex + ']', desc);

  let cellCount = buf[nodeIndex + DOMT_NODE_CELL_COUNT];
  ASSERT(nodeIndex + cellCount < buf.length, 'node should fit in buffer', desc);
  let varCount = buf[nodeIndex + DOMT_VAR_COUNT];
  ASSERT(varCount < 10e5, 'we are unlikely to use more than 100k vars [' + varCount + ']', desc);

  //if (!varCount) console.log(desc + '; domt_verifyNode: found empty node', [].slice.call(domt.buffer, nodeIndex, nodeIndex + 10));
  //_domt_debug(domt, true);
  //if (!varCount) while (true) console.error(1);

  ASSERT(varCount > 0, 'we probably have more than no vars');
  ASSERT(cellCount >= DOMT_JUMP_TABLE + varCount, 'a node should at least cover the jump table [' + cellCount + ' >= ' + (DOMT_JUMP_TABLE + varCount) + ']', desc);

  let jta = nodeIndex + DOMT_JUMP_TABLE;
  for (let varIndex = 0; varIndex < varCount; ++varIndex) {
    let $jmp = buf[jta + varIndex];
    ASSERT(varIndex < varCount - 1 || $jmp !== DOMT_IS_NUMDOM, 'only the last node can have empty $jmp values');
    ASSERT($jmp, 'i dont think we have EMPTY domains without a numdom flags');
    if (!($jmp & (DOMT_IS_NUMDOM | DOMT_IS_SOLVED))) {
      ASSERT($jmp >= DOMT_JUMP_TABLE + varCount, 'domain should be outside of jump table [' + $jmp + ' >= ' + (DOMT_JUMP_TABLE + varCount) + ']', desc);
      ASSERT($jmp < cellCount, 'domain should be within node [' + $jmp + ',' + cellCount + ']', desc);

      let domainOffset = nodeIndex + $jmp;
      let len = buf[domainOffset + DOMT_DOMAIN_LENGTH_OFFSET];
      ASSERT(len % 2 === 0, 'should always be pairs, so even length [node=' + nodeIndex + ', var=' + varIndex + ', $jmp=' + $jmp + ', doffset=' + domainOffset + ', len=' + len + ']', desc);
      ASSERT(len < 1000, 'a domain with more than 500 pairs? this can be valid but is very rare in our system', desc);
      ASSERT(domainOffset + DOMT_DOMAIN_BODY_OFFSET + len <= nodeIndex + cellCount, 'domain should fit within node (' + (domainOffset + DOMT_DOMAIN_BODY_OFFSET + len) + '<=' + (nodeIndex + cellCount) + ')', desc);

      // verify the domain itself. should be CSIS
      let lastHi = -2;
      for (let i = 0; i < len; i += 2) {
        let lo = buf[domainOffset + DOMT_DOMAIN_BODY_OFFSET + i];
        let hi = buf[domainOffset + DOMT_DOMAIN_BODY_OFFSET + i + 1];
        ASSERT(lo <= hi, 'each pair should be lo<=hi', lo, hi, desc);
        ASSERT(lo - 1 > lastHi, desc);
        ASSERT(lo >= SUB, desc); // okay the typed array is unsigned, but still :)
        ASSERT(hi <= SUP, desc);
        lastHi = hi;
      }
    }
  }

  //working on: figuring out why this assertion breaks. run `grunt distbug && tests/perf/curator/node.js > a` and break once you see the ones (or else log gets cut off)
  //inspect the debug and figure out how empty nodes are being written out without breaking any assertions. that should not happen and is causing incorrect memory consumptions

  // check global domt composition consistency

  nodeIndex = DOMT_DEFAULT_FIRST_NODE;
  while (nodeIndex <= domt.lastNodeIndex) {
    let varCount = buf[nodeIndex + DOMT_VAR_COUNT];
    if (!varCount) {
      console.log('no var count!?');
      _domt_debug(domt, true);
    }
    ASSERT(varCount > 0, 'expecting vars', varCount);
    ASSERT(buf[nodeIndex + DOMT_NODE_CELL_COUNT] >= DOMT_JUMP_TABLE + varCount, 'cells should at least cover jump table');

    for (let varIndex = 0; varIndex < varCount; ++varIndex) {
      let $jmp = buf[nodeIndex + DOMT_JUMP_TABLE + varIndex];
      ASSERT($jmp && ($jmp !== DOMT_IS_NUMDOM || nodeIndex === domt.lastNodeIndex), '$jmp shouldnt be EMPTY');
    }

    nodeIndex += buf[nodeIndex + DOMT_NODE_CELL_COUNT];
  }
}

// __REMOVE_BELOW_FOR_DIST__

/**
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @returns {number}
 */
function domt_getNodeSize(domt, nodeIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');

  return domt.buffer[nodeIndex + DOMT_NODE_CELL_COUNT];
}
/**
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @returns {number}
 */
function domt_getNodeEnd(domt, nodeIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');

  return nodeIndex + domt_getNodeSize(domt, nodeIndex);
}
/**
 * Get domain by varIndex from nodeIndex as an array
 *
 * Only use for testing because it creates a new
 * array object!
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @param {number} varIndex
 * @returns {$domain_arr}
 */
function domt_getDomainArr(domt, nodeIndex, varIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');
  ASSERT(isFinite(varIndex), 'expecting var index');

  let jmp = domt_getJump(domt, nodeIndex, varIndex);
  if (jmp & DOMT_IS_NUMDOM) {
    let numdom = jmp ^ DOMT_IS_NUMDOM;
    return domain_toArr(numdom);
  }
  if (jmp & DOMT_IS_SOLVED) {
    let value = jmp ^ DOMT_IS_SOLVED;
    return domain_toArr(domain_createValue(value));
  }

  let buf = domt.buffer;
  let domain = [];
  for (let i = 0, len = buf[jmp]; i < len; ++i) {
    domain.push(buf[jmp + 1 + i]);
  }
  return domain;
}
/**
 * Get the value in the jump table for this var
 *
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @param {number} varIndex
 * @returns {number}
 */
function domt_getJump(domt, nodeIndex, varIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');
  ASSERT(isFinite(varIndex), 'expecting var index');

  return domt.buffer[nodeIndex + DOMT_JUMP_TABLE + varIndex];
}
/**
 * Get length of this domain as if it were an arrdom.
 * So this returns arr.length, not the number of
 * elements in the domain (!).
 *
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @param {number} varIndex
 * @returns {number}
 */
function domt_getDomainArrLen(domt, nodeIndex, varIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');
  ASSERT(isFinite(varIndex), 'expecting var index');

  let jmp = domt_getJump(domt, nodeIndex, varIndex);
  if (jmp & DOMT_IS_NUMDOM) return domain_size(jmp ^ DOMT_IS_NUMDOM);
  if (jmp & DOMT_IS_SOLVED) return 2; // [value, value]
  return domt.buffer[jmp + DOMT_DOMAIN_LENGTH_OFFSET];
}
/**
 * Get the lowest value of a domain
 *
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @param {number} varIndex
 * @returns {number}
 */
function domt_getDomainLo(domt, nodeIndex, varIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');
  ASSERT(isFinite(varIndex), 'expecting var index');

  let jmp = domt_getJump(domt, nodeIndex, varIndex);
  if (jmp & DOMT_IS_NUMDOM) return domain_min(jmp ^ DOMT_IS_NUMDOM);
  if (jmp & DOMT_IS_SOLVED) return jmp ^ DOMT_IS_SOLVED;
  return domt.buffer[jmp + DOMT_DOMAIN_BODY_OFFSET];
}
/**
 * Get the highest value of a domain
 *
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @param {number} varIndex
 * @returns {number}
 */
function domt_getDomainHi(domt, nodeIndex, varIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');
  ASSERT(isFinite(varIndex), 'expecting var index');

  let jmp = domt_getJump(domt, nodeIndex, varIndex);
  if (jmp & DOMT_IS_NUMDOM) return domain_max(jmp ^ DOMT_IS_NUMDOM);
  if (jmp & DOMT_IS_SOLVED) return jmp ^ DOMT_IS_SOLVED;
  return domt.buffer[jmp + domt.buffer[jmp + DOMT_DOMAIN_LENGTH_OFFSET]];
}
/**
 * Get the value of a domain if solved and NO_SUCH_VALUE if not
 * solved. It is "unsafe" because it only checks for the solved
 * state by checking whether the bit was set in the struct, if
 * the bit is not set the arrdom/numdom is not verified for being
 * solved first.
 *
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @param {number} varIndex
 * @returns {number}
 */
function domt_getDomainValueUnsafe(domt, nodeIndex, varIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');
  ASSERT(isFinite(varIndex), 'expecting var index');

  let jmp = domt_getJump(domt, nodeIndex, varIndex);
  if (jmp & DOMT_IS_NUMDOM || !(jmp & DOMT_IS_SOLVED)) return NO_SUCH_VALUE;
  return jmp ^ DOMT_IS_SOLVED;
}
/**
 * Return whether the domain is solved according to the bit in
 * the jump table. If the bit is not set, the domain is not checked.
 *
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @param {number} varIndex
 * @returns {number}
 */
function domt_getDomainIsSolvedUnsafe(domt, nodeIndex, varIndex) {
  ASSERT(domt._class === '$domt', 'expecting domt');
  ASSERT(isFinite(nodeIndex), 'expecting node index');
  ASSERT(isFinite(varIndex), 'expecting var index');

  let jmp = domt_getJump(domt, nodeIndex, varIndex);
  return (!(jmp & DOMT_IS_NUMDOM) && jmp & DOMT_IS_SOLVED);
}
/**
 * Return used cells in this entire domt.
 * Basically returns the first cell index after the
 * last node index added to the domt.
 *
 * Only use for testing or outside tight loops
 * because the buffer should be cached
 *
 * @deprecated (only use for testing)
 * @param {$domt} domt
 * @returns {number}
 */
function domt_getSize(domt) {
  ASSERT(domt._class === '$domt', 'expecting domt');

  return domt_getNodeEnd(domt, domt.lastNodeIndex);
}


/**
 * @param {$domt} domt
 * @param {number} nodeIndex
 * @returns {boolean}
 */
function domt_isNodeRejected(domt, nodeIndex, llen) {
  let buf = domt.buffer;
  let offset = nodeIndex + DOMT_JUMP_TABLE;
  let count = buf[nodeIndex + DOMT_VAR_COUNT];
  ASSERT(llen === count, 'node should have proper var count', llen, count);
  for (let i = 0; i < count; ++i) {
    // if $jmp equals the flag, the numdom is 0, meaning it contains no values (==rejected)
    let $jmp = buf[offset + i];
    if ($jmp === DOMT_IS_NUMDOM) return true;
  }
  return false;
}

// __REMOVE_ABOVE_FOR_DIST__

function _domt_debug(domt, fromNodeNumber, toNodeNumber, printBuf, msg) {
  ASSERT(domt._class === '$domt', 'expecting domt');

  let buf = domt.buffer;
  console.log('\n## domt debug' + (msg ? ' (' + msg + ')' : ''), fromNodeNumber, toNodeNumber, printBuf);
  console.log('  Last current node index:', domt.lastNodeIndex);
  if (domt._maxNodeIndex) console.log('  Max node index seen:', domt._maxNodeIndex);
  if (domt._maxCellSize) console.log('  Max cell count:', domt._maxCellSize);
  if (domt._grows) console.log('  Buffer grows:', domt._grows);
  console.log('  Buffer length (cells):', domt.buffer.length);
  let totalCells = domt.lastNodeIndex + domt.buffer[domt.lastNodeIndex + DOMT_NODE_CELL_COUNT];
  console.log('  Used cells:', totalCells);

  if (printBuf) console.log('Raw used buf:', [].slice.call(buf, 0, totalCells).join(', '));

  if (fromNodeNumber === true) {
    fromNodeNumber = 0;
    toNodeNumber = Infinity;
  }
  if (!toNodeNumber) toNodeNumber = fromNodeNumber;

  let nodeIndex = DOMT_DEFAULT_FIRST_NODE;
  let lastNodeIndex = domt.lastNodeIndex;
  for (let i = 0; i <= toNodeNumber && nodeIndex <= lastNodeIndex && (!i || buf[nodeIndex + DOMT_NODE_CELL_COUNT]); ++i) {
    let cells = buf[nodeIndex + DOMT_NODE_CELL_COUNT];
    // it's like a linked list and we need to skip nodes until we hit our target
    if (i >= fromNodeNumber && i <= toNodeNumber) {
      let vars = buf[nodeIndex + DOMT_VAR_COUNT];
      console.log('# Node #' + i + ' @ ' + nodeIndex);
      console.log('  Cell count:', cells);
      console.log('  Var count:', vars);
      //console.log('first 100:', [].slice.call(buf.slice(0, 100), 0).join(','));
      console.log('  Jump table:', [].slice.call(buf, nodeIndex + DOMT_JUMP_TABLE, nodeIndex + DOMT_JUMP_TABLE + vars).map(($jmp, i) => {
        if ($jmp & DOMT_IS_NUMDOM) return $jmp + ' (numdom: [' + domain_toArr($jmp ^ DOMT_IS_NUMDOM) + '])\n';
        if ($jmp === DOMT_IS_NUMDOM) return $jmp + ' (rejected)\n'; // $jmp is a numdom but no numdom flags are set so rejected. different from $jmp === is_solved
        if ($jmp & DOMT_IS_SOLVED) return $jmp + ' (solved: ' + ($jmp ^ DOMT_IS_SOLVED) + ')\n';
        return $jmp + ' = ' + buf[nodeIndex + $jmp] + ' [' + [].slice.call(buf, nodeIndex + $jmp + 1, nodeIndex + $jmp + 1 + buf[nodeIndex + $jmp]) + ']\n';
      }).join(','));
      console.log('  Domain data:', ([].slice.call(buf, nodeIndex + DOMT_JUMP_TABLE + vars, nodeIndex + cells).join(',') || '<none>'));
    }

    nodeIndex += cells;
  }
  console.log('##\n');
}
// BODY_STOP

export {
  DOMT_DEFAULT_FIRST_NODE,
  DOMT_NODE_CELL_COUNT,
  DOMT_VAR_COUNT,
  DOMT_JUMP_TABLE,
  DOMT_IS_NUMDOM,
  DOMT_IS_SOLVED,
  DOMT_HAS_CHANGED,
  DOMT_MAX_DOM_COUNT,

  _domt_debug,
  domt_create,
  domt_initDomain,
  domt_isNodeRejected,
  domt_duplicateNode,
  domt_replaceDomain,
  domt_sizeOf,

  // __REMOVE_BELOW_FOR_DIST__
  // testing stuff
  domt_getDomainArr,
  domt_getJump,
  domt_getDomainArrLen,
  domt_getDomainHi,
  domt_getDomainIsSolvedUnsafe,
  domt_getDomainLo,
  domt_getDomainValueUnsafe,
  domt_getNodeSize,
  domt_getNodeEnd,
  domt_getSize,
  // __REMOVE_ABOVE_FOR_DIST__
};

