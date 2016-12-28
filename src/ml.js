import {
  ASSERT,
  ASSERT_LOG2,
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
const ML_STOP = 0xff;

ASSERT(ml_opcodeCounter <= 256, 'All opcodes are 8bit');

const SIZEOF_V = 1 + 2;
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

function ml_sizeof(ml, offset) {
  switch (ml[offset]) {
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
      return SIZEOF_V + ml.readUInt16BE(offset + 1);
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
      THROW('unknown op: ' + ml[offset]);
  }
}

function ml_dec8(ml, pc) {
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  ASSERT_LOG2(' . dec8pc decoding', ml[pc], 'from', pc);
  return ml[pc];
}

function ml_dec16(ml, pc) {
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  let n = ml.readUInt16BE(pc); // (ml[pc++] << 8) | ml[pc];
  ASSERT_LOG2(' . dec16pc decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1, '-->', n);
  return n;
}

function ml_enc8(ml, pc, num) {
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  ASSERT(typeof num === 'number', 'Encoding numbers', num);
  ASSERT(num >= 0 && num <= 0xff, 'Only encode 8bit values', num, '0x' + num.toString(16));
  ASSERT_LOG2(' . enc8(' + num + ')', num, 'at', pc, ' ');
  ASSERT(num >= 0, 'only expecting non-negative nums');
  ml[pc] = num;
}

function ml_enc16(ml, pc, num) {
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  ASSERT(typeof num === 'number', 'Encoding numbers');
  ASSERT(num <= 0xffff, 'implement 32bit index support if this breaks', num);
  ASSERT_LOG2(' - enc16(' + num + ')', (num >> 8) & 0xff, 'at', pc, 'and', num & 0xff, 'at', pc + 1);
  ASSERT(num >= 0, 'only expecting non-negative nums');
  // node 4.6 has no uint version and using writeInt16BE will cause problems, so:
  ml[pc++] = (num >> 8) & 0xff;
  ml[pc] = num & 0xff;
}

function ml_eliminate(ml, offset, sizeof) {
  ASSERT_LOG2(' - ml_eliminate: eliminating constraint at', offset, 'with size =', sizeof);
  ml_jump(ml, offset, sizeof);
}

function ml_skip(ml, offset, len) {
  ASSERT_LOG2(' - ml_skip: compiling a skip at', offset, 'with size =', len);
  ml_jump(ml, offset, len);
}

function ml_jump(ml, offset, len) {
  ASSERT_LOG2('  - ml_jump: offset = ', offset, 'len = ', len);

  switch (ml[offset + len]) {
    case ML_NOOP:
      ASSERT_LOG2('  - jmp target is another jmp (noop), merging them');
      return ml_jump(ml, offset, len + 1);
    case ML_NOOP2:
      ASSERT_LOG2('  - jmp target is another jmp (noop2), merging them');
      return ml_jump(ml, offset, len + 2);
    case ML_NOOP3:
      ASSERT_LOG2('  - jmp target is another jmp (noop3), merging them');
      return ml_jump(ml, offset, len + 3);
    case ML_NOOP4:
      ASSERT_LOG2('  - jmp target is another jmp (noop4), merging them');
      return ml_jump(ml, offset, len + 4);
    case ML_JMP:
      let jmplen = ml_dec16(ml, offset + len + 1);
      ASSERT(jmplen > 0, 'dont think zero is a valid jmp len');
      ASSERT_LOG2('  - jmp target is another jmp (jmp', jmplen, '), merging them');
      return ml_jump(ml, offset, len + SIZEOF_V + jmplen);
  }

  switch (len) {
    case 0:
      return THROW('this is a bug');
    case 1:
      ASSERT_LOG2('  - compiling a NOOP');
      return ml_enc8(ml, offset, ML_NOOP);
    case 2:
      ASSERT_LOG2('  - compiling a NOOP2');
      return ml_enc8(ml, offset, ML_NOOP2);
    case 3:
      ASSERT_LOG2('  - compiling a NOOP3');
      return ml_enc8(ml, offset, ML_NOOP3);
    case 4:
      ASSERT_LOG2('  - compiling a NOOP4');
      return ml_enc8(ml, offset, ML_NOOP4);
    default:
      ASSERT_LOG2('  - compiling a JMP of', len);
      ml_enc8(ml, offset, ML_JMP);
      ml_enc16(ml, offset + 1, len - SIZEOF_V);
  }
}

function ml_pump(ml, offset, from, to, len) {
  ASSERT_LOG2(' - pumping from', offset + from, 'to', offset + to, '(len=', len, ')');
  let fromOffset = offset + from;
  let toOffset = offset + to;
  for (let i = 0; i < len; ++i) {
    ASSERT_LOG2(' - pump', fromOffset, toOffset, '(1)');
    ml[fromOffset++] = ml[toOffset++];
  }
}

function ml_countConstraints(ml) {
  let pc = 0;
  let constraints = 0;

  while (pc < ml.length) {
    let pcStart = pc;
    let op = ml[pc];
    switch (op) {
      case ML_UNUSED:
        return THROW('mlConstraints: zero op @', pcStart, 'Buffer(' + ml.toString('hex').replace(/(..)/g, '$1 ') + ')');

      case ML_STOP:
        return constraints;

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
      case ML_JMP:
        pc += 3 + ml.readUInt16BE(pc + 1);
        break;

      default:
        let size = ml_sizeof(ml, pc); // throws if op is unknown
        ++constraints;
        pc += size;
    }
  }

  THROW('ML OOB');
}

function ml_hasConstraint(ml) {
  // technically this should be cheap; either the first
  // op is a constraint or it's a jump directly to stop.
  // (all jumps should be consolidated)
  let pc = 0;

  while (pc < ml.length) {
    switch (ml[pc]) {
      case ML_UNUSED:
        return ml_throw('oops');

      case ML_STOP:
        return false;

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
      case ML_JMP:
        pc += 3 + ml.readUInt16BE(pc + 1);
        break;

      default:
        return true;
    }
  }

  THROW('ML OOB');
}

function ml__debug(ml, offset, max, domains, names) {
  function ml_index(offset) {
    let index = ml.readUInt16BE(offset);
    return '{index=' + index + (names ? ',name=' + names[index] : '') + (domains ? ',' + domain__debug(domains[index]) : '') + '}';
  }

  function ml_8(offset) {
    return ml[offset];
  }

  function ml_16(offset) {
    return ml.readUInt16BE(offset);
  }

  let AB; // grrr switches and let are annoying

  if (max < 0) max = ml.length;
  let pc = offset;
  let count = 0;
  let rv = [];
  while (count++ < max && pc < ml.length) {
    let name = '';
    /* eslint-disable no-fallthrough */// should have an option to allow it when explicitly stated like below...
    switch (ml[pc]) {
      case ML_UNUSED:
        rv.push('unused_error(0)');
        return rv.join('\n');

      case ML_VV_EQ:
        name = '==';
      /* fall-through */
      case ML_VV_NEQ:
        if (!name) name = '!=';
      /* fall-through */
      case ML_VV_LT:
        if (!name) name = '<';
      /* fall-through */
      case ML_VV_LTE:
        if (!name) name = '<=';
        rv.push(ml_index(pc + 1) + ' ' + name + ' ' + ml_index(pc + 3));
        break;

      case ML_V8_EQ:
        name = '==';
      /* fall-through */
      case ML_V8_NEQ:
        if (!name) name = '!=';
      /* fall-through */
      case ML_V8_LT:
        if (!name) name = '<';
      /* fall-through */
      case ML_V8_LTE:
        if (!name) name = '<=';
        rv.push(ml_index(pc + 1) + ' ' + name + ' ' + ml_8(pc + 3));
        break;

      case ML_88_EQ:
        name = '==';
      /* fall-through */
      case ML_88_NEQ:
        if (!name) name = '!=';
      /* fall-through */
      case ML_88_LT:
        if (!name) name = '<';
      /* fall-through */
      case ML_88_LTE:
        if (!name) name = '<=';
        rv.push(ml_8(pc + 1) + ' ' + name + ' ' + ml_8(pc + 2));
        break;

      case ML_8V_LT:
        name = '<';
      /* fall-through */
      case ML_8V_LTE:
        if (!name) name = '<=';
        rv.push(ml_8(pc + 1) + ' ' + name + ' ' + ml_index(pc + 3));
        break;

      case ML_VVV_ISEQ:
        name = '==?';
      /* fall-through */
      case ML_VVV_ISNEQ:
        if (!name) name = '!=?';
      /* fall-through */
      case ML_VVV_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_VVV_ISLTE:
        if (!name) name = '<=?';
        AB = ml_index(pc + 1) + ' ' + name + ' ' + ml_index(pc + 3);
        rv.push(ml_index(pc + 5) + ' = ' + AB);
        break;

      case ML_V8V_ISEQ:
        name = '==?';
      /* fall-through */
      case ML_V8V_ISNEQ:
        if (!name) name = '!=?';
      /* fall-through */
      case ML_V8V_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_V8V_ISLTE:
        if (!name) name = '<=?';
        AB = ml_index(pc + 1) + ' ' + name + ' ' + ml_8(pc + 3);
        rv.push(ml_index(pc + 4) + ' = ' + AB);
        break;

      case ML_VV8_ISEQ:
        name = '==?';
      /* fall-through */
      case ML_VV8_ISNEQ:
        if (!name) name = '!=?';
      /* fall-through */
      case ML_VV8_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_VV8_ISLTE:
        if (!name) name = '<=?';
        AB = ml_index(pc + 1) + ' ' + name + ' ' + ml_index(pc + 3);
        rv.push(ml_8(pc + 5) + ' = ' + AB);
        break;

      case ML_88V_ISEQ:
        name = '==?';
      /* fall-through */
      case ML_88V_ISNEQ:
        if (!name) name = '!=?';
      /* fall-through */
      case ML_88V_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_88V_ISLTE:
        if (!name) name = '<=?';
        AB = ml_8(pc + 1) + ' ' + name + ' ' + ml_8(pc + 2);
        rv.push(ml_index(pc + 4) + ' = ' + AB);
        break;

      case ML_V88_ISEQ:
        name = '==?';
      /* fall-through */
      case ML_V88_ISNEQ:
        if (!name) name = '!=?';
      /* fall-through */
      case ML_V88_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_V88_ISLTE:
        if (!name) name = '<=?';
        AB = ml_index(pc + 1) + ' ' + name + ' ' + ml_8(pc + 3);
        rv.push(ml_8(pc + 4) + ' = ' + AB);
        break;

      case ML_888_ISEQ:
        name = '==?';
      /* fall-through */
      case ML_888_ISNEQ:
        if (!name) name = '!=?';
      /* fall-through */
      case ML_888_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_888_ISLTE:
        if (!name) name = '<=?';
        AB = ml_8(pc + 1) + ' ' + name + ' ' + ml_8(pc + 2);
        rv.push(ml_8(pc + 3) + ' = ' + AB);
        break;

      case ML_8VV_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_8VV_ISLTE:
        if (!name) name = '<=?';
        AB = ml_8(pc + 1) + ' ' + name + ' ' + ml_index(pc + 2);
        rv.push(ml_index(pc + 4) + ' = ' + AB);
        break;

      case ML_8V8_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_8V8_ISLTE:
        if (!name) name = '<=?';
        AB = ml_8(pc + 1) + ' ' + name + ' ' + ml_index(pc + 2);
        rv.push(ml_8(pc + 4) + ' = ' + AB);
        break;

      case ML_8V_SUM:
        {
          name = 'sum';
          let vars = '';
          let varcount = ml_16(pc + 1);
          let sumconstant = ml_8(pc + 3);
          for (let i = 0; i < varcount; ++i) {
            vars += ml_index(pc + SIZEOF_C8_COUNT + i * 2);
          }
          vars = name + '(' + sumconstant + ', ' + vars + ')';
          vars = ml_index(pc + SIZEOF_C8_COUNT + varcount * 2) + ' = ' + vars;
          rv.push(vars);
          break;
        }

      case ML_PRODUCT:
        name = 'product';
      /* fall-through */
      case ML_DISTINCT:
        if (!name) name = 'distinct';
        let vars = '';
        let varcount = ml_16(pc + 1);
        for (let i = 0; i < varcount; ++i) {
          vars += ml_index(pc + SIZEOF_COUNT + i * 2) + ' ';
        }
        vars = name + '(' + vars + ')';
        if (name === 'product') vars = ml_index(pc + SIZEOF_COUNT + varcount * 2) + ' = ' + vars;
        rv.push(vars);
        break;

      case ML_PLUS:
        name = '+';
      /* fall-through */
      case ML_MINUS:
        if (!name) name = '-';
      /* fall-through */
      case ML_MUL:
        if (!name) name = '*';
      /* fall-through */
      case ML_DIV:
        if (!name) name = '/';
        AB = ml_index(pc + 1) + ' ' + name + ' ' + ml_index(pc + 3);
        rv.push(ml_index(pc + 5) + ' = ' + AB);
        break;

      case ML_JMP:
        rv.push('jmp(' + ml.readUInt16BE(pc + 1) + ')');
        break;

      case ML_NOOP:
        rv.push('noop(1)');
        break;
      case ML_NOOP2:
        rv.push('noop(2)');
        break;
      case ML_NOOP3:
        rv.push('noop(3)');
        break;
      case ML_NOOP4:
        rv.push('noop(4)');
        break;
      case ML_STOP:
        rv.push('stop()');
        break;

      default:
        THROW('add me');
    }

    let size = ml_sizeof(ml, pc);
    //console.log('size was:', size, 'rv=', rv);
    if (max !== 1) rv.push(pc + ' ~ ' + (pc + size) + ' -> 0x ' + [...ml.slice(pc, pc + size)].map(c => (c < 16 ? '0' : '') + c.toString(16)).join(' '));
    pc += size;
  }

  return max === 1 ? rv[0] : ' ## ML Debug:\n' + rv.join('\n') + '\n ## End of ML Debug\n';
}

function ml_throw(ml, offset, msg) {
  console.log('There was an ML related error...');
  let before = ml.slice(Math.max(0, offset - 30), offset);
  let after = ml.slice(offset, offset + 20);
  console.log('ML at error (offset=' + offset + '):', before, after);
  console.log(ml__debug(ml, offset, 1));
  THROW(msg);
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

  SIZEOF_V,
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
  ml_countConstraints,
  ml_dec8,
  ml_dec16,
  ml_enc8,
  ml_enc16,
  ml_eliminate,
  ml_hasConstraint,
  ml_jump,
  ml_pump,
  ml_sizeof,
  ml_skip,
  ml_throw,
};