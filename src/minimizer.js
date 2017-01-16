// problem optimizer
// take an input problem and determine whether constraints can be pruned
// or domains cut before actually generating their propagators

import {
  ASSERT,
  ASSERT_LOG2,
  THROW,
  TRACE_ADD,
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

  SIZEOF_V,
  SIZEOF_8V,
  SIZEOF_VV,
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
  ml_dec8,
  ml_dec16,
  ml_enc8,
  ml_enc16,
  ml_eliminate,
  ml_pump,
  ml_skip,
  ml_jump,
} from './ml';
import {
  domain__debug,
  domain_containsValue,
  domain_createEmpty,
  domain_createRange,
  domain_createRangeTrimmed,
  domain_createValue,
  domain_getValue,
  domain_hasNoZero,
  domain_intersection,
  domain_intersectionValue,
  domain_isBool,
  domain_isSolved,
  domain_isZero,
  domain_max,
  domain_min,
  domain_removeGte,
  domain_removeGtUnsafe,
  domain_removeLte,
  domain_removeLtUnsafe,
  domain_removeValue,
  domain_sharesNoElements,
  domain_size,
} from './domain';

// BODY_START

const MINIMIZER_STABLE = 0;
const MINIMIZER_SOLVED = 1;
const MINIMIZER_REJECTED = 2;

const MINIMIZE_ALIASED = false;

