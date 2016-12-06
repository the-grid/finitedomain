// problem optimizer
// take an input problem and determine whether constraints can be pruned
// or domains cut before actually generating their propagators

import {
  SUB,
  SUP,

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
  ML_88_LT,
  ML_LTE,
  ML_GT,
  ML_GTE,
  ML_ISEQ,
  ML_ISNEQ,
  ML_ISLT,
  ML_ISLTE,
  ML_ISGT,
  ML_ISGTE,
  ML_SUM,
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
} from './compiler';
import {
  domain__debug,
  domain_containsValue,
  domain_createEmpty,
  domain_createRange,
  domain_createValue,
  domain_getValue,
  domain_intersection,
  domain_isEmpty,
  domain_isSolved,
  domain_max,
  domain_min,
  domain_removeGte,
  domain_removeGtUnsafe,
  domain_removeLte,
  domain_removeLtUnsafe,
  domain_removeValue,
} from './domain';

// BODY_START

const MINIMIZER_STABLE = 0;
const MINIMIZER_SOLVED = 1;
const MINIMIZER_REJECTED = 2;

function cr_optimizeConstraints(ml, domains, addVar, getVar) {
  ASSERT_LOG2('cr_optimizeConstraints', ml, domains.map(domain__debug));
  let change = true;
  let onlyJumps = true;
  let emptyDomain = false;
  let pc = 0;
  while (change) {
    ASSERT_LOG2('cr outer loop');
    change = false;
    pc = 0;
    cr_innerLoop();
    ASSERT_LOG2('changed?', change, 'only jumps?', onlyJumps, 'empty domain?', emptyDomain);
    if (emptyDomain) return MINIMIZER_REJECTED;
    if (onlyJumps) return MINIMIZER_SOLVED;
  }
  return MINIMIZER_STABLE;

  function cr_innerLoop() {
    onlyJumps = true;
    while (pc < ml.length && !emptyDomain) {
      let pcStart = pc;
      let op = ml[pc++];
      ASSERT_LOG2('# CRc[' + pcStart + ']:', op, '(0x' + op.toString(16) + ')');
      switch (op) {
        case ML_UNUSED:
          return THROW(' ! problem @', pcStart);

        case ML_STOP:
          ASSERT_LOG2(' ! good end @', pcStart);
          return;

        case ML_JMP:
          ASSERT_LOG2('- jmp @', pcStart);
          let delta = cr_dec16();
          ASSERT_LOG2('- jump', delta);
          pc += delta;
          break;

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

        case ML_88_LT:
          ASSERT_LOG2('- lt 88 @', pcStart);
          cr_88_lt(ml);
          break;

        case ML_LTE:
          ASSERT_LOG2('- lte @', pcStart);
          cr_lte(ml);
          break;

        case ML_GT:
          ASSERT_LOG2('- gt @', pcStart);
          cr_gt(ml);
          break;

        case ML_GTE:
          ASSERT_LOG2('- gte @', pcStart);
          cr_gte(ml);
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

        case ML_ISEQ:
          ASSERT_LOG2('- iseq @', pcStart);
          cr_isEq(ml);
          break;

        case ML_ISNEQ:
          ASSERT_LOG2('- isneq @', pcStart);
          cr_isNeq(ml);
          break;

        case ML_ISLT:
          ASSERT_LOG2('- islt @', pcStart);
          cr_isLt(ml);
          break;

        case ML_ISLTE:
          ASSERT_LOG2('- islte @', pcStart);
          cr_isLte(ml);
          break;

        case ML_ISGT:
          ASSERT_LOG2('- isgt @', pcStart);
          cr_isGt(ml);
          break;

        case ML_ISGTE:
          ASSERT_LOG2('- isgte @', pcStart);
          cr_isGte(ml);
          break;

        case ML_SUM:
          ASSERT_LOG2('- sum @', pcStart);
          cr_sum(ml);
          break;

        case ML_PRODUCT:
          ASSERT_LOG2('- product @', pcStart);
          cr_product(ml);
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
          ASSERT_LOG2('- noop3 @', pcStart, '->', pc);
          break;
        case ML_NOOP4:
          pc = pcStart + 4;
          ASSERT_LOG2('- noop4 @', pcStart, '->', pc);
          break;

        default:
          THROW('unknown op: 0x' + op.toString(16));
      }
    }
    if (emptyDomain) return;
    return THROW('Derailed; expected to find STOP before EOF');
  }

  function cr_dec8() {
    ASSERT(pc < ml.length, 'OOB');
    ASSERT_LOG2(' . dec8 decoding', ml[pc], 'from', pc);
    return ml[pc++];
  }

  function cr_dec16() {
    ASSERT(pc < ml.length - 1, 'OOB');
    ASSERT_LOG2(' . dec16 decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1, '=>', (ml[pc] << 8) | ml[pc + 1]);
    return (ml[pc++] << 8) | ml[pc++];
  }

  function cr_dec16pc(pc) {
    ASSERT(pc < ml.length - 1, 'OOB');
    ASSERT_LOG2(' . dec16pc decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1);
    return (ml[pc++] << 8) | ml[pc];
  }

  function cr_enc8(pc, num) {
    ASSERT(typeof num === 'number', 'Encoding numbers');
    ASSERT((num >> 0) <= 0xff, 'Only encode 8bit values');
    ASSERT(pc < ml.length, 'OOB');
    ASSERT_LOG2(' . enc8(' + num + ')', num, 'at', pc);
    ml[pc] = num;
  }

  //function cr_enc88(pc, a, b) {
  //  ASSERT(typeof a === 'number', 'Encoding numbers');
  //  ASSERT(typeof b === 'number', 'Encoding numbers');
  //  ASSERT((a >> 0) <= 0xff, 'Only encode 8bit values');
  //  ASSERT((b >> 0) <= 0xff, 'Only encode 8bit values');
  //  ASSERT(pc < ml.length - 1, 'OOB');
  //  ASSERT_LOG2(' - encoding', a, 'at', pc, 'and', b, 'at', pc + 1);
  //  ml[pc++] = a;
  //  ml[pc] = b;
  //}

  function cr_enc16(pc, num) {
    ASSERT(typeof num === 'number', 'Encoding numbers');
    ASSERT(num <= 0xffff, 'implement 32bit index support if this breaks', num);
    ASSERT(pc < ml.length - 1, 'OOB');
    ASSERT_LOG2(' - enc16(' + num + ')', (num >> 8) & 0xff, 'at', pc, 'and', num & 0xff, 'at', pc + 1);
    ml[pc++] = (num >> 8) & 0xff;
    ml[pc] = num & 0xff;
  }

  function cr_vv_eq(ml) {
    // read two indexes to target
    // for now they are 16bit but maybe we'll introduce ML_EQ32 when using >64k vars

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];

    ASSERT_LOG2(' = cr_vv_eq', indexA, indexB, domain__debug(A), domain__debug(B));
    if (!A || !B) return emptyDomain = true;

    let R = domain_intersection(A, B);
    ASSERT_LOG2(' ->', domain__debug(R));
    if (!R) return emptyDomain = true;
    change = A !== R || B !== R;
    domains[indexA] = R;
    domains[indexB] = R;

    // solved if the two domains intersect to a solved domain
    if (domain_getValue(R) >= 0) {
      ASSERT_LOG2(' - eliminating constraint');
      // op + A are already skipped. this skips over B
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 2);

      // TODO: (abstract this) check target field. if it's also a jump, extend this jump by that
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_v8_eq(ml) {
    // read one index to A, B is a literal

    let offset = pc - 1;
    let indexA = cr_dec16();
    let vB = cr_dec8();

    let A = domains[indexA];

    ASSERT_LOG2(' = cr_v8_eq', indexA, domain__debug(A), vB);
    if (!A) return emptyDomain = true;

    if (!domain_containsValue(A, vB)) {
      ASSERT_LOG2(' - A did not contain literal', vB, 'so search rejects');
      domains[indexA] = domain_createEmpty();
      return emptyDomain = true;
    }

    domains[indexA] = domain_createValue(vB);

    // domain must be solved now since B was a literal (a solved constant)

    ASSERT_LOG2(' - A contained literal', vB, 'so eliminating constraint');
    // op + 2 + 1
    cr_enc8(offset, ML_NOOP4);

    // TODO: (abstract this) check target field. if it's also a jump, extend this jump by that
  }

  function cr_88_eq(ml) {
    // eq two literals
    // either remove constraint if they are equal or reject if they are not

    let offset = pc - 1;
    let vA = cr_dec8();
    let vB = cr_dec8();

    ASSERT_LOG2(' = cr_88_eq', vA, vB);

    if (vA === vB) {
      ASSERT_LOG2(' - literals match so eliminating this constraint');
      cr_enc8(offset, ML_NOOP3); // 1+1+1
    } else {
      ASSERT_LOG2(' - literals dont match so this problem is unsolvable');
      return emptyDomain = true; // TODO: is there anything higher up that properly handles this case?
    }
  }

  function cr_vv_neq(ml) {
    // read two indexes to target
    // for now they are 16bit but maybe we'll introduce ML_NEQ32 when using >64k vars

    let offset = pc - 1;

    let indexA = cr_dec16();
    let indexB = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];

    ASSERT_LOG2(' = cr_vv_neq', indexA, indexB, domain__debug(A), domain__debug(B));
    if (!A || !B) return emptyDomain = true;

    // if either is solved then the other domain should
    // become the result of unsolved_set "minus" solved_set
    let vA = domain_getValue(A);
    if (vA >= 0) {
      change = true;
      B = domains[indexB] = domain_removeValue(B, vA);
      if (!B) return emptyDomain = true;
    }
    let vB = domain_getValue(B);
    if (domain_getValue(B) >= 0) {
      change = true;
      A = domains[indexA] = domain_removeValue(A, vB);
      if (!A) return emptyDomain = true;
    }

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B));

    // solved if the two domains (now) intersects to an empty domain
    let R = domain_intersection(A, B);
    if (domain_isEmpty(R)) {
      ASSERT_LOG2(' - eliminating constraint');
      // op + A are already skipped. this skips over B
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 2);

      // TODO: (abstract this) check target field. if it's also a jump, extend this jump by that
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_v8_neq(ml) {
    // read one index to target and an 8bit literal

    let offset = pc - 1;

    let indexA = cr_dec16();
    let vB = cr_dec8();

    let A = domains[indexA];

    ASSERT_LOG2(' = cr_v8_neq', indexA, domain__debug(A), vB);
    if (!A) return emptyDomain = true;

    // remove the literal from A and remove constraint
    let oA = A;
    A = domains[indexA] = domain_removeValue(A, vB);
    ASSERT_LOG2(' ->', domain__debug(A));
    if (A !== oA) {
      if (!A) return emptyDomain = true;
      change = true;
    }

    ASSERT_LOG2(' - eliminating constraint');
    cr_enc8(offset, ML_NOOP4); // 1 + 2 + 1
  }

  function cr_88_neq(ml) {
    // check if two literals are neq. eliminate constraint afterwards.

    let offset = pc - 1;

    let vA = cr_dec8();
    let vB = cr_dec8();

    ASSERT_LOG2(' = cr_88_neq', vA, vB);

    if (vA === vB) return emptyDomain = true;

    ASSERT_LOG2(' - eliminating constraint');
    cr_enc8(offset, ML_NOOP3); // 1 + 1 + 1
  }

  function cr_vv_lt(ml) {
    // read two indexes to target

    let offset = pc - 1;

    let indexA = cr_dec16();
    let indexB = cr_dec16();

    ASSERT_LOG2(' = cr_vv_lt', indexA, indexB, domain__debug(domains[indexA]), domain__debug(domains[indexB]));

    _cr_vv_lt(ml, indexA, indexB, offset);
  }

  function _cr_vv_lt(ml, indexA, indexB, offset) {
    let A = domains[indexA];
    let B = domains[indexB];
    if (!A || !B) return emptyDomain = true;

    // relative comparison is easy; cut away any non-intersecting
    // values that violate the desired outcome. only when a A and
    // B have multiple intersecting values we have to keep this
    // constraint

    let oA = A;
    let oB = B;
    A = domains[indexA] = domain_removeGte(A, domain_max(B));
    ASSERT_LOG2(' - updated A', domain__debug(A), 'max B=', domain_max(B));
    if (!A) return emptyDomain = true;
    B = domains[indexB] = domain_removeLte(B, domain_min(A));
    ASSERT_LOG2(' - updated B', domain__debug(B), 'max A=', domain_min(A));
    if (!B) return emptyDomain = true;

    change = oA !== A || oB !== B;
    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B));

    // any value in A must be < any value in B
    if (domain_max(A) < domain_min(B)) {
      ASSERT_LOG2(' - eliminating constraint');
      // solved because there is no value left in A that is bigger or equal to B
      // op + A are already skipped. this skips over B
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 2);

      // TODO: (abstract this) check target field. if it's also a jump, extend this jump by that
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_v8_lt(ml) {
    // read one index to target and a literal

    let offset = pc - 1;

    let indexA = cr_dec16();
    let vB = cr_dec8();

    let A = domains[indexA];

    ASSERT_LOG2(' = cr_v8_lt', indexA, domain__debug(A), vB);
    if (domain_max(A) >= vB) return emptyDomain = true;

    let oA = A;
    // remove any value gte vB and remove constraint
    A = domains[indexA] = domain_removeGte(A, vB);
    ASSERT_LOG2(' ->', domain__debug(A));
    if (A !== oA) {
      if (!A) return emptyDomain = true;
      change = true;
    }

    ASSERT_LOG2(' - eliminating constraint');
    cr_enc8(offset, ML_NOOP4); // 1 + 2 + 1
  }

  function cr_88_lt(ml) {
    // read two literals

    let offset = pc - 1;

    let vA = cr_dec8();
    let vB = cr_dec8();

    ASSERT_LOG2(' = cr_88_lt', vA, vB);
    if (vA >= vB) return emptyDomain = true;

    ASSERT_LOG2(' - eliminating constraint');
    cr_enc8(offset, ML_NOOP3); // 1 + 1 + 1
  }

  function cr_lte(ml) {
    // read two indexes to target

    let offset = pc - 1;

    let indexA = cr_dec16();
    let indexB = cr_dec16();

    ASSERT_LOG2(' = cr_lte', indexA, indexB, domain__debug(domains[indexA]), domain__debug(domains[indexB]));

    _cr_lte(ml, indexA, indexB, offset);
  }

  function _cr_lte(ml, indexA, indexB, offset) {
    let A = domains[indexA];
    let B = domains[indexB];
    if (!A || !B) return emptyDomain = true;

    // relative comparison is easy; cut away any non-intersecting
    // values that violate the desired outcome. only when a A and
    // B have multiple intersecting values we have to keep this
    // constraint

    let oA = A;
    let oB = B;
    A = domains[indexA] = domain_removeGtUnsafe(A, domain_max(B));
    ASSERT_LOG2(' - updated A', domain__debug(A), 'max B=', domain_max(B));
    if (!A) return emptyDomain = true;
    // A is (now) empty so just remove it
    B = domains[indexB] = domain_removeLtUnsafe(B, domain_min(A));
    ASSERT_LOG2(' - updated B', domain__debug(B), 'max A=', domain_min(A));
    if (!B) return emptyDomain = true;

    change = oA !== A || oB !== B;
    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B));

    // any value in A must be < any value in B
    if (domain_max(A) <= domain_min(B)) {
      ASSERT_LOG2(' - eliminating constraint at 1 because max(A)<=max(B) (', domain_max(A), '<=', domain_min(B), ')');
      // solved because there is no value left in A that is bigger or equal to B
      // op + A are already skipped. this skips over B
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 2);

      // TODO: (abstract this) check target field. if it's also a jump, extend this jump by that
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_gt(ml) {
    // read two indexes to target

    let offset = pc - 1;

    let indexA = cr_dec16();
    let indexB = cr_dec16();

    ASSERT_LOG2(' = cr_gt', indexA, indexB, domain__debug(domains[indexA]), domain__debug(domains[indexB]));

    // swap args!
    _cr_vv_lt(ml, indexB, indexA, offset);
  }

  function cr_gte(ml) {
    // read two indexes to target

    let offset = pc - 1;

    let indexA = cr_dec16();
    let indexB = cr_dec16();

    ASSERT_LOG2(' = cr_gte', indexA, indexB, domain__debug(domains[indexA]), domain__debug(domains[indexB]));

    // swap args!
    _cr_lte(ml, indexB, indexA, offset);
  }

  function cr_distinct(ml) {
    let offset = pc - 1;
    let count = cr_dec16();

    ASSERT_LOG2(' = cr_distinct', count, 'x');
    ASSERT_LOG2('  -', Array.from(Array(count)).map((n, i) => cr_dec16pc(pc + i * 2)));
    ASSERT_LOG2('  -', Array.from(Array(count)).map((n, i) => domain__debug(domains[cr_dec16pc(pc + i * 2)])));

    // a distinct is basically a pyramid of neq's; one for each unique pair of the set
    // to prevent generating an array we'll decode every var during the loop...
    // we loop back to front because we're splicing out vars while looping
    for (let i = count - 1; i >= 0; --i) {
      let indexA = cr_dec16pc(pc + i * 2);
      let A = domains[indexA];
      ASSERT_LOG2('  - loop i=', i, 'index=', indexA, 'domain=', domain__debug(A));
      if (!A) return emptyDomain = true;

      let v = domain_getValue(A);
      if (v >= 0) {
        ASSERT_LOG2('  - solved, so removing', v, 'from all other domains');
        // if v is solved, remove v from all other domains, then remove v from the list
        for (let j = 0; j >= 0; --j) {
          if (j !== i) {
            let indexB = cr_dec16pc(pc + j * 2);
            ASSERT(indexA !== indexB, 'same var should not occur multiple times...'); // what about constants? could be artifacts (A=1,B=1,distinct(A,B))
            ASSERT_LOG2('    - loop j=', j, 'index=', indexB, 'domain=', domain__debug(domains[indexB]));
            let beforeB = domains[indexB];
            let B = domains[indexB] = domain_removeValue(domains[indexB], v);
            change = change || B !== beforeB;
            ASSERT_LOG2('    -> B=', domain__debug(domains[indexB]), B !== beforeB);
            if (!B) return emptyDomain = true;
          }
        }

        // now
        // - move all indexes bigger than the current back one position
        // - compile the new count back in
        // - compile a NOOP in the place of the last element
        ASSERT_LOG2('  - moving further domains one space forward (from ', i + 1, ' / ', count, ')');
        for (let k = i + 1; k < count; ++k) {
          ASSERT_LOG2('    - moving ', (k + 1) + 'th var');
          ml[pc + k * 2] = ml[pc + (k + 1) * 2];
          ml[pc + k * 2 + 1] = ml[pc + (k + 1) * 2 + 1];
        }
        --count;
        ASSERT_LOG2('  - recompiling new count (', count, ')');
        cr_enc16(pc - 2, count);
        ASSERT_LOG2('  - compiling noop into empty spot');
        cr_enc8(pc + count * 2, ML_NOOP2);
      }
    }

    if (count === 2) {
      // recompile as neq
      // list of vars should not have any holes (not even after elimination above) so we can just copy them.
      // ml len of this distinct should be 7 bytes (op=1, count=2, A=2, B=2)
      // note: skip the count when reading!
      cr_enc8(offset, ML_VV_NEQ);
      ml[offset + 1] = ml[offset + 3]; // A
      ml[offset + 2] = ml[offset + 4];
      ml[offset + 3] = ml[offset + 5]; // B
      ml[offset + 4] = ml[offset + 6];
      // this should open up 2 bytes (the count) so encode a NOOP2 in there
      cr_enc8(offset + 5, ML_NOOP2);
      ASSERT_LOG2(' - changed to a neq');
      ASSERT_LOG2(' - ml now:', ml);
      onlyJumps = false;
      pc = offset + 1 + 6; // count=2+A=2+B=2=6
    } else if (count === 1) {
      // eliminate. skip (count+1)*2 bytes
      ASSERT_LOG2(' - eliminating constraint');
      // op + first var are already skipped. this skips over the other vars
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, -3 + (count + 1) * 2);

      ASSERT_LOG2(' - ml now:', ml);
      pc += count * 2;
    } else if (count === 0) {
      // eliminate. skip the op
      ASSERT_LOG2(' - eliminating constraint without vars');
      // there are no vars so only replace the op with a noop (skips one byte) and the count with a noop2
      cr_enc8(offset, ML_NOOP);
      cr_enc8(offset + 1, ML_NOOP2);

      ASSERT_LOG2(' - ml now:', ml);
      // pc is already good now
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + 1 + 2 + count * 2; // skip the 16bit indexes manually
    }
  }

  function cr_plus(ml) {
    // read two indexes to target

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();
    let indexR = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_plus', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A || !B || !R) return emptyDomain = true;

    let oA = A;
    let oB = B;
    let oR = R;

    // note: A + B = C   ==>   <loA + loB, hiA + hiB>
    // but:  A - B = C   ==>   <loA - hiB, hiA - loB>   (so the lo/hi of B gets swapped!)
    // keep in mind that any number oob <sub,sup> gets pruned in either case

    let minR = domain_min(R);
    let maxR = domain_max(R);
    A = domain_removeLtUnsafe(A, minR - domain_max(B));
    A = domain_removeGtUnsafe(A, maxR - domain_min(B));
    ASSERT_LOG2('    - updated A:', domain__debug(A), '<' + minR + '-' + domain_max(B) + '=' + (minR - domain_max(B)) + ', ' + maxR + '-' + domain_min(B) + '=' + (maxR - domain_min(B)) + '>');
    if (A) {
      let minA = domain_min(A);
      let maxA = domain_max(A);
      B = domain_removeLtUnsafe(B, minR - maxA);
      B = domain_removeGtUnsafe(B, maxR - minA);
      ASSERT_LOG2('    - updated B:', domain__debug(B), 'A minmax:', minA, maxA);
      if (B) {
        let minB = domain_min(B);
        let maxB = domain_max(B);
        R = domain_removeLtUnsafe(R, minA + minB);
        R = domain_removeGtUnsafe(R, maxA + maxB);
        ASSERT_LOG2('    - updated R:', domain__debug(R), 'B minmax:', minB, maxB);
        if (R) {
          if (oR !== R || oB !== B) {
            minR = domain_min(R);
            maxR = domain_max(R);
            A = domain_removeLtUnsafe(A, minR - maxB);
            A = domain_removeGtUnsafe(A, maxR - minB);
            ASSERT_LOG2('    - updated A:', domain__debug(A), 'R minmax:', minR, maxR);
            if (A) {
              if (oR !== R || oA !== A) {
                B = domain_removeLtUnsafe(B, minR - domain_max(A));
                B = domain_removeGtUnsafe(B, maxR - domain_min(A));
                ASSERT_LOG2('    - updated B:', domain__debug(B), 'A minmax:', domain_min(A), domain_max(A));
                if (!B) {
                  emptyDomain = true;
                }
              }
            } else {
              emptyDomain = true;
            }
          }
        } else {
          emptyDomain = true;
        }
      } else {
        emptyDomain = true;
      }
    } else {
      emptyDomain = true;
    }

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B), domain__debug(R));

    if (oA !== A || oB !== B || oR !== R) {
      change = true;
      domains[indexA] = A;
      domains[indexB] = B;
      domains[indexR] = R;
    }
    if (emptyDomain) return;

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) {
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ASSERT_LOG2(' - eliminating constraint');

      // op + A are already skipped. this skips over B and R
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 4);
      return;
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_minus(ml) {
    // read two indexes to target

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();
    let indexR = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_minus', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A || !B || !R) return emptyDomain = true;

    let oA = A;
    let oB = B;
    let oR = R;

    // C = A - B   -> A = B + C, B = C - A
    // note: A - B = C   ==>   <loA - hiB, hiA - loB>
    // but:  A + B = C   ==>   <loA + loB, hiA + hiB>   (so the lo/hi of B gets swapped!)
    // keep in mind that any number oob <sub,sup> gets pruned in either case

    let minR = domain_min(R);
    let maxR = domain_max(R);
    A = domain_removeLtUnsafe(A, minR + domain_min(B));
    A = domain_removeGtUnsafe(A, maxR + domain_max(B));
    ASSERT_LOG2('    - updated A:', domain__debug(A), '<' + minR + '+' + domain_min(B) + '=' + (minR + domain_min(B)) + ', ' + maxR + '+' + domain_max(B) + '=' + (maxR + domain_max(B)) + '>');
    if (A) {
      let minA = domain_min(A);
      let maxA = domain_max(A);
      B = domain_removeLtUnsafe(B, minA - maxR);
      B = domain_removeGtUnsafe(B, maxA - minR);
      ASSERT_LOG2('    - updated B:', domain__debug(B), 'A minmax:', minA, maxA);
      if (B) {
        let minB = domain_min(B);
        let maxB = domain_max(B);
        R = domain_removeLtUnsafe(R, minA - maxB);
        R = domain_removeGtUnsafe(R, maxA - minB);
        ASSERT_LOG2('    - updated R:', domain__debug(R), 'B minmax:', minB, maxB);
        if (R) {
          if (oR !== R || oB !== B) {
            minR = domain_min(R);
            maxR = domain_max(R);
            A = domain_removeLtUnsafe(A, minR + minB);
            A = domain_removeGtUnsafe(A, maxR + maxB);
            ASSERT_LOG2('    - updated A:', domain__debug(A), 'R minmax:', minR, maxR);
            if (A) {
              if (oR !== R || oA !== A) {
                B = domain_removeLtUnsafe(B, domain_min(A) - maxR);
                B = domain_removeGtUnsafe(B, domain_max(A) - minR);
                ASSERT_LOG2('    - updated B:', domain__debug(B), 'A minmax:', domain_min(A), domain_max(A));
                if (!B) {
                  emptyDomain = true;
                }
              }
            } else {
              emptyDomain = true;
            }
          }
        } else {
          emptyDomain = true;
        }
      } else {
        emptyDomain = true;
      }
    } else {
      emptyDomain = true;
    }

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B), domain__debug(R));

    if (oA !== A || oB !== B || oR !== R) {
      change = true;
      domains[indexA] = A;
      domains[indexB] = B;
      domains[indexR] = R;
    }
    if (emptyDomain) return;

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) {
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ASSERT_LOG2(' - eliminating constraint');
      // op + A are already skipped. this skips over B and R
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 4);
      return;
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_mul(ml) {
    // read two indexes to target

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();
    let indexR = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_mul', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A || !B || !R) return emptyDomain = true;

    let oA = A;
    let oB = B;
    let oR = R;

    // C = A * B, B = C / A, A = C / B
    // note: A * B = C   ==>   <loA * loB, hiA * hiB>
    // but:  A / B = C   ==>   <loA / hiB, hiA / loB> and has rounding/div-by-zero issues! instead use "inv-mul" tactic
    // keep in mind that any number oob <sub,sup> gets pruned in either case. x/0=0
    // when dividing "do the opposite" of integer multiplication. 5/4=[] because there is no int x st 4*x=5
    // only outer bounds are evaluated here...

    let minR = domain_min(R);
    let maxR = domain_max(R);
    let minB = domain_min(B);
    let maxB = domain_max(B);
    A = domain_removeLtUnsafe(A, maxB ? Math.floor(minR / maxB) : SUB);
    A = domain_removeGtUnsafe(A, minB ? Math.ceil(maxR / minB) : SUP);
    ASSERT_LOG2('    - updated A:', domain__debug(A), '<floor(' + minR + '/' + domain_max(B) + ')=' + Math.floor(minR / domain_max(B)) + ', ceil(' + maxR + '/' + domain_min(B) + ')=' + Math.ceil(maxR / domain_min(B)) + '>');
    if (A) {
      let minA = domain_min(A);
      let maxA = domain_max(A);
      B = domain_removeLtUnsafe(B, maxA ? Math.floor(minR / maxA) : SUB);
      B = domain_removeGtUnsafe(B, minA ? Math.ceil(maxR / minA) : SUP);
      ASSERT_LOG2('    - updated B:', domain__debug(B), 'A minmax:', minA, maxA);
      if (B) {
        minB = domain_min(B);
        maxB = domain_max(B);
        R = domain_removeLtUnsafe(R, minA * minB);
        R = domain_removeGtUnsafe(R, maxA * maxB);
        ASSERT_LOG2('    - updated R:', domain__debug(R), 'B minmax:', minB, maxB);
        if (R) {
          if (oR !== R || oB !== B) {
            minR = domain_min(R);
            maxR = domain_max(R);
            A = domain_removeLtUnsafe(A, maxB ? Math.floor(minR / maxB) : SUB);
            A = domain_removeGtUnsafe(A, minB ? Math.ceil(maxR / minB) : SUP);
            ASSERT_LOG2('    - updated A:', domain__debug(A), 'R minmax:', minR, maxR);
            if (A) {
              if (oR !== R || oA !== A) {
                minA = domain_min(A);
                maxA = domain_max(A);
                B = domain_removeLtUnsafe(B, maxA ? Math.floor(minR / maxA) : SUB);
                B = domain_removeGtUnsafe(B, minA ? Math.ceil(maxR / minA) : SUP);
                ASSERT_LOG2('    - updated B:', domain__debug(B), 'A minmax:', domain_min(A), domain_max(A));
                if (!B) {
                  emptyDomain = true;
                }
              }
            } else {
              emptyDomain = true;
            }
          }
        } else {
          emptyDomain = true;
        }
      } else {
        emptyDomain = true;
      }
    } else {
      emptyDomain = true;
    }

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B), domain__debug(R));

    if (oA !== A || oB !== B || oR !== R) {
      change = true;
      domains[indexA] = A;
      domains[indexB] = B;
      domains[indexR] = R;
    }
    if (emptyDomain) return;

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) {
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ASSERT_LOG2(' - eliminating constraint');
      // op + A are already skipped. this skips over B and R
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 4);
      return;
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_div(ml) {
    // read two indexes to target

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();
    let indexR = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_mul', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A || !B || !R) return emptyDomain = true;

    let oA = A;
    let oB = B;
    let oR = R;

    // R = A / B, A = R * B, B = A / R
    // note: A * B = C   ==>   <loA * loB, hiA * hiB> and has rounding/div-by-zero issues!
    // but:  A / B = C   ==>   <loA / hiB, hiA / loB> use "inv-div" tactic
    // keep in mind that any number oob <sub,sup> gets pruned in either case. x/0=0
    // when dividing do integer division where 4/2=2 and 4/3=[] and [1,2]/2=1 and [4,5]/3=[]
    // if the divisor is solved to 0 the result is empty, otherwise; x / <0, y> = <0, SUP>
    // only outer bounds are evaluated here...

    let minR = domain_min(R);
    let maxR = domain_max(R);
    let minB = domain_min(B);
    let maxB = domain_max(B);
    A = domain_removeLtUnsafe(A, minR * minB);
    A = domain_removeGtUnsafe(A, maxR * maxB);
    ASSERT_LOG2('    - updated A:', domain__debug(A), '<floor(' + minR + '*' + minB + ')=' + (minR * minB) + ', (' + maxR + '*' + maxB + ')=' + (maxR / maxB) + '>');
    if (A) {
      let minA = domain_min(A);
      let maxA = domain_max(A);
      B = domain_removeLtUnsafe(B, maxR ? Math.floor(minA / maxR) : SUB);
      B = domain_removeGtUnsafe(B, minR ? Math.ceil(maxA / minR) : SUP);
      ASSERT_LOG2('    - updated B:', domain__debug(B), 'A minmax:', minA, maxA);
      if (B) {
        minB = domain_min(B);
        maxB = domain_max(B);
        R = domain_removeLtUnsafe(R, maxB ? Math.floor(minA / maxB) : SUB);
        R = domain_removeGtUnsafe(R, minB ? Math.ceil(maxA / minB) : SUP);
        ASSERT_LOG2('    - updated R:', domain__debug(R), 'B minmax:', minB, maxB);
        if (R) {
          if (oR !== R || oB !== B) {
            minR = domain_min(R);
            maxR = domain_max(R);
            A = domain_removeLtUnsafe(A, minR * minB);
            A = domain_removeGtUnsafe(A, maxR * maxB);
            ASSERT_LOG2('    - updated A:', domain__debug(A), 'R minmax:', minR, maxR);
            if (A) {
              if (oR !== R || oA !== A) {
                minA = domain_min(A);
                maxA = domain_max(A);
                B = domain_removeLtUnsafe(B, maxR ? Math.floor(minA / maxR) : SUB);
                B = domain_removeGtUnsafe(B, minR ? Math.ceil(maxA / minR) : SUP);
                ASSERT_LOG2('    - updated B:', domain__debug(B), 'A minmax:', domain_min(A), domain_max(A));
                if (!B) {
                  emptyDomain = true;
                }
              }
            } else {
              emptyDomain = true;
            }
          }
        } else {
          emptyDomain = true;
        }
      } else {
        emptyDomain = true;
      }
    } else {
      emptyDomain = true;
    }

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B), domain__debug(R));

    if (oA !== A || oB !== B || oR !== R) {
      change = true;
      domains[indexA] = A;
      domains[indexB] = B;
      domains[indexR] = R;
    }
    if (emptyDomain) return;

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) {
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ASSERT_LOG2(' - eliminating constraint');
      // op + A are already skipped. this skips over B and R
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 4);
      return;
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_isEq(ml) {
    // read two indexes to target

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();
    let indexR = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_isEq', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A || !B || !R) return emptyDomain = true;

    let remove = false;
    if (domain_getValue(A) >= 0 && domain_getValue(B) >= 0) {
      ASSERT_LOG2(' - A and B are solved so we can determine R');
      let result = A === B ? 1 : 0;
      if (domain_containsValue(R, result)) {
        R = domains[indexR] = domain_createValue(result);
        remove = true;
        change = true;
      } else {
        R = domains[indexR] = domain_createEmpty();
        emptyDomain = true;
        return;
      }
    } else {
      if (domain_max(R) > 1) {
        ASSERT_LOG2(' - Trimming R (', domain__debug(R), ') to bool');
        ASSERT(domain_min(R) === 0, 'should be min zero');
        R = domains[indexR] = domain_createRange(0, 1);
        change = true;
      }
    }

    // R should be 0 if A==B. R should be 1 if A!==B. R can only end up <= 1.
    let vR = domain_getValue(R);
    if (vR === 0) {
      ASSERT_LOG2(' ! changing iseq to neq and revisiting');
      // compile a neq and restart
      cr_enc8(offset, ML_VV_NEQ);
      cr_enc8(offset + 5, ML_NOOP2); // skip the op and A and B and overwrite the C with a noop
      pc = offset; // make it repeat with the new neq
      return;
    }
    if (vR === 1) {
      ASSERT_LOG2(' ! changing iseq to eq and revisiting');
      // compile an eq and restart
      cr_enc8(offset, ML_VV_EQ);
      cr_enc8(offset + 5, ML_NOOP2); // skip the op and A and B and overwrite the C with a noop
      pc = offset; // make it repeat with the new eq
      return;
    }

    ASSERT(domain_min(R) === 0 && domain_max(R) >= 1, 'R should be boolable at this point');

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B), domain__debug(R));

    if (remove) {
      ASSERT_LOG2(' - eliminating constraint');
      // op + A are already skipped. this skips over B and R
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 4);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_isNeq(ml) {
    // read two indexes to target

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();
    let indexR = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_isNeq', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A || !B || !R) return emptyDomain = true;

    let remove = false;
    if (domain_getValue(A) >= 0 && domain_getValue(B) >= 0) {
      ASSERT_LOG2(' - A and B are solved so we can determine R');
      let result = A !== B ? 1 : 0;
      if (domain_containsValue(R, result)) {
        R = domains[indexR] = domain_createValue(result);
        remove = true;
        change = true;
      } else {
        R = domains[indexR] = domain_createEmpty();
        emptyDomain = true;
        return;
      }
    } else {
      if (domain_max(R) > 1) {
        ASSERT_LOG2(' - Trimming R (', domain__debug(R), ') to bool');
        ASSERT(domain_min(R) === 0, 'should be min zero');
        R = domains[indexR] = domain_createRange(0, 1);
        change = true;
      }
    }

    // R should be 0 if A==B. R should be 1 if A!==B. R can only end up <= 1.
    let vR = domain_getValue(R);
    if (vR === 0) {
      ASSERT_LOG2(' ! changing isneq to eq and revisiting');
      // compile a neq and restart
      cr_enc8(offset, ML_VV_EQ);
      cr_enc8(offset + 5, ML_NOOP2); // skip the op and A and B and overwrite the C with a noop
      pc = offset; // make it repeat with the new neq
      return;
    }
    if (vR === 1) {
      ASSERT_LOG2(' ! changing isneq to neq and revisiting');
      // compile an eq and restart
      cr_enc8(offset, ML_VV_NEQ);
      cr_enc8(offset + 5, ML_NOOP2); // skip the op and A and B and overwrite the C with a noop
      pc = offset; // make it repeat with the new eq
      return;
    }

    ASSERT(domain_min(R) === 0 && domain_max(R) >= 1, 'R should be boolable at this point');

    ASSERT_LOG2(' ->', domain__debug(A), domain__debug(B), domain__debug(R));

    if (remove) {
      ASSERT_LOG2(' - eliminating constraint');
      // op + A are already skipped. this skips over B and R
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, 4);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_isLt(ml) {
    // read two indexes to target

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();
    let indexR = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_isLt', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A || !B || !R) return emptyDomain = true;

    let oR = R;
    R = domain_removeGtUnsafe(R, 1);
    let vR = domain_getValue(R);
    if (vR < 0) {
      // if R isn't set you can't really update A or B. so we don't.
      if (domain_max(A) < domain_min(B)) R = domain_createValue(vR = 1);
      else if (domain_min(A) >= domain_max(B)) R = domain_createValue(vR = 0);
    }
    if (R !== oR) {
      change = true;
      domains[indexR] = R;
    }

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args
    if (vR === 1) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lt in its place');
      // replace isLt with regular lt
      cr_enc8(offset, ML_VV_LT);
      cr_enc8(offset + 5, ML_NOOP2); // skip the R
      pc = offset; // make it repeat with the new lt
    } else if (vR === 0) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lte with swapped args in its place');
      // replace isLt with a regular lte
      cr_enc8(offset, ML_LTE);
      cr_enc16(offset + 1, indexB);
      cr_enc16(offset + 3, indexA);
      cr_enc8(offset + 5, ML_NOOP2); // skip the R
      pc = offset; // make it repeat with the new lt
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_isLte(ml) {
    // read two indexes to target

    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();
    let indexR = cr_dec16();

    let A = domains[indexA];
    let B = domains[indexB];
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_isLt', indexA, indexB, indexR, domain__debug(A), domain__debug(B), domain__debug(R));
    if (!A || !B || !R) return emptyDomain = true;

    let oR = R;
    R = domain_removeGtUnsafe(R, 1);
    let vR = domain_getValue(R);
    if (vR < 0) {
      // if R isn't set you can't really update A or B. so we don't.
      if (domain_max(A) <= domain_min(B)) R = domain_createValue(vR = 1);
      else if (domain_min(A) > domain_max(B)) R = domain_createValue(vR = 0);
    }
    if (R !== oR) {
      change = true;
      domains[indexR] = R;
    }

    // if R is solved replace this isLte with an lte or "gte" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lte is an lt with swapped args
    if (vR === 1) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lte in its place');
      // replace isLte with regular lt
      cr_enc8(offset, ML_LTE);
      cr_enc8(offset + 5, ML_NOOP2); // skip the R
      pc = offset; // make it repeat with the new lt
    } else if (vR === 0) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lt with swapped args in its place');
      // replace isLt with a regular lte
      cr_enc8(offset, ML_VV_LT);
      cr_enc16(offset + 1, indexB);
      cr_enc16(offset + 3, indexA);
      cr_enc8(offset + 5, ML_NOOP2); // skip the R
      pc = offset; // make it repeat with the new lt
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
    }
  }

  function cr_isGt(ml) {
    // change GT to LT with swapped args and restart
    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();

    ASSERT_LOG2(' ! changing isgt to islte with swapped A and B');

    cr_enc8(offset, ML_ISLT);
    cr_enc16(offset + 1, indexB);
    cr_enc16(offset + 3, indexA);
    // restart
    pc = offset;
  }

  function cr_isGte(ml) {
    // change GTE to LTE with swapped args and restart
    let offset = pc - 1;
    let indexA = cr_dec16();
    let indexB = cr_dec16();

    ASSERT_LOG2(' ! changing isgt to islte with swapped A and B');

    cr_enc8(offset, ML_ISLTE);
    cr_enc16(offset + 1, indexB);
    cr_enc16(offset + 3, indexA);
    // restart
    pc = offset;
  }

  function cr_sum(ml) {
    let offset = pc - 1;
    let count = cr_dec16();

    let indexR = cr_dec16pc(offset + 1 + count * 2 + 2);
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_sum', count, 'x');
    ASSERT_LOG2('  -', Array.from(Array(count)).map((n, i) => cr_dec16pc(pc + i * 2)));
    ASSERT_LOG2('  -', Array.from(Array(count)).map((n, i) => domain__debug(domains[cr_dec16pc(pc + i * 2)])).join(' '));

    // a sum is basically a pyramid of plusses; (A+B)+(C+D) etc
    // to prevent generating an array we'll decode every var during the loop...
    // we loop back to front because we're splicing out vars while looping

    // replace all constants by one constant
    // prune the result var by the outer bounds of the sum of the args
    // in limited cases we can prune some of the arg values if the result forces
    // that (if the result is max 10 then inputs can be pruned of any value > 10)
    // we cant really do anything else

    let sumLo = 0;
    let sumHi = 0;
    for (let i = count - 1; i >= 0; --i) {
      let indexA = cr_dec16pc(pc + i * 2);
      let A = domains[indexA];
      if (!A) return emptyDomain = true;
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
      if (!R) return emptyDomain = true;
      change = true;
      domains[indexR] = R;
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
    for (let i = 0; i < count; ++i) {
      let indexA = cr_dec16pc(pc + i * 2);
      let A = domains[indexA];
      let oA = A;
      A = domain_removeLtUnsafe(A, minR - (sumHi - domain_max(A)));
      A = domain_removeGtUnsafe(A, maxR - (sumLo - domain_min(A)));
      if (A !== oA) {
        if (!A) return emptyDomain = true;
        change = true;
        domains[indexA] = A;
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

    ASSERT_LOG2(' -> There are now', constants, 'constants and', count - constants, 'non-constants left. Constants sum to', constantSum);
    ASSERT_LOG2(' -> Result of vars: ', Array.from(Array(count)).map((n, i) => domain__debug(domains[cr_dec16pc(pc + i * 2)])).join(' '), ' Result:', domain__debug(R));

    if (count - constants === (constants ? 1 : 2)) {
      ASSERT(constants ? var2 === -1 : var2 >= 0, 'if there are constants there should not be a second non-constant here otherwise expecting a second var');
      // there are either two non-constants and no constants,
      // or one non-constant and some constants left
      // consolidate the constants into one and recompile the
      // whole sum as a regular plus
      // compile a jmp for the unused var fields

      // TODO: note: use the plus opcode that accepts a literal
      let newIndexA = cr_dec16pc(offset + 3 + var1 * 2);
      let newIndexB = constants ? getVar(addVar(undefined, constantSum, undefined, true)) : cr_dec16pc(offset + 3 + var2 * 2);

      ASSERT(count >= 2, 'need at least two vars to have enough space for a plus');
      cr_enc8(offset, ML_PLUS);
      cr_enc16(offset + 1, newIndexA);
      cr_enc16(offset + 3, newIndexB);
      cr_enc16(offset + 5, indexR);

      // this distinct has at least two var args. a distinct of 2+ takes 1+2+n*2
      // bytes. a plus takes 1+2+2+2 bytes. so this morph should be fine.
      // if the distinct had more than two vars, skip the rest.
      if (count === 2) {
        // in this case you only need to eliminate space for the 16bit count
        // that's 2 bytes space, a jmp would take 3, so compile a noop instead
        ASSERT_LOG2(' - len=2 so just a noop2 for the count');
        cr_enc8(offset + 7, ML_NOOP2);
      } else {
        // skip count-2 vars. jmp will ignore itself so -3
        ASSERT_LOG2(' - and a jump over the count and', count - 2, 'vars');
        cr_enc8(offset + 7, ML_JMP);
        cr_enc16(offset + 8, (1 + count - 2) * 2 - 3);
      }

      ASSERT_LOG2(' - changed to a plus to a plus on index', newIndexA, 'and', (constants ? 'constant value ' + constantSum : 'index ' + newIndexB));
      ASSERT_LOG2(' - ml now:', ml);
      // revisit immediately
      pc = offset;
    } else if (!constants && count === 1) {
      // artifact; a sum with exactly one var is just an eq to R
      ASSERT(!constants && var1 >= 0 && var2 < 0, 'should have found exactly one var');

      let newIndexA = cr_dec16pc(offset + 3 + var1 * 2);

      // if R is a constant we use ML_V8_EQ and otherwise ML_VV_EQ
      if (minR === maxR) {
        cr_enc8(offset, ML_V8_EQ);
        cr_enc16(offset + 1, newIndexA);
        cr_enc8(offset + 3, minR); // this can fail if R solved to >255.. that requires 16 or 32bit support here
        cr_enc8(offset + 4, ML_NOOP3);
      } else {
        // the len of this sum is op+len+var+R or 1 + 2 + 2 + 2 = 7. the len
        // of an eq is 5 (1+2+2) so just replace it and append a noop2 to it
        cr_enc8(offset, ML_VV_EQ);
        cr_enc16(offset + 1, newIndexA);
        cr_enc16(offset + 3, indexR);
        cr_enc8(offset + 5, ML_NOOP2);
      }

      ASSERT_LOG2(' - changed to a product to an eq on index', newIndexA, 'and index ' + indexR);
      ASSERT_LOG2(' - ml now:', ml);
      // revisit it immediately
      pc = offset;
    } else if (count - constants === 0) {
      // eliminate. skip (count+1)*2+2 bytes
      ASSERT_LOG2(' - eliminating constraint since all vars are constants');
      oR = R;
      R = domain_intersection(R, domain_createValue(constantSum));
      if (oR !== R) {
        ASSERT_LOG2(' - Updated R from', domain__debug(oR), 'to', domain__debug(R));
        if (!R) return emptyDomain = true;
        change = true;
        domains[indexR] = R;
      }
      let delta = 1 + 2 + count * 2 + 2; // sizeof(op)=x; op+count+vars+result -> 8bit+16bit+n*16bit+16bit
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, delta);
      ASSERT_LOG2(' - ml now:', ml);
      pc = offset + delta;
    } else {
      ASSERT(count - constants > 2, 'There no other valid options here');
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + 1 + 2 + count * 2 + 2; // skip the 16bit indexes manually
    }
  }

  function cr_product(ml) {
    let offset = pc - 1;
    let count = cr_dec16();

    let indexR = cr_dec16pc(offset + 1 + count * 2 + 2);
    let R = domains[indexR];

    ASSERT_LOG2(' = cr_product', count, 'x');
    ASSERT_LOG2('  -', Array.from(Array(count)).map((n, i) => cr_dec16pc(pc + i * 2)));
    ASSERT_LOG2('  -', Array.from(Array(count)).map((n, i) => domain__debug(domains[cr_dec16pc(pc + i * 2)])).join(' '));

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
    for (let i = count - 1; i >= 0; --i) {
      let indexA = cr_dec16pc(pc + i * 2);
      let A = domains[indexA];
      if (!A) return emptyDomain = true;
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
      if (!R) return emptyDomain = true;
      change = true;
      domains[indexR] = R;
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
    for (let i = 0; i < count; ++i) {
      let indexA = cr_dec16pc(pc + i * 2);
      let A = domains[indexA];
      let oA = A;
      //ASSERT_LOG2('lte, A=', domain__debug(A), 'max=',domain_max(A), 'producthi=',productHi, 'ta=',productHi / domain_max(A), 'min(R)/ta=', minR/(productHi / domain_max(A)));
      let ta = productHi / domain_max(A);
      if (ta) A = domain_removeLtUnsafe(A, Math.floor(minR / ta));
      ta = productLo / domain_min(A);
      //ASSERT_LOG2('gte', ta, maxR/ta)
      if (ta) A = domain_removeGtUnsafe(A, Math.ceil(maxR / ta));
      if (A !== oA) {
        ASSERT_LOG2(' - updated domain from', domain__debug(oA), 'to', domain__debug(A));
        if (!A) return emptyDomain = true;
        change = true;
        domains[indexA] = A;
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

    ASSERT_LOG2(' -> There are now', constants, 'constants and', count - constants, 'non-constants left. Constants mul to', constantsProduct);
    ASSERT_LOG2(' -> Result of vars: ', Array.from(Array(count)).map((n, i) => domain__debug(domains[cr_dec16pc(pc + i * 2)])).join(' '), ' Result:', domain__debug(R));

    if (count - constants === (constants ? 1 : 2)) {
      ASSERT(constants ? var2 === -1 : var2 >= 0, 'if there are constants there should not be a second non-constant here otherwise expecting a second var');
      // there are either two non-constants and no constants,
      // or one non-constant and some constants left
      // consolidate the constants into one and recompile the
      // whole product as a regular mul
      // compile a jmp for the unused var fields

      // TODO: note: use the mul opcode that accepts a literal
      let newIndexA = cr_dec16pc(offset + 3 + var1 * 2);
      let newIndexB = constants ? getVar(addVar(undefined, constantsProduct, undefined, true)) : cr_dec16pc(offset + 3 + var2 * 2);

      ASSERT(count >= 2, 'need at least two vars to have enough space for a plus');
      cr_enc8(offset, ML_MUL);
      cr_enc16(offset + 1, newIndexA);
      cr_enc16(offset + 3, newIndexB);
      cr_enc16(offset + 5, indexR);

      // this distinct has at least two var args. a distinct of 2+ takes 1+2+n*2
      // bytes. a plus takes 1+2+2+2 bytes. so this morph should be fine.
      // if the distinct had more than two vars, skip the rest.
      if (count === 2) {
        // in this case you only need to eliminate space for the 16bit count
        // that's 2 bytes space, a jmp would take 3, so compile a noop instead
        ASSERT_LOG2(' - len=2 so just a noop2 for the count');
        cr_enc8(offset + 7, ML_NOOP2);
      } else {
        // skip count-2 vars. jmp will ignore itself so -3
        ASSERT_LOG2(' - and a jump over the count and', count - 2, 'vars');
        cr_enc8(offset + 7, ML_JMP);
        cr_enc16(offset + 8, (1 + count - 2) * 2 - 3);
      }

      ASSERT_LOG2(' - changed to a mul on index', newIndexA, 'and', (constants ? 'constant value ' + constantsProduct : 'index ' + newIndexB));
      ASSERT_LOG2(' - ml now:', ml);
      // revisit immediately
      pc = offset;
    } else if (!constants && count === 1) {
      // artifact; a product with exactly one var is just an eq to R
      ASSERT(!constants && var1 >= 0 && var2 < 0, 'should have found exactly one var');

      let newIndexA = cr_dec16pc(offset + 3 + var1 * 2);

      // if R is a constant we use ML_V8_EQ and otherwise ML_VV_EQ
      if (minR === maxR) {
        cr_enc8(offset, ML_V8_EQ);
        cr_enc16(offset + 1, newIndexA);
        cr_enc8(offset + 3, minR); // this can fail if R solved to >255.. that requires 16 or 32bit support here
        cr_enc8(offset + 4, ML_NOOP3);
      } else {
        // the len of this sum is op+len+var+R or 1 + 2 + 2 + 2 = 7. the len
        // of an eq is 5 (1+2+2) so just replace it and append a noop2 to it
        cr_enc8(offset, ML_VV_EQ);
        cr_enc16(offset + 1, newIndexA);
        cr_enc16(offset + 3, indexR);
        cr_enc8(offset + 5, ML_NOOP2);
      }

      ASSERT_LOG2(' - changed to a product to an eq on index', newIndexA, 'and index ' + indexR);
      ASSERT_LOG2(' - ml now:', ml);
      // revisit it immediately
      pc = offset;
    } else if (count - constants === 0) {
      // eliminate. skip (count+1)*2+2 bytes
      ASSERT_LOG2(' - eliminating constraint since all vars are constants');
      oR = R;
      R = domain_intersection(R, domain_createValue(constantsProduct));
      if (oR !== R) {
        ASSERT_LOG2(' - Updated R from', domain__debug(oR), 'to', domain__debug(R));
        if (!R) return emptyDomain = true;
        change = true;
        domains[indexR] = R;
      }
      let delta = 1 + 2 + count * 2 + 2; // sizeof(op)=x; op+count+vars+result -> 8bit+16bit+n*16bit+16bit
      cr_enc8(offset, ML_JMP);
      cr_enc16(offset + 1, delta);
      ASSERT_LOG2(' - ml now:', ml);
      pc = offset + delta;
    } else {
      ASSERT(count - constants > 2, 'There no other valid options here');
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + 1 + 2 + count * 2 + 2; // skip the 16bit indexes manually
    }
  }
}

function cr_stabilize(ml, domains) {

}

// BODY_STOP

export {
 MINIMIZER_STABLE,
 MINIMIZER_SOLVED,
 MINIMIZER_REJECTED,
  cr_optimizeConstraints,
  cr_stabilize,
};
