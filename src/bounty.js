import {
  ASSERT,
  ASSERT_LOG2,
  THROW,
} from './helpers';

import {
  ML_START,
  ML_VV_EQ,
  ML_V8_EQ,
  ML_88_EQ,
  ML_VV_NEQ,
  ML_V8_NEQ,
  ML_88_NEQ,
  ML_VV_LT,
  ML_V8_LT,
  ML_8V_LT,
  ML_88_LT,
  ML_VV_LTE,
  ML_V8_LTE,
  ML_8V_LTE,
  ML_88_LTE,
  ML_VVV_ISEQ,
  ML_V8V_ISEQ,
  ML_VV8_ISEQ,
  ML_88V_ISEQ,
  ML_V88_ISEQ,
  ML_888_ISEQ,
  ML_VVV_ISNEQ,
  ML_V8V_ISNEQ,
  ML_VV8_ISNEQ,
  ML_88V_ISNEQ,
  ML_V88_ISNEQ,
  ML_888_ISNEQ,
  ML_VVV_ISLT,
  ML_8VV_ISLT,
  ML_V8V_ISLT,
  ML_VV8_ISLT,
  ML_88V_ISLT,
  ML_V88_ISLT,
  ML_8V8_ISLT,
  ML_888_ISLT,
  ML_VVV_ISLTE,
  ML_8VV_ISLTE,
  ML_V8V_ISLTE,
  ML_VV8_ISLTE,
  ML_88V_ISLTE,
  ML_V88_ISLTE,
  ML_8V8_ISLTE,
  ML_888_ISLTE,
  ML_NALL,
  ML_ISALL,
  ML_ISALL2,
  ML_ISNALL,
  ML_ISNONE,
  ML_8V_SUM,
  ML_PRODUCT,
  ML_DISTINCT,
  ML_PLUS,
  ML_MINUS,
  ML_MUL,
  ML_DIV,
  ML_VV_AND,
  ML_VV_OR,
  ML_VV_XOR,
  ML_VV_NAND,
  ML_VV_XNOR,
  ML_DEBUG,
  ML_JMP,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  SIZEOF_V,
  SIZEOF_VV,
  SIZEOF_VVV,
  SIZEOF_8VV,
  SIZEOF_V8V,
  SIZEOF_VV8,
  SIZEOF_COUNT,
  SIZEOF_C8,

  ml__debug,
  ml_dec16,
  ml_throw,
} from './ml';
import {
  domain__debug,
} from './domain';

// BODY_START

let bounty_flagCounter = 0;
const BOUNTY_NONE = bounty_flagCounter;
const BOUNTY_NOT_BOOLY = ++bounty_flagCounter; // booly = when only used in bool ops (like nall) or as the lhs of a reifier
const BOUNTY_OTHER = ++bounty_flagCounter;
const BOUNTY_OTHER_BOOLY = BOUNTY_OTHER; // all vars are implicitly booly, opt-out for non-booly
const BOUNTY_OTHER_NONBOOLY = BOUNTY_OTHER | BOUNTY_NOT_BOOLY; // debug or any of the ops the cutter is not interested in

const BOUNTY_ISALL_RESULT = 1 << ++bounty_flagCounter;
const BOUNTY_LTE_LHS = (1 << ++bounty_flagCounter) | BOUNTY_NOT_BOOLY;
const BOUNTY_LTE_RHS = (1 << ++bounty_flagCounter) | BOUNTY_NOT_BOOLY;
const BOUNTY_NALL = 1 << ++bounty_flagCounter;
const BOUNTY_NAND = 1 << ++bounty_flagCounter;
const BOUNTY_NEQ = (1 << ++bounty_flagCounter) | BOUNTY_NOT_BOOLY;

ASSERT(bounty_flagCounter <= 16, 'can only run with 16 flags, or must increase flag size');

const BOUNTY_LINK_COUNT = 1; // should it simply trunc over 255?
const BOUNTY_META_FLAGS = 16; // steps of 8 (bits per byte)
const BOUNTY_MAX_OFFSETS_TO_TRACK = 5;

const BOUNTY_SIZEOF_HEADER = BOUNTY_LINK_COUNT + (BOUNTY_META_FLAGS / 2);
const BOUNTY_SIZEOF_OFFSETS = BOUNTY_MAX_OFFSETS_TO_TRACK * 4; // need to store 32bit per offset (more like 24 but whatever)
const BOUNTY_SIZEOF_VAR = BOUNTY_SIZEOF_HEADER + BOUNTY_SIZEOF_OFFSETS;

/**
 * @param {Buffer} ml
 * @param {string[]} vars
 * @param {$nordom} domains
 * @param {Function} getAlias
 * @param {Buffer} [bounty]
 */