function cr_optimizeConstraints(ml, getVar, addVar, domains, names, addAlias, getAlias, solveStack) {
  ASSERT_LOG2('cr_optimizeConstraints', ml, domains.map(domain__debug));
  console.log('sweeping');
  let varChanged = true;
  let onlyJumps = true;
  let emptyDomain = false;
  let lastPcOffset = 0;
  let lastOp = 0;
  let pc = 0;
  let loops = 0;
  while (varChanged) {
    ++loops;
    //console.log('- looping', loops);
    console.time('-> loop ' + loops);
    ASSERT_LOG2('cr outer loop');
    varChanged = false;
    pc = 0;
    let ops = cr_innerLoop();
    ASSERT_LOG2('changed?', varChanged, 'only jumps?', onlyJumps, 'empty domain?', emptyDomain);
    if (emptyDomain) {
      console.log('Empty domain at', lastPcOffset, 'for opcode', lastOp, [ml__debug(ml, lastPcOffset, 1, domains, names)], ml.slice(lastPcOffset, lastPcOffset + 10));
      console.error('Empty domain, problem rejected');
    }
    console.timeEnd('-> loop ' + loops);
    console.log('   - ops this loop:', ops);
    if (emptyDomain) return MINIMIZER_REJECTED;
    if (onlyJumps) return MINIMIZER_SOLVED;

    ASSERT_LOG2('intermediate state:');
    ASSERT_LOG2(ml__debug(ml, 0, 20, domains, names));
  }
  return MINIMIZER_STABLE;

  function getDomainOrRestartForAlias(index, argDelta) {
    ASSERT(argDelta >= 0, 'expecting delta for compilation');
    let D = domains[index];
    if (D !== false) return D;

    ASSERT_LOG2(' ~ domain for', index, 'is falsy so this should be an alias, recompiling and restarting same op');
    // if the domain is falsy then there was an alias (or a bug)
    // write the alias back to ML and restart the current op
    // caller should ensure to check return value and return on
    // a falsy result as well so the loop can restart.
    let aliasIndex = getAlias(index);
    ASSERT_LOG2(' - alias(' + index + ') = ' + aliasIndex, 'writing to', lastPcOffset + argDelta, ' and hoping callsite will return');
    ASSERT(typeof aliasIndex === 'number' && aliasIndex >= 0, 'should have this alias');
    ml.writeUInt16BE(aliasIndex, lastPcOffset + argDelta);
    ASSERT(pc === lastPcOffset, 'expecting to restart'); // caller should stop and loop will restart this op with aliased index as if nothing happened
    return false;
  }

  function setDomain(index, domain, desc) {
    TRACE_ADD(index, domain__debug(domains[index]), domain__debug(domain), '(name=' + names[index] + ') ' + desc + '; ml: ' + ml__debug(ml, pc, 1));
    ASSERT_LOG2(' - {', index, '} updated from', domain__debug(domains[index]), 'to', domain__debug(domain));
    ASSERT(!domain || domain_intersection(domains[index], domain), 'should never add new values to a domain, only remove them', 'index=', index, 'old=', domain__debug(domains[index]), 'new=', domain__debug(domain), 'desc=', desc);
    domains[index] = domain;
    if (domain) varChanged = true;
    else emptyDomain = true;

    return emptyDomain;
  }

  function setEmpty(index, desc) {
    ASSERT_LOG2(' - :\'( setEmpty({', index, '})', desc);
    emptyDomain = true;
    if (index >= 0) setDomain(index, domain_createEmpty(), 'explicitly empty' + (desc ? '; ' + desc : ''));
  }

  function cr_innerLoop() {
    let ops = 0;
    onlyJumps = true;
    while (pc < ml.length && !emptyDomain) {
      ++ops;
      let pcStart = pc;
      lastPcOffset = pc;
      let op = ml[pc];
      lastOp = op;

      ASSERT_LOG2('# CRc[' + pcStart + ']:', op, '(0x' + op.toString(16) + ')');
      switch (op) {
        case ML_START:
          if (pc !== 0) {
            ASSERT_LOG2('reading a op=zero which should not happen', ml.slice(Math.max(pc - 100, 0), pc), '<here>', ml.slice(pc, pc + 100));
            return THROW(' ! optimizer problem @', pc);
          }
          ++pc;
          break;

        case ML_STOP:
          ASSERT_LOG2(' ! good end @', pcStart);
          return ops;

        case ML_VV_EQ:
          ASSERT_LOG2('- eq vv @', pcStart);
          cr_vv_eq(ml);
          break;

        case ML_V8_EQ:
          ASSERT_LOG2('- eq v8 @', pcStart);
          cr_v8_eq(ml);
          break;

        case ML_88_EQ:
          ASSERT_LOG2('- eq 88 @', pcStart);
          cr_88_eq(ml);
          break;

        case ML_VV_NEQ:
          ASSERT_LOG2('- neq vv @', pcStart);
          cr_vv_neq(ml);
          break;

        case ML_V8_NEQ:
          ASSERT_LOG2('- neq v8 @', pcStart);
          cr_v8_neq(ml);
          break;

        case ML_88_NEQ:
          ASSERT_LOG2('- neq 88 @', pcStart);
          cr_88_neq(ml);
          break;

        case ML_VV_LT:
          ASSERT_LOG2('- lt vv @', pcStart);
          cr_vv_lt(ml);
          break;

        case ML_V8_LT:
          ASSERT_LOG2('- lt v8 @', pcStart);
          cr_v8_lt(ml);
          break;

        case ML_8V_LT:
          ASSERT_LOG2('- lt 8v @', pcStart);
          cr_8v_lt(ml);
          break;

        case ML_88_LT:
          ASSERT_LOG2('- lt 88 @', pcStart);
          cr_88_lt(ml);
          break;

        case ML_VV_LTE:
          ASSERT_LOG2('- lte vv @', pcStart);
          cr_vv_lte(ml);
          break;

        case ML_V8_LTE:
          ASSERT_LOG2('- lte v8 @', pcStart);
          cr_v8_lte(ml);
          break;

        case ML_8V_LTE:
          ASSERT_LOG2('- lte 8v @', pcStart);
          cr_8v_lte(ml);
          break;

        case ML_88_LTE:
          ASSERT_LOG2('- lte 88 @', pcStart);
          cr_88_lte(ml);
          break;

        case ML_NALL:
          ASSERT_LOG2('- nall @', pcStart);
          cr_nall(ml);
          break;

        case ML_ISALL:
          ASSERT_LOG2('- isall @', pcStart);
          cr_isAll(ml);
          break;

        case ML_ISALL2:
          ASSERT_LOG2('- isall2 @', pcStart);
          cr_isAll2(ml);
          break;

        case ML_ISNALL:
          ASSERT_LOG2('- isnall @', pcStart);
          cr_isNall(ml);
          break;

        case ML_DISTINCT:
          ASSERT_LOG2('- distinct @', pcStart);
          cr_distinct(ml);
          break;

        case ML_PLUS:
          ASSERT_LOG2('- plus @', pcStart);
          cr_plus(ml);
          break;

        case ML_MINUS:
          ASSERT_LOG2('- minus @', pcStart);
          cr_minus(ml);
          break;

        case ML_MUL:
          ASSERT_LOG2('- mul @', pcStart);
          cr_mul(ml);
          break;

        case ML_DIV:
          ASSERT_LOG2('- div @', pcStart);
          cr_div(ml);
          break;

        case ML_VVV_ISEQ:
          ASSERT_LOG2('- iseq vvv @', pcStart);
          cr_vvv_isEq(ml);
          break;

        case ML_V8V_ISEQ:
          ASSERT_LOG2('- iseq v8v @', pcStart);
          cr_v8v_isEq(ml);
          break;

        case ML_VV8_ISEQ:
          ASSERT_LOG2('- iseq vv8 @', pcStart);
          cr_vv8_isEq(ml);
          break;

        case ML_88V_ISEQ:
          ASSERT_LOG2('- iseq 88v @', pcStart);
          cr_88v_isEq(ml);
          break;

        case ML_V88_ISEQ:
          ASSERT_LOG2('- iseq v88 @', pcStart);
          cr_v88_isEq(ml);
          break;

        case ML_888_ISEQ:
          ASSERT_LOG2('- iseq 888 @', pcStart);
          cr_888_isEq(ml);
          break;

        case ML_VVV_ISNEQ:
          ASSERT_LOG2('- isneq vvv @', pcStart);
          cr_vvv_isNeq(ml);
          break;

        case ML_V8V_ISNEQ:
          ASSERT_LOG2('- isneq v8v @', pcStart);
          cr_v8v_isNeq(ml);
          break;

        case ML_VV8_ISNEQ:
          ASSERT_LOG2('- isneq vv8 @', pcStart);
          cr_vv8_isNeq(ml);
          break;

        case ML_88V_ISNEQ:
          ASSERT_LOG2('- isneq 88v @', pcStart);
          cr_88v_isNeq(ml);
          break;

        case ML_V88_ISNEQ:
          ASSERT_LOG2('- isneq v88 @', pcStart);
          cr_v88_isNeq(ml);
          break;

        case ML_888_ISNEQ:
          ASSERT_LOG2('- isneq 888 @', pcStart);
          cr_888_isNeq(ml);
          break;

        case ML_VVV_ISLT:
          ASSERT_LOG2('- islt vvv @', pcStart);
          cr_vvv_isLt(ml);
          break;

        case ML_8VV_ISLT:
          ASSERT_LOG2('- islt 8vv @', pcStart);
          cr_8vv_isLt(ml);
          break;

        case ML_V8V_ISLT:
          ASSERT_LOG2('- islt v8v @', pcStart);
          cr_v8v_isLt(ml);
          break;

        case ML_VV8_ISLT:
          ASSERT_LOG2('- islt vv8 @', pcStart);
          cr_vv8_isLt(ml);
          break;

        case ML_88V_ISLT:
          ASSERT_LOG2('- islt 88v @', pcStart);
          cr_88v_isLt(ml);
          break;

        case ML_V88_ISLT:
          ASSERT_LOG2('- islt v88 @', pcStart);
          cr_v88_isLt(ml);
          break;

        case ML_8V8_ISLT:
          ASSERT_LOG2('- islt 8v8 @', pcStart);
          cr_8v8_isLt(ml);
          break;

        case ML_888_ISLT:
          ASSERT_LOG2('- islt 888 @', pcStart);
          cr_888_isLt(ml);
          break;

        case ML_VVV_ISLTE:
          ASSERT_LOG2('- islte vvv @', pcStart);
          cr_vvv_isLte(ml);
          break;

        case ML_8VV_ISLTE:
          ASSERT_LOG2('- islte 8vv @', pcStart);
          cr_8vv_isLte(ml);
          break;

        case ML_V8V_ISLTE:
          ASSERT_LOG2('- islte v8v @', pcStart);
          cr_v8v_isLte(ml);
          break;

        case ML_VV8_ISLTE:
          ASSERT_LOG2('- islte vv8 @', pcStart);
          cr_vv8_isLte(ml);
          break;

        case ML_88V_ISLTE:
          ASSERT_LOG2('- islte 88v @', pcStart);
          cr_88v_isLte(ml);
          break;

        case ML_V88_ISLTE:
          ASSERT_LOG2('- islte v88 @', pcStart);
          cr_v88_isLte(ml);
          break;

        case ML_8V8_ISLTE:
          ASSERT_LOG2('- islte 8v8 @', pcStart);
          cr_8v8_isLte(ml);
          break;

        case ML_888_ISLTE:
          ASSERT_LOG2('- islte 888 @', pcStart);
          cr_888_isLte(ml);
          break;

        case ML_8V_SUM:
          ASSERT_LOG2('- sum @', pcStart);
          cr_sum(ml);
          break;

        case ML_PRODUCT:
          ASSERT_LOG2('- product @', pcStart);
          cr_product(ml);
          break;

        case ML_VV_AND:
          ASSERT_LOG2('- and @', pcStart);
          cr_vv_and(ml);
          break;

        case ML_VV_OR:
          ASSERT_LOG2('- or @', pcStart);
          cr_vv_or(ml);
          break;

        case ML_VV_XOR:
          ASSERT_LOG2('- xor @', pcStart);
          cr_vv_xor(ml);
          break;

        case ML_VV_NAND:
          ASSERT_LOG2('- nand @', pcStart);
          cr_vv_nand(ml);
          break;

        case ML_VV_XNOR:
          ASSERT_LOG2('- xnor @', pcStart);
          cr_vv_xnor(ml);
          break;

        case ML_NOOP:
          ASSERT_LOG2('- noop @', pc);
          cr_moveTo(ml, pc, 1);
          break;
        case ML_NOOP2:
          ASSERT_LOG2('- noop2 @', pc);
          cr_moveTo(ml, pc, 2);
          break;
        case ML_NOOP3:
          ASSERT_LOG2('- noop3 @', pc);
          cr_moveTo(ml, pc, 3);
          break;
        case ML_NOOP4:
          ASSERT_LOG2('- noop4 @', pc);
          cr_moveTo(ml, pc, 4);
          break;
        case ML_JMP:
          ASSERT_LOG2('- jmp @', pc);
          let delta = ml_dec16(ml, pc + 1);
          cr_moveTo(ml, pc, SIZEOF_V + delta);
          break;

        default:
          THROW('unknown op: 0x' + op.toString(16));
      }
      if (pc === pcStart) {
        ASSERT_LOG2(' - restarting op from same pc...');
      }
    }
    if (emptyDomain) return ops;
    return THROW('Derailed; expected to find STOP before EOF');
  }

  function cr_moveTo(ml, offset, len) {
    ASSERT_LOG2(' - trying to move from', offset, 'to', offset + len, 'delta = ', len);
    switch (ml_dec8(ml, offset + len)) {
      case ML_NOOP:
      case ML_NOOP2:
      case ML_NOOP3:
      case ML_NOOP4:
      case ML_JMP:
        ASSERT_LOG2('- moving to another jump so merging them now');
        ml_jump(ml, offset, len);
        pc = offset; // restart, make sure the merge worked
        break;
      default:
        pc = offset + len;
        break;
    }
  }

  function cr_vv_eq() {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    if (indexA !== indexB) {
      let A = getDomainOrRestartForAlias(indexA, 1);
      let B = getDomainOrRestartForAlias(indexB, 3);
      if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED) return; // there was an alias; restart op

      ASSERT_LOG2(' = cr_vv_eq', indexA, indexB, domain__debug(A), domain__debug(B));
      if (!A) return setEmpty(indexA, 'bad state');
      if (!B) return setEmpty(indexB, 'bad state');

      let R = domain_intersection(A, B);
      ASSERT_LOG2(' ->', domain__debug(R));
      if (A !== R || B !== R) {
        setDomain(indexA, R, 'A == B');
        setDomain(indexB, R, 'A == B');
        if (!R) return;
      }

      addAlias(indexB, indexA);
    }

    // the vars are now intersected and aliased. we can remove this constraint.
    ml_eliminate(ml, offset, SIZEOF_VV);
  }

  function cr_v8_eq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    ASSERT_LOG2(' = cr_v8_eq', indexA, domain__debug(A), vB);
    if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

    if (!A) return setEmpty(indexA, 'bad state');

    if (!domain_containsValue(A, vB)) {
      ASSERT_LOG2(' - A did not contain literal', vB, 'so search rejects');
      return setEmpty(indexA, 'A did not contain literal ' + vB);
    }

    let oA = A;
    A = domain_createValue(vB);
    if (A !== oA) {
      if (setDomain(indexA, A, 'A == lit')) return;
    }

    // domain must be solved now since B was a literal (a solved constant)
    ml_eliminate(ml, offset, SIZEOF_V8);
  }

  function cr_88_eq(ml) {
    // (artifact) either remove constraint if they are equal or reject if they are not

    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);

    ASSERT_LOG2(' = cr_88_eq', vA, vB);

    if (vA !== vB) return setEmpty(-1, 'literals ' + vA + '!=' + vB + ' so fail');

    ml_eliminate(ml, offset, SIZEOF_88);
  }

  function cr_vv_neq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vv_neq', indexA, indexB, domain__debug(A), domain__debug(B));
    if (!A) return setEmpty(indexA, 'bad state');
    if (!B) return setEmpty(indexB, 'bad state');

    // if either is solved then the other domain should
    // become the result of unsolved_set "minus" solved_set
    let vA = domain_getValue(A);
    if (vA >= 0) {
      let oB = B;
      B = domain_removeValue(B, vA);
      if (oB !== B) {
        if (setDomain(indexB, B, 'A neq B with A solved')) return;
      }
    }
    let vB = domain_getValue(B);
    if (domain_getValue(B) >= 0) {
      let oA = A;
      A = domain_removeValue(A, vB);
      if (A !== oA) {
        if (setDomain(indexA, A, 'A neq B with B solved')) return;
      }
    }
    if (vA < 0) {
      // check A again if not already solved... B may have affected it
      vA = domain_getValue(A);
      if (vA >= 0) {
        let oB = B;
        B = domain_removeValue(B, vA);
        if (oB !== B) {
          if (setDomain(indexB, B, 'A neq B with A solved in the rebound')) return;
        }
      }
    }
    // artifact case can happen after certain morphs
    if (indexA === indexB) return setEmpty(indexA, 'contraction A != A');

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B));

    // solved if the two domains (now) intersects to an empty domain
    if (domain_sharesNoElements(A, B)) {
      ASSERT_LOG2(' - No element overlapping between', indexA, 'and', indexB, '(', domain__debug(A), ' & ', domain__debug(B), ') so we can eliminate this neq');
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VV;
    }
  }

  function cr_v8_neq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v8_neq', indexA, domain__debug(A), vB);
    if (!A) return setEmpty(indexA, 'bad state');

    // remove the literal from A and remove constraint
    let oA = A;

    A = domain_removeValue(A, vB);
    ASSERT_LOG2(' ->', domain__debug(A));
    if (A !== oA) {
      if (setDomain(indexA, A, 'A neq lit')) return;
    }

    ml_eliminate(ml, offset, SIZEOF_V8);
  }

  function cr_88_neq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);

    ASSERT_LOG2(' = cr_88_neq', vA, vB);

    if (vA === vB) return setEmpty(-1, 'neq but literals ' + vA + ' == ' + vB + 'so fail');

    ml_eliminate(ml, offset, SIZEOF_88);
  }

  function cr_vv_lt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vv_lt {', indexA, '} < {', indexB, '}   -->  ', domain__debug(A), '<', domain__debug(B));
    if (!A) return setEmpty(indexA, 'bad state');
    if (!B) return setEmpty(indexB, 'bad state');

    // relative comparison is easy; cut away any non-intersecting
    // values that violate the desired outcome. only when a A and
    // B have multiple intersecting values we have to keep this
    // constraint
    let oA = A;
    A = domain_removeGte(A, domain_max(B));
    if (A !== oA) {
      if (setDomain(indexA, A, 'A lt B')) return;
    }

    let oB = B;
    B = domain_removeLte(B, domain_min(A));
    if (B !== oB) {
      if (setDomain(indexB, B, 'A lt B')) return;
      pc = offset; // repeat because B changed which may affect A
      return;
    }

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B));

    // any value in A must be < any value in B
    if (domain_max(A) < domain_min(B)) {
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VV;
    }
  }

  function cr_v8_lt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v8_lt', indexA, domain__debug(A), vB);
    if (!A) return setEmpty(indexA, 'bad state');
    if (domain_min(A) >= vB) return setEmpty(indexA, 'lt but min(A)<lit(' + vB + ')');

    let oA = A;
    // remove any value gte vB and remove constraint
    A = domain_removeGte(A, vB);
    ASSERT_LOG2(' ->', domain__debug(A));

    if (A !== oA) {
      if (setDomain(indexA, A, 'A lt lit')) return;
    }

    ml_eliminate(ml, offset, SIZEOF_V8);
  }

  function cr_8v_lt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let vA = ml_dec8(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let B = getDomainOrRestartForAlias(indexB, 2);
    if (B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_8v_lt', vA, indexB, domain__debug(B));
    if (!B) return setEmpty(indexB, 'bad state');
    if (vA >= domain_max(B)) return setEmpty(indexB, 'lt but max(B)>=lit(' + vA + ')');

    let oB = B;
    // remove any value lte vA and remove constraint
    B = domain_removeLte(B, vA);
    ASSERT_LOG2(' ->', domain__debug(B));
    if (B !== oB) {
      if (setDomain(indexB, B, 'lit lt B')) return;
    }

    ml_eliminate(ml, offset, SIZEOF_8V);
  }

  function cr_88_lt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);

    ASSERT_LOG2(' = cr_88_lt', vA, vB);
    if (vA >= vB) return setEmpty(-1, 'lt but literals ' + vA + ' >= ' + vB + ' so fail');

    ml_eliminate(ml, offset, SIZEOF_88);
  }

  function cr_vv_lte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vv_lte', indexA, indexB, domain__debug(A), domain__debug(B));
    if (!A) return setEmpty(indexA, 'bad state');
    if (!B) return setEmpty(indexB, 'bad state');

    // relative comparison is easy; cut away any non-intersecting
    // values that violate the desired outcome. only when a A and
    // B have multiple intersecting values we have to keep this
    // constraint

    let oA = A;
    A = domain_removeGtUnsafe(A, domain_max(B));
    if (A !== oA) {
      if (setDomain(indexA, A, 'A lte B')) return;
    }

    // A is (now) empty so just remove it
    let oB = B;
    B = domain_removeLtUnsafe(B, domain_min(A));
    if (B !== oB) {
      if (setDomain(indexB, B, 'A lte B')) return;
      pc = offset; // repeat because B changed which may affect A
      return;
    }

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B));

    // any value in A must be < any value in B
    if (domain_max(A) <= domain_min(B)) {
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VV;
    }
  }

  function cr_v8_lte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v8_lte', indexA, domain__debug(A), vB);
    if (!A) return setEmpty(indexA, 'bad state');
    if (domain_max(A) > vB) return setEmpty(indexA, 'lte but A > ' + vB + ' so fail');

    let oA = A;
    // remove any value gt vB and remove constraint
    A = domain_removeGtUnsafe(A, vB);
    ASSERT_LOG2(' ->', domain__debug(A));
    if (A !== oA) {
      if (setDomain(indexA, A, 'A lte lit')) return;
    }

    ml_eliminate(ml, offset, SIZEOF_V8);
  }

  function cr_8v_lte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let vA = ml_dec8(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let B = getDomainOrRestartForAlias(indexB, 2);
    if (B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_8v_lte', vA, '->', indexB, '<=', domain__debug(B));
    if (!B) return setEmpty(indexB, 'bad state');
    if (vA > domain_min(B)) return setEmpty(indexB, 'lte but ' + vA + ' > B so fail');

    let oB = B;
    // remove any value lt vA and remove constraint
    B = domain_removeLtUnsafe(B, vA);
    ASSERT_LOG2(' ->', domain__debug(B));
    if (B !== oB) {
      if (setDomain(indexB, B, 'lit lte B')) return;
    }

    ml_eliminate(ml, offset, SIZEOF_8V);
  }

  function cr_88_lte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);

    ASSERT_LOG2(' = cr_88_lte', vA, vB);
    if (vA > vB) return setEmpty(-1, 'lte but literals ' + vA + ' > ' + vB + ' so fail');

    ml_eliminate(ml, offset, SIZEOF_88);
  }

  function cr_nall(ml) {
    let offset = pc;
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let offsetArgs = offset + SIZEOF_COUNT;

    ASSERT_LOG2(' = cr_nall', argCount, 'x');
    ASSERT_LOG2('  -', Array.from(Array(argCount)).map((n, i) => ml_dec16(ml, offsetArgs + i * 2)));
    ASSERT_LOG2('  -', Array.from(Array(argCount)).map((n, i) => domain__debug(domains[ml_dec16(ml, offsetArgs + i * 2)])));

    if (!argCount) return setEmpty(-1, 'nall without args is probably a bug');
    let countStart = argCount;
    let lastIndex;

    // a nall only ensures at least one of its arg solves to zero
    for (let i = argCount - 1; i >= 0; --i) {
      lastIndex = ml_dec16(ml, offsetArgs + i * 2);

      let A = getDomainOrRestartForAlias(lastIndex, SIZEOF_COUNT + i * 2);
      if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

      ASSERT_LOG2('  - loop i=', i, 'index=', lastIndex, 'domain=', domain__debug(A));
      if (!A) return setEmpty(lastIndex, 'bad state in a nall arg');

      if (domain_min(A) > 0) {
        // remove var from list
        ASSERT_LOG2(' - domain contains no zero so remove var from this constraint');

        // now
        // - move all indexes bigger than the current back one position
        // - compile the new count back in
        // - compile a NOOP in the place of the last element
        ASSERT_LOG2('  - moving further domains one space forward (from ', i + 1, ' / ', argCount, ')', i + 1 < argCount);
        for (let k = i + 1; k < argCount; ++k) {
          ASSERT_LOG2('    - moving ', (k + 1) + 'th var at', offsetArgs + k * 2, 'and', offsetArgs + k * 2 + 1, 'sigh');
          ml[offsetArgs + k * 2] = ml[offsetArgs + (k + 1) * 2];
          ml[offsetArgs + k * 2 + 1] = ml[offsetArgs + (k + 1) * 2 + 1];
        }
        --argCount;
      } else if (domain_isZero(A)) {
        // remove constraint
        ASSERT_LOG2(' - domain solved to zero so constraint is satisfied');
        ml_eliminate(ml, offset, SIZEOF_COUNT + 2 * countStart);
        pc = offset; // revisit
      } else {
        // A contains a 0 and is unsolved
        ASSERT_LOG2(' - domain contains zero and is not solved so leave it alone');
      }
    }

    if (argCount === 0) {
      // this is a bad state: all vars were removed from this constraint which means no var (left) had a zero
      // empty the last var and reject
      return setEmpty(lastIndex, 'nall; at least one arg must be zero');
    } else if (argCount === 1) {
      // force set last index to zero and remove constraint. this should not reject (because then the var would have been removed above)
      if (setDomain(lastIndex, domain_createValue(0))) return;
      ml_eliminate(ml, offset, SIZEOF_COUNT + 2 * countStart);
      pc = offset; // revisit
    } else if (argCount === 2) {
      // recompile as nand
      // list of vars should not have any holes (not even after elimination above) so we can just copy them.
      // ml len of this nall should be 7 bytes (op=1, count=2, A=2, B=2)
      // note: skip the count when reading!
      ml_enc8(ml, offset, ML_VV_NAND);
      ml_pump(ml, offsetCount, 0, 2, 4); // copies the first arg over count and the second arg over the first
      // this should open up at least 2 bytes, maybe more, so skip anything from the old op right after the new op
      ml_skip(ml, offset + SIZEOF_VV, (SIZEOF_COUNT + 2 * countStart) - SIZEOF_VV);
      ASSERT_LOG2(' - changed to a nand');
      pc = offset; // revisit
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_COUNT + countStart * 2;
    }
  }

  function cr_isAll(ml) {
    let offset = pc;
    ASSERT_LOG2(' - parsing cr_isAll');
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let argLen = argCount * 2;
    let oplen = SIZEOF_COUNT + argLen + 2;
    ASSERT_LOG2(' - ml for this isAll:', ml.slice(offset, offset + oplen));
    let offsetArgs = offset + SIZEOF_COUNT;
    let offsetR = offsetArgs + argLen;
    let indexR = ml_dec16(ml, offsetR);

    let R = getDomainOrRestartForAlias(indexR, SIZEOF_COUNT + argLen);
    if (R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_isAll', argCount, 'x');
    ASSERT_LOG2('  -> {' + indexR + '=' + domain__debug(R) + '} = ', Array.from(Array(argCount)).map((n, i, x) => (x = ml_dec16(ml, offsetArgs + i * 2)) + '=>' + domain__debug(domains[x])).join(' '));

    if (!R) return setEmpty(indexR, 'isall; R bad state');

    if (domain_isZero(R)) {
      ASSERT_LOG2(' - R is 0 so recompile to nall and revisit');
      // compile to nall and revisit
      ml_enc8(ml, offset, ML_NALL);
      ml_jump(ml, offset, 2); // difference between nall and isAll is the result var (16bit)
      pc = offset;
      return;
    }
    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' - R is non-zero so remove zero from all args and eliminate');
      // remove zero from all and eliminate
      for (let i = argCount - 1; i >= 0; --i) {
        let indexA = ml_dec16(ml, offsetArgs + i * 2);
        let A = getDomainOrRestartForAlias(indexA, SIZEOF_COUNT + i * 2);
        ASSERT_LOG2('    - index=', indexA, 'dom=', domain__debug(A));
        if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op
        if (!A) return setEmpty(indexA, 'isall; bad state');
        if (setDomain(indexA, domain_removeValue(A, 0))) return;
      }
      ml_eliminate(ml, offset, SIZEOF_COUNT + 2 * argCount + 2);
      pc = offset;
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_COUNT + argCount * 2 + 2;
  }

  function cr_isAll2(ml) {
    // fixed two placed vv isall

    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_isAll2', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!B) return setEmpty(indexB, 'isEq bad state B');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    if (domain_isZero(R)) {
      setDomain(indexA, domain_removeValue(A, 0));
      setDomain(indexB, domain_removeValue(B, 0));
      ml_eliminate(ml, offset, SIZEOF_VVV);
      pc = offset;
      return;
    }
    if (domain_hasNoZero(R)) {
      if (domain_min(A) > 0 || domain_min(B) > 0) {
        ml_eliminate(ml, offset, SIZEOF_VVV);
        pc = offset;
        return;
      } else {
        setEmpty(indexA, 'isall rejected on R=0');
        setEmpty(indexA, 'isall rejected on R=0');
        return;
      }
    }

    if (domain_isZero(A) || domain_isZero(B)) {
      ASSERT(domain_min(R) === 0 && domain_max(R) > 0, 'R should be booly');
      setDomain(R, domain_createValue(0));
      ml_eliminate(ml, offset, SIZEOF_VVV);
      pc = offset;
      return;
    }
    if (domain_hasNoZero(A) && domain_hasNoZero(B)) {
      ASSERT(R === domain_createRange(0, 1), 'R should be bool');
      setDomain(R, domain_removeValue(R, 0));
      ml_eliminate(ml, offset, SIZEOF_VVV);
      pc = offset;
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function cr_isNall(ml) {
    let offset = pc;
    ASSERT_LOG2(' - parsing cr_isNll');
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let argLen = argCount * 2;
    let oplen = SIZEOF_COUNT + argLen + 2;
    ASSERT_LOG2(' - ml for this isNall:', ml.slice(offset, offset + oplen));
    let offsetArgs = offset + SIZEOF_COUNT;
    let offsetR = offsetArgs + argLen;
    let indexR = ml_dec16(ml, offsetR);

    let R = getDomainOrRestartForAlias(indexR, SIZEOF_COUNT + argLen);
    if (R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_isNall', argCount, 'x');
    ASSERT_LOG2('  -> {' + indexR + '=' + domain__debug(R) + '} = ', Array.from(Array(argCount)).map((n, i, x) => (x = ml_dec16(ml, offsetArgs + i * 2)) + '=>' + domain__debug(domains[x])).join(' '));

    if (!R) return setEmpty(indexR, 'isnall; R bad state');

    if (domain_isZero(R)) {
      // remove zero from all and eliminate
      for (let i = argCount - 1; i >= 0; --i) {
        let indexA = ml_dec16(ml, offsetArgs + i * 2);
        let A = getDomainOrRestartForAlias(indexA, SIZEOF_COUNT + i * 2);
        ASSERT_LOG2('    - index=', indexA, 'dom=', domain__debug(A));
        if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op
        if (!A) return setEmpty(indexA, 'isnall; bad state');
        if (setDomain(indexA, domain_removeValue(A, 0))) return;
      }
      ml_eliminate(ml, offset, SIZEOF_COUNT + 2 * argCount + 2);
      pc = offset;
      return;
    }
    if (domain_hasNoZero(R)) {
      // compile to nall and revisit
      ml_enc8(ml, offset, ML_NALL);
      ml_jump(ml, offset, 2); // difference between nall and isNall is the result var (16bit)
      pc = offset;
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_COUNT + argCount * 2 + 2;
  }

  function cr_distinct(ml) {
    let offset = pc;
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let offsetArgs = offset + SIZEOF_COUNT;

    ASSERT_LOG2(' = cr_distinct', argCount, 'x');
    ASSERT_LOG2('  -', Array.from(Array(argCount)).map((n, i) => ml_dec16(ml, offsetArgs + i * 2)));
    ASSERT_LOG2('  -', Array.from(Array(argCount)).map((n, i) => domain__debug(domains[ml_dec16(ml, offsetArgs + i * 2)])));

    let countStart = argCount;

    // a distinct is basically a pyramid of neq's; one for each unique pair of the set
    // to prevent generating an array we'll decode every var during the loop...
    // we loop back to front because we're splicing out vars while looping
    for (let i = argCount - 1; i >= 0; --i) {
      let indexA = ml_dec16(ml, offsetArgs + i * 2);

      let A = getDomainOrRestartForAlias(indexA, SIZEOF_COUNT + i * 2);
      if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

      ASSERT_LOG2('  - loop i=', i, 'index=', indexA, 'domain=', domain__debug(A));
      if (!A) return setEmpty(indexA, 'bad state in a distinct arg');

      let v = domain_getValue(A);
      if (v >= 0) {
        ASSERT_LOG2('  - solved, so removing', v, 'from all other domains');
        // if v is solved, remove v from all other domains, then remove v from the list
        for (let j = 0; j >= 0; --j) {
          if (j !== i) {
            let indexB = ml_dec16(ml, offsetArgs + j * 2);
            ASSERT(indexA !== indexB, 'same var should not occur multiple times...');
            ASSERT_LOG2('    - loop j=', j, 'index=', indexB, 'domain=', domain__debug(domains[indexB]));

            let oB = getDomainOrRestartForAlias(indexB, SIZEOF_COUNT + j * 2);
            if (oB === MINIMIZE_ALIASED) return; // there was an alias; restart op

            let B = domain_removeValue(oB, v);
            if (B !== oB) {
              if (setDomain(indexB, B, 'distinct arg')) return;
            }
          }
        }

        // now
        // - move all indexes bigger than the current back one position
        // - compile the new count back in
        // - compile a NOOP in the place of the last element
        ASSERT_LOG2('  - moving further domains one space forward (from ', i + 1, ' / ', argCount, ')', i + 1 < argCount);
        for (let k = i + 1; k < argCount; ++k) {
          ASSERT_LOG2('    - moving ', (k + 1) + 'th var at', offsetArgs + k * 2, 'and', offsetArgs + k * 2 + 1, 'sigh');
          ml[offsetArgs + k * 2] = ml[offsetArgs + (k + 1) * 2];
          ml[offsetArgs + k * 2 + 1] = ml[offsetArgs + (k + 1) * 2 + 1];
        }
        --argCount;
      }
    }

    if (argCount <= 1) {
      ASSERT(argCount >= 0, 'should be zero or one');
      ASSERT_LOG2(' - Count is', argCount, '; eliminating constraint');
      ml_eliminate(ml, offset, SIZEOF_COUNT + 2 * countStart);
    } else if (argCount === 2) {
      ASSERT_LOG2(' - Count=2, recompiling to regular neq');
      // recompile as neq
      // list of vars should not have any holes (not even after elimination above) so we can just copy them.
      // ml len of this distinct should be 7 bytes (op=1, count=2, A=2, B=2)
      // note: skip the count when reading!
      ml_enc8(ml, offset, ML_VV_NEQ);
      ml_pump(ml, offsetCount, 0, 2, 4); // copies the first arg over count and the second arg over the first
      // this should open up at least 2 bytes, maybe more, so skip anything from the old op right after the new op
      ml_skip(ml, offset + SIZEOF_VV, (SIZEOF_COUNT + 2 * countStart) - SIZEOF_VV);
      ASSERT_LOG2(' - changed to a neq');
      pc = offset; // revisit
    } else {
      if (argCount !== countStart) {
        ASSERT_LOG2('  - recompiling new count (', argCount, ')');
        ml_enc16(ml, offset + 1, argCount);
        ASSERT_LOG2('  - compiling noop into empty spots');
        ml_skip(ml, offsetArgs + argCount * 2, (countStart - argCount) * 2);
      }

      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_COUNT + countStart * 2;
    }
  }

  function cr_plus(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_plus', '{', indexR, '} = {', indexA, '} ==? {', indexB, '} -->', domain__debug(R), '=', domain__debug(A), '==?', domain__debug(B));
    if (!A) return setEmpty(indexA, 'plus bad state A');
    if (!B) return setEmpty(indexB, 'plus bad state B');
    if (!R) return setEmpty(indexR, 'plus bad state R');

    // note: A + B = C   ==>   <loA + loB, hiA + hiB>
    // but:  A - B = C   ==>   <loA - hiB, hiA - loB>   (so the lo/hi of B gets swapped!)
    // keep in mind that any number oob <sub,sup> gets pruned in either case

    let minA;
    let maxA;
    let minB = domain_min(B);
    let maxB = domain_max(B);
    let minR = domain_min(R);
    let maxR = domain_max(R);

    let oA, oB, oR;
    let lo, hi;

    let loops = 0;
    do {
      ++loops;
      ASSERT_LOG2(' - plus propagation step...', loops);
      oA = A;
      oB = B;
      oR = R;

      lo = minR - maxB;
      hi = maxR - minB;
      A = domain_intersection(A, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated A:', domain__debug(oA), 'trimmed to', lo, hi, '(', minR, '-', maxB, ',', maxR, '-', minB, ')', '->', domain__debug(A));
      if (!A) return setEmpty(indexA, 'plus updated A to empty ' + indexA + ' + ' + indexB + ' = ' + indexR);
      minA = domain_min(A);
      maxA = domain_max(A);

      lo = minR - maxA;
      hi = maxR - minA;
      B = domain_intersection(B, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated B:', domain__debug(oB), 'trimmed to', lo, hi, '(', minR, '-', maxA, ',', maxR, '-', minA, ')', '->', domain__debug(B));
      if (!B) return setEmpty(indexB, 'plus updated B to empty ' + indexA + ' + ' + indexB + ' = ' + indexR);
      minB = domain_min(B);
      maxB = domain_max(B);

      lo = minA + minB;
      hi = maxA + maxB;
      R = domain_intersection(R, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated R:', domain__debug(oR), 'trimmed to', lo, hi, '(', minA, '+', minB, ',', maxA, '+', maxB, ')', '->', domain__debug(R));
      if (!R) return setEmpty(indexR, 'plus updated R to empty ' + indexA + ' + ' + indexB + ' = ' + indexR);
      minR = domain_min(R);
      maxR = domain_max(R);
    } while (A !== oA || B !== oB || R !== oR);

    ASSERT_LOG2(' ->', 'A:', domain__debug(A), 'B:', domain__debug(B), 'R:', domain__debug(R));

    if (loops > 1) {
      setDomain(indexA, A, 'plus A');
      setDomain(indexB, B, 'plus B');
      setDomain(indexR, R, 'plus R');
      ASSERT(A && B && R, 'would have exited early if domains were emptied');
    }

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) {
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ml_eliminate(ml, offset, SIZEOF_VVV);
    } else {
      if (cr_plusAB(offset, indexA, indexB, indexR, A, B, R, 'A', 'B')) return;
      if (cr_plusAB(offset, indexB, indexA, indexR, B, A, R, 'B', 'A')) return;

      ASSERT_LOG2(' - not only jumps..., new pc =', offset + SIZEOF_VVV);
      onlyJumps = false;
      pc = offset + SIZEOF_VVV;
    }
  }
  function cr_plusAB(offset, indexX, indexY, indexR, X, Y, R, nameX, nameY) {
    ASSERT(!domain_isSolved(X) || !domain_isSolved(Y) || !domain_isSolved(R), 'at least two vars arent solved');
    ASSERT_LOG2(' - cr_plusAB', nameX, nameY, domain__debug(R), '=', domain__debug(X), '+', domain__debug(Y));
    let vX = domain_getValue(X);
    if (vX >= 0) {
      // note Y and R are _not_ solved here
      if (vX === 0) {
        ASSERT_LOG2(' -', nameX, '=0 so ', nameY, '0==R, rewriting op to eq');
        // rewrite to Y == R
        cr_vvv2vv(ml, offset, ML_VV_EQ, indexR, indexY);
        pc = offset; // revisit
        return true;
      }

      let maxB = domain_max(Y);
      if (maxB <= 1 && domain_size(R) === 2 && vX < 0xff) {
        ASSERT(domain_max(R) > 1, 'if', nameY, '<= 1 then R must be >1 because R=B+A and ', nameX, ' is non-zero and', nameY, 'is not solved (both checked above) so R must be at least [1,2]');
        // B = R ==? A or B = R !=? A, that depends on max(R)==A
        ASSERT_LOG2(' -', nameX, '>0,', nameY, '<=1,size(R)=2. Morphing to iseq: ', (domain_max(R) === vX ? nameY + ' = R ==? ' + nameX : nameY + ' = R !=? ' + nameX), '->', domain__debug(Y), '=', domain__debug(R), (domain_max(R) === vX ? '==?' : '!=?'), vX);
        cr_vvv2v8v(ml, offset, domain_max(R) === vX ? ML_V8V_ISEQ : ML_V8V_ISNEQ, indexR, vX, indexY);
        pc = offset; // revisit (dont think we need to...)
        return true;
      }

      if (domain_max(R) <= 1 && domain_size(Y) === 2) {
        // A = R ==? B or A = R !=? B, that depends on max(B)==A
        ASSERT_LOG2(' - A>0 R<=1 and size(B)=2. Morphing to iseq: ', (maxB === vX ? 'R = B ==? A' : 'R = B !=? A'), '->', domain__debug(R), '=', domain__debug(Y), (maxB === vX ? '==?' : '!=?'), vX);
        cr_vvv2v8v(ml, offset, maxB === vX ? ML_V8V_ISEQ : ML_V8V_ISNEQ, indexY, vX, indexR);
        pc = offset; // revisit (dont think we need to...)
        return true;
      }
    }
  }

  function cr_minus(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_minus', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A) return setEmpty(indexA, 'plus bad state A');
    if (!B) return setEmpty(indexB, 'plus bad state B');
    if (!R) return setEmpty(indexR, 'plus bad state R');

    // C = A - B   -> A = B + C, B = C - A
    // note: A - B = C   ==>   <loA - hiB, hiA - loB>
    // but:  A + B = C   ==>   <loA + loB, hiA + hiB>   (so the lo/hi of B gets swapped!)
    // keep in mind that any number oob <sub,sup> gets trimmed in either case.
    // this trimming may affect "valid" numbers in the other domains so that needs back-propagation.

    let minA;
    let maxA;
    let minB = domain_min(B);
    let maxB = domain_max(B);
    let minR = domain_min(R);
    let maxR = domain_max(R);

    let oA, oB, oR;
    let lo, hi;

    let loops = 0;
    do {
      ++loops;
      ASSERT_LOG2(' - minus propagation step...', loops);
      oA = A;
      oB = B;
      oR = R;

      lo = minB + minR;
      hi = maxB + maxR;
      A = domain_intersection(A, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated A:', domain__debug(oA), 'trimmed to', lo, hi, '(', minB, '+', minR, ',', maxB, '+', maxR, ')', '->', domain__debug(A));
      if (!A) return setEmpty(indexA, 'minus updated A to empty ' + indexA + ' - ' + indexB + ' = ' + indexR);
      minA = domain_min(A);
      maxA = domain_max(A);

      lo = minA - maxR;
      hi = maxA - minR;
      B = domain_intersection(B, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated B:', domain__debug(oB), 'trimmed to', lo, hi, '(', minA, '-', maxR, ',', maxA, '-', minR, ')', '->', domain__debug(B));
      if (!B) return setEmpty(indexB, 'minus updated B to empty ' + indexA + ' - ' + indexB + ' = ' + indexR);
      minB = domain_min(B);
      maxB = domain_max(B);

      lo = minA - maxB;
      hi = maxA - minB;
      R = domain_intersection(R, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated R:', domain__debug(oR), 'trimmed to', lo, hi, '(', minA, '-', maxB, ',', maxA, '-', minB, ')', '->', domain__debug(R));
      if (!R) return setEmpty(indexR, 'minus updated R to empty ' + indexA + ' - ' + indexB + ' = ' + indexR);
      minR = domain_min(R);
      maxR = domain_max(R);
    } while (A !== oA || B !== oB || R !== oR);

    ASSERT_LOG2(' ->', 'A:', domain__debug(A), 'B:', domain__debug(B), 'R:', domain__debug(R));

    if (loops > 1) {
      setDomain(indexA, A, 'plus A');
      setDomain(indexB, B, 'plus B');
      setDomain(indexR, R, 'plus R');
      if (!A || !B || !R) return;
    }

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) { // minR==maxR&&minA==maxA
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ml_eliminate(ml, offset, SIZEOF_VVV);
    } else if (domain_getValue(A) === 0) { // maxA==0
      ASSERT_LOG2(' - A=0 so B==R, rewriting op to eq');
      cr_vvv2vv(ml, offset, ML_VV_EQ, indexB, indexR);
      pc = offset; // revisit
    } else if (domain_getValue(B) === 0) { // maxB==0
      ASSERT_LOG2(' - B=0 so A==R, rewriting op to eq');
      cr_vvv2vv(ml, offset, ML_VV_EQ, indexA, indexR);
      pc = offset; // revisit
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VVV;
    }
  }

  function cr_mul(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_mul', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A) return setEmpty(indexA, 'plus bad state A');
    if (!B) return setEmpty(indexB, 'plus bad state B');
    if (!R) return setEmpty(indexR, 'plus bad state R');

    // C = A * B, B = C / A, A = C / B
    // note: A * B = C   ==>   <loA * loB, hiA * hiB>
    // but:  A / B = C   ==>   <loA / hiB, hiA / loB> and has rounding/div-by-zero issues! instead use "inv-mul" tactic
    // keep in mind that any number oob <sub,sup> gets pruned in either case. x/0=0
    // when dividing "do the opposite" of integer multiplication. 5/4=[] because there is no int x st 4*x=5
    // only outer bounds are evaluated here...

    let minA;
    let maxA;
    let minB = domain_min(B);
    let maxB = domain_max(B);
    let minR = domain_min(R);
    let maxR = domain_max(R);

    let oA, oB, oR;
    let lo, hi;

    let loops = 0;
    do {
      ++loops;
      ASSERT_LOG2(' - mul propagation step...', loops);
      oA = A;
      oB = B;
      oR = R;

      if (maxB) { // this is for mul, not div! so r/0=a is actually a*0=r, so if B=0 then A can be anything.
        lo = Math.ceil(minR / maxB);
        hi = Math.floor(maxR / minB);
        if (lo > hi) return setEmpty(indexA, 'A resulted in a fraction ' + indexA + ' / ' + indexB + ' = ' + indexR); // 5/2=2.5, ceil(2.5)>floor(2.5). so in those cases the result is empty because there is no integer solution for n*2=5
        A = domain_intersection(A, domain_createRangeTrimmed(lo, hi));
        ASSERT_LOG2(' - Updated A:', domain__debug(oA), 'trimmed to', lo, hi, '(', minR, '/', maxB, ',', maxR, '/', minB, ')', '->', domain__debug(A));
        if (!A) return setEmpty(indexA, 'mul updated A to empty ' + indexA + ' / ' + indexB + ' = ' + indexR);
      }
      minA = domain_min(A);
      maxA = domain_max(A);

      if (maxA) { // this is for mul, not div! so r/0=b is actually 0*b=r, so if A=0 then B can be anything.
        lo = Math.ceil(minR / maxA);
        hi = Math.floor(maxR / minA);
        if (lo > hi) return setEmpty(indexB, 'B resulted in a fraction ' + indexA + ' / ' + indexB + ' = ' + indexR); // 5/2=2.5, ceil(2.5)>floor(2.5). so in those cases the result is empty because there is no integer solution for n*2=5
        B = domain_intersection(B, domain_createRangeTrimmed(lo, hi));
        ASSERT_LOG2(' - Updated B:', domain__debug(oB), 'trimmed to', lo, hi, '(', minR, '/', maxA, ',', maxR, '/', minA, ')', '->', domain__debug(B));
        if (!B) return setEmpty(indexB, 'mul updated B to empty ' + indexA + ' / ' + indexB + ' = ' + indexR);
      }
      minB = domain_min(B);
      maxB = domain_max(B);

      lo = minA * minB;
      hi = maxA * maxB;
      R = domain_intersection(R, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated R:', domain__debug(oR), 'trimmed to', lo, hi, '(', minA, '*', minB, ',', maxA, '*', maxB, ')', '->', domain__debug(R));
      if (!R) return setEmpty(indexR, 'mul updated R to empty ' + indexA + ' / ' + indexB + ' = ' + indexR);
      minR = domain_min(R);
      maxR = domain_max(R);
    } while (A !== oA || B !== oB || R !== oR);

    ASSERT_LOG2(' ->', 'A:', domain__debug(A), 'B:', domain__debug(B), 'R:', domain__debug(R));

    if (loops > 1) {
      setDomain(indexA, A, 'plus A');
      setDomain(indexB, B, 'plus B');
      setDomain(indexR, R, 'plus R');
      if (!A || !B || !R) return;
    }

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) {
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ml_eliminate(ml, offset, SIZEOF_VVV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VVV;
    }
  }

  function cr_div(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_mul', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A) return setEmpty(indexA, 'plus bad state A');
    if (!B) return setEmpty(indexB, 'plus bad state B');
    if (!R) return setEmpty(indexR, 'plus bad state R');

    // R = A / B, A = R * B, B = A / R
    // note:  A / B = C   ==>   <loA / hiB, hiA / loB> and has rounding/div-by-zero issues!
    // but: A * B = C   ==>   <loA * loB, hiA * hiB> use "inv-div" tactic
    // basically remove any value from the domains that can not lead to a valid integer result A/B=C

    let oA, oB, oR;

    // first of all, the divisor cannot contain a zero since that always leads to a invalid result (NaN)
    ASSERT_LOG2(' - Removing zero from B', domain__debug(B), ' -> ', domain__debug(domain_removeValue(B, 0)));
    oB = B;
    B = domain_removeValue(B, 0);
    if (B !== oB) {
      if (setDomain(indexB, B, 'remove zero from B because div')) return;
    }

    let minA;
    let maxA;
    let minB = domain_min(B);
    let maxB = domain_max(B);
    let minR = domain_min(R);
    let maxR = domain_max(R);

    let lo, hi;

    let loops = 0;
    do {
      ++loops;
      ASSERT_LOG2(' - div propagation step...', loops);
      oA = A;
      oB = B;
      oR = R;

      lo = minB * minR;
      hi = maxB * maxR;
      A = domain_intersection(A, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated A:', domain__debug(oA), 'trimmed to', lo, hi, '(', minB, '*', minR, ',', maxB, '*', maxR, ')', '->', domain__debug(A));
      if (!A) return setEmpty(indexA, 'div updated A to empty ' + indexA + ' / ' + indexB + ' = ' + indexR);
      minA = domain_min(A);
      maxA = domain_max(A);

      if (maxA) { // if maxA=0 then A=0 and 0/*=0 so B can be anything
        lo = Math.ceil(minA / maxR);
        hi = Math.floor(maxA / minR);
        if (lo > hi) return setEmpty(indexB, 'B resulted in a fraction ' + indexA + ' / ' + indexB + ' = ' + indexR); // 5/2=2.5, ceil(2.5)>floor(2.5). so in those cases the result is empty because there is no integer solution for n*2=5
        B = domain_intersection(B, domain_createRangeTrimmed(lo, hi));
        ASSERT_LOG2(' - Updated B:', domain__debug(oB), 'trimmed to', lo, hi, '(', minA, '/', maxR, ',', maxA, '/', minR, ')', '->', domain__debug(B));
        if (!B) return setEmpty(indexB, 'div updated B to empty ' + indexA + ' / ' + indexB + ' = ' + indexR);
      }
      minB = domain_min(B);
      maxB = domain_max(B);

      // A/B=R, B!=0, remove any ints that are lower than min/max and higher than max/min
      // and hope that rounding errors between ints are not a problem here
      lo = Math.ceil(minA / maxB);
      hi = Math.floor(maxA / minB);
      if (lo > hi) return setEmpty(indexB, 'R resulted in a fraction ' + indexA + ' / ' + indexB + ' = ' + indexR); // 5/2=2.5, ceil(2.5)>floor(2.5). so in those cases the result is empty because there is no integer solution for n*2=5
      R = domain_intersection(R, domain_createRangeTrimmed(lo, hi));
      ASSERT_LOG2(' - Updated R:', domain__debug(oR), 'trimmed to', lo, hi, '(', minA, '/', maxB, ',', maxA, '/', minB, ')', '->', domain__debug(R));
      if (!R) return setEmpty(indexR, 'div updated A to empty ' + indexA + ' / ' + indexB + ' = ' + indexR);
      minR = domain_min(R);
      maxR = domain_max(R);
    } while (A !== oA || B !== oB || R !== oR);

    ASSERT_LOG2(' ->', 'A:', domain__debug(A), 'B:', domain__debug(B), 'R:', domain__debug(R));

    if (loops > 1) {
      setDomain(indexA, A, 'plus A');
      setDomain(indexB, B, 'plus B');
      setDomain(indexR, R, 'plus R');
      if (!A || !B || !R) return;
    }

    ASSERT(((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2) || domain_getValue(A) === 0, 'if two vars are solved the third should be solved as well, unless A is 0 because then B can be anything');

    if (domain_isSolved(R) && domain_isSolved(A)) {
      ASSERT(domain_isSolved(B) || domain_getValue(A) === 0, 'if two are solved then all three must be solved or A is 0');
      ml_eliminate(ml, offset, SIZEOF_VVV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VVV;
    }
  }

  function cr_vvv_isEq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vvv_isEq', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!B) return setEmpty(indexB, 'isEq bad state B');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let vA = domain_getValue(A);
    let vB = domain_getValue(B);

    if (vA >= 0 && vB >= 0) {
      ASSERT_LOG2(' - A and B are solved so we can determine R');

      if (A === B) {
        if (setDomain(indexR, domain_removeValue(R, 0), 'iseq R: A==B')) return;
      } else {
        if (setDomain(indexR, domain_intersectionValue(R, 0), 'iseq R: A!=B')) return;
      }

      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    // A and B arent both solved. check R. it ends up either zero or non-zero (but not necessarily 1)
    // note that R doesnt need to completely solve for iseq. we only care about "is zero" or "has no zero".
    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! changing iseq to neq and revisiting');
      cr_vvv2vv(ml, offset, ML_VV_NEQ, indexA, indexB);
      pc = offset; // make it repeat with the new neq
      return;
    }
    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! changing iseq to eq and revisiting');
      cr_vvv2vv(ml, offset, ML_VV_EQ, indexA, indexB);
      pc = offset; // make it repeat with the new eq
      return;
    }

    if (domain_max(A) < domain_min(B) || domain_min(A) > domain_max(B)) {
      ASSERT_LOG2(' - no overlap between', indexA, 'and', indexB, ' (', domain__debug(A), domain__debug(B), ') so R becomes 0 and constraint is removed');
      // B is solved but A doesn't contain that value, R becomes 0 and the constraint is removed
      ASSERT(domain_containsValue(R, 0), 'redundant safe guard');
      R = domain_createValue(0);
      if (setDomain(indexR, R, 'isEq no overlap A B so R=0')) return;
      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    // there are some bool-domain-specific tricks we can apply
    if (domain_isBool(R)) {
      // if A=[0 1], B=0|1, R=[0 1] we can recompile this to NEQ or EQ
      if (vA >= 0 && vA <= 1 && domain_isBool(B)) {
        // - A=0: 0==A=1, 1==A=0: B!=R
        // - A=1: 0==A=0, 1==A=1: B==R
        cr_vvv2vv(ml, offset, vA === 0 ? ML_VV_NEQ : ML_VV_EQ, indexB, indexR);
        pc = offset; // revisit
        return;
      }
      if (vB >= 0 && vB <= 1 && domain_isBool(A)) {
        // - B=0: 0==B=1, 1==B=0: A!=R
        // - B=1: 0==B=0, 1==B=1: A==R
        cr_vvv2vv(ml, offset, vB === 0 ? ML_VV_NEQ : ML_VV_EQ, indexA, indexR);
        pc = offset; // revisit
        return;
      }

      if (vB >= 0) {
        // check for [01]=[00xx]==?x because in that case we can rewrite it to a XNOR
        if (domain_min(A) === 0 && domain_max(A) === vB && domain_size(A) === 2) {
          // [0,1] = [0,0, vB,vB] ==? vB    ->   (R=0 & A=0) | (R=1 & A=vB)  --> XNOR
          ASSERT_LOG2(' ! [01]=[00xx]==?x so morphing to XNOR and revisiting');
          cr_vvv2vv(ml, offset, ML_VV_XNOR, indexA, indexR);
          pc = offset; // revisit
          return;
        }
      }
      if (vA >= 0) {
        // check for [01]=x==?[00xx] because in that case we can rewrite it to a XNOR
        if (domain_min(B) === 0 && domain_max(B) === vA && domain_size(B) === 2) {
          // [0,1] = [0,0, vB,vB] ==? vB    ->   (R=0 & A=0) | (R=1 & A=vB)  --> XNOR
          ASSERT_LOG2(' ! [01]=x==?[00xx] so morphing to XNOR and revisiting');
          cr_vvv2vv(ml, offset, ML_VV_XNOR, indexB, indexR);
          pc = offset; // revisit
          return;
        }
      }
    }

    ASSERT(domain_min(R) === 0 && domain_max(R) > 0, 'R should be a booly at this point', domain__debug(R));
    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B), domain__debug(R));

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function cr_v8v_isEq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 4;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let R = getDomainOrRestartForAlias(indexR, 4);
    ASSERT_LOG2(' = cr_v8v_isEq', '{', indexR, '} = {', indexA, '} ==?', vB, '-->', domain__debug(R), '=', domain__debug(A), '==?', vB);
    if (A === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let oR = R;
    if (!domain_containsValue(A, vB)) {
      R = domain_removeGtUnsafe(R, 0);
    } else if (domain_isSolved(A)) {
      // A and B are solved and A contains B so R>0
      R = domain_removeValue(R, 0);
    }

    if (R !== oR && setDomain(indexR, R, 'isEq A eq lit resolved')) return;

    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! changing iseq to neq and revisiting');
      cr_v8v2v8(ml, offset, ML_V8_NEQ, indexA, vB);
      pc = offset; // make it repeat with the new neq
      return;
    }
    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! changing iseq to eq and revisiting');
      cr_v8v2v8(ml, offset, ML_V8_EQ, indexA, vB);
      pc = offset; // make it repeat with the new eq
      return;
    }

    ASSERT(domain_min(R) === 0 && domain_max(R) >= 1, 'R should be boolable at this point');
    ASSERT_LOG2(' ->', domain__debug(A), vB, domain__debug(R));

    if (domain_isBool(R)) {
      ASSERT(!domain_isSolved(A), 'if it were solved that case is caught above');
      // if A=[0 1], B=0|1, R=[0 1] we can recompile this to NEQ or EQ
      if (vB <= 1 && domain_isBool(A)) {
        // - B=0: 0==B=1, 1==B=0: A!=R
        // - B=1: 0==B=0, 1==B=1: A==R
        cr_v8v2vv(ml, offset, vB === 0 ? ML_VV_NEQ : ML_VV_EQ, indexA, indexR);
        pc = offset; // revisit
        return;
      }

      // check for [01]=[00xx]==?x because in that case we can rewrite it to a XNOR
      if (domain_min(A) === 0 && domain_max(A) === vB && domain_size(A) === 2) {
        // [0,1] = [0,0, vB,vB] ==? vB    ->   (R=0 & A=0) | (R=1 & A=vB)  --> XNOR
        ASSERT_LOG2(' ! [01]=[00xx]==?x so morphing to XNOR and revisiting');
        cr_v8v2vv(ml, offset, ML_VV_XNOR, indexA, indexR);
        pc = offset; // revisit
        return;
      }
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_V8V;
  }

  function cr_vv8_isEq(ml) {
    let offset = pc;
    let offsetR = offset + 5;
    let vR = ml_dec8(ml, offsetR);

    ASSERT_LOG2(' = cr_vv8_isEq', vR, 'immediately recompile to eq or neq');

    // we know R is solved so just recompile it to eq or neq
    if (vR === 0) {
      ASSERT_LOG2(' ! R=0 changing iseq to neq and revisiting');
      // compile a neq and restart
      ml_enc8(ml, offset, ML_VV_NEQ);
      ml_skip(ml, offset + SIZEOF_VV, SIZEOF_VV8 - SIZEOF_VV);
      pc = offset; // make it repeat with the new neq
      return;
    }

    // otherwise R must be non-zero
    ASSERT_LOG2(' ! R>0 changing iseq to eq and revisiting');
    // compile an eq and restart
    ml_enc8(ml, offset, ML_VV_EQ);
    ml_skip(ml, offset + SIZEOF_VV, SIZEOF_VV8 - SIZEOF_VV);
    pc = offset; // make it repeat with the new eq
  }

  function cr_88v_isEq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 3;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let R = getDomainOrRestartForAlias(indexR, 4);
    if (R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_88v_isEq', indexR, vA, vB, domain__debug(R));
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    ASSERT_LOG2(' - A and B are solved so we can determine R');

    if (vA === vB) {
      if (setDomain(indexR, domain_removeValue(R, 0))) return;
    } else {
      if (setDomain(indexR, domain_removeGtUnsafe(R, 0))) return;
    }

    ASSERT_LOG2(' ->', vA, vB, domain__debug(R));

    ml_eliminate(ml, offset, SIZEOF_88V);
    pc = offset;
  }

  function cr_v88_isEq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 4;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v88_isEq', vR, '= {', indexA, '} ==?', vB, ' --> ', vR, '=', domain__debug(A), '==?', vB);
    if (!A) return setEmpty(indexA, 'isEq bad state A');

    ASSERT_LOG2(' - B and R are solved so we can determine A');

    if (vR === 0) {
      if (setDomain(indexA, domain_removeValue(A, vB))) return;
    } else {
      if (setDomain(indexA, domain_intersectionValue(A, vB))) return;
    }

    ASSERT_LOG2(' ->', vR, '=', domain__debug(A), '==?', vB);

    ml_eliminate(ml, offset, SIZEOF_V88);
    pc = offset;
  }

  function cr_888_isEq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 3;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    ASSERT_LOG2(' = cr_888_isEq', vA, vB, vR);
    ASSERT_LOG2(' - already resolved, only need to verify it');

    // isEq !== shouldEq
    if ((vA === vB) !== (vR > 0)) return setEmpty(-1, 'isEq 888 did not match');

    ml_eliminate(ml, offset, SIZEOF_888);
    pc = offset;
  }

  function cr_vvv_isNeq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_isNeq', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!B) return setEmpty(indexB, 'isEq bad state B');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    if (domain_isSolved(A) && domain_isSolved(B)) {
      ASSERT_LOG2(' - A and B are solved so we can determine R');
      if (A === B) {
        if (setDomain(indexR, domain_removeGtUnsafe(R, 0))) return;
      } else {
        if (setDomain(indexR, domain_removeValue(R, 0))) return;
      }
      ml_eliminate(ml, offset, SIZEOF_VVV);
      pc = offset;
      return;
    }

    // R should be 0 if A==B. R should be >0 if A!==B
    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! R=0, changing isneq to eq and revisiting');
      cr_vvv2vv(ml, offset, ML_VV_EQ, indexA, indexB);
      pc = offset; // make it repeat with the new neq
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! R>0, changing isneq to neq and revisiting');
      cr_vvv2vv(ml, offset, ML_VV_NEQ, indexA, indexB);
      pc = offset; // make it repeat with the new eq
      return;
    }

    ASSERT(domain_min(R) === 0 && domain_max(R) >= 1, 'R should be boolable at this point');
    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B), domain__debug(R));
    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function cr_v8v_isNeq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 4;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let R = getDomainOrRestartForAlias(indexR, 4);
    if (A === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v8v_isNeq', indexA, indexR, domain__debug(A), vB, domain__debug(R));
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let vA = domain_getValue(A);
    if (vA >= 0) {
      ASSERT_LOG2(' - A and B are solved so we can determine R');
      if (vA === vB) {
        if (setDomain(indexR, domain_removeGtUnsafe(R, 0))) return;
      } else {
        if (setDomain(indexR, domain_removeValue(R, 0))) return;
      }
      ml_eliminate(ml, offset, SIZEOF_V8V);
      pc = offset;
      return;
    }

    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! vR=0 so changing isneq to eq and revisiting');
      cr_v8v2v8(ml, offset, ML_V8_EQ, indexA, vB);
      pc = offset; // make it repeat with the new neq
      return;
    }
    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! vR>0 so changing isneq to neq and revisiting');
      cr_v8v2v8(ml, offset, ML_V8_NEQ, indexA, vB);
      pc = offset; // make it repeat with the new eq
      return;
    }

    ASSERT(domain_min(R) === 0 && domain_max(R) >= 1, 'R should be boolable at this point');
    ASSERT_LOG2(' ->', domain__debug(R), '=', domain__debug(A), '!=?', vB);
    ASSERT(domain_max(A) !== 0, 'if max(A) were zero then it would be solved and that case is caught above');

    if (domain_isBool(R)) {
      // if A=[0 1], B=0|1, R=[0 1] we can recompile this to a simpler op
      ASSERT(!domain_isSolved(A), 'A isnt solved, so if max <= 1 then A is a bool and not zero');
      if (vB <= 1 && domain_isBool(A)) {
        // - B=0: 0!=B=0, 1!=B=1: A==R
        // - B=1: 0!=B=1, 1!=B=0: A!=R
        cr_v8v2vv(ml, offset, vB === 0 ? ML_VV_EQ : ML_VV_NEQ, indexA, indexR);
        pc = offset; // revisit
        return;
      }
    }

    if (domain_size(A) === 2) {
      ASSERT(domain_containsValue(A, vB), 'if the domain did not contain value of B then R would be solved already');
      // if this isneq is checking one of the two values in A then normalize it to an iseq for the other value
      // this way the deduper may catch this case and discover an implicit alias
      // [1 2] !=? 1   ->  [1 2] ==? 2
      // [1 2] !=? 2   ->  [1 2] ==? 1
      ASSERT_LOG2(' - Normalizing isNeq to equivalent isEq, looking for', domain_getValue(domain_removeValue(A, vB)), 'instead of', vB);
      cr_v8v2v8v(ml, offset, ML_V8V_ISEQ, indexA, domain_getValue(domain_removeValue(A, vB)), indexR);
      pc = offset; // revisit
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_V8V;
  }

  function cr_vv8_isNeq(ml) {
    let offset = pc;
    let offsetR = offset + 5;
    let vR = ml_dec8(ml, offsetR);

    ASSERT_LOG2(' = cr_vv8_isNeq', vR, 'immediately recompile to neq or eq');

    // we know R is solved so just recompile it to eq or neq
    if (vR === 0) {
      ASSERT_LOG2(' ! R=0 changing isneq to eq and revisiting');
      // compile an eq and restart
      ml_enc8(ml, offset, ML_VV_EQ);
      ml_skip(ml, offset + SIZEOF_VV, SIZEOF_VV8 - SIZEOF_VV);
      pc = offset; // make it repeat with the new neq
      return;
    }

    ASSERT_LOG2(' ! R>0 changing isneq to neq and revisiting');
    // compile a neq and restart
    ml_enc8(ml, offset, ML_VV_NEQ);
    ml_skip(ml, offset + SIZEOF_VV, SIZEOF_VV8 - SIZEOF_VV);
    pc = offset; // make it repeat with the new eq
    return;
  }

  function cr_88v_isNeq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 3;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let R = getDomainOrRestartForAlias(indexR, 3);
    if (R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_88v_isNeq', indexR, vA, vB, domain__debug(R));
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    ASSERT_LOG2(' - A and B are solved so we can determine R');

    if (vA === vB) {
      if (setDomain(indexR, domain_intersectionValue(R, 0))) return;
    } else {
      if (setDomain(indexR, domain_removeValue(R, 0))) return;
    }

    ASSERT_LOG2(' ->', vA, vB, domain__debug(R));

    ml_eliminate(ml, offset, SIZEOF_88V);
    pc = offset;
  }

  function cr_v88_isNeq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 4;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v88_isNeq', indexA, domain__debug(A), vB, vR);
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (vR > 1) return setEmpty(indexA, 'isNeq; literal R > 1');

    ASSERT_LOG2(' - B and R are solved so we can determine A');

    if (vR === 0) {
      if (setDomain(indexA, domain_intersectionValue(A, vB))) return;
    } else {
      if (setDomain(indexA, domain_removeValue(A, vB))) return;
    }

    ASSERT_LOG2(' ->', domain__debug(A), vB, vR);
    ml_eliminate(ml, offset, SIZEOF_V88);
    pc = offset;
  }

  function cr_888_isNeq(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 3;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    ASSERT_LOG2(' = cr_888_isEq', vA, vB, vR);
    ASSERT_LOG2(' - already resolved, only need to verify it');
    if (vR > 1) return setEmpty(-1, 'isNeq; literal 888 R > 1');

    // isNeq !== shouldNeq
    if ((vA !== vB) !== (vR > 0)) return setEmpty(-1, 'isNeq; 888 fails');

    ml_eliminate(ml, offset, SIZEOF_888);
  }

  function cr_vvv_isLt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vvv_isLt', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!B) return setEmpty(indexB, 'isEq bad state B');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let oR = R;

    if (!domain_isSolved(R)) {
      if (domain_max(A) < domain_min(B)) R = domain_removeValue(R, 0);
      else if (domain_min(A) >= domain_max(B)) R = domain_removeGtUnsafe(R, 0);
    }

    if (R !== oR && !setDomain(indexR, R, 'islt; solving R because A < B or A >= B')) return;

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args

    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lte with swapped args in its place', indexB, 'and', indexA);
      cr_vvv2vv(ml, offset, ML_VV_LTE, indexB, indexA);
      // replace isLt with a regular lte
      pc = offset; // make it repeat with the new lt
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lt in its place for', indexA, 'and', indexB);
      cr_vvv2vv(ml, offset, ML_VV_LT, indexA, indexB);
      pc = offset; // make it repeat with the new lt
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function cr_8vv_isLt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 4;
    let vA = ml_dec8(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let B = getDomainOrRestartForAlias(indexB, 2);
    let R = getDomainOrRestartForAlias(indexR, 4);
    if (B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_8vv_isLt', indexB, indexR, vA, domain__debug(B), domain__debug(R));
    if (!B) return setEmpty(indexB, 'isEq bad state B');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let oR = R;

    if (!domain_isSolved(R)) {
      if (vA < domain_min(B)) R = domain_removeValue(R, 0);
      else if (vA >= domain_max(B)) R = domain_removeGtUnsafe(R, 0);
    }

    if (R !== oR && !setDomain(indexR, R, 'islt; solving R because A < B or A >= B')) return;

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args

    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lte with swapped args in its place', indexB, 'and', vA);
      cr_8vv2v8(ml, offset, ML_V8_LTE, indexB, vA);
      pc = offset; // make it repeat with the new lt
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lt in its place for', vA, 'and', indexB);
      cr_8vv28v(ml, offset, ML_8V_LT, vA, indexB);
      pc = offset; // make it repeat with the new lt
      return;
    }

    if (domain_isBool(R)) {
      // if A=0|1, B=[0 1], R=[0 1] we can recompile this to a simpler op
      ASSERT(domain_max(B) !== 0, 'if max(B) were zero then R would be solved and that case is caught above');
      if (vA <= 1 && domain_isBool(B)) {
        // - A=0: A<0=0, A<1=1: B=R
        // - A=1: A<0=0, A<1=0: R=0, remove constraint (already done above)
        ASSERT(vA === 0, 'the path for A=1 is handled above');
        cr_8vv2vv(ml, offset, ML_VV_EQ, indexB, indexR);
        pc = offset; // revisit
        return;
      }
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_8VV;
  }

  function cr_v8v_isLt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 4;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let R = getDomainOrRestartForAlias(indexR, 4);
    if (A === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v8v_isLt', indexA, indexR, domain__debug(A), vB, domain__debug(R));
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let oR = R;

    if (!domain_isSolved(R)) {
      if (domain_max(A) < vB) R = domain_removeValue(R, 0);
      else if (domain_min(A) >= vB) R = domain_removeGtUnsafe(R, 0);
    }

    if (R !== oR && !setDomain(indexR, R, 'islt; solving R because A < B or A >= B')) return;

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args

    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lte with swapped args in its place', vB, 'and', indexA);
      cr_v8v28v(ml, offset, ML_8V_LTE, vB, indexA);
      pc = offset; // make it repeat with the new lt
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lt in its place for', indexA, 'and', vB);
      cr_v8v2v8(ml, offset, ML_V8_LT, indexA, vB);
      pc = offset; // make it repeat with the new lt
      return;
    }

    if (domain_isBool(R)) {
      // if A=[0 1], B=0|1, R=[0 1] we can recompile this to a simpler op
      ASSERT(domain_max(A) !== 0, 'if max(A) were zero then R would be solved and that case is caught above');
      if (vB <= 1 && domain_isBool(A)) {
        // - B=0: 0<B=0, 1<B=0: R=0, remove constraint (already done above)
        // - B=1: 0<B=1, 1<B=0: A!=R
        ASSERT(vB === 0, 'the path for B=0 is handled above');
        cr_v8v2vv(ml, offset, ML_VV_NEQ, indexA, indexR);
        pc = offset; // revisit
        return;
      }
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_V8V;
  }

  function cr_vv8_isLt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    ASSERT_LOG2(' = cr_vv8_isLt', indexA, indexB, vR);

    // R is solved so just replace the reifier by its non-reifier component

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args
    if (vR === 0) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lte with swapped args in its place for', indexB, 'and', indexA);
      cr_vv82vv(ml, offset, ML_VV_LTE, indexB, indexA);
      pc = offset; // make it repeat with the new lt
      return;
    }

    ASSERT_LOG2(' ! result var solved to 1 so compiling an lt in its place', indexA, 'and', indexB);
    cr_vv82vv(ml, offset, ML_VV_LT, indexA, indexB);
    pc = offset; // make it repeat with the new lt
  }

  function cr_88v_isLt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 3;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let R = getDomainOrRestartForAlias(indexR, 3);
    if (R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_88v_isLt', indexR, vA, vB, domain__debug(R));
    if (!R) return setEmpty(indexR, 'isLt bad state R');

    if (vA < vB) {
      if (setDomain(indexR, domain_removeValue(R, 0), 'isLt; solving R with two literals')) return;
    } else {
      if (setDomain(indexR, domain_removeGtUnsafe(R, 0), 'isLt; solving R with two literals')) return;
    }

    ml_eliminate(ml, offset, SIZEOF_88V);
    pc = offset;
  }

  function cr_v88_isLt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 4;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v88_isLt', indexA, domain__debug(A), vB, vR);
    if (!A) return setEmpty(indexA, 'isEq bad state A');

    if (vR === 0) {
      if (setDomain(indexA, domain_removeLtUnsafe(A, vB))) return;
    } else {
      if (setDomain(indexA, domain_removeGte(A, vB))) return;
    }

    ml_eliminate(ml, offset, SIZEOF_V88);
    pc = offset;
  }

  function cr_8v8_isLt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 4;
    let vA = ml_dec8(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    let B = getDomainOrRestartForAlias(indexB, 2);
    if (B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_8v8_isLt', indexB, vA, domain__debug(B), vR);
    if (!B) return setEmpty(indexB, 'isEq bad state B');

    if (vR === 0) {
      if (setDomain(indexB, domain_removeGtUnsafe(B, vA))) return;
    } else {
      if (setDomain(indexB, domain_removeLte(B, vA))) return;
    }

    ml_eliminate(ml, offset, SIZEOF_8V8);
    pc = offset;
  }

  function cr_888_isLt(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 3;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    ASSERT_LOG2(' = cr_888_isLt', vA, '<?', vB, '=', vR);

    // just check
    if ((vA < vB) !== (vR > 0)) return setEmpty(-1, 'isLt; 888 failed');

    ml_eliminate(ml, offset, SIZEOF_888);
  }

  function cr_vvv_isLte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    let R = getDomainOrRestartForAlias(indexR, 5);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vvv_isLte', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!B) return setEmpty(indexB, 'isEq bad state B');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let oR = R;

    if (!domain_isSolved(R)) {
      // if R isn't set you can't really update A or B. so we don't.
      if (domain_max(A) <= domain_min(B)) R = domain_removeValue(R, 0);
      else if (domain_min(A) > domain_max(B)) R = domain_removeGtUnsafe(R, 0);
    }

    if (R !== oR && setDomain(indexR, R, 'islte; solving R because A and B are solved')) return;

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args
    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lt with swapped args in its place', indexB, 'and', indexA);
      // replace isLt with a regular lte
      cr_vvv2vv(ml, offset, ML_VV_LT, indexB, indexA);
      pc = offset; // make it repeat with the new lt
      return;
    }
    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lte in its place', indexA, 'and', indexB);
      cr_vvv2vv(ml, offset, ML_VV_LTE, indexA, indexB);
      pc = offset; // make it repeat with the new lt
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function cr_8vv_isLte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 4;
    let vA = ml_dec8(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let B = getDomainOrRestartForAlias(indexB, 2);
    let R = getDomainOrRestartForAlias(indexR, 4);
    if (B === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_8vv_isLte', indexB, indexR, '->', vA, '<=?', domain__debug(B), '=', domain__debug(R));
    if (!B) return setEmpty(indexB, 'isEq bad state B');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let oR = R;

    if (!domain_isSolved(R)) {
      // if R isn't set you can't really update A or B. so we don't.
      if (vA <= domain_min(B)) R = domain_removeValue(R, 0);
      else if (vA > domain_max(B)) R = domain_removeGtUnsafe(R, 0);
    }

    if (R !== oR && setDomain(indexR, R, 'islte; solving R because A and B are solved')) return;

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args
    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lt with swapped args in its place', indexB, 'and', vA);
      cr_8vv2v8(ml, offset, ML_V8_LT, indexB, vA);
      pc = offset; // make it repeat with the new lt
      return;
    }
    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lte in its place for', vA, 'and', indexB);
      cr_8vv28v(ml, offset, ML_8V_LTE, vA, indexB);
      pc = offset; // make it repeat with the new lt
      return;
    }

    if (domain_isBool(R)) {
      // if A=0|1, B=[0 1], R=[0 1] we can recompile this to a simpler op
      ASSERT(domain_max(B) !== 0, 'if max(B) were zero then R would be solved and that case is caught above');
      ASSERT_LOG2(' - result var was not solved');
      if (vA <= 1 && domain_isBool(B)) {
        // - A=0: A<=0=1, A<=1=1: R=1, remove constraint (Already done above)
        // - A=1: A<=0=0, A<=1=1: B==R
        ASSERT(vA === 1, 'the path for A=0 is handled above');
        ASSERT_LOG2(' - changing this isLte to an eq because A=1 and max(B)==1 so B==R');
        cr_8vv2vv(ml, offset, ML_VV_EQ, indexB, indexR);
        pc = offset; // revisit
        return;
      }
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_8VV;
  }

  function cr_v8v_isLte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 4;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let R = getDomainOrRestartForAlias(indexR, 4);
    if (A === MINIMIZE_ALIASED || R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v8v_isLte', indexA, indexR, domain__debug(A), vB, domain__debug(R));
    if (!A) return setEmpty(indexA, 'isEq bad state A');
    if (!R) return setEmpty(indexR, 'isEq bad state R');

    let oR = R;

    if (!domain_isSolved(R)) {
      // if R isn't set you can't really update A or B. so we don't.
      if (domain_max(A) <= vB) R = domain_removeValue(R, 0);
      else if (domain_min(A) > vB) R = domain_removeGtUnsafe(R, 0);
    }

    if (R !== oR && setDomain(indexR, R, 'islte; solving R because A and B are solved')) return;

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args
    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lt with swapped args in its place', vB, 'and', indexA);
      cr_v8v28v(ml, offset, ML_8V_LT, vB, indexA);
      pc = offset; // make it repeat with the new lt
      return;
    }
    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lte in its place', indexA, 'and', vB);
      cr_v8v2v8(ml, offset, ML_V8_LTE, indexA, vB);
      pc = offset; // make it repeat with the new lt
      return;
    }

    if (domain_isBool(R)) {
      // if A=[0 1], B=0|1, R=[0 1] we can recompile this to a simpler op
      ASSERT(domain_max(A) !== 0, 'if max(A) were zero then R would be solved and that case is caught above');
      if (vB <= 1 && domain_isBool(A)) {
        // - B=0: 0<=B=1, 1<=B=0: B!=R
        // - B=1: 0<=B=1, 1<=B=1: R=1, remove constraint (already done above)
        ASSERT(vB === 0, 'the path for A=1 is handled above');
        cr_v8v2vv(ml, offset, ML_VV_NEQ, indexA, indexR);
        pc = offset; // revisit
        return;
      }
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_V8V;
  }

  function cr_vv8_isLte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    ASSERT_LOG2(' = cr_vv8_isLte', indexA, indexB, vR);

    // R is solved so just replace the reifier by its non-reifier component

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args
    if (vR === 0) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lt with swapped args in its place', indexB, 'and', indexA);
      cr_vv82vv(ml, offset, ML_VV_LTE, indexB, indexA);
      pc = offset; // make it repeat with the new lt
      return;
    }

    ASSERT_LOG2(' ! result var solved to 1 so compiling an lte in its place', indexA, 'and', indexB);
    cr_vv82vv(ml, offset, ML_VV_LT, indexA, indexB);
    pc = offset; // make it repeat with the new lt
  }

  function cr_88v_isLte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 3;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let indexR = ml_dec16(ml, offsetR);

    let R = getDomainOrRestartForAlias(indexR, 3);
    if (R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_88v_isLte', indexR, vA, vB, domain__debug(R));
    if (!R) return setEmpty(indexR, 'isLte bad state R');

    if (vA <= vB) {
      if (setDomain(indexR, domain_removeValue(R, 0), 'isLte; solving R with two literals')) return;
    } else {
      if (setDomain(indexR, domain_removeGtUnsafe(R, 0), 'isLte; solving R with two literals')) return;
    }

    ml_eliminate(ml, offset, SIZEOF_88V);
    pc = offset;
  }

  function cr_v88_isLte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 4;
    let indexA = ml_dec16(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    let A = getDomainOrRestartForAlias(indexA, 1);
    if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_v88_isLte', indexA, domain__debug(A), vB, vR);
    if (!A) return setEmpty(indexA, 'isEq bad state A');

    // we know A and R so determine B and remove constraint
    if (vR === 0) {
      if (setDomain(indexA, domain_removeLte(A, vB))) return;
    } else {
      if (setDomain(indexA, domain_removeGtUnsafe(A, vB))) return;
    }

    ml_eliminate(ml, offset, SIZEOF_V88);
    pc = offset;
  }

  function cr_8v8_isLte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 4;
    let vA = ml_dec8(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    let B = getDomainOrRestartForAlias(indexB, 2);
    if (B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_8v8_isLte', indexB, vA, domain__debug(B), vR);
    if (!B) return setEmpty(indexB, 'isEq bad state B');

    if (vR === 0) {
      if (setDomain(indexB, domain_removeGte(B, vA))) return;
    } else {
      if (setDomain(indexB, domain_removeLtUnsafe(B, vA))) return;
    }

    ml_eliminate(ml, offset, SIZEOF_8V8);
    pc = offset;
  }

  function cr_888_isLte(ml) {
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 2;
    let offsetR = offset + 3;
    let vA = ml_dec8(ml, offsetA);
    let vB = ml_dec8(ml, offsetB);
    let vR = ml_dec8(ml, offsetR);

    ASSERT_LOG2(' = cr_888_isLte', vA, vB, vR);

    // just check
    if ((vA <= vB) !== (vR > 0)) return setEmpty(-1, 'islte; 888 failed');

    ml_eliminate(ml, offset, SIZEOF_888);
    pc = offset;
  }

  function cr_sum(ml) {
    let offset = pc;
    ASSERT_LOG2(' - parsing sum:', ml.slice(offset, offset + 10));
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let offsetConstant = offset + 3;
    let fixedConstant = ml_dec8(ml, offsetConstant);
    let oplen = SIZEOF_C8_COUNT + argCount * 2 + 2;
    ASSERT_LOG2(' - ml for this sum:', ml.slice(offset, offset + oplen));
    let offsetArgs = offset + SIZEOF_C8_COUNT;
    let offsetR = offsetArgs + argCount * 2;
    let indexR = ml_dec16(ml, offsetR);

    let R = getDomainOrRestartForAlias(indexR, SIZEOF_C8_COUNT + argCount * 2);
    ASSERT_LOG2(' - offsets; R =', offsetR, 'indexR=', indexR, 'R=', domain__debug(R));
    if (R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_sum', argCount, 'x');
    ASSERT_LOG2('  -> {' + indexR + '=' + domain__debug(R) + '} = ', Array.from(Array(argCount)).map((n, i, x) => (x = ml_dec16(ml, offsetArgs + i * 2)) + '=>' + domain__debug(domains[x])).join(' '));
    ASSERT_LOG2(' - start loop, backwards');

    if (!R) return setEmpty(indexR, 'sum; R bad state');

    // a sum is basically a pyramid of plusses; (A+B)+(C+D) etc
    // to prevent generating an array we'll decode every var during the loop...
    // we loop back to front because we're splicing out vars while looping

    // replace all constants by one constant
    // prune the result var by the outer bounds of the sum of the args
    // in limited cases we can prune some of the arg values if the result forces
    // that (if the result is max 10 then inputs can be pruned of any value > 10)
    // we cant really do anything else

    let sumLo = fixedConstant;
    let sumHi = fixedConstant;
    for (let i = argCount - 1; i >= 0; --i) {
      let indexOffsetDelta = SIZEOF_C8_COUNT + i * 2;
      let indexA = ml_dec16(ml, offset + indexOffsetDelta);
      let A = getDomainOrRestartForAlias(indexA, indexOffsetDelta);
      ASSERT_LOG2('   - sum arg:', i, 'index:', indexA, 'domain:', domain__debug(A));
      if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op
      if (!A) return setEmpty(indexA, 'sum arg; bad state');
      let min = domain_min(A);
      let max = domain_max(A);
      sumLo += min;
      sumHi += max;
    }

    ASSERT_LOG2(' - total min=', sumLo, ', max=', sumHi, '. applying bounds to this R:', domain__debug(R));

    // trim the result to <low, hi>, which is the sum of the lows and his of all the args
    let oR = R;
    R = domain_removeLtUnsafe(R, sumLo);
    R = domain_removeGtUnsafe(R, sumHi);
    ASSERT_LOG2(' - Updated R from', domain__debug(oR), 'to', domain__debug(R));
    if (R !== oR) {
      if (setDomain(indexR, R, 'sum; updating R with outer bounds of its args;')) return;
    }

    let minR = domain_min(R);
    let maxR = domain_max(R);

    ASSERT_LOG2(' - Now back propagating R to the args', minR, maxR);

    // now trim the args for any value that can not amount to a valid result according to R
    // we use the min and max of R, subtract the total hi or lo from that number without the
    // hi or lo of the current var and the result will be the value that this var can at
    // least or most add to the total sum. oob values can be cut.
    let constants = 0;
    let constantSum = 0;
    let var1 = -1; // for 1 and 2 var optim, track which vars were non-constants
    let var2 = -1;
    for (let i = 0; i < argCount; ++i) {
      let indexOffsetDelta = SIZEOF_C8_COUNT + i * 2;
      let indexA = ml_dec16(ml, offset + indexOffsetDelta);
      let A = getDomainOrRestartForAlias(indexA, indexOffsetDelta);
      if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op
      let oA = A;
      A = domain_removeLtUnsafe(A, minR - (sumHi - domain_max(A)));
      A = domain_removeGtUnsafe(A, maxR - (sumLo - domain_min(A)));
      ASSERT_LOG2('   - sum arg:', i, 'index:', indexA, 'before:', domain__debug(oA), 'after:', domain__debug(A));
      if (A !== oA) {
        if (setDomain(indexA, A, 'sum; updating arg with new bounds')) return;
      }
      let vA = domain_getValue(A);
      if (vA >= 0) {
        ++constants;
        constantSum += vA;
      } else if (var1 === -1) {
        var1 = i;
      } else if (var2 === -1) {
        var2 = i;
      }
    }

    ASSERT_LOG2(' -> There are now', constants, 'constants and', argCount - constants, 'non-constants left. Constants sum to', constantSum);
    ASSERT_LOG2(constants && !constantSum && (argCount - constants) <= 2 ? ' - Dropping the zero-valued constants and rewriting the remaining args' : ' - No zero-valued constants to drop');
    ASSERT_LOG2(' -> Result of vars: ', Array.from(Array(argCount)).map((n, i) => domain__debug(domains[ml_dec16(ml, offsetArgs + i * 2)])).join(' '), ' Result:', domain__debug(R));

    if (argCount - constants === (constantSum ? 1 : 2)) {
      ASSERT_LOG2(' - Two concrete vars/values left to sum, rewriting to a plus');
      ASSERT_LOG2(' - Var 1 is the', var1, 'th arg and var 2 is', (constantSum ? 'the constant ' + constantSum : 'the ' + var2 + 'th arg'));
      ASSERT(constantSum ? var2 === -1 : var2 >= 0, 'if there are non-zero constants there should not be a second non-constant here otherwise expecting a second var');
      // there are either two non-constants and no constants,
      // or one non-constant and some constants left
      // consolidate the constants into one and recompile the
      // whole sum as a regular plus
      // compile a jmp for the unused var fields

      // TODO: note: use the plus opcode that accepts a literal
      let newIndexA = ml_dec16(ml, offsetArgs + var1 * 2);
      let newIndexB = constants ? getVar(addVar(undefined, constantSum, undefined, true)) : ml_dec16(ml, offsetArgs + var2 * 2);

      ASSERT(argCount >= 2, 'need at least two vars to have enough space for a plus');
      ml_enc8(ml, offset, ML_PLUS);
      ml_enc16(ml, offset + 1, newIndexA);
      ml_enc16(ml, offset + 3, newIndexB);
      ml_enc16(ml, offset + 5, indexR);
      ml_skip(ml, offset + SIZEOF_VVV, oplen - SIZEOF_VVV);

      ASSERT_LOG2(' - Changed to a plus to a plus on index', newIndexA, 'and', (constants ? 'constant value ' + constantSum : 'index ' + newIndexB));
      ASSERT_LOG2(' - ml now:', ml);
      // revisit immediately
      pc = offset;
    } else if (!constantSum && (argCount - constants) === 1) { // ignore the constants that are zero!
      ASSERT_LOG2(' - One concrete vars/values left to sum (sum arg index', var1, '), rewriting to an eq');
      // artifact; a sum with exactly one var is just an eq to R
      ASSERT(!constantSum && var1 >= 0 && var2 < 0, 'should have found exactly one var', 'constants:', constants, 'constantSum:', constantSum, 'var1:', var1, 'var2:', var2);

      let newIndexA = ml_dec16(ml, offsetArgs + var1 * 2);

      // if R is a constant we use ML_V8_EQ and otherwise ML_VV_EQ
      if (minR === maxR) {
        ASSERT_LOG2(' - compiling ML_V8_EQ because R solved to', minR);
        ml_enc8(ml, offset, ML_V8_EQ);
        ml_enc16(ml, offset + 1, newIndexA);
        ASSERT(minR <= 255, 'support 16bit if this fails'); // TODO: just support it by compiling it as a new anonymous (solved) var
        ml_enc8(ml, offset + 3, minR); // this can fail if R solved to >255.. that requires 16 or 32bit support here
        ml_skip(ml, offset + SIZEOF_V8, oplen - SIZEOF_V8);
      } else {
        ASSERT_LOG2(' - compiling ML_VV_EQ because R is not yet solved', minR, maxR);
        // the len of this sum is op+len+var+R or 1 + 2 + 2 + 2 = 7. the len
        // of an eq is 5 (1+2+2) so just replace it and append a noop2 to it
        ml_enc8(ml, offset, ML_VV_EQ);
        ml_enc16(ml, offset + 1, newIndexA);
        ml_enc16(ml, offset + 3, indexR);
        ml_skip(ml, offset + SIZEOF_VV, oplen - SIZEOF_VV);
      }

      ASSERT_LOG2(' - changed to a product to an eq on index', newIndexA, 'and index ' + indexR);
      ASSERT_LOG2(' - ml now:', ml);
      // revisit it immediately
      pc = offset;
    } else if (argCount - constants === 0) {
      // eliminate. skip (count+1)*2+2 bytes
      ASSERT_LOG2(' - eliminating constraint since all vars are constants');
      oR = R;
      R = domain_intersectionValue(R, constantSum);
      if (oR !== R) {
        if (setDomain(indexR, R, 'sum; solved R because all args are constants (now)')) return;
      }

      ml_eliminate(ml, offset, SIZEOF_C8_COUNT + argCount * 2 + 2); // sizeof(op)=x; op+count+vars+result -> 8bit+16bit+8bit+n*16bit+16bit
    } else if (constants) {
      ASSERT_LOG2(' - Unable to morph but there are', constants, 'constants to consolidate to value', constantSum + fixedConstant);
      ASSERT((constantSum + fixedConstant) < 256, 'TODO: support >8bit');
      // there are constants and they did not morph or eliminate the constraint; consolidate them.
      ml_enc16(ml, offset + 1, argCount - constants);
      ml_enc8(ml, offset + 3, constantSum + fixedConstant);
      // loop through the constants and move non-constants to the left
      ASSERT_LOG2(' - Moving constants out...');
      let tgtIndex = 0;
      for (let i = 0; i < argCount; ++i) {
        let indexOffsetDelta = SIZEOF_C8_COUNT + i * 2;
        let indexA = ml_dec16(ml, offset + indexOffsetDelta);
        let A = getDomainOrRestartForAlias(indexA, indexOffsetDelta);
        ASSERT_LOG2('   - index:', indexA, 'domain:', domain__debug(A), 'constant:', domain_isSolved(A));
        ASSERT(A !== MINIMIZE_ALIASED, 'A didnt change so it shouldnt have been aliased since last explicit check');
        if (!domain_isSolved(A)) {
          ASSERT_LOG2('     - not a constant so moving 2 bytes from', offset + indexOffsetDelta, 'to', offset + SIZEOF_C8_COUNT + tgtIndex);
          // move forward (wont change anything until a constant was skipped...)
          ml_enc8(ml, offset + SIZEOF_C8_COUNT + tgtIndex++, ml_dec8(ml, offset + indexOffsetDelta));
          ml_enc8(ml, offset + SIZEOF_C8_COUNT + tgtIndex++, ml_dec8(ml, offset + indexOffsetDelta + 1));
        }
      }
      ASSERT_LOG2(' - Non-constants should now all be moved to the left. Moving result var from', offsetR, 'to', offset + SIZEOF_C8_COUNT + tgtIndex);
      ml_enc8(ml, offset + SIZEOF_C8_COUNT + tgtIndex++, ml_dec8(ml, offsetR));
      ml_enc8(ml, offset + SIZEOF_C8_COUNT + tgtIndex++, ml_dec8(ml, offsetR + 1));
      ASSERT_LOG2(' - Now blanking out', constants * 2, 'trailing empty bytes starting at', offset + SIZEOF_C8_COUNT + (argCount - constants) * 2 + 2);
      // now "blank out" the remainder
      ml_skip(ml, offset + SIZEOF_C8_COUNT + (argCount - constants) * 2 + 2, constants * 2);
      pc = offset; // TODO: temp while debugging + oplen;
    } else {
      ASSERT(argCount - (constantSum ? constants : 0) > 1, 'There no other valid options here', 'count', argCount, 'constants', constants, 'count-constants', argCount - constants, 'constantsum', constantSum);
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_C8_COUNT + argCount * 2 + 2; // skip the 16bit indexes manually
    }
    ASSERT_LOG2(' - ml after sum:', ml.slice(offset, offset + SIZEOF_C8_COUNT + 2 * argCount + 2));
  }

  function cr_product(ml) {
    let offset = pc;
    ASSERT_LOG2(' - parsing product:', ml.slice(offset, offset + 10));
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let argLen = argCount * 2;
    let oplen = SIZEOF_COUNT + argLen + 2;
    ASSERT_LOG2(' - ml for this product:', ml.slice(offset, offset + oplen));
    let offsetArgs = offset + SIZEOF_COUNT;
    let offsetR = offsetArgs + argLen;
    let indexR = ml_dec16(ml, offsetR);

    let R = getDomainOrRestartForAlias(indexR, SIZEOF_COUNT + argLen);
    if (R === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_product', argCount, 'x');
    ASSERT_LOG2('  -> {' + indexR + '=' + domain__debug(R) + '} = ', Array.from(Array(argCount)).map((n, i, x) => (x = ml_dec16(ml, offsetArgs + i * 2)) + '=>' + domain__debug(domains[x])).join(' '));
    ASSERT_LOG2(' - start loop, backwards');

    if (!R) return setEmpty(indexR, 'product; R bad state');

    // a product is basically a pyramid of muls; (A*B)*(C*D) etc
    // to prevent generating an array we'll decode every var during the loop...
    // we loop back to front because we're splicing out vars while looping

    // replace all constants by one constant
    // prune the result var by the outer bounds of the product of the args
    // in limited cases we can prune some of the arg values if the result forces
    // that (if the result is max 10 then inputs can be pruned of any value > 10)
    // we cant really do anything else

    let productLo = 1;
    let productHi = 1;
    for (let i = argCount - 1; i >= 0; --i) {
      let indexA = ml_dec16(ml, offsetArgs + i * 2);
      let A = getDomainOrRestartForAlias(indexA, SIZEOF_COUNT + i * 2);
      ASSERT_LOG2('    - index=', indexA, 'dom=', domain__debug(A));
      if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op
      if (!A) return setEmpty(indexA, 'product; bad state');
      let min = domain_min(A);
      let max = domain_max(A);
      productLo *= min;
      productHi *= max;
    }

    ASSERT_LOG2(' - total min=', productLo, ', max=', productHi, '. applying bounds to this R:', domain__debug(R));

    // trim the result to <low, hi>, which is the product of the lows and his of all the args
    let oR = R;
    R = domain_removeLtUnsafe(R, productLo);
    R = domain_removeGtUnsafe(R, productHi);
    ASSERT_LOG2(' - Updated R from', domain__debug(oR), 'to', domain__debug(R));
    if (R !== oR) {
      if (setDomain(indexR, R, 'product; updated R bounds with arg outer bounds')) return;
    }

    let minR = domain_min(R);
    let maxR = domain_max(R);

    ASSERT_LOG2(' - Now back propagating R to the args', minR, maxR);

    // now trim the args for any value that can not amount to a valid result according to R
    // we use the min and max of R, subtract the total hi or lo from that number without the
    // hi or lo of the current var and the result will be the value that this var can at
    // least or most add to the total product. oob values can be cut.
    let constants = 0;
    let constantsProduct = 1;
    let var1 = -1; // for 1 and 2 var optim, track which vars were non-constants
    let var2 = -1;
    for (let i = 0; i < argCount; ++i) {
      let indexA = ml_dec16(ml, offsetArgs + i * 2);
      let A = getDomainOrRestartForAlias(indexA, 1 + 2 + i * 2);
      if (A === MINIMIZE_ALIASED) return; // there was an alias; restart op
      let oA = A;
      //ASSERT_LOG2('lte, A=', domain__debug(A), 'max=',domain_max(A), 'producthi=',productHi, 'ta=',productHi / domain_max(A), 'min(R)/ta=', minR/(productHi / domain_max(A)));
      let ta = productHi / domain_max(A);
      if (ta) A = domain_removeLtUnsafe(A, Math.floor(minR / ta));
      ta = productLo / domain_min(A);
      //ASSERT_LOG2('gte', ta, maxR/ta)
      if (ta) A = domain_removeGtUnsafe(A, Math.ceil(maxR / ta));
      if (A !== oA) {
        if (setDomain(indexA, A, 'product; updated bounds of an arg')) return;
      }
      let vA = domain_getValue(A);
      if (vA >= 0) {
        ++constants;
        constantsProduct *= vA;
      } else if (var1 === -1) {
        var1 = i;
      } else if (var2 === -1) {
        var2 = i;
      }
    }

    ASSERT_LOG2(' -> There are now', constants, 'constants and', argCount - constants, 'non-constants left. Constants mul to', constantsProduct);
    ASSERT_LOG2(' -> Result of vars: ', Array.from(Array(argCount)).map((n, i) => domain__debug(domains[ml_dec16(ml, offsetArgs + i * 2)])).join(' '), ' Result:', domain__debug(R));

    if (argCount - constants === (constants ? 1 : 2)) {
      ASSERT(constants ? var2 === -1 : var2 >= 0, 'if there are constants there should not be a second non-constant here otherwise expecting a second var');
      // there are either two non-constants and no constants,
      // or one non-constant and some constants left
      // consolidate the constants into one and recompile the
      // whole product as a regular mul
      // compile a jmp for the unused var fields

      // TODO: note: use the mul opcode that accepts a literal
      let newIndexA = ml_dec16(ml, offsetArgs + var1 * 2);
      let newIndexB = constants ? getVar(addVar(undefined, constantsProduct, undefined, true)) : ml_dec16(ml, offsetArgs + var2 * 2);

      ASSERT(argCount >= 2, 'need at least two vars to have enough space for a plus');
      ml_enc8(ml, offset, ML_MUL);
      ml_enc16(ml, offset + 1, newIndexA);
      ml_enc16(ml, offset + 3, newIndexB);
      ml_enc16(ml, offset + 5, indexR);

      // this distinct has at least two var args. a distinct of 2+ takes 1+2+n*2
      // bytes. a plus takes 1+2+2+2 bytes. so this morph should be fine.
      ml_skip(ml, offset + SIZEOF_VVV, oplen - SIZEOF_VVV);

      ASSERT_LOG2(' - changed to a mul on index', newIndexA, 'and', (constants ? 'constant value ' + constantsProduct : 'index ' + newIndexB));
      // revisit immediately
      pc = offset;
    } else if (!constants && argCount === 1) {
      // artifact; a product with exactly one var is just an eq to R
      ASSERT(!constants && var1 >= 0 && var2 < 0, 'should have found exactly one var');

      let newIndexA = ml_dec16(ml, offsetArgs + var1 * 2);

      // if R is a constant we use ML_V8_EQ and otherwise ML_VV_EQ
      if (minR === maxR) {
        ml_enc8(ml, offset, ML_V8_EQ);
        ml_enc16(ml, offset + 1, newIndexA);
        ml_enc8(ml, offset + 3, minR); // this can fail if R solved to >255.. that requires 16 or 32bit support here
        ml_skip(ml, offset + SIZEOF_V8, oplen - SIZEOF_V8);
      } else {
        // the len of this sum is op+len+var+R or 1 + 2 + 2 + 2 = 7. the len
        // of an eq is 5 (1+2+2) so just replace it and append a noop2 to it
        ml_enc8(ml, offset, ML_VV_EQ);
        ml_enc16(ml, offset + 1, newIndexA);
        ml_enc16(ml, offset + 3, indexR);
        ml_skip(ml, offset + SIZEOF_VV, oplen - SIZEOF_VV);
      }

      ASSERT_LOG2(' - changed to a product to an eq on index', newIndexA, 'and index ' + indexR);
      ASSERT_LOG2(' - ml now:', ml);
      // revisit it immediately
      pc = offset;
    } else if (argCount - constants === 0) {
      // eliminate. skip (count+1)*2+2 bytes
      ASSERT_LOG2(' - eliminating constraint since all vars are constants');
      oR = R;
      R = domain_intersectionValue(R, constantsProduct);
      if (oR !== R) {
        if (!R) return setEmpty(indexR, 'product; solved R because only constants are left');
      }
      let delta = SIZEOF_COUNT + argLen + 2; // sizeof(op)=x; op+count+vars+result -> 8bit+16bit+n*16bit+16bit
      ml_eliminate(ml, offset, delta);
    } else {
      ASSERT(argCount - constants > 2, 'There no other valid options here');
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_COUNT + argLen + 2; // skip the 16bit indexes manually
    }
  }

  function cr_vv_and(ml) {
    // remove zero from A and B and remove constraint
    // (this is basically an alias for A>=1,B>=1 for the sake of consistency)
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let oA = getDomainOrRestartForAlias(indexA, 1);
    let oB = getDomainOrRestartForAlias(indexB, 3);
    if (oA === MINIMIZE_ALIASED || oB === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vv_and', indexA, '&', indexB, ' -> ', domain__debug(A), '&', domain__debug(B));

    let A = domain_removeValue(oA, 0);
    let B = domain_removeValue(oB, 0);
    if (setDomain(indexA, A, 'AND A') || setDomain(indexB, B, 'AND B')) return;

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B));

    ml_eliminate(ml, offset, SIZEOF_VV);
  }

  function cr_vv_or(ml) {
    // remove constraint when A or B has no zero
    // when A or B solves to zero remove zero from the other and remove constraint
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vv_or', indexA, '|', indexB, ' -> ', domain__debug(A), '|', domain__debug(B));

    if (domain_getValue(A) === 0) {
      ASSERT_LOG2(' - A=0 so remove 0 from B', domain__debug(B), '->', domain__debug(domain_removeValue(B, 0)));
      let oB = B;
      B = domain_removeValue(oB, 0);
      if (B !== oB) {
        if (setDomain(indexB, B, 'OR B')) return;
      }
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else if (domain_getValue(B) === 0) {
      ASSERT_LOG2(' - B=0 so remove 0 from A', domain__debug(A), '->', domain__debug(domain_removeValue(A, 0)));
      let oA = A;
      A = domain_removeValue(A, 0);
      if (A !== oA) {
        if (setDomain(indexA, A, 'OR A')) return;
      }
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else if (domain_min(A) > 0 || domain_min(B) > 0) {
      ASSERT_LOG2(' - at least A or B has no zeroes so remove constraint');
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VV;
    }
  }

  function cr_vv_xor(ml) {
    // fail if either A and B solve to zero or both solve to non-zero
    // remove when either solves to zero and the other has no zero
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vv_xor', indexA, '^', indexB, ' -> ', domain__debug(A), '^', domain__debug(B));

    let hasZeroA = domain_min(A) === 0;
    let hasZeroB = domain_min(B) === 0;
    if (hasZeroA !== hasZeroB) {
      // the one that has a zero must solve to zero
      setDomain(hasZeroA ? indexA : indexB, domain_createValue(0), 'xor');

      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }
    // ok so either A and B both do or dont contain a zero
    if (!hasZeroA) {
      // reject because neither has zero but at least must have to satisfy the xor
      setEmpty(indexA, 'xor(A,B) failed');
      setEmpty(indexB, 'xor(A,B) failed');
      return;
    }

    // last case; both have zero. if one is solved, remove it from the other. otherwise leave it for now.
    if (domain_isSolved(A)) {
      if (setDomain(indexB, domain_removeValue(B, 0), 'A=0 xor B')) return;
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }
    if (domain_isSolved(B)) {
      if (setDomain(indexA, domain_removeValue(A, 0), 'B=0 xor A')) return;
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VV;
  }

  function cr_vv_nand(ml) {
    // fail if A and B solve to non-zero
    // remove when either solves to zero
    // when either has no zero, set other to zero and remove constraint
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vv_nand', indexA, '!&', indexB, ' -> ', domain__debug(A), '!&', domain__debug(B));

    if (domain_min(A) > 0) {
      // -> B=0
      if (setDomain(indexB, domain_removeGte(B, 1), 'nand')) return;
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }
    if (domain_min(B) > 0) {
      // -> A=0
      if (setDomain(indexA, domain_removeGte(A, 1), 'nand')) return;
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }
    // note: at this point A and B both have a zero. if either is solved, it is
    // solved to zero and we remove the constraint. otherwise neither is solved
    // (they'd have zero and something non-zero) and we ignore now
    if (domain_isZero(A) || domain_isZero(B)) {
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VV;
  }

  function cr_vv_xnor(ml) {
    // fail if A and B both solve to zero or both to non-zero
    // when either solves to zero also solve the other to zero and remove constraint
    // when either has no zero, remove zero from the other and remove constraint
    let offset = pc;
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = ml_dec16(ml, offsetA);
    let indexB = ml_dec16(ml, offsetB);

    let A = getDomainOrRestartForAlias(indexA, 1);
    let B = getDomainOrRestartForAlias(indexB, 3);
    if (A === MINIMIZE_ALIASED || B === MINIMIZE_ALIASED) return; // there was an alias; restart op

    ASSERT_LOG2(' = cr_vv_xnor', indexA, '!^', indexB, ' -> ', domain__debug(A), '!^', domain__debug(B));

    if (domain_min(A) > 0) {
      // -> B>0
      if (setDomain(indexB, domain_removeValue(B, 0), 'xnor')) return;
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }
    if (domain_min(B) > 0) {
      // -> A>0
      if (setDomain(indexA, domain_removeValue(A, 0), 'xnor')) return;
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }
    // note: at this point A and B both have a zero. if either is solved, it is
    // solved to zero, set the other to zero and remove the constraint.
    if (domain_isZero(A)) {
      if (setDomain(indexB, domain_removeGte(B, 1), 'xnor')) return;
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }
    if (domain_isZero(B)) {
      if (setDomain(indexA, domain_removeGte(A, 1), 'xnor')) return;
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VV;
  }
}

function cr_vvv2vv(ml, offset, opCode, indexA, indexB) {
  ASSERT_LOG2(' -| cr_vvv2vv |', opCode, indexA, indexB);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);
  ml_skip(ml, offset + SIZEOF_VV, SIZEOF_VVV - SIZEOF_VV);
}

function cr_vvv2v8v(ml, offset, opCode, indexA, constant, indexR) {
  ASSERT_LOG2(' -| cr_vvv2v8v |', opCode, indexA, constant, indexR);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc8(ml, offset + 3, constant);
  ml_enc16(ml, offset + 4, indexR);
  ml_skip(ml, offset + SIZEOF_V8V, SIZEOF_VVV - SIZEOF_V8V);
}

function cr_vv82vv(ml, offset, opCode, indexA, indexB) {
  ASSERT_LOG2(' -| cr_vv82vv |', opCode, indexA, indexB);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);
  ml_skip(ml, offset + SIZEOF_VV, SIZEOF_VV8 - SIZEOF_VV);
}

function cr_8vv2vv(ml, offset, opCode, indexA, indexB) {
  ASSERT_LOG2(' -| cr_8vv2vv |', opCode, indexA, indexB);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);
  ml_skip(ml, offset + SIZEOF_VV, SIZEOF_8VV - SIZEOF_VV);
}

function cr_8vv2v8(ml, offset, opCode, indexA, vB) {
  ASSERT_LOG2(' -| cr_8vv2v8 |', opCode, indexA, vB);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc8(ml, offset + 3, vB);
  ml_skip(ml, offset + SIZEOF_V8, SIZEOF_8VV - SIZEOF_V8);
}

function cr_8vv28v(ml, offset, opCode, vA, indexB) {
  ASSERT_LOG2(' -| cr_8vv28v |', opCode, vA, indexB);
  ml_enc8(ml, offset, opCode);
  ml_enc8(ml, offset + 1, vA);
  ml_enc16(ml, offset + 2, indexB);
  ml_skip(ml, offset + SIZEOF_8V, SIZEOF_8VV - SIZEOF_8V);
}

function cr_v8v2vv(ml, offset, opCode, indexA, indexB) {
  ASSERT_LOG2(' -| cr_v8v2vv |', opCode, indexA, indexB);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc16(ml, offset + 3, indexB);
  ml_skip(ml, offset + SIZEOF_VV, SIZEOF_V8V - SIZEOF_VV);
}

function cr_v8v2v8(ml, offset, opCode, indexA, vB) {
  ASSERT_LOG2(' -| cr_v8v2v8 |', opCode, indexA, vB);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc8(ml, offset + 3, vB);
  ml_skip(ml, offset + SIZEOF_V8, SIZEOF_V8V - SIZEOF_V8);
}

function cr_v8v2v8v(ml, offset, opCode, indexA, vB, indexR) {
  ASSERT_LOG2(' -| cr_v8v2v8v |', opCode, indexA, vB, indexR);
  ml_enc8(ml, offset, opCode);
  ml_enc16(ml, offset + 1, indexA);
  ml_enc8(ml, offset + 3, vB);
  ml_enc16(ml, offset + 4, indexR);
}

function cr_v8v28v(ml, offset, opCode, vA, indexB) {
  ASSERT_LOG2(' -| cr_v8v2v8 |', opCode, vA, indexB);
  ml_enc8(ml, offset, opCode);
  ml_enc8(ml, offset + 1, vA);
  ml_enc16(ml, offset + 2, indexB);
  ml_skip(ml, offset + SIZEOF_8V, SIZEOF_V8V - SIZEOF_8V);
}

//function cr_v8v2v88(ml, offset, opCode, indexA, vB, vR) {
//  ASSERT_LOG2(' -| cr_v8v2v88 |', opCode, indexA, vB, vR);
//  ml_enc8(ml, offset, opCode);
//  ml_enc16(ml, offset + 1, indexA);
//  ml_enc8(ml, offset + 3, vB);
//  ml_enc8(ml, offset + 4, vR);
//  ml_skip(ml, offset + SIZEOF_V88, SIZEOF_V8V - SIZEOF_V88);
//}

// BODY_STOP

export {
  MINIMIZER_STABLE,
  MINIMIZER_SOLVED,
  MINIMIZER_REJECTED,
  cr_optimizeConstraints,
};
