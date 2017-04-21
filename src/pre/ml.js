import {
  ASSERT,
  TRACE,
  THROW,
} from './helpers';
import {
  domain__debug,
} from '../domain';

// BODY_START

let ml_opcodeCounter = 0;

// note: all ops accept vars and literals
// - a var is signified by a V
// - an 8bit literal signified by 8
// - a 16bit literal signified by F

const ML_START = ml_opcodeCounter++;

const ML_EQ = ml_opcodeCounter++;
const ML_NEQ = ml_opcodeCounter++;
const ML_LT = ml_opcodeCounter++;
const ML_LTE = ml_opcodeCounter++;
const ML_ISEQ = ml_opcodeCounter++;
const ML_ISNEQ = ml_opcodeCounter++;
const ML_ISLT = ml_opcodeCounter++;
const ML_ISLTE = ml_opcodeCounter++;

const ML_NALL = ml_opcodeCounter++;
const ML_ISALL = ml_opcodeCounter++;
const ML_ISALL2 = ml_opcodeCounter++;
const ML_ISNALL = ml_opcodeCounter++;
const ML_ISNONE = ml_opcodeCounter++;

const ML_SUM = ml_opcodeCounter++; // constant: 8bit literal, result: var

const ML_PRODUCT = ml_opcodeCounter++;
const ML_DISTINCT = ml_opcodeCounter++;
const ML_PLUS = ml_opcodeCounter++;
const ML_MINUS = ml_opcodeCounter++;
const ML_MUL = ml_opcodeCounter++;
const ML_DIV = ml_opcodeCounter++;

const ML_AND = ml_opcodeCounter++;
const ML_OR = ml_opcodeCounter++;
const ML_XOR = ml_opcodeCounter++;
const ML_NAND = ml_opcodeCounter++;
const ML_XNOR = ml_opcodeCounter++;

const ML_DEBUG = ml_opcodeCounter++;
const ML_JMP = ml_opcodeCounter++;
const ML_JMP32 = ml_opcodeCounter++;
const ML_NOOP = ml_opcodeCounter++;
const ML_NOOP2 = ml_opcodeCounter++;
const ML_NOOP3 = ml_opcodeCounter++;
const ML_NOOP4 = ml_opcodeCounter++;
const ML_STOP = 0xff;

ASSERT(ml_opcodeCounter <= 0xff, 'All opcodes are 8bit');
ASSERT(ML_START === 0);
ASSERT(ML_STOP === 0xff);

const SIZEOF_V = 1 + 2; // 16bit
const SIZEOF_W = 1 + 4; // 32bit
const SIZEOF_VV = 1 + 2 + 2;
const SIZEOF_VVV = 1 + 2 + 2 + 2;
const SIZEOF_COUNT = 1 + 2; // + 2*count

let ml_typeCounter = 0;
const ML_NO_ARGS = ++ml_typeCounter;
const ML_V = ++ml_typeCounter;
const ML_W = ++ml_typeCounter;
const ML_VV = ++ml_typeCounter;
const ML_VVV = ++ml_typeCounter;
const ML_C = ++ml_typeCounter;
const ML_CR = ++ml_typeCounter;
const ML_C8R = ++ml_typeCounter;

function ml_sizeof(ml, offset, op) {
  switch (op) {
    case ML_EQ:
    case ML_NEQ:
    case ML_LT:
    case ML_LTE:
    case ML_AND:
    case ML_OR:
    case ML_XOR:
    case ML_NAND:
    case ML_XNOR:
      return SIZEOF_VV;

    case ML_START:
      return 1;

    case ML_ISEQ:
    case ML_ISNEQ:
    case ML_ISLT:
    case ML_ISLTE:
    case ML_PLUS:
    case ML_MINUS:
    case ML_MUL:
    case ML_DIV:
      return SIZEOF_VVV;

    case ML_NALL:
    case ML_DISTINCT:
      if (ml && offset >= 0) return SIZEOF_COUNT + ml.readUInt16BE(offset + 1) * 2;
      return -1;

    case ML_ISALL:
    case ML_ISNALL:
    case ML_ISNONE:
      if (ml && offset >= 0) return SIZEOF_COUNT + ml.readUInt16BE(offset + 1) * 2 + 2;
      return -1;

    case ML_ISALL2:
      return SIZEOF_VVV;

    case ML_SUM:
    case ML_PRODUCT:
      if (ml && offset >= 0) return SIZEOF_COUNT + ml.readUInt16BE(offset + 1) * 2 + 2;
      return -1;

    case ML_DEBUG:
      return SIZEOF_V;
    case ML_JMP:
      return SIZEOF_V + ml.readUInt16BE(offset + 1);
    case ML_JMP32:
      return SIZEOF_W + ml.readUInt32BE(offset + 1);
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
      //console.log('(ml) unknown op', op,' at', offset,'ctrl+c now or log will fill up');
      //while (true) console.error('ctrl+c me');
      TRACE('(ml_sizeof) unknown op: ' + ml[offset], ' at', offset);
      THROW('(ml_sizeof) unknown op: ' + ml[offset], ' at', offset);
  }
}

function ml_dec8(ml, pc) {
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  TRACE('\x1b[90m', ' . dec8pc decoding', ml[pc], 'from', pc, '\x1b[0m');
  return ml[pc];
}