function bounty_collect(ml, vars, domains, getAlias, bounty) {
  ASSERT_LOG2('\n ## bounty_collect', ml);
  let pc = 0;

  if (!bounty) bounty = new Buffer(vars.length * BOUNTY_SIZEOF_VAR);
  bounty.fill(0); // even for new buffer because they are not guaranteed to be zero filled (most like not)

  bountyLoop();

  ASSERT_LOG2(` - There are ${getDeadCount(bounty)} dead vars, ${getLeafCount(bounty)} leaf vars, full distribution: ${getOccurrenceCount(bounty)} other vars`);

  return bounty;

  function getBountyOffset(varIndex) {
    return varIndex * BOUNTY_SIZEOF_VAR;
  }

  function getOffsetsOffset(varIndex) {
    return varIndex * BOUNTY_SIZEOF_VAR + BOUNTY_SIZEOF_HEADER;
  }

  function getFinalIndex(index, _max = 50) {
    if (_max <= 0) THROW('damnit');
    ASSERT_LOG2('getFinalIndex: ' + index + ' -> ' + domain__debug(domains[index]));
    if (domains[index] !== false) return index;

    // if the domain is falsy then there was an alias (or a bug)
    // write the alias back to ML and restart the current op
    // caller should ensure to check return value and return on
    // a falsy result as well so the loop can restart.
    let aliasIndex = getAlias(index);
    ASSERT(aliasIndex !== index, 'an alias to itself is an infi loop and a bug');
    ASSERT_LOG2(' - alias for', index, 'is', aliasIndex);
    return getFinalIndex(aliasIndex, _max - 1);
  }

  function collect(delta, metaFlags) {
    ASSERT(typeof delta === 'number' && delta > 0, 'delta should be >0 number', delta);
    ASSERT(typeof metaFlags === 'number' && metaFlags > 0, 'at least one metaFlags should be passed on', metaFlags, metaFlags.toString(2));

    let n = ml_dec16(ml, pc + delta);
    ASSERT(n < domains.length, 'should be a valid index', n);
    let index = getFinalIndex(n);
    ASSERT(!isNaN(index) && index >= 0 && index < domains.length, 'should be a valid index', index);


    let varOffset = getBountyOffset(index);
    ++bounty[varOffset];

    ASSERT_LOG2(' > collect(', index, ',', metaFlags.toString(2), ') ->', bounty[varOffset + BOUNTY_LINK_COUNT], '|=', metaFlags, ' -> ', (bounty[varOffset + BOUNTY_LINK_COUNT] | metaFlags).toString(2));

    let offsetsOffset = getOffsetsOffset(index);
    for (let i = 0; i < BOUNTY_MAX_OFFSETS_TO_TRACK; ++i) {
      let nextOffset = offsetsOffset + (i * 4);
      if (!bounty.readUInt32BE(nextOffset)) {
        bounty.writeUInt32BE(pc, nextOffset);
        break;
      }
    }

    bounty[varOffset + BOUNTY_LINK_COUNT] |= metaFlags;
  }

  function bountyLoop() {
    pc = 0;
    ASSERT_LOG2(' - bountyLoop');
    while (pc < ml.length) {
      let pcStart = pc;
      let op = ml[pc];
      ASSERT_LOG2(' -- CT pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, domains, vars));
      switch (op) {
        case ML_VV_NEQ:
          collect(1, BOUNTY_NEQ | BOUNTY_NOT_BOOLY);
          collect(3, BOUNTY_NEQ | BOUNTY_NOT_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_VV_LTE:
          collect(1, BOUNTY_LTE_LHS | BOUNTY_NOT_BOOLY);
          collect(3, BOUNTY_LTE_RHS | BOUNTY_NOT_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_VV_LT:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_VV_AND:
          collect(1, BOUNTY_OTHER_BOOLY);
          collect(3, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_VV_OR:
          collect(1, BOUNTY_OTHER_BOOLY);
          collect(3, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_VV_XOR:
          collect(1, BOUNTY_OTHER_BOOLY);
          collect(3, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_VV_XNOR:
          collect(1, BOUNTY_OTHER_BOOLY);
          collect(3, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VV;
          break;

        case ML_VV_NAND:
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

        case ML_VVV_ISEQ:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          collect(5, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VVV;
          break;

        case ML_VVV_ISNEQ:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          collect(5, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VVV;
          break;

        case ML_VVV_ISLT:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          collect(5, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VVV;
          break;

        case ML_VVV_ISLTE:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          collect(5, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_VVV;
          break;

        case ML_PLUS:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          collect(5, BOUNTY_OTHER_NONBOOLY);
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

        case ML_V8V_ISEQ:
        case ML_V8V_ISNEQ:
        case ML_V8V_ISLT:
        case ML_V8V_ISLTE:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(4, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_V8V;
          break;

        case ML_VV8_ISEQ:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          pc += SIZEOF_VV8;
          break;

        case ML_VV8_ISNEQ:
        case ML_VV8_ISLT:
        case ML_VV8_ISLTE:
          collect(1, BOUNTY_OTHER_NONBOOLY);
          collect(3, BOUNTY_OTHER_NONBOOLY);
          pc += SIZEOF_VV8;
          break;

        case ML_8VV_ISLT:
        case ML_8VV_ISLTE:
          collect(2, BOUNTY_OTHER_NONBOOLY);
          collect(4, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_8VV;
          break;

        case ML_8V_SUM:
          // TODO: collect multiple occurrences of same var once
          let slen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < slen; ++i) {
            collect(SIZEOF_C8 + i * 2, BOUNTY_OTHER_NONBOOLY);
          }
          collect(SIZEOF_C8 + slen * 2, BOUNTY_OTHER_NONBOOLY); // R
          pc += SIZEOF_C8 + slen * 2 + 2;
          break;

        case ML_ISALL:
        case ML_ISNALL:
          let ilen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < ilen; ++i) {
            collect(SIZEOF_COUNT + i * 2, BOUNTY_OTHER_BOOLY);
          }
          collect(SIZEOF_COUNT + ilen * 2, op === ML_ISALL ? BOUNTY_ISALL_RESULT : BOUNTY_OTHER_BOOLY); // R
          pc += SIZEOF_COUNT + ilen * 2 + 2;
          break;

        case ML_ISNONE:
          let mlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < mlen; ++i) {
            collect(SIZEOF_COUNT + i * 2, BOUNTY_OTHER_BOOLY);
          }
          collect(SIZEOF_COUNT + mlen * 2, BOUNTY_OTHER_BOOLY);
          pc += SIZEOF_COUNT + mlen * 2 + 2;
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
          let delta = ml_dec16(ml, pc + 1);
          pc += 3 + delta;
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
          switch (op) {
            case ML_VV_EQ:
            case ML_V8_EQ:
            case ML_V8_NEQ:
            case ML_V8_LT:
            case ML_V8_LTE:
            case ML_8V_LT:
            case ML_8V_LTE:
            case ML_88_EQ:
            case ML_88_NEQ:
            case ML_88_LT:
            case ML_88_LTE:
            case ML_88V_ISEQ:
            case ML_88V_ISNEQ:
            case ML_88V_ISLT:
            case ML_88V_ISLTE:
            case ML_V88_ISEQ:
            case ML_V88_ISNEQ:
            case ML_V88_ISLT:
            case ML_V88_ISLTE:
            case ML_8V8_ISLT:
            case ML_8V8_ISLTE:
            case ML_888_ISEQ:
            case ML_888_ISNEQ:
            case ML_888_ISLT:
            case ML_888_ISLTE:
              THROW('expecting bounty to run after the minifier and these ops should be gone');
              break;
          }
          //console.error('(cnt) unknown op', pc,' at', pc,'ctrl+c now or log will fill up');
          //while (true) console.log('beep');
          ml_throw(ml, pc, '(cnt) unknown op');
      }
    }
    THROW('ML OOB');
  }

  function getDeadCount(varMeta) {
    let count = 0;
    for (let i = 0; i < vars.length; i += BOUNTY_SIZEOF_VAR) {
      if (!varMeta[i]) ++count;
    }
    return count;
  }

  function getLeafCount(varMeta) {
    let count = 0;
    for (let i = 0; i < vars.length; i += BOUNTY_SIZEOF_VAR) {
      if (varMeta[i] === 1) ++count;
    }
    return count;
  }

  function getOccurrenceCount(varMeta) {
    // should be eliminated when not used by ASSERTs
    let count = {};
    for (let i = 0; i < vars.length; i += BOUNTY_SIZEOF_VAR) {
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
  bounty[varIndex * BOUNTY_SIZEOF_VAR] = 0;
}

function bounty_getMeta(bounty, varIndex) {
  return bounty[varIndex * BOUNTY_SIZEOF_VAR + BOUNTY_LINK_COUNT];
}

function bounty_updateMeta(bounty, varIndex, newFlags) {
  bounty[varIndex * BOUNTY_SIZEOF_VAR + BOUNTY_LINK_COUNT] = newFlags;
}

function bounty_getOffset(bounty, varIndex, n) {
  ASSERT(n < BOUNTY_MAX_OFFSETS_TO_TRACK, 'OOB, shouldnt exceed the max offset count');
  return bounty.readUInt32BE(varIndex * BOUNTY_SIZEOF_VAR + BOUNTY_SIZEOF_HEADER + n * 4);
}


// BODY_STOP

export {
  BOUNTY_NONE,
  BOUNTY_NOT_BOOLY,
  BOUNTY_OTHER_BOOLY,
  BOUNTY_OTHER_NONBOOLY,

  BOUNTY_ISALL_RESULT,
  BOUNTY_LTE_LHS,
  BOUNTY_LTE_RHS,
  BOUNTY_NALL,
  BOUNTY_NAND,
  BOUNTY_NEQ,

BOUNTY_MAX_OFFSETS_TO_TRACK,

  bounty_collect,
  bounty_getCounts,
  bounty_getMeta,
  bounty_getOffset,
  bounty_markVar,
  bounty_updateMeta,
};
