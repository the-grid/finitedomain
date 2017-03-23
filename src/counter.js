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

// BODY_START

/**
 * This was an early counting class, obsoleted by bounty.
 * Only used for debugging stats now.
 *
 * @param {Buffer} ml
 * @param {Object} problem
 */
function counter(ml, problem) {
  let varCount = problem.varNames.length;
  let getAlias = problem.getAlias;

  TRACE('\n ## counter', ml);
  let pc = 0;
  let counts = new Array(varCount).fill(0);
  countLoop(problem);
  TRACE(' - There are', counts.filter(c => !c).length, 'dead vars,', counts.filter(c => c === 1).length, 'leaf vars, and', counts.filter(c => c > 1).length, 'other vars');
  return counts;

  function count(delta) {
    let n = ml_dec16(ml, pc + delta);
    ASSERT(n >= 0 && n <= 0xffff, 'should be a valid index', n);
    let index = getAlias(n);
    ASSERT(!isNaN(index) && index >= 0 && index <= 0xffff, 'should be a valid var/constant index', index);
    if (index < varCount) {
      ++counts[index];
    }
  }

  function countLoop(problem) {
    pc = 0;
    let len = ml.length;
    TRACE(' - countLoop');
    while (pc < len) {
      let pcStart = pc;
      let op = ml[pc];
      TRACE(' -- CT pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, problem));
      switch (op) {
        case ML_NEQ:
          count(1);
          count(3);
          pc += SIZEOF_VV;
          break;

        case ML_LTE:
          count(1);
          count(3);
          pc += SIZEOF_VV;
          break;

        case ML_EQ:
        case ML_LT:
          count(1);
          count(3);
          pc += SIZEOF_VV;
          break;

        case ML_AND:
        case ML_OR:
        case ML_XOR:
        case ML_XNOR:
          count(1);
          count(3);
          pc += SIZEOF_VV;
          break;

        case ML_NAND:
          count(1);
          count(3);
          pc += SIZEOF_VV;
          break;

        case ML_NALL:
          let nlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < nlen; ++i) {
            count(3 + i * 2);
          }
          pc += SIZEOF_COUNT + nlen * 2;
          break;

        case ML_DISTINCT:
          // note: distinct "cant" have multiple counts of same var because that would reject
          let dlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < dlen; ++i) {
            count(3 + i * 2);
          }
          pc += SIZEOF_COUNT + dlen * 2;
          break;

        case ML_ISALL2:
          count(1);
          count(3);
          count(5);
          pc += SIZEOF_VVV;
          break;

        case ML_ISEQ:
        case ML_ISNEQ:
        case ML_ISLT:
        case ML_ISLTE:
          count(1);
          count(3);
          count(5);
          pc += SIZEOF_VVV;
          break;

        case ML_PLUS:
        case ML_MINUS:
        case ML_MUL:
        case ML_DIV:
          count(1);
          count(3);
          count(5);
          pc += SIZEOF_VVV;
          break;

        case ML_ISALL:
        case ML_ISNALL:
          let ilen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < ilen; ++i) {
            count(3 + i * 2);
          }
          count(3 + ilen * 2); // R
          pc += SIZEOF_COUNT + ilen * 2 + 2;
          break;

        case ML_ISNONE:
          let mlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < mlen; ++i) {
            count(3 + i * 2);
          }
          count(3 + mlen * 2);
          pc += SIZEOF_COUNT + mlen * 2 + 2;
          break;

        case ML_SUM:
        case ML_PRODUCT:
          // TODO: count multiple occurrences of same var once
          let plen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < plen; ++i) {
            count(3 + i * 2);
          }
          count(3 + plen * 2); // R
          pc += SIZEOF_COUNT + plen * 2 + 2;
          break;

        case ML_START:
          if (pc !== 0) return THROW(' ! compiler problem @', pcStart);
          ++pc;
          break;

        case ML_STOP:
          return;

        case ML_DEBUG:
          count(1); // R
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
          //console.error('(cnt) unknown op', pc,' at', pc,'ctrl+c now or log will fill up');
          //while (true) console.log('beep');
          ml_throw(ml, pc, '(cnt) unknown op');
      }
    }
    THROW('CNT ML OOB');
  }
}

// BODY_STOP

export {
  counter,
};