function ml_dec16(ml, pc) {
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  let n = ml.readUInt16BE(pc); // (ml[pc++] << 8) | ml[pc];
  TRACE('\x1b[90m', ' . dec16pc decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1, '-->', n, '\x1b[0m');
  return n;
}

function ml_dec32(ml, pc) {
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  let n = ml.readUInt32BE(pc);
  TRACE('\x1b[90m', ' . dec32pc decoding', ml[pc], ml[pc + 1], ml[pc + 2], ml[pc + 3], '( x' + ml[pc].toString(16) + ml[pc + 1].toString(16) + ml[pc + 2].toString(16) + ml[pc + 3].toString(16), ') from', pc, '-->', n, '\x1b[0m');
  return n;
}

function ml_enc8(ml, pc, num) {
  TRACE('\x1b[90m', ' . enc8(' + num + '/x' + num.toString(16) + ') at', pc, ' ', '\x1b[0m');
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  ASSERT(typeof num === 'number', 'Encoding numbers', num);
  ASSERT(num >= 0 && num <= 0xff, 'Only encode 8bit values', num, '0x' + num.toString(16));
  ASSERT(num >= 0, 'only expecting non-negative nums', num);
  ml[pc] = num;
}

function ml_enc16(ml, pc, num) {
  TRACE('\x1b[90m', ' - enc16(' + num + '/x' + num.toString(16) + ')', (num >> 8) & 0xff, 'at', pc, 'and', num & 0xff, 'at', pc + 1, '\x1b[0m');
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  ASSERT(typeof num === 'number', 'Encoding numbers');
  ASSERT(num <= 0xffff, 'implement 32bit index support if this breaks', num);
  ASSERT(num >= 0, 'only expecting non-negative nums', num);
  // node 4.6 has no uint version and using writeInt16BE will cause problems, so:
  ml[pc++] = (num >> 8) & 0xff;
  ml[pc] = num & 0xff;
}

function ml_enc32(ml, pc, num) {
  ASSERT(ml instanceof Buffer, 'Expecting ml to be a buffer', typeof ml);
  ASSERT(typeof pc === 'number' && pc >= 0 && pc < ml.length, 'Invalid or OOB', pc, '>=', ml.length);
  ASSERT(typeof num === 'number', 'Encoding numbers');
  ASSERT(num <= 0xffffffff, 'implement 64bit index support if this breaks', num);
  TRACE('\x1b[90m', ' - enc32(' + num + '/x' + num.toString(16) + ')', ml[pc], ml[pc + 1], ml[pc + 2], ml[pc + 3], '( x' + ml[pc].toString(16) + ml[pc + 1].toString(16) + ml[pc + 2].toString(16) + ml[pc + 3].toString(16), ') at', pc + 1, '\x1b[0m');
  ASSERT(num >= 0, 'only expecting non-negative nums', num);
  // node 4.6 has no uint version and using writeInt32BE will cause problems, so:
  ml[pc++] = (num >> 24) & 0xff;
  ml[pc++] = (num >> 16) & 0xff;
  ml[pc++] = (num >> 8) & 0xff;
  ml[pc] = num & 0xff;
}

function ml_eliminate(ml, offset, sizeof) {
  ASSERT(ml instanceof Buffer, 'ml should be buffer', ml);
  TRACE(' - ml_eliminate: eliminating constraint at', offset, 'with size =', sizeof, ml.length < 50 ? ml : '');
  ASSERT(typeof offset === 'number' && offset >= 0 && offset < ml.length, 'valid offset required');
  ASSERT(typeof sizeof === 'number' && sizeof >= 0, 'valid sizeof required');
  ml_jump(ml, offset, sizeof);
  TRACE('    - after ml_eliminate:', ml.length < 50 ? ml : '<trunced>');
}

function ml_skip(ml, offset, len) {
  TRACE(' - ml_skip: compiling a skip at', offset, 'with size =', len);
  ml_jump(ml, offset, len);
}

function ml_jump(ml, offset, len) {
  TRACE('  - ml_jump: offset = ', offset, 'len = ', len);

  switch (ml[offset + len]) {
    case ML_NOOP:
      TRACE('  - jmp target is another jmp (noop), merging them');
      return ml_jump(ml, offset, len + 1);
    case ML_NOOP2:
      TRACE('  - jmp target is another jmp (noop2), merging them');
      return ml_jump(ml, offset, len + 2);
    case ML_NOOP3:
      TRACE('  - jmp target is another jmp (noop3), merging them');
      return ml_jump(ml, offset, len + 3);
    case ML_NOOP4:
      TRACE('  - jmp target is another jmp (noop4), merging them');
      return ml_jump(ml, offset, len + 4);
    case ML_JMP:
      let jmplen = ml_dec16(ml, offset + len + 1);
      ASSERT(jmplen > 0, 'dont think zero is a valid jmp len');
      ASSERT(jmplen <= 0xffff, 'oob');
      TRACE('  - jmp target is another jmp (len =', SIZEOF_V + jmplen, '), merging them');
      return ml_jump(ml, offset, len + SIZEOF_V + jmplen);
    case ML_JMP32:
      let jmplen32 = ml_dec32(ml, offset + len + 1);
      ASSERT(jmplen32 > 0, 'dont think zero is a valid jmp len');
      ASSERT(jmplen32 <= 0xffffffff, 'oob');
      TRACE('  - jmp target is a jmp32 (len =', SIZEOF_W + jmplen32, '), merging them');
      return ml_jump(ml, offset, len + SIZEOF_W + jmplen32);
  }

  switch (len) {
    case 0:
      return THROW('this is a bug');
    case 1:
      TRACE('  - compiling a NOOP');
      return ml_enc8(ml, offset, ML_NOOP);
    case 2:
      TRACE('  - compiling a NOOP2');
      return ml_enc8(ml, offset, ML_NOOP2);
    case 3:
      TRACE('  - compiling a NOOP3');
      return ml_enc8(ml, offset, ML_NOOP3);
    case 4:
      TRACE('  - compiling a NOOP4');
      return ml_enc8(ml, offset, ML_NOOP4);
    default:
      if (len < 0xffff) {
        TRACE('  - compiling a ML_JMP of', len, '(compiles', len - SIZEOF_V, 'because SIZEOF_V=', SIZEOF_V, ')');
        ml_enc8(ml, offset, ML_JMP);
        ml_enc16(ml, offset + 1, len - SIZEOF_V);
      } else {
        TRACE('  - compiling a ML_JMP32 of', len, '(compiles', len - SIZEOF_W, 'because SIZEOF_W=', SIZEOF_W, ')');
        ml_enc8(ml, offset, ML_JMP32);
        ml_enc32(ml, offset + 1, len - SIZEOF_W);
      }
  }
}

function ml_pump(ml, offset, from, to, len) {
  TRACE(' - pumping from', offset + from, 'to', offset + to, '(len=', len, ')');
  let fromOffset = offset + from;
  let toOffset = offset + to;
  for (let i = 0; i < len; ++i) {
    TRACE(' - pump', fromOffset, toOffset, '(1)');
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
      case ML_START:
        if (pc !== 0) return THROW('mlConstraints: zero op @', pcStart, 'Buffer(' + ml.toString('hex').replace(/(..)/g, '$1 ') + ')');
        ++pc;
        break;

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
        pc += SIZEOF_V + ml.readUInt16BE(pc + 1);
        break;
      case ML_JMP32:
        pc += SIZEOF_W + ml.readUInt32BE(pc + 1);
        break;

      default:
        let size = ml_sizeof(ml, pc, op); // throws if op is unknown
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
      case ML_START:
        if (pc !== 0) return ml_throw('oops');
        ++pc;
        break;

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
        pc += SIZEOF_V + ml.readUInt16BE(pc + 1);
        break;
      case ML_JMP32:
        pc += SIZEOF_W + ml.readUInt32BE(pc + 1);
        break;

      default:
        return true;
    }
  }

  THROW('ML OOB');
}

function ml_c2vv(ml, offset, argCount, opCode, indexA, indexB) {
  // "count without result" (distinct, nall, etc)
  TRACE(' -| ml_c2vv | from', offset, ', argCount=', argCount, ', op=', opCode, indexA, indexB);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);
  let oldLen = SIZEOF_COUNT + argCount * 2;
  ml_skip(ml, offset + SIZEOF_VV, oldLen - SIZEOF_VV);
}

