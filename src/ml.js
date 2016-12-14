import {
  ASSERT,
  THROW,
} from './helpers';
import {
  domain__debug,
} from './domain';

// BODY_START

let ml_opcodeCounter = 0;

// note: all ops accept vars and literals
// - a var is signified by a V
// - an 8bit literal signified by 8
// - a 16bit literal signified by F

const ML_UNUSED = ml_opcodeCounter++;

const ML_VV_EQ = ml_opcodeCounter++;
const ML_V8_EQ = ml_opcodeCounter++;
const ML_88_EQ = ml_opcodeCounter++;

const ML_VV_NEQ = ml_opcodeCounter++;
const ML_V8_NEQ = ml_opcodeCounter++;
const ML_88_NEQ = ml_opcodeCounter++;

const ML_VV_LT = ml_opcodeCounter++;
const ML_V8_LT = ml_opcodeCounter++;
const ML_8V_LT = ml_opcodeCounter++;
const ML_88_LT = ml_opcodeCounter++;

const ML_VV_LTE = ml_opcodeCounter++;
const ML_V8_LTE = ml_opcodeCounter++;
const ML_8V_LTE = ml_opcodeCounter++;
const ML_88_LTE = ml_opcodeCounter++;

const ML_VVV_ISEQ = ml_opcodeCounter++;
const ML_V8V_ISEQ = ml_opcodeCounter++;
const ML_VV8_ISEQ = ml_opcodeCounter++;
const ML_88V_ISEQ = ml_opcodeCounter++;
const ML_V88_ISEQ = ml_opcodeCounter++;
const ML_888_ISEQ = ml_opcodeCounter++;

const ML_VVV_ISNEQ = ml_opcodeCounter++;
const ML_V8V_ISNEQ = ml_opcodeCounter++;
const ML_VV8_ISNEQ = ml_opcodeCounter++;
const ML_88V_ISNEQ = ml_opcodeCounter++;
const ML_V88_ISNEQ = ml_opcodeCounter++;
const ML_888_ISNEQ = ml_opcodeCounter++;

const ML_VVV_ISLT = ml_opcodeCounter++;
const ML_8VV_ISLT = ml_opcodeCounter++;
const ML_V8V_ISLT = ml_opcodeCounter++;
const ML_VV8_ISLT = ml_opcodeCounter++;
const ML_88V_ISLT = ml_opcodeCounter++;
const ML_V88_ISLT = ml_opcodeCounter++;
const ML_8V8_ISLT = ml_opcodeCounter++;
const ML_888_ISLT = ml_opcodeCounter++;

const ML_VVV_ISLTE = ml_opcodeCounter++;
const ML_8VV_ISLTE = ml_opcodeCounter++;
const ML_V8V_ISLTE = ml_opcodeCounter++;
const ML_VV8_ISLTE = ml_opcodeCounter++;
const ML_88V_ISLTE = ml_opcodeCounter++;
const ML_V88_ISLTE = ml_opcodeCounter++;
const ML_8V8_ISLTE = ml_opcodeCounter++;
const ML_888_ISLTE = ml_opcodeCounter++;

const ML_8V_SUM = ml_opcodeCounter++; // constant: 8bit literal, result: var

const ML_PRODUCT = ml_opcodeCounter++;
const ML_DISTINCT = ml_opcodeCounter++;
const ML_PLUS = ml_opcodeCounter++;
const ML_MINUS = ml_opcodeCounter++;
const ML_MUL = ml_opcodeCounter++;
const ML_DIV = ml_opcodeCounter++;
const ML_JMP = ml_opcodeCounter++;
const ML_NOOP = ml_opcodeCounter++;
const ML_NOOP2 = ml_opcodeCounter++;
const ML_NOOP3 = ml_opcodeCounter++;
const ML_NOOP4 = ml_opcodeCounter++;
const ML_STOP = ml_opcodeCounter++;

ASSERT(ml_opcodeCounter <= 256, 'All opcodes are 8bit');

