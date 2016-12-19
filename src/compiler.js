/*
// this is an import function for config
// it converts a DSL string to a $config
// see /docs/dsl.txt for syntax
// see exporter.js to convert a config to this DSL
import {
  ASSERT,
  ASSERT_LOG2,
  THROW,
} from './helpers';
import {
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
  //
  //SIZEOF_VV,
  //SIZEOF_8V,
  //SIZEOF_V8,
  //SIZEOF_88,
  //SIZEOF_VVV,
  //SIZEOF_8VV,
  //SIZEOF_V8V,
  //SIZEOF_VV8,
  //SIZEOF_88V,
  //SIZEOF_V88,
  //SIZEOF_8V8,
  //SIZEOF_888,
  //SIZEOF_COUNT,
} from './ml';

// BODY_START


// Generate propagators from a list of
function compilePropagators(ml) {
  let out = Buffer.from(ml, 'binary');
  let oc = 0;

  let pc = 0;
  while (pc < ml.length) {
    let pcStart = pc;
    let op = ml[pc];
    ASSERT_LOG2('CRp[' + pc + ']:', op);
    switch (op) {
      case ML_UNUSED:
        return THROW('problem');

      case ML_STOP:
        ASSERT_LOG2(' - stop');
        out[oc++] = ML_STOP >>> 0;
        ++pc;
        break;

      case ML_JMP:
        ASSERT_LOG2(' - jump');
        ++pc;
        let delta = cr_dec16();
        if (delta <= 0) THROW('Empty jump'); // infinite loop
        ASSERT_LOG2('jumping by', delta, 'from', pc, 'to', pc + delta);
        pc = pcStart + delta;
        break;

      case ML_VV_EQ:
      case ML_V8_EQ:
      case ML_88_EQ:
      case ML_VV_NEQ:
      case ML_V8_NEQ:
      case ML_88_NEQ:
      case ML_VV_LT:
      case ML_V8_LT:
      case ML_8V_LT:
      case ML_88_LT:
      case ML_VV_LTE:
      case ML_V8_LTE:
      case ML_8V_LTE:
      case ML_88_LTE:
        ASSERT_LOG2(' - eq neq lt lte');
        out[oc++] = ml[pc++]; // OP
        out[oc++] = ml[pc++]; // A
        out[oc++] = ml[pc++];
        out[oc++] = ml[pc++]; // B
        out[oc++] = ml[pc++];
        break;

      case ML_NOOP:
        pc = pcStart + 1;
        ASSERT_LOG2('- noop @', pcStart, '->', pc);
        break;
      case ML_NOOP2:
        pc = pcStart + 2;
        ASSERT_LOG2('- noop2 @', pcStart, '->', pc);
        break;
      case ML_NOOP3:
        pc = pcStart + 3;
        ASSERT_LOG2('- noop2 @', pcStart, '->', pc);
        break;
      case ML_NOOP4:
        pc = pcStart + 4;
        ASSERT_LOG2('- noop4 @', pcStart, '->', pc);
        break;

      case ML_VVV_ISEQ:
      case ML_VVV_ISNEQ:
      case ML_VVV_ISLT:
      case ML_VVV_ISLTE:
      case ML_8V_SUM:
      case ML_PRODUCT:
      case ML_DISTINCT:
      case ML_PLUS:
      case ML_MINUS:
      case ML_MUL:
      case ML_DIV:
        return THROW('implement me (op)');

      default:
        THROW('unknown op: 0x' + op.toString(16));
    }
  }
  // a STOP will be compiled in as well unless the check below throws
  if (pc !== ml.length) THROW('Derailed, pc=' + pc + ', len=' + ml.length);

  return out;

  function cr_dec16() {
    ASSERT(pc < ml.length - 1, 'OOB');
    ASSERT_LOG2(' . decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1);
    return (ml[pc++] << 8) | ml[pc++];
  }

  //function cr_enc8(pc, num) {
  //  ASSERT(typeof num === 'number', 'Encoding numbers');
  //  ASSERT((num >> 0) <= 0xff, 'Only encode 8bit values');
  //  ASSERT(pc < ml.length, 'OOB');
  //  ml[pc] = num;
  //}
  //
  //function cr_enc88(pc, a, b) {
  //  ASSERT(typeof a === 'number', 'Encoding numbers');
  //  ASSERT(typeof b === 'number', 'Encoding numbers');
  //  ASSERT((a >> 0) <= 0xff, 'Only encode 8bit values');
  //  ASSERT((b >> 0) <= 0xff, 'Only encode 8bit values');
  //  ASSERT(pc < ml.length - 1, 'OOB');
  //  LOG(' - encoding', a, 'at', pc, 'and', b, 'at', pc + 1);
  //  ml[pc++] = a;
  //  ml[pc] = b;
  //}
  //
  //function cr_enc16(pc, num) {
  //  ASSERT(typeof num === 'number', 'Encoding numbers');
  //  ASSERT(num <= 0xffff, 'implement 32bit index support if this breaks', num);
  //  ASSERT(pc < ml.length - 1, 'OOB');
  //  LOG(' - encoding', (num >> 8) & 0xff, 'at', pc, 'and', num & 0xff, 'at', pc + 1);
  //  ml[pc++] = (num >> 8) & 0xff;
  //  ml[pc] = num & 0xff;
  //}
}

// BODY_STOP

export {
  compilePropagators,
};
*/