function ml_any2c(ml, offset, oldSizeof, opCode, args) {
  TRACE(' -| ml_any2c | from', offset, 'was len=', oldSizeof, 'to op', opCode, 'with args', args, ', new size should be', SIZEOF_COUNT + args.length * 2);
  ASSERT(ml instanceof Buffer, 'ml is buffer', ml);
  ASSERT(typeof offset === 'number' && offset > 0 && offset < ml.length, 'valid offset', offset);
  ASSERT(typeof oldSizeof === 'number' && offset > 0 && offset < ml.length, 'valid oldSizeof', oldSizeof);
  ASSERT(args instanceof Array, 'args is list of indexes', args);

  let count = args.length;
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, count);
  for (let i = 0; i < count; ++i) {
    ml_enc16(ml, offset + SIZEOF_COUNT + i * 2, args[i]);
  }
  let newSizeof = SIZEOF_COUNT + count * 2;
  ASSERT(newSizeof <= oldSizeof, 'should fit!');
  if (newSizeof < oldSizeof) {
    ml_jump(ml, offset + newSizeof, oldSizeof - newSizeof);
  }
  ASSERT(ml_validateSkeleton(ml, 'ml_any2c'));
}

function ml_cr2vv(ml, offset, len, opCode, indexA, indexB) {
  // "count with result" (not like sum, which is c8r)
  TRACE(' -| ml_cr2vv | from', offset, ', len=', len, ', op=', opCode, indexA, indexB);
  ASSERT(ml instanceof Buffer, 'ml is buffer', ml);
  ASSERT(typeof offset === 'number' && offset > 0 && offset < ml.length, 'valid offset', offset);
  ASSERT(typeof opCode === 'number' && offset >= 0, 'valid opCode', opCode);
  ASSERT(typeof indexA === 'number' && indexA >= 0, 'valid indexA', indexA);
  ASSERT(typeof indexB === 'number' && indexB >= 0, 'valid indexB', indexB);

  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);
  let oldLen = SIZEOF_COUNT + len * 2 + 2;
  ml_skip(ml, offset + SIZEOF_VV, oldLen - SIZEOF_VV);
}

function ml_vv2vv(ml, offset, opCode, indexA, indexB) {
  TRACE(' -| ml_vv2vv | from', offset, ', op=', opCode, ', index AB:', indexA, indexB);
  ASSERT(ml instanceof Buffer, 'ml is buffer', ml);
  ASSERT(typeof offset === 'number' && offset > 0 && offset < ml.length, 'valid offset', offset);
  ASSERT(typeof opCode === 'number' && offset >= 0, 'valid opCode', opCode);
  ASSERT(typeof indexA === 'number' && indexA >= 0, 'valid indexA', indexA);
  ASSERT(typeof indexB === 'number' && indexB >= 0, 'valid indexB', indexB);

  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);

  ASSERT(ml_validateSkeleton(ml, 'ml_vv2vv'));
}