const SIZEOF_VV = 1 + 2 + 2;
const SIZEOF_8V = 1 + 1 + 2;
const SIZEOF_V8 = 1 + 2 + 1;
const SIZEOF_88 = 1 + 1 + 1;
const SIZEOF_VVV = 1 + 2 + 2 + 2;
const SIZEOF_8VV = 1 + 1 + 2 + 2;
const SIZEOF_V8V = 1 + 2 + 1 + 2;
const SIZEOF_VV8 = 1 + 2 + 2 + 1;
const SIZEOF_88V = 1 + 1 + 1 + 2;
const SIZEOF_V88 = 1 + 2 + 1 + 1;
const SIZEOF_8V8 = 1 + 1 + 2 + 1;
const SIZEOF_888 = 1 + 1 + 1 + 1;
const SIZEOF_COUNT = 1 + 2; // + 2*count
const SIZEOF_C8_COUNT = 1 + 2 + 1; // + 2*count

function ml_sizeof(opcode, ml, offset) {
  switch (opcode) {
    case ML_VV_EQ:
    case ML_VV_NEQ:
    case ML_VV_LT:
    case ML_VV_LTE:
      return SIZEOF_VV;

    case ML_UNUSED:
    case ML_V8_EQ:
    case ML_V8_NEQ:
    case ML_V8_LT:
    case ML_V8_LTE:
      return SIZEOF_V8;

    case ML_88_EQ:
    case ML_88_NEQ:
    case ML_88_LT:
    case ML_88_LTE:
      return SIZEOF_88;

    case ML_8V_LT:
    case ML_8V_LTE:
      return SIZEOF_8V;

    case ML_VVV_ISEQ:
    case ML_VVV_ISNEQ:
    case ML_VVV_ISLT:
    case ML_VVV_ISLTE:
    case ML_PLUS:
    case ML_MINUS:
    case ML_MUL:
    case ML_DIV:
      return SIZEOF_VVV;

    case ML_V8V_ISEQ:
    case ML_V8V_ISNEQ:
    case ML_V8V_ISLT:
    case ML_V8V_ISLTE:
      return SIZEOF_V8V;

    case ML_VV8_ISEQ:
    case ML_VV8_ISNEQ:
    case ML_VV8_ISLT:
    case ML_VV8_ISLTE:
      return SIZEOF_VV8;

    case ML_88V_ISEQ:
    case ML_88V_ISNEQ:
    case ML_88V_ISLT:
    case ML_88V_ISLTE:
      return SIZEOF_88V;

    case ML_V88_ISEQ:
    case ML_V88_ISNEQ:
    case ML_V88_ISLT:
    case ML_V88_ISLTE:
      return SIZEOF_V88;

    case ML_888_ISEQ:
    case ML_888_ISNEQ:
    case ML_888_ISLT:
    case ML_888_ISLTE:
      return SIZEOF_888;

    case ML_8VV_ISLT:
    case ML_8VV_ISLTE:
      return SIZEOF_8VV;

    case ML_8V8_ISLT:
    case ML_8V8_ISLTE:
      return SIZEOF_8V8;

    case ML_DISTINCT:
      if (ml && offset >= 0) return SIZEOF_COUNT + ml.readUInt16BE(offset + 1) * 2;
      return -1;

    case ML_8V_SUM:
      if (ml && offset >= 0) return SIZEOF_C8_COUNT + ml.readUInt16BE(offset + 1) * 2 + 2;
      return -1;

    case ML_PRODUCT:
      if (ml && offset >= 0) return SIZEOF_COUNT + ml.readUInt16BE(offset + 1) * 2 + 2;
      return -1;

    case ML_JMP:
      return 3;
    case ML_NOOP:
      return 1;
    case ML_NOOP2:
      return 2;
    case ML_NOOP3:
      return 3;
    case ML_NOOP4:
      return 4;
    case ML_STOP:
      return 1;
    default:
      THROW('unknown op: ' + opcode);
  }
}

