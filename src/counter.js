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
  ML_JMP,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  SIZEOF_VV,
  SIZEOF_8V,
  SIZEOF_V8,
  SIZEOF_88,
  SIZEOF_VVV,
  SIZEOF_8VV,
  SIZEOF_V8V,
  SIZEOF_VV8,
  SIZEOF_88V,
  SIZEOF_V88,
  SIZEOF_8V8,
  SIZEOF_888,
  SIZEOF_COUNT,
  SIZEOF_C8_COUNT,

  ml__debug,
  ml_dec16,
  ml_throw,
} from './ml';
import {
  domain__debug,
} from './domain';

// BODY_START

const COUNT_NONE = 0;
const COUNT_BOOLY = 1 << 0;
const COUNT_ISALL_RESULT = 1 << 1;
const COUNT_NEQ = 1 << 2;
const COUNT_LTE_RHS = 1 << 3;

/**
 * @param {Buffer} ml
 * @param {string[]} vars
 * @param {$nordom} domains
 * @param {Function} getAlias
 * @param {number[]} [lastOffset]
 * @param {number[]} [varMeta]
 */
function counter(ml, vars, domains, getAlias, lastOffset, varMeta) {
  ASSERT_LOG2('\n ## counter', ml);
  let pc = 0;
  let counts = new Array(domains.length).fill(0);
  countLoop();
  ASSERT_LOG2(' - There are', counts.filter(c => !c).length, 'dead vars,', counts.filter(c => c === 1).length, 'leaf vars, and', counts.filter(c => c > 1).length, 'other vars');
  return counts;

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

  function count(delta, asBool, metaFlags) {
    let n = ml_dec16(ml, pc + delta);
    ASSERT(n < domains.length, 'should be a valid index', n);
    let index = getFinalIndex(n);
    ASSERT(!isNaN(index) && index >= 0 && index < domains.length, 'should be a valid index', index);
    ++counts[index];
    if (lastOffset) lastOffset[index] = pc;
    if (varMeta) {
      if (!asBool) varMeta[index] = (varMeta[index] | COUNT_BOOLY) ^ COUNT_BOOLY; // remove booly flag without changing other flags
      if (metaFlags) varMeta[index] |= metaFlags;
    }
  }

  function countLoop() {
    pc = 0;
    ASSERT_LOG2(' - countLoop');
    while (pc < ml.length) {
      let pcStart = pc;
      let op = ml[pc];
      ASSERT_LOG2(' -- CT pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, domains, vars));
      switch (op) {
        case ML_VV_NEQ:
          count(1, false, COUNT_NEQ);
          count(3, false, COUNT_NEQ);
          pc += SIZEOF_VV;
          break;

        case ML_VV_LTE:
          count(1, false);
          count(3, false, COUNT_LTE_RHS);
          pc += SIZEOF_VV;
          break;

        case ML_VV_EQ:
        case ML_VV_LT:
          count(1, false);
          count(3, false);
          pc += SIZEOF_VV;
          break;

        case ML_VV_AND:
        case ML_VV_OR:
        case ML_VV_XOR:
        case ML_VV_NAND:
        case ML_VV_XNOR:
          count(1, true);
          count(3, true);
          pc += SIZEOF_VV;
          break;

        case ML_V8_EQ:
        case ML_V8_NEQ:
        case ML_V8_LT:
        case ML_V8_LTE:
          count(1, false);
          pc += SIZEOF_V8;
          break;

        case ML_8V_LT:
        case ML_8V_LTE:
          count(2, false);
          pc += SIZEOF_8V;
          break;

        case ML_88_EQ:
        case ML_88_NEQ:
        case ML_88_LT:
        case ML_88_LTE:
          pc += SIZEOF_88;
          break;

        case ML_NALL:
          let nlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < nlen; ++i) {
            count(3 + i * 2, true);
          }
          pc += SIZEOF_COUNT + nlen * 2;
          break;

        case ML_DISTINCT:
          // note: distinct "cant" have multiple counts of same var because that would reject
          let dlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < dlen; ++i) {
            count(3 + i * 2, false);
          }
          pc += SIZEOF_COUNT + dlen * 2;
          break;

        case ML_ISALL2:
          count(1, true);
          count(3, true);
          count(5, true, COUNT_ISALL_RESULT);
          pc += SIZEOF_VVV;
          break;

        case ML_VVV_ISEQ:
        case ML_VVV_ISNEQ:
        case ML_VVV_ISLT:
        case ML_VVV_ISLTE:
          count(1, false);
          count(3, false);
          count(5, true);
          pc += SIZEOF_VVV;
          break;

        case ML_PLUS:
        case ML_MINUS:
        case ML_MUL:
        case ML_DIV:
          count(1, false);
          count(3, false);
          count(5, false);
          pc += SIZEOF_VVV;
          break;

        case ML_V8V_ISEQ:
        case ML_V8V_ISNEQ:
        case ML_V8V_ISLT:
        case ML_V8V_ISLTE:
          count(1, false);
          count(4, true);
          pc += SIZEOF_V8V;
          break;

        case ML_VV8_ISEQ:
        case ML_VV8_ISNEQ:
        case ML_VV8_ISLT:
        case ML_VV8_ISLTE:
          count(1, false);
          count(3, false);
          pc += SIZEOF_VV8;
          break;

        case ML_8VV_ISLT:
        case ML_8VV_ISLTE:
          count(2, false);
          count(4, true);
          pc += SIZEOF_8VV;
          break;

        case ML_88V_ISEQ:
        case ML_88V_ISNEQ:
        case ML_88V_ISLT:
        case ML_88V_ISLTE:
          count(3, true);
          pc += SIZEOF_88V;
          break;

        case ML_V88_ISEQ:
        case ML_V88_ISNEQ:
        case ML_V88_ISLT:
        case ML_V88_ISLTE:
          count(1, false);
          pc += SIZEOF_V88;
          break;

        case ML_8V8_ISLT:
        case ML_8V8_ISLTE:
          count(2, false);
          pc += SIZEOF_8V8;
          break;

        case ML_888_ISEQ:
        case ML_888_ISNEQ:
        case ML_888_ISLT:
        case ML_888_ISLTE:
          pc += SIZEOF_888;
          break;

        case ML_8V_SUM:
          // TODO: count multiple occurrences of same var once
          let slen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < slen; ++i) {
            count(4 + i * 2, false);
          }
          count(4 + slen * 2, false); // R
          pc += SIZEOF_C8_COUNT + slen * 2 + 2;
          break;

        case ML_ISALL:
        case ML_ISNALL:
          let ilen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < ilen; ++i) {
            count(3 + i * 2, true);
          }
          count(3 + ilen * 2, true, op === ML_ISALL ? COUNT_ISALL_RESULT : 0); // R
          pc += SIZEOF_COUNT + ilen * 2 + 2;
          break;

        case ML_PRODUCT:
          // TODO: count multiple occurrences of same var once
          let plen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < plen; ++i) {
            count(3 + i * 2, false);
          }
          count(3 + plen * 2, false); // R
          pc += SIZEOF_COUNT + plen * 2 + 2;
          break;

        case ML_START:
          if (pc !== 0) return THROW(' ! compiler problem @', pcStart);
          ++pc;
          break;

        case ML_STOP:
          return;

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
          //console.error('(cnt) unknown op', pc,' at', pc,'ctrl+c now or log will fill up');
          //while (true) console.log('beep');
          ml_throw(ml, pc, '(cnt) unknown op');
      }
    }
    THROW('ML OOB');
  }
}

// BODY_STOP

export {
  COUNT_NONE,
  COUNT_BOOLY,
  COUNT_ISALL_RESULT,
  COUNT_NEQ,
  COUNT_LTE_RHS,

  counter,
};