function ml_vvv2vv(ml, offset, opCode, indexA, indexB) {
  TRACE(' -| ml_vvv2vv |', opCode, indexA, indexB);
  ASSERT(ml instanceof Buffer, 'ml is buffer', ml);
  ASSERT(typeof offset === 'number' && offset > 0 && offset < ml.length, 'valid offset', offset);
  ASSERT(typeof opCode === 'number' && offset >= 0, 'valid opCode', opCode);
  ASSERT(typeof indexA === 'number' && indexA >= 0, 'valid indexA', indexA);
  ASSERT(typeof indexB === 'number' && indexB >= 0, 'valid indexB', indexB);

  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);
  ml_skip(ml, offset + SIZEOF_VV, SIZEOF_VVV - SIZEOF_VV);

  ASSERT(ml_validateSkeleton(ml, 'ml_vvv2vv'));
}

function ml_vvv2vvv(ml, offset, opCode, indexA, indexB, indexR) {
  TRACE(' -| cr_vvv2vvv |', opCode, indexA, indexB, indexR);
  ASSERT(ml instanceof Buffer, 'ml is buffer', ml);
  ASSERT(typeof offset === 'number' && offset > 0 && offset < ml.length, 'valid offset', offset);
  ASSERT(typeof opCode === 'number' && offset >= 0, 'valid opCode', opCode);
  ASSERT(typeof indexA === 'number' && indexA >= 0, 'valid indexA', indexA);
  ASSERT(typeof indexB === 'number' && indexB >= 0, 'valid indexB', indexB);
  ASSERT(typeof indexR === 'number' && indexR >= 0, 'valid indexR', indexR);

  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);
  ml_enc16(ml, offset + 5, indexR);

  ASSERT(ml_validateSkeleton(ml, 'ml_vvv2vvv'));
}

function ml_walk(ml, offset, callback) {
  ASSERT(ml instanceof Buffer, 'ml must be Buffer');
  ASSERT(typeof offset === 'number' && offset >= 0 && offset < ml.length, 'offset should be valid and not oob');
  ASSERT(typeof callback === 'function', 'callback should be callable');

  let len = ml.length;
  let op = ml[offset];
  while (offset < len) {
    op = ml[offset];
    ASSERT(offset === 0 || op !== ML_START, 'should not see op=0 unless offset=0', 'offset=', offset, 'ml=', ml);
    let sizeof = ml_sizeof(ml, offset, op);
    ASSERT(sizeof > 0, 'ops should occupy space');
    let r = callback(ml, offset, op, sizeof);
    if (r !== undefined) return r;
    offset += sizeof;
  }
}

/**
 * Walk the ml with a callback for each var encountered
 *
 * @param {Buffer} ml
 * @param {number} offset
 * @param {Function} callback Called as opCallback(ml, opoffset, optype, opcode, ...args) the actual `args` depend on the optype
 */
function ml_stream(ml, offset, callback) {
  ASSERT(ml instanceof Buffer, 'ml must be Buffer');
  ASSERT(typeof offset === 'number' && offset >= 0 && offset < ml.length, 'offset should be valid and not oob');
  ASSERT(typeof callback === 'function', 'callback should be callable');

  let r;
  let len = ml.length;
  let op = ml[offset];
  while (offset < len) {
    op = ml[offset];
    ASSERT(offset === 0 || op !== ML_START, 'should not see op=0 unless offset=0', 'offset=', offset, 'ml=', ml);

    let sizeof = 0;
    switch (op) {
      case ML_EQ:
      case ML_NEQ:
      case ML_LT:
      case ML_LTE:
      case ML_AND:
      case ML_OR:
      case ML_XOR:
      case ML_NAND:
      case ML_XNOR:
        r = callback(ml, offset, ML_VV, op, ml_dec16(ml, offset + 1), ml_dec16(ml, offset + 3));
        sizeof = SIZEOF_VV;
        break;

      case ML_ISEQ:
      case ML_ISNEQ:
      case ML_ISLT:
      case ML_ISLTE:
      case ML_PLUS:
      case ML_MINUS:
      case ML_MUL:
      case ML_DIV:
      case ML_ISALL2:
        r = callback(ml, offset, ML_VVV, op, ml_dec16(ml, offset + 1), ml_dec16(ml, offset + 3), ml_dec16(ml, offset + 5));
        sizeof = SIZEOF_VVV;
        break;

      case ML_NALL:
      case ML_DISTINCT:
        r = callback(ml, offset, ML_C, op, ml_dec16(ml, offset + 1));
        sizeof = SIZEOF_COUNT + ml_dec16(ml, offset + 1) * 2;
        break;

      case ML_ISALL:
      case ML_ISNALL:
      case ML_ISNONE:
      case ML_PRODUCT:
      case ML_SUM:
        r = callback(ml, offset, ML_CR, op, ml_dec16(ml, offset + 1), ml_dec16(ml, offset + SIZEOF_COUNT + ml_dec16(ml, offset + 1) * 2));
        sizeof = SIZEOF_COUNT + ml_dec16(ml, offset + 1) * 2 + 2;
        break;

      case ML_DEBUG:
        r = callback(ml, offset, ML_V, op, ml_dec16(ml, offset + 1));
        sizeof = SIZEOF_V;
        break;

      case ML_JMP:
        r = callback(ml, offset, ML_V, op, ml_dec16(ml, offset + 1));
        sizeof = SIZEOF_V + ml_dec16(ml, offset + 1);
        break;
      case ML_JMP32:
        r = callback(ml, offset, ML_W, op, ml_dec32(ml, offset + 1));
        sizeof = SIZEOF_W + ml_dec32(ml, offset + 1);
        break;

      case ML_NOOP2:
        r = callback(ml, offset, ML_NO_ARGS, op);
        sizeof = 2;
        break;
      case ML_NOOP3:
        r = callback(ml, offset, ML_NO_ARGS, op);
        sizeof = 3;
        break;
      case ML_NOOP4:
        r = callback(ml, offset, ML_NO_ARGS, op);
        sizeof = 4;
        break;

      case ML_NOOP:
      case ML_START:
      case ML_STOP:
        r = callback(ml, offset, ML_NO_ARGS, op);
        sizeof = 1;
        break;

      default:
        TRACE('(ml_walkVars) unknown op: ' + ml[offset], ' at', offset);
        ml_throw(ml, offset, '(ml_walkVars) unknown op');
    }

    ASSERT(sizeof > 0, 'ops should occupy space');
    if (r !== undefined) return r;
    offset += sizeof;
  }
}

