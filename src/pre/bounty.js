import {
  ASSERT,
  TRACE,
  THROW,
} from './helpers';

import {
  ML_START,
  ML_EQ,
  ML_NEQ,
  ML_LT,
  ML_LTE,
  ML_ISEQ,
  ML_ISNEQ,
  ML_ISLT,
  ML_ISLTE,
  ML_NALL,
  ML_ISALL,
  ML_ISALL2,
  ML_ISNALL,
  ML_ISNONE,
  ML_SUM,
  ML_PRODUCT,
  ML_DISTINCT,
  ML_PLUS,
  ML_MINUS,
  ML_MUL,
  ML_DIV,
  ML_AND,
  ML_OR,
  ML_XOR,
  ML_NAND,
  ML_XNOR,
  ML_DEBUG,
  ML_JMP,
  ML_JMP32,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  SIZEOF_V,
  SIZEOF_W,
  SIZEOF_VV,
  SIZEOF_VVV,
  SIZEOF_COUNT,

  ml__debug,
  ml_dec16,
  ml_dec32,
  ml_throw,
} from './ml';
import {
  domain__debug,
  domain_getValue,
} from '../domain';

// BODY_START

let bounty_flagCounter = 0;
const BOUNTY_NONE = bounty_flagCounter;
const BOUNTY_NOT_BOOLY_ONLY_FLAG = ++bounty_flagCounter; // booly = when only used in bool ops (like nall) or as the lhs of a reifier
const BOUNTY_OTHER_ONLY_FLAG = ++bounty_flagCounter;
const BOUNTY_OTHER_BOOLY = BOUNTY_OTHER_ONLY_FLAG; // all vars are implicitly booly, opt-out for non-booly
const BOUNTY_OTHER_NONBOOLY = BOUNTY_OTHER_ONLY_FLAG | BOUNTY_NOT_BOOLY_ONLY_FLAG; // debug or any of the ops the cutter is not interested in

const BOUNTY_LTE_LHS_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_LTE_LHS = BOUNTY_LTE_LHS_ONLY_FLAG | BOUNTY_NOT_BOOLY_ONLY_FLAG;
const BOUNTY_LTE_RHS_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_LTE_RHS = BOUNTY_LTE_RHS_ONLY_FLAG | BOUNTY_NOT_BOOLY_ONLY_FLAG;
const BOUNTY_ISALL_RESULT_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_ISALL_RESULT = BOUNTY_ISALL_RESULT_ONLY_FLAG;
const BOUNTY_ISEQ_ARG_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_ISEQ_ARG = BOUNTY_ISEQ_ARG_ONLY_FLAG | BOUNTY_NOT_BOOLY_ONLY_FLAG;
const BOUNTY_NALL_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_NALL = BOUNTY_NALL_ONLY_FLAG;
const BOUNTY_NAND_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_NAND = BOUNTY_NAND_ONLY_FLAG;
const BOUNTY_NEQ_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_NEQ = BOUNTY_NEQ_ONLY_FLAG | BOUNTY_NOT_BOOLY_ONLY_FLAG;
const BOUNTY_OR_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_OR = BOUNTY_OR_ONLY_FLAG;
const BOUNTY_SUM_RESULT_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_SUM_RESULT = BOUNTY_SUM_RESULT_ONLY_FLAG | BOUNTY_NOT_BOOLY_ONLY_FLAG;
const BOUNTY_PLUS_RESULT_ONLY_FLAG = 1 << ++bounty_flagCounter;
const BOUNTY_PLUS_RESULT = BOUNTY_PLUS_RESULT_ONLY_FLAG | BOUNTY_NOT_BOOLY_ONLY_FLAG;

ASSERT(bounty_flagCounter <= 16, 'can only run with 16 flags, or must increase flag size');

const BOUNTY_LINK_COUNT = 1; // should it simply trunc over 255?
const BOUNTY_META_FLAGS = 16; // steps of 8 (bits per byte)
const BOUNTY_MAX_OFFSETS_TO_TRACK = 20; // perf case bounty size when this is: 5->1mb, 20->3mb
const BOUNTY_BYTES_PER_OFFSET = 4;