function ml__debug(ml, offset, domains, names) {
  function ml_index(offset) {
    let index = ml.readUInt16BE(offset);
    return '{index=' + index + (names ? ',name=' + names[index] : '') + (domains ? ',' + domain__debug(domains[index]) : '') + '}';
  }

  let name = '';
  /* eslint-disable no-fallthrough */// should have an option to allow it when explicitly stated like below...
  switch (ml[offset]) {
    case ML_UNUSED:
      return 'unused_error(0)';

    case ML_VV_EQ:
      name = 'eq';
      /* fall-through */
    case ML_VV_NEQ:
      if (!name) name = 'neq';
      /* fall-through */
    case ML_VV_LT:
      if (!name) name = 'lt';
      /* fall-through */
    case ML_VV_LTE:
      if (!name) name = 'lte';
      return name + '(' + ml_index(offset + 1) + '), ' + ml_index(offset + 3) + ')';

    case ML_V8_EQ:
      name = 'eq';
      /* fall-through */
    case ML_V8_NEQ:
      if (!name) name = 'neq';
      /* fall-through */
    case ML_V8_LT:
      if (!name) name = 'lt';
      /* fall-through */
    case ML_V8_LTE:
      if (!name) name = 'lte';
      return name + '(' + ml_index(offset + 1) + ', ' + ml.readUInt8(offset + 3) + ')';

    case ML_88_EQ:
      name = 'eq';
      /* fall-through */
    case ML_88_NEQ:
      if (!name) name = 'neq';
      /* fall-through */
    case ML_88_LT:
      if (!name) name = 'lt';
      /* fall-through */
    case ML_88_LTE:
      if (!name) name = 'lte';
      return name + '(' + ml.readUInt8(offset + 1) + ', ' + ml.readUInt8(offset + 2) + ')';

    case ML_8V_LT:
      name = 'lt';
      /* fall-through */
    case ML_8V_LTE:
      if (!name) name = 'lte';
      return name + '(' + ml.readUInt8(offset + 1) + ', ' + ml_index(offset + 3) + ')';

    case ML_VVV_ISEQ:
      name = 'iseq';
      /* fall-through */
    case ML_VVV_ISNEQ:
      if (!name) name = 'isneq';
      /* fall-through */
    case ML_VVV_ISLT:
      if (!name) name = 'islt';
      /* fall-through */
    case ML_VVV_ISLTE:
      if (!name) name = 'islte';
      return name + '(' + ml_index(offset + 1) + ', ' + ml_index(offset + 3) + ', ' + ml_index(offset + 5) + ')';

    case ML_V8V_ISEQ:
      name = 'iseq';
      /* fall-through */
    case ML_V8V_ISNEQ:
      if (!name) name = 'isneq';
      /* fall-through */
    case ML_V8V_ISLT:
      if (!name) name = 'islt';
      /* fall-through */
    case ML_V8V_ISLTE:
      if (!name) name = 'islte';
      return name + '(' + ml_index(offset + 1) + ', ' + ml.readUInt8(offset + 3) + ', ' + ml_index(offset + 4) + ')';

    case ML_VV8_ISEQ:
      name = 'iseq';
      /* fall-through */
    case ML_VV8_ISNEQ:
      if (!name) name = 'isneq';
      /* fall-through */
    case ML_VV8_ISLT:
      if (!name) name = 'islt';
      /* fall-through */
    case ML_VV8_ISLTE:
      if (!name) name = 'islte';
      return name + '(' + ml_index(offset + 1) + ', ' + ml_index(offset + 3) + ', ' + ml.readUInt8(offset + 5) + ')';

    case ML_88V_ISEQ:
      name = 'iseq';
      /* fall-through */
    case ML_88V_ISNEQ:
      if (!name) name = 'isneq';
      /* fall-through */
    case ML_88V_ISLT:
      if (!name) name = 'islt';
      /* fall-through */
    case ML_88V_ISLTE:
      if (!name) name = 'islte';
      return name + '(' + ml.readUInt8(offset + 1) + ', ' + ml.readUInt8(offset + 2) + ', ' + ml_index(offset + 3) + ')';

    case ML_V88_ISEQ:
      name = 'iseq';
      /* fall-through */
    case ML_V88_ISNEQ:
      if (!name) name = 'isneq';
      /* fall-through */
    case ML_V88_ISLT:
      if (!name) name = 'islt';
      /* fall-through */
    case ML_V88_ISLTE:
      if (!name) name = 'islte';
      return name + '(' + ml_index(offset + 1) + ', ' + ml.readUInt8(offset + 3) + ', ' + ml.readUInt8(offset + 4) + ')';

    case ML_888_ISEQ:
      name = 'iseq';
      /* fall-through */
    case ML_888_ISNEQ:
      if (!name) name = 'isneq';
      /* fall-through */
    case ML_888_ISLT:
      if (!name) name = 'islt';
      /* fall-through */
    case ML_888_ISLTE:
      if (!name) name = 'islte';
      return name + '(' + ml.readUInt8(offset + 1) + ', ' + ml.readUInt8(offset + 2) + ', ' + ml.readUInt8(offset + 3) + ')';

    case ML_8VV_ISLT:
      if (!name) name = 'islt';
      /* fall-through */
    case ML_8VV_ISLTE:
      if (!name) name = 'islte';
      return name + '(' + ml.readUInt8(offset + 1) + ', ' + ml_index(offset + 2) + ', ' + ml_index(offset + 4) + ')';

    case ML_8V8_ISLT:
      if (!name) name = 'islt';
      /* fall-through */
    case ML_8V8_ISLTE:
      if (!name) name = 'islte';
      return name + '(' + ml.readUInt8(offset + 1) + ', ' + ml_index(offset + 2) + ', ' + ml.readUInt8(offset + 4) + ')';

    case ML_8V_SUM: {
      name = 'sum';
      let vars = '';
      let varcount = ml.readUInt16BE(offset + 1);
      let sumconstant = ml.readUInt8(offset + 3);
      for (let i = 0; i < varcount; ++i) {
        vars += ml.readUInt16BE(offset + SIZEOF_C8_COUNT + i * 2);
      }
      vars = name + '(' + sumconstant + ', ' + vars + ')';
      vars = ml.readUInt16BE(offset + SIZEOF_C8_COUNT + varcount * 2) + ' = ' + vars;
      return vars;

    }

    case ML_PRODUCT:
      if (!name) name = 'product';
      /* fall-through */
    case ML_DISTINCT:
      if (!name) name = 'distinct';
      let vars = '';
      let varcount = ml.readUInt16BE(offset + 1);
      for (let i = 0; i < varcount; ++i) {
        vars += ml.readUInt16BE(offset + SIZEOF_COUNT + i * 2);
      }
      vars = name + '(' + vars + ')';
      if (name !== 'distinct') vars = ml.readUInt16BE(offset + SIZEOF_COUNT + varcount * 2) + ' = ' + vars;
      return vars;

    case ML_PLUS:
      name = 'plus';
      /* fall-through */
    case ML_MINUS:
      if (!name) name = 'minus';
      /* fall-through */
    case ML_MUL:
      if (!name) name = 'mul';
      /* fall-through */
    case ML_DIV:
      if (!name) name = 'div';
      let trips = ml.readUInt16BE(offset + 1) + ', ' + ml.readUInt16BE(offset + 3);
      return ml.readUInt16BE(offset + 5) + ' = ' + name + '(' + trips + ')';

    case ML_JMP:
      return 'jmp(' + ml.readUInt16BE(offset + 1) + ')';

    case ML_NOOP:
      return 'noop(1)';

    case ML_NOOP2:
      return 'noop(2)';
    case ML_NOOP3:
      return 'noop(3)';
    case ML_NOOP4:
      return 'noop(4)';
    case ML_STOP:
      return 'stop()';

    default:
      THROW('add me');
  }
}

// BODY_STOP

export {
  ML_UNUSED,
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
  ML_8V_SUM,
  ML_PRODUCT,
  ML_DISTINCT,
  ML_PLUS,
  ML_MINUS,
  ML_MUL,
  ML_DIV,
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
  ml_sizeof,
};