function ml_validateSkeleton(ml, msg) {
  TRACE('--- ml_validateSkeleton', msg);
  let started = false;
  let stopped = false;
  ml_walk(ml, 0, (ml, offset, op) => {
    if (op === ML_START && offset === 0) started = true;
    if (op === ML_START && offset !== 0) ml_throw(ml, offset, 'ml_validateSkeleton: Found ML_START at offset', offset);
    if (op === ML_STOP) stopped = true;
    else if (stopped) ml_throw(ml, offset, 'ml_validateSkeleton: Should stop after encountering a stop but did not');
  });

  if (!started || !stopped) ml_throw(ml, ml.length, 'ml_validateSkeleton: Missing a ML_START or ML_STOP');
  TRACE('--- PASS ml_validateSkeleton');
  return true;
}

function ml_getRecycleOffset(ml, fromOffset, requiredSize) {
  TRACE(' - ml_getRecycleOffset looking for at least', requiredSize, 'bytes of free space');
  ASSERT(typeof fromOffset === 'number' && fromOffset >= 0, 'expecting fromOffset', fromOffset);
  ASSERT(typeof requiredSize === 'number' && requiredSize > 0, 'expecting size', requiredSize);
  // find a jump which covers at least the requiredSize
  return ml_walk(ml, fromOffset, (ml, offset, op) => {
    TRACE('   - considering op', op, 'at', offset);
    if (op === ML_JMP || op === ML_JMP32) {
      let size = ml_getOpSizeSlow(ml, offset);
      TRACE('   - found jump of', size, 'bytes at', offset + ', wanted', requiredSize, (requiredSize <= size ? ' so is ok!' : ' so is too small'));
      if (size >= requiredSize) return offset;
    }
  });
}

function ml_getRecycleOffsets(ml, fromOffset, slotCount, sizePerSlot) {
  TRACE(' - ml_getRecycleOffsets looking for empty spaces to fill', slotCount, 'times', sizePerSlot, 'bytes');
  ASSERT(typeof fromOffset === 'number' && fromOffset >= 0, 'expecting fromOffset', fromOffset);
  ASSERT(typeof slotCount === 'number' && slotCount > 0, 'expecting slotCount', slotCount);
  ASSERT(typeof sizePerSlot === 'number' && sizePerSlot > 0, 'expecting sizePerSlot', sizePerSlot);

  let spaces = [];

  // find a jump which covers at least the requiredSize
  ml_walk(ml, fromOffset, (ml, offset, op) => {
    TRACE('   - considering op', op, 'at', offset);
    if (op === ML_JMP || op === ML_JMP32) {
      let size = ml_getOpSizeSlow(ml, offset);
      TRACE('   - found jump of', size, 'bytes at', offset + ', wanted', sizePerSlot, (sizePerSlot <= size ? ' so is ok!' : ' so is too small'));
      if (size >= sizePerSlot) {
        spaces.push(offset); // only add it once!
        do { // remove as many from count as there fit in this empty space
          --slotCount;
          size -= sizePerSlot;
        } while (slotCount && size >= sizePerSlot);
        if (!slotCount) return true;
      }
    }
  });

  if (slotCount) return false; // unable to collect enough spaces
  return spaces;
}

function ml_recycles(ml, bins, loops, sizeofOp, callback) {
  let i = 0;
  while (i < loops) {
    let currentRecycleOffset = bins.pop();
    ASSERT(ml_dec8(ml, currentRecycleOffset) === ML_JMP, 'should only get jumps here'); // might trap a case where we clobber
    let sizeLeft = ml_getOpSizeSlow(ml, currentRecycleOffset);
    ASSERT(sizeLeft >= sizeofOp, 'this is what should have been asked for when getting recycled spaces');
    do {
      let stop = callback(currentRecycleOffset, i, sizeLeft);
      if (stop) return;
      ++i;
      sizeLeft -= sizeofOp;
      currentRecycleOffset += sizeofOp;
    } while (sizeLeft >= sizeofOp && i < loops);
    if (sizeLeft) ml_jump(ml, currentRecycleOffset, sizeLeft);
    ASSERT(ml_validateSkeleton(ml), 'trickNandIsall1 compiling loops'); // cant check earlier
  }
}

function ml_getOpSizeSlow(ml, offset) {
  ASSERT(ml instanceof Buffer, 'ml is a buf');
  ASSERT(typeof offset === 'number' && offset >= 0 && offset < ml.length, 'ml_getOpSizeSlow OOB');
  // this is much slower compared to using the constants because it has to read from the ML
  // this function exists to suplement recycling, where you must read the size of the jump
  // otherwise you won't know how much space is left after recycling
  let size = ml_sizeof(ml, offset, ml[offset]);
  TRACE(' - ml_getOpSizeSlow', offset, ml.length, '-->', size);
  return size;
}