const BOUNTY_SIZEOF_HEADER = BOUNTY_LINK_COUNT + (BOUNTY_META_FLAGS / 2);
const BOUNTY_SIZEOF_OFFSETS = BOUNTY_MAX_OFFSETS_TO_TRACK * BOUNTY_BYTES_PER_OFFSET; // need to store 32bit per offset (more like 24 but whatever)
const BOUNTY_SIZEOF_VAR = BOUNTY_SIZEOF_HEADER + BOUNTY_SIZEOF_OFFSETS;

/**
 * @param {Buffer} ml
 * @param {Object} problem
 * @param {Buffer} [bounty]
 */
function bounty_collect(ml, problem, bounty) {
  TRACE('\n ## bounty_collect', ml);

  let varNames = problem.varNames;
  let varCount = varNames.length;
  let getAlias = problem.getAlias;
  let getDomain = problem.getDomain;

  let pc = 0;

  if (!bounty) {
    bounty = new Buffer(varCount * BOUNTY_SIZEOF_VAR);
    console.log('Created bounty buffer. Size:', bounty.length);
  }
  bounty.fill(0); // even for new buffer because they are not guaranteed to be zero filled (most like not)

  bountyLoop();

  TRACE(` - There are ${getDeadCount(bounty)} dead vars, ${getLeafCount(bounty)} leaf vars, full distribution: ${getOccurrenceCount(bounty)} other vars`);

  return bounty;

  function getBountyOffset(varIndex) {
    return varIndex * BOUNTY_SIZEOF_VAR;
  }

  function getOffsetsOffset(varIndex) {
    return varIndex * BOUNTY_SIZEOF_VAR + BOUNTY_SIZEOF_HEADER;
  }

  function collect(delta, metaFlags) {
    TRACE('collect(', delta, ',', bounty__debugMeta(metaFlags), ')');
    ASSERT(typeof delta === 'number' && delta > 0, 'delta should be >0 number', delta);
    ASSERT(typeof metaFlags === 'number' && metaFlags > 0, 'at least one metaFlags should be passed on', metaFlags, metaFlags.toString(2));

    let index = ml_dec16(ml, pc + delta);
    ASSERT(!isNaN(index) && index >= 0 && index <= 0xffff, 'should be a valid index', index);
    index = getAlias(index);
    ASSERT(!isNaN(index) && index >= 0 && index <= 0xffff, 'should be a valid index', index);

    let domain = getDomain(index, true);
    TRACE(' - index=', index, 'domain=', domain__debug(domain));
    ASSERT(domain !== false, 'domain should be unaliased');
    if (domain_getValue(domain) >= 0) return; // ignore all constants. solved vars and constants are not relevant to bounty

    let varOffset = getBountyOffset(index);
    ASSERT(bounty[varOffset] < 0xff, 'constraint count should not overflow');
    let countIndex = bounty[varOffset]++; // count, but as zero-offset

    let flagsOffset = varOffset + BOUNTY_LINK_COUNT;
    ASSERT(BOUNTY_META_FLAGS === 16, 'update code if this changes');
    let currentFlags = bounty.readUInt16BE(flagsOffset);

    TRACE(' >> collecting for index=', index, ' -> count now:', bounty[varOffset], 'flags:', bounty__debugMeta(currentFlags), '|=', bounty__debugMeta(metaFlags), ' -> ', bounty__debugMeta(currentFlags | metaFlags), 'from', flagsOffset, 'domain:', domain__debug(domain));

    if (countIndex < BOUNTY_MAX_OFFSETS_TO_TRACK) {
      let offsetsOffset = getOffsetsOffset(index);
      let nextOffset = offsetsOffset + countIndex * BOUNTY_BYTES_PER_OFFSET;
      TRACE(' - tracking offset; countIndex=', countIndex, ', putting offset at', nextOffset);
      bounty.writeUInt32BE(pc, nextOffset);
    } else {
      TRACE(' - unable to track offset; countIndex beyond max;', countIndex, '>', BOUNTY_MAX_OFFSETS_TO_TRACK);
    }

    ASSERT(BOUNTY_META_FLAGS === 16, 'update code if this changes');
    bounty.writeUInt16BE(currentFlags | metaFlags, flagsOffset);
  }

  function bountyLoop() {
    pc = 0;
    TRACE(' - bountyLoop');
    while (pc < ml.length) {
      let pcStart = pc;
      let op = ml[pc];
      TRACE(' -- CT pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, problem));
      switch (op) {
        case ML_EQ:
          // should be aliased but if the problem rejected there may be eqs like this left
          // (bounty is also used for generating the dsl problem)
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_NEQ:
          collect(1, BOUNTY_NEQ | BOUNTY_NOT_BOOLY_ONLY_FLAG);
          collect(3, BOUNTY_NEQ | BOUNTY_NOT_BOOLY_ONLY_FLAG);
          pc += SIZEOF_VV;
          break;

        case ML_LTE:
          collect(1, BOUNTY_LTE_LHS | BOUNTY_NOT_BOOLY_ONLY_FLAG);
          collect(3, BOUNTY_LTE_RHS | BOUNTY_NOT_BOOLY_ONLY_FLAG);
          pc += SIZEOF_VV;
          break;

        case ML_LT:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_AND:
          collect(1, BOUNTY_OTHER_BOOLY);
          collect(3, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_OR:
          collect(1, BOUNTY_OR);
          collect(3, BOUNTY_OR);
          pc += SIZEOF_VV;
          break;

        case ML_XOR:
          collect(1, BOUNTY_OTHER_BOOLY);
          collect(3, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_XNOR:
          collect(1, BOUNTY_OTHER_BOOLY);
          collect(3, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_NAND:
          collect(1, BOUNTY_NAND);
          collect(3, BOUNTY_NAND);
          pc += SIZEOF_VV;
          break;

        case ML_NALL:
          let nlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < nlen; ++i) {
            collect(SIZEOF_COUNT + i * 2, BOUNTY_NALL);
          }
          pc += SIZEOF_COUNT + nlen * 2;
          break;

        case ML_DISTINCT:
          // note: distinct "cant" have multiple counts of same var because that would reject
          let dlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < dlen; ++i) {
            collect(SIZEOF_COUNT + i * 2, BOUNTY_OTHER_NONBOOLY);
          }
          pc += SIZEOF_COUNT + dlen * 2;
          break;

        case ML_ISALL2:
          collect(1, BOUNTY_OTHER_BOOLY);
          collect(3, BOUNTY_OTHER_BOOLY);
          collect(5, BOUNTY_ISALL_RESULT);
          pc += SIZEOF_VVV;
          break;

        case ML_ISEQ:
          collect(1, BOUNTY_ISEQ_ARG);
          collect(3, BOUNTY_ISEQ_ARG);
          collect(5, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VVV;
          break;

        case ML_ISNEQ:
        case ML_ISLT:
        case ML_ISLTE:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          collect(5, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VVV;
          break;

        case ML_PLUS:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          collect(5, BOUNTY_PLUS_RESULT);
          pc += SIZEOF_VVV;
          break;

        case ML_MINUS:
        case ML_MUL:
        case ML_DIV:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          collect(5, BOUNTY_OTHER_NONBOOLY);
          pc += SIZEOF_VVV;
          break;

        case ML_ISALL:
          let ilen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < ilen; ++i) {
            collect(SIZEOF_COUNT + i * 2, BOUNTY_OTHER_BOOLY);
          }
          collect(SIZEOF_COUNT + ilen * 2, BOUNTY_ISALL_RESULT); // R
          pc += SIZEOF_COUNT + ilen * 2 + 2;
          break;

        case ML_ISNALL:
        case ML_ISNONE:
          let mlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < mlen; ++i) {
            collect(SIZEOF_COUNT + i * 2, BOUNTY_OTHER_BOOLY);
          }
          collect(SIZEOF_COUNT + mlen * 2, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_COUNT + mlen * 2 + 2;
          break;

        case ML_SUM:
          // TODO: collect multiple occurrences of same var once
          let splen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < splen; ++i) {
            collect(SIZEOF_COUNT + i * 2, BOUNTY_OTHER_NONBOOLY);
          }
          collect(SIZEOF_COUNT + splen * 2, BOUNTY_SUM_RESULT); // R
          pc += SIZEOF_COUNT + splen * 2 + 2;
          break;

        case ML_PRODUCT:
          // TODO: collect multiple occurrences of same var once
          let plen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < plen; ++i) {
            collect(SIZEOF_COUNT + i * 2, BOUNTY_OTHER_NONBOOLY);
          }
          collect(SIZEOF_COUNT + plen * 2, BOUNTY_OTHER_NONBOOLY); // R
          pc += SIZEOF_COUNT + plen * 2 + 2;
          break;

        case ML_START:
          if (pc !== 0) return THROW(' ! compiler problem @', pcStart);
          ++pc;
          break;

        case ML_STOP:
          return;

        case ML_DEBUG:
          // should prevent trivial eliminations because DEBUG is never part of a trick and vars under DEBUG are never considered leaf vars
          collect(1, BOUNTY_OTHER_NONBOOLY);
          pc += SIZEOF_V;
          break;

        case ML_JMP:
          pc += SIZEOF_V + ml_dec16(ml, pc + 1);
          break;
        case ML_JMP32:
          pc += SIZEOF_W + ml_dec32(ml, pc + 1);
          break;

        case ML_NOOP:
          ++pc;
          break;
        case ML_NOOP2:
          pc += 2;
          break;
        case ML_NOOP3:
          pc += 3;
          break;
        case ML_NOOP4:
          pc += 4;
          break;

        default:
          // put in a switch in the default so that the main switch is smaller. this second switch should never hit.
          //console.error('(cnt) unknown op', pc,' at', pc,'ctrl+c now or log will fill up');
          //while (true) console.log('beep');
          ml_throw(ml, pc, '(bnt) expecting bounty to run after the minifier and these ops should be gone');
      }
    }
    ml_throw(ml, pc, 'ML OOB');
  }

  function getDeadCount(varMeta) {
    let count = 0;
    for (let i = 0; i < varCount; i += BOUNTY_SIZEOF_VAR) {
      if (!varMeta[i]) ++count;
    }
    return count;
  }

  function getLeafCount(varMeta) {
    let count = 0;
    for (let i = 0; i < varCount; i += BOUNTY_SIZEOF_VAR) {
      if (varMeta[i] === 1) ++count;
    }
    return count;
  }

  function getOccurrenceCount(varMeta) {
    // should be eliminated when not used by ASSERTs
    let count = {};
    for (let i = 0; i < varCount; i += BOUNTY_SIZEOF_VAR) {
      count[varMeta[i]] = ~-count[varMeta[i]];
    }

    return count;
  }
}

function bounty_getCounts(bounty, varIndex) {
  return bounty[varIndex * BOUNTY_SIZEOF_VAR];
}

function bounty_markVar(bounty, varIndex) {
  // until next loop, ignore this var (need to refresh bounty data)
  TRACE(' - bounty_markVar', varIndex);
  bounty[varIndex * BOUNTY_SIZEOF_VAR] = 0;
}

function bounty_getMeta(bounty, varIndex, _debug) {
  ASSERT(bounty_getCounts(bounty, varIndex) > 0 || _debug, 'check caller (2), this is probably a bug (var did not appear in any constraint, or its a constant, or this data was marked as stale)');
  return bounty.readUInt16BE(varIndex * BOUNTY_SIZEOF_VAR + BOUNTY_LINK_COUNT);
}

function bounty_updateMeta(bounty, varIndex, newFlags) {
  bounty[varIndex * BOUNTY_SIZEOF_VAR + BOUNTY_LINK_COUNT] = newFlags;
}

function bounty_getOffset(bounty, varIndex, n, _debug) {
  ASSERT(bounty_getCounts(bounty, varIndex) > 0 || _debug, 'check caller (1), this is probably a bug (var did not appear in any constraint, or its a constant, or this data was marked as stale)', varIndex, n, bounty_getCounts(bounty, varIndex), _debug);
  ASSERT(n < bounty_getCounts(bounty, varIndex), 'check caller, this is probably a bug (should not get an offset beyond the count)');
  ASSERT(n < BOUNTY_MAX_OFFSETS_TO_TRACK, 'OOB, shouldnt exceed the max offset count');
  return bounty.readUInt32BE(varIndex * BOUNTY_SIZEOF_VAR + BOUNTY_SIZEOF_HEADER + n * BOUNTY_BYTES_PER_OFFSET);
}

function bounty__debug(bounty, varIndex) {
  return `{B: index=${varIndex}, counts=${bounty_getCounts(bounty, varIndex)}, meta=${bounty__debugMeta(bounty_getMeta(bounty, varIndex, true))}}`;
}


function bounty__debugMeta(meta) {
  ASSERT(typeof meta === 'number', 'the meta should be a number', meta);
  let s = '0'.repeat(16 - meta.toString(2).length) + meta.toString(2);
  let what = [];

  if (!meta) what.push('BOUNTY_NONE');
  if ((meta & BOUNTY_NOT_BOOLY_ONLY_FLAG) === BOUNTY_NOT_BOOLY_ONLY_FLAG) what.push('NOT_BOOLY');
  if ((meta & BOUNTY_OTHER_ONLY_FLAG) === BOUNTY_OTHER_ONLY_FLAG) what.push('OTHER');
  if ((meta & BOUNTY_LTE_LHS_ONLY_FLAG) === BOUNTY_LTE_LHS_ONLY_FLAG) what.push('LTE_LHS');
  if ((meta & BOUNTY_LTE_RHS_ONLY_FLAG) === BOUNTY_LTE_RHS_ONLY_FLAG) what.push('LTE_RHS');
  if ((meta & BOUNTY_ISALL_RESULT_ONLY_FLAG) === BOUNTY_ISALL_RESULT_ONLY_FLAG) what.push('ISALL_RESULT');
  if ((meta & BOUNTY_ISEQ_ARG_ONLY_FLAG) === BOUNTY_ISEQ_ARG_ONLY_FLAG) what.push('ISEQ_ARG');
  if ((meta & BOUNTY_NALL_ONLY_FLAG) === BOUNTY_NALL_ONLY_FLAG) what.push('NALL');
  if ((meta & BOUNTY_NAND_ONLY_FLAG) === BOUNTY_NAND_ONLY_FLAG) what.push('NAND');
  if ((meta & BOUNTY_NEQ_ONLY_FLAG) === BOUNTY_NEQ_ONLY_FLAG) what.push('NEQ');
  if ((meta & BOUNTY_OR_ONLY_FLAG) === BOUNTY_OR_ONLY_FLAG) what.push('OR');
  if ((meta & BOUNTY_PLUS_RESULT_ONLY_FLAG) === BOUNTY_PLUS_RESULT_ONLY_FLAG) what.push('PLUS_RESULT');
  if ((meta & BOUNTY_SUM_RESULT_ONLY_FLAG) === BOUNTY_SUM_RESULT_ONLY_FLAG) what.push('SUM_RESULT');

  return '[ ' + s + ': ' + what.join(', ') + ' ]';
}


// BODY_STOP

export {
  BOUNTY_NONE,
  BOUNTY_NOT_BOOLY_ONLY_FLAG,
  BOUNTY_OTHER_ONLY_FLAG,
  BOUNTY_OTHER_BOOLY,
  BOUNTY_OTHER_NONBOOLY,

  BOUNTY_ISALL_RESULT,
  BOUNTY_ISALL_RESULT_ONLY_FLAG,
  BOUNTY_ISEQ_ARG,
  BOUNTY_ISEQ_ARG_ONLY_FLAG,
  BOUNTY_LTE_LHS,
  BOUNTY_LTE_LHS_ONLY_FLAG,
  BOUNTY_LTE_RHS,
  BOUNTY_LTE_RHS_ONLY_FLAG,
  BOUNTY_NALL,
  BOUNTY_NALL_ONLY_FLAG,
  BOUNTY_NAND,
  BOUNTY_NAND_ONLY_FLAG,
  BOUNTY_NEQ,
  BOUNTY_NEQ_ONLY_FLAG,
  BOUNTY_OR,
  BOUNTY_OR_ONLY_FLAG,
  BOUNTY_PLUS_RESULT,
  BOUNTY_PLUS_RESULT_ONLY_FLAG,
  BOUNTY_SUM_RESULT,
  BOUNTY_SUM_RESULT_ONLY_FLAG,

  BOUNTY_MAX_OFFSETS_TO_TRACK,

  bounty__debug,
  bounty__debugMeta,
  bounty_collect,
  bounty_getCounts,
  bounty_getMeta,
  bounty_getOffset,
  bounty_markVar,
  bounty_updateMeta,
};