function ml_recycleC3(ml, offset, op, indexA, indexB, indexC) {
  // explicitly rewrite a count with len=3
  let jumpOp = ml_dec8(ml, offset);
  TRACE('- ml_recycleC3 | offset=', offset, ', op=', op, indexA, indexB, indexC, jumpOp);
  ASSERT(jumpOp === ML_JMP || jumpOp === ML_JMP32, 'expecting to recycle a space that starts with a jump');
  ASSERT((jumpOp === ML_JMP ? SIZEOF_V + ml_dec16(ml, offset + 1) : SIZEOF_W + ml_dec32(ml, offset + 1)) >= SIZEOF_COUNT + 6, 'a c3 should fit'); // op + len + 3*2

  let currentSize = (jumpOp === ML_JMP ? SIZEOF_V + ml_dec16(ml, offset + 1) : SIZEOF_W + ml_dec32(ml, offset + 1));
  let newSize = SIZEOF_COUNT + 6;
  let remainsEmpty = currentSize - newSize;
  if (remainsEmpty < 0) THROW('recycled OOB');
  TRACE('- putting a c3', op, 'at', offset, ', old size=', currentSize, ', new size=', newSize, ', leaving', remainsEmpty, 'for a jump');

  ml_enc8(ml, offset, op);
  ml_enc16(ml, offset + 1, 3);
  ml_enc16(ml, offset + 3, indexA);
  ml_enc16(ml, offset + 5, indexB);
  ml_enc16(ml, offset + 7, indexC);

  if (remainsEmpty) ml_skip(ml, offset + newSize, remainsEmpty);
}

function ml_recycleVV(ml, offset, op, indexA, indexB) {
  let jumpOp = ml_dec8(ml, offset);
  TRACE('- ml_recycleVV', offset, op, indexA, indexB, jumpOp);
  ASSERT(jumpOp === ML_JMP || jumpOp === ML_JMP32, 'expecting to recycle a space that starts with a jump');
  ASSERT((jumpOp === ML_JMP ? SIZEOF_V + ml_dec16(ml, offset + 1) : SIZEOF_W + ml_dec32(ml, offset + 1)) >= SIZEOF_VV, 'a vv should fit'); // op + len + 3*2

  let currentSize = (jumpOp === ML_JMP ? SIZEOF_V + ml_dec16(ml, offset + 1) : SIZEOF_W + ml_dec32(ml, offset + 1));
  let remainsEmpty = currentSize - SIZEOF_VV;
  if (remainsEmpty < 0) THROW('recycled OOB');
  TRACE('- putting a vv', op, 'at', offset, 'of size', currentSize, 'leaving', remainsEmpty, 'for a jump');

  ml_enc8(ml, offset, op);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);

  if (remainsEmpty) ml_skip(ml, offset + SIZEOF_VV, remainsEmpty);
}

function ml__debug(ml, offset, max, problem, dontThrow) {
  let getDomain = problem && problem.getDomain;
  let names = problem && problem.varNames;

  function ml_index(offset) {
    let index = ml.readUInt16BE(offset);
    return '{index=' + index + (problem && index < names.length ? ',name=' + names[index] : '') + (problem ? ',' + domain__debug(getDomain(index)) : '') + '}';
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
    let op = ml[pc];
    /* eslint-disable no-fallthrough */// should have an option to allow it when explicitly stated like below...
    switch (op) {
      case ML_START:
        if (pc !== 0) {
          TRACE('collected debugs up to error:', rv);
          if (!dontThrow) THROW('ML_START at non-zero (' + pc + ')');
          rv.push('unused_error(0)');
          return rv.join('\n');
        }
        break;

      case ML_EQ:
        name = '==';
      /* fall-through */
      case ML_NEQ:
        if (!name) name = '!=';
      /* fall-through */
      case ML_LT:
        if (!name) name = '<';
      /* fall-through */
      case ML_LTE:
        if (!name) name = '<=';
      /* fall-through */
      case ML_AND:
        if (!name) name = '&';
      /* fall-through */
      case ML_OR:
        if (!name) name = '|';
      /* fall-through */
      case ML_XOR:
        if (!name) name = '^';
      /* fall-through */
      case ML_NAND:
        if (!name) name = '!&';
      /* fall-through */
      case ML_XNOR:
        if (!name) name = '!^';
        rv.push(ml_index(pc + 1) + ' ' + name + ' ' + ml_index(pc + 3));
        break;

      case ML_ISEQ:
        name = '==?';
      /* fall-through */
      case ML_ISNEQ:
        if (!name) name = '!=?';
      /* fall-through */
      case ML_ISLT:
        if (!name) name = '<?';
      /* fall-through */
      case ML_ISLTE:
        if (!name) name = '<=?';
        AB = ml_index(pc + 1) + ' ' + name + ' ' + ml_index(pc + 3);
        rv.push(ml_index(pc + 5) + ' = ' + AB);
        break;

      case ML_SUM:
        name = 'sum';
      /* fall-through */
      case ML_PRODUCT:
        if (!name) name = 'product';
      /* fall-through */
      case ML_ISALL:
        if (!name) name = 'isall';
      /* fall-through */
      case ML_ISNALL:
        if (!name) name = 'isnall';
      /* fall-through */
      case ML_ISNONE:
        if (!name) name = 'isnone';
        let vars = '';
        let varcount = ml_16(pc + 1);
        for (let i = 0; i < varcount; ++i) {
          vars += ml_index(pc + SIZEOF_COUNT + i * 2) + ' ';
        }
        vars = name + '(' + vars + ')';
        vars = ml_index(pc + SIZEOF_COUNT + varcount * 2) + ' = ' + vars;
        rv.push(vars);
        break;

      case ML_NALL:
        name = 'nall';
      /* fall-through */
      case ML_DISTINCT:
        if (!name) name = 'distinct';
        let xvars = '';
        let xvarcount = ml_16(pc + 1);
        for (let i = 0; i < xvarcount; ++i) {
          xvars += ml_index(pc + SIZEOF_COUNT + i * 2) + ' ';
        }
        xvars = name + '(' + xvars + ')';
        rv.push(xvars);
        break;

      case ML_ISALL2:
        AB = 'isAll( ' + ml_index(pc + 1) + ' , ' + ml_index(pc + 3) + ' ) # (isall2)';
        rv.push(ml_index(pc + 5) + ' = ' + AB);
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
      case ML_JMP32:
        rv.push('jmp32(' + ml.readUInt32BE(pc + 1) + ')');
        break;

      case ML_DEBUG:
        rv.push('debug(' + ml.readUInt16BE(pc + 1) + ')');
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
        THROW('add me [pc=' + pc + ', op=' + ml[pc] + ']');
    }

    let size = ml_sizeof(ml, pc, op);
    //console.log('size was:', size, 'rv=', rv);
    if (max !== 1) rv.push('\x1b[90m' + pc + ' ~ ' + (pc + size) + ' -> 0x ' + [...ml.slice(pc, pc + Math.min(size, 100))].map(c => (c < 16 ? '0' : '') + c.toString(16)).join(' ') + (size > 100 ? '... (trunced)' : '') + '\x1b[0m');
    pc += size;
  }

  return max === 1 ? rv[0] : ' ## ML Debug:\n' + rv.join('\n') + '\n ## End of ML Debug' + ((offset || pc < ml.length) ? ' (did not list all ops)...' : '') + '\n';
}

function ml_throw(ml, offset, msg) {
  console.error('There was an ML related error;', msg);
  let before = ml.slice(Math.max(0, offset - 30), offset);
  let after = ml.slice(offset, offset + 20);
  console.error('ML at error (offset=' + offset + '/' + ml.length + '):', before, after);
  console.error('->', ml__debug(ml, offset, 1));
  THROW(msg);
}

function ml_getOpList(ml) {
  let pc = 0;
  let rv = [];
  while (pc < ml.length) {
    let op = ml[pc];
    switch (op) {
      case ML_START:
        if (pc !== 0) {
          rv.push('error(0)');
          return rv.join(',');
        }
        break;

      case ML_EQ:
        rv.push('eq');
        break;
      case ML_NEQ:
        rv.push('neq');
        break;
      case ML_LT:
        rv.push('lt');
        break;
      case ML_LTE:
        rv.push('lte');
        break;
      case ML_AND:
        rv.push('and');
        break;
      case ML_OR:
        rv.push('or');
        break;
      case ML_XOR:
        rv.push('xor');
        break;
      case ML_NAND:
        rv.push('nand');
        break;
      case ML_XNOR:
        rv.push('xnor');
        break;

      case ML_ISEQ:
        rv.push('iseq');
        break;

      case ML_ISNEQ:
        rv.push('isneq');
        break;

      case ML_ISLT:
        rv.push('islt');
        break;

      case ML_ISLTE:
        rv.push('islte');
        break;

      case ML_SUM:
        rv.push('sum');
        break;
      case ML_PRODUCT:
        rv.push('product');
        break;
      case ML_ISALL:
        rv.push('isall');
        break;
      case ML_ISNALL:
        rv.push('isnall');
        break;
      case ML_ISNONE:
        rv.push('isnone');
        break;

      case ML_NALL:
        rv.push('nall');
        break;
      case ML_DISTINCT:
        rv.push('distinct');
        break;

      case ML_ISALL2:
        rv.push('isall2');
        break;

      case ML_PLUS:
        rv.push('plus');
        break;
      case ML_MINUS:
        rv.push('minus');
        break;
      case ML_MUL:
        rv.push('mul');
        break;
      case ML_DIV:
        rv.push('div');
        break;
    }

    pc += ml_sizeof(ml, pc, op);
  }

  return rv.sort((a, b) => a < b ? -1 : 1).join(',');
}

function ml_heapSort16bitInline(ml, offset, argCount) {
  ASSERT(ml instanceof Buffer, 'valid ML');
  ASSERT(typeof offset === 'number' && (offset === 0 || (offset > 0 && offset < ml.length)), 'valid offset', ml.length, offset, argCount);
  ASSERT(typeof argCount === 'number' && (argCount === 0 || (argCount > 0 && offset + argCount * 2 <= ml.length)), 'valid count', ml.length, offset, argCount);

  TRACE('     ### <ml_heapSort16bitInline>, argCount=', argCount, ', offset=', offset, ', buf=', ml.slice(offset, offset + argCount * 2));
  TRACE('     - values before:', new Array(argCount).fill(0).map((_, i) => ml.readUInt16BE(offset + i * 2)).join(' '));

  if (argCount <= 1) return; // finished this branch

  ml_heapify(ml, offset, argCount);

  let end = argCount - 1;
  while (end > 0) {
    TRACE('     - swapping first elemement (should be biggest of values left to do) [', ml.readUInt16BE(offset), '] with last [', ml.readUInt16BE(offset + end * 2), '] and reducing end [', end, '->', end - 1, ']');
    ml_swap16(ml, offset, offset + end * 2);
    TRACE('     - (total) buffer now: Buffer(', [].map.call(ml.slice(offset, offset + argCount * 2), b => (b < 16 ? '0' : '') + b.toString(16)).join(' '), ')');
    --end;
    ml_heapRepair(ml, offset, 0, end);
  }

  TRACE('     ### </ml_heapSort16bitInline> values after:', new Array(argCount).fill(0).map((_, i) => ml.readUInt16BE(offset + i * 2)).join(' '), 'buf:', ml.slice(offset, offset + argCount * 2));
}
function ml_heapParent(index) {
  return Math.floor((index - 1) / 2);
}
function ml_heapLeft(index) {
  return index * 2 + 1;
}
function ml_heapRight(index) {
  return index * 2 + 2;
}
function ml_heapify(ml, offset, len) {
  TRACE('     - ml_heapify', ml.slice(offset, offset + len * 2), offset, len);

  let start = ml_heapParent(len - 1);
  while (start >= 0) {
    ml_heapRepair(ml, offset, start, len - 1);
    --start; // wont this cause it to do it redundantly twice?
  }

  TRACE('     - ml_heapify end');
}
function ml_heapRepair(ml, offset, startIndex, endIndex) {
  TRACE('     - ml_heapRepair', offset, startIndex, endIndex, 'Buffer(', [].map.call(ml.slice(offset + startIndex * 2, offset + startIndex * 2 + (endIndex - startIndex + 1) * 2), b => (b < 16 ? '0' : '') + b.toString(16)).join(' '), ')');
  let parentIndex = startIndex;
  let parentValue = ml_dec16(ml, offset + parentIndex * 2);
  let leftIndex = ml_heapLeft(parentIndex);
  TRACE('     -- first leftIndex=', leftIndex, 'end=', endIndex);

  while (leftIndex <= endIndex) {
    TRACE('       - sift loop. indexes; parent=', parentIndex, 'left=', leftIndex, 'right=', ml_heapRight(parentIndex), 'values; parent=', ml.readUInt16BE(offset + parentIndex * 2) + '/' + parentValue, ' left=', ml.readUInt16BE(offset + leftIndex * 2), ' right=', ml_heapRight(parentIndex) <= endIndex ? ml.readUInt16BE(offset + ml_heapRight(parentIndex) * 2) : 'void');
    let leftValue = ml_dec16(ml, offset + leftIndex * 2);
    let swapIndex = parentIndex;
    let swapValue = parentValue;

    TRACE('         - swap<left?', swapValue, leftValue, swapValue < leftValue ? 'yes' : 'no');
    if (swapValue < leftValue) {
      swapIndex = leftIndex;
      swapValue = leftValue;
    }

    let rightIndex = ml_heapRight(parentIndex);
    TRACE('         - right index', rightIndex, '<=', endIndex, rightIndex <= endIndex ? 'yes it has a right child' : 'no right child');
    if (rightIndex <= endIndex) {
      let rightValue = ml_dec16(ml, offset + rightIndex * 2);
      TRACE('         - swap<right?', swapValue, rightValue);
      if (swapValue < rightValue) {
        swapIndex = rightIndex;
        swapValue = rightValue;
      }
    }

    TRACE('           - result; parent=', parentIndex, 'swap=', swapIndex, ', values; parent=', parentValue, ', swap=', swapValue, '->', (swapIndex === parentIndex ? 'finished, parent=swap' : 'should swap'));

    if (swapIndex === parentIndex) {
      TRACE('     - ml_heapRepair end early:', 'Buffer(', [].map.call(ml.slice(offset + startIndex * 2, offset + startIndex * 2 + (endIndex - startIndex + 1) * 2), b => (b < 16 ? '0' : '') + b.toString(16)).join(' '), ')');
      return;
    }
    // "swap"
    ml_enc16(ml, offset + parentIndex * 2, swapValue);
    ml_enc16(ml, offset + swapIndex * 2, parentValue);
    TRACE('             - setting parent to index=', swapIndex, ', value=', swapValue);
    parentIndex = swapIndex;
    // note: parentValue remains the same because the swapped child becomes the new parent and it gets the old parent value

    leftIndex = ml_heapLeft(parentIndex);
    TRACE('           - next left:', leftIndex, 'end:', endIndex);
  }

  TRACE('     - ml_heapRepair end:', ml.slice(offset + startIndex * 2, offset + startIndex * 2 + (endIndex - startIndex + 1) * 2));
}
function ml_swap16(ml, indexA, indexB) {
  let A = ml_dec16(ml, indexA);
  let B = ml_dec16(ml, indexB);
  ml_enc16(ml, indexA, B);
  ml_enc16(ml, indexB, A);
}

// BODY_STOP

export {
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
  ML_START,
  ML_STOP,

  SIZEOF_V,
  SIZEOF_W,
  SIZEOF_VV,
  SIZEOF_VVV,
  SIZEOF_COUNT,

  ML_NO_ARGS,
  ML_V,
  ML_W,
  ML_VV,
  ML_VVV,
  ML_C,
  ML_CR,
  ML_C8R,

  ml__debug,
  ml_getOpList,
  ml_countConstraints,
  ml_dec8,
  ml_dec16,
  ml_dec32,
  ml_enc8,
  ml_enc16,
  ml_enc32,
  ml_eliminate,
  ml_getRecycleOffset,
  ml_getRecycleOffsets,
  ml_getOpSizeSlow,
  ml_hasConstraint,
  ml_heapSort16bitInline,
  ml_jump,
  ml_pump,
  ml_recycles,
  ml_recycleC3,
  ml_recycleVV,
  ml_sizeof,
  ml_skip,
  ml_stream,
  ml_throw,
  ml_validateSkeleton,
  ml_walk,

  ml_any2c,
  ml_c2vv,
  ml_cr2vv,
  ml_vv2vv,
  ml_vvv2vv,
  ml_vvv2vvv,
};
