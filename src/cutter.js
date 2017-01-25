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
  SIZEOF_VVV,
  SIZEOF_8VV,
  SIZEOF_V8V,
  SIZEOF_VV8,
  SIZEOF_COUNT,
  SIZEOF_C8_COUNT,

  ml__debug,
  ml_dec8,
  ml_dec16,
  ml_enc8,
  ml_enc16,
  ml_eliminate,
  ml_getOpSizeSlow,
  ml_getRecycleOffset,
  ml_heapSort16bitInline,
  ml_jump,
  ml_recycleC3,
  ml_recycleVV,
  ml_throw,
  ml_validateSkeleton,

  ml_c2vv,
  ml_cr2vv,
  ml_vv2vv,
  ml_vvv2vv,
  ml_vvv2vvv,
} from './ml';
import {
  domain__debug,
  domain_containsValue,
  domain_createValue,
  domain_createRange,
  domain_hasNoZero,
  domain_intersection,
  domain_isBool,
  domain_isZero,
  domain_min,
  domain_max,
  domain_getValue,
  domain_removeValue,
  domain_removeGte,
  domain_removeLte,
  domain_removeGtUnsafe,
  domain_removeLtUnsafe,
} from './domain';
import domain_plus from './domain_plus';
import {
  COUNT_BOOLY,
  COUNT_ISALL_RESULT,
  COUNT_LTE_LHS,
  COUNT_LTE_LHS_TWICE,
  COUNT_LTE_RHS,
  COUNT_NALL,
  COUNT_NAND,
  COUNT_NEQ,

  counter,
} from './counter';

// BODY_START

function cutter(ml, vars, domains, addAlias, getAlias, solveStack) {
  ASSERT_LOG2('\n ## cutter', ml);
  let pc = 0;
  let lastOffset;
  let varMeta;
  let addrTracker = {}; // track op offsets for certain cases
  let counts;
  let lenBefore;
  let emptyDomain = false;
  let removed;
  let loops = 0;
  do {
    ASSERT_LOG2(' # start cutter outer loop', loops);
    lastOffset = new Array(domains.length).fill(0); // offset of op containing var; only tag the last occurrence of a var. so zero is never actually used here for count>1
    varMeta = new Array(domains.length).fill(COUNT_BOOLY); // track certain properties of each var, is it a booly, used in an isall, etc. cutter can use these stats for cutting decisions.
    counts = counter(ml, vars, domains, getAlias, lastOffset, varMeta);
    lenBefore = solveStack.length;
    cutLoop();
    removed = solveStack.length - lenBefore;
    console.log(' - end cutter outer loop', loops, ', removed', removed, ', constraints, emptyDomain =', emptyDomain);
    ++loops;
  } while (removed && !emptyDomain);

  if (emptyDomain) return -1;
  return loops;

  function getFinalIndex(index, _max = 50) {
    if (_max <= 0) THROW('damnit');
    ASSERT_LOG2('getFinalIndex: ' + index + ' -> ' + domain__debug(domains[index]));
    if (domains[index] !== false) return index;

    // if the domain is falsy then there was an alias 6sx(or a bug)
    // write the alias back to ML and restart the current op
    // caller should ensure to check return value and return on
    // a falsy result as well so the loop can restart.
    let aliasIndex = getAlias(index);
    ASSERT(aliasIndex !== index, 'an alias to itself is an infi loop and a bug');
    ASSERT_LOG2(' - alias for', index, 'is', aliasIndex);
    return getFinalIndex(aliasIndex, _max - 1);
  }

  function force(varIndex) {
    ASSERT(domains[varIndex] !== false, 'TOFIX: resolve aliases in solveStack');
    let v = domain_getValue(domains[varIndex]);
    if (v < 0) {
      ASSERT_LOG2('   - forcing index', varIndex, 'to min(' + domain__debug(domains[varIndex]) + '):', domain_min(domains[varIndex]));
      v = domain_min(domains[varIndex]); // arbitrary choice, may want to take strats into account although that's more relevant for helping search faster than the actual solution imo
      domains[varIndex] = domain_createValue(v);
    }
    return v;
  }

  function cutNeq() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    ASSERT_LOG2(' - cutNeq', indexA, '!=', indexB, 'counts:', counts[indexA], counts[indexB], 'meta:', varMeta[indexA], varMeta[indexB]);

    let countsA = counts[indexA];
    let countsB = counts[indexB];

    if (countsA === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut neq A;', indexA, '!=', indexB, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        domains[indexA] = domain_removeValue(A, vB);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' != ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
      return;
    }
    if (countsB === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut neq B;', indexA, '!=', indexB, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let B = domains[indexB];
        domains[indexB] = domain_removeValue(B, vA);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' != ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
      return;
    }

    if (countsA === 2) {
      if ((varMeta[indexA] & COUNT_LTE_LHS) && doNeqLteLhs(indexA, pc, 'neq')) return;
      if ((varMeta[indexA] & COUNT_LTE_RHS) && doNeqLteRhs(indexA, pc, 'neq')) return;
    }

    if (countsB === 2) {
      if ((varMeta[indexB] & COUNT_LTE_LHS) && doNeqLteLhs(indexB, pc, 'neq')) return;
      if ((varMeta[indexB] & COUNT_LTE_RHS) && doNeqLteRhs(indexB, pc, 'neq')) return;
    }

    pc += SIZEOF_VV;
  }

  function cutLt() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    ASSERT_LOG2(' - cutLt', indexA, '<', indexB);

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut lt A;', indexA, '<', indexB, '  ->  ', domain__debug(domains[indexA]), '<', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        ASSERT_LOG2('   - Setting', indexA, '(', domain__debug(A), ') to be lt', indexB, '(', vB, ')');
        domains[indexA] = domain_removeGte(A, vB);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = vars[indexA] + ' < ' + vars[indexB]));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
      return;
    }

    if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(domains => {
        let vA = force(indexA);
        let B = domains[indexB];
        ASSERT_LOG2(' - cut lt B; Setting', indexA, '(', vA, ') to be lt', indexB, '(', domain__debug(B), ')');
        domains[indexB] = domain_removeLte(B, vA);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' < ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
      return;
    }

    pc += SIZEOF_VV;
  }

  function cutLte() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    ASSERT_LOG2(' - cutLte', indexA, '<=', indexB);

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut lte A;', indexA, '<=', indexB, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        domains[indexA] = domain_removeGtUnsafe(A, vB);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' <= ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
      return;
    }

    if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut lte B;', indexA, '<=', indexB, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let B = domains[indexB];
        domains[indexB] = domain_removeLtUnsafe(B, vA);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${indexA} <= ${indexB}`));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
      return;
    }

    if (counts[indexA] === 2) {
      if (varMeta[indexA] & COUNT_NAND) {
        // note: must be indexA
        if (doNandLte(indexA, pc, 'lte')) return;
      }

      if (varMeta[indexA] & COUNT_ISALL_RESULT) {
        if (doIsAllLteLhs(indexA, pc, 'lte')) return;
      }

      if (varMeta[indexA] & COUNT_LTE_LHS_TWICE) {
        if (doLteTwice(indexA, pc)) return;
      }

      if ((varMeta[indexA] & COUNT_NEQ) && doNeqLteLhs(indexA, pc, 'lte')) return;
    }

    if (counts[indexB] === 2) {
      if (varMeta[indexB] & COUNT_ISALL_RESULT) {
        // note: MUST be indexB because the trick doesn't work for indexA
        if (doIsAllLteRhs(indexB, pc, 'lte')) return;
      }
      if (varMeta[indexB] & COUNT_NEQ) {
        // note: MUST be indexB because the trick doesn't work for indexA
        if (doNeqLteRhs(indexB, pc, 'lte')) return;
      }
    }

    pc += SIZEOF_VV;
  }

  function cutIsEq(ml, offset, sizeof, lenA, lenB, lenR) {
    ASSERT_LOG2(' -- cutIsEq', offset, sizeof, lenA, lenB, lenR);
    ASSERT(1 + lenA + lenB + lenR === sizeof, 'expecting this sizeof');
    if (lenR === 2) {
      let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + lenA + lenB));
      ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR], 'meta:', varMeta[indexR]);
      ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
      if (counts[indexR] === 1) {
        let indexA = lenA === 1 ? ml_dec8(ml, offset + 1) : getFinalIndex(ml_dec16(ml, offset + 1));
        let indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA));
        ASSERT_LOG2('   - R is a leaf var');
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut iseq R;', indexR, '=', indexA, '==?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '==?', domain__debug(domains[indexB]));
          let vA = lenA === 1 ? indexA : force(indexA);
          let vB = lenB === 1 ? indexB : force(indexB);
          let matches = vA === vB ? 1 : 0;
          ASSERT(domain_min(domains[indexR]) === 0 && domain_max(domains[indexR]) > 0, 'A B and R should already have been reduced to domains that are valid within A==?B=R', vA, vB, matches, domain__debug(domains[indexR]));
          domains[indexR] = matches ? domain_removeValue(domains[indexR], 0) : domain_createValue(0);
        });
        ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
        ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${indexR} = ${indexA} ==? ${indexB}`));
        ml_eliminate(ml, pc, sizeof);
        --counts[indexA];
        --counts[indexB];
        --counts[indexR];
        pc = offset + sizeof;
        return;
      }
    }

    ASSERT(lenA === 2, 'we normalize constants for iseq');
    if (lenB === 1) {
      let indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      if (counts[indexA] === 1) {
        // A is leaf, B is constant, cut the constraint, A can reflect B and C afterwards
        // we assume that A contains a valid value for B and both cases C=0 and C=1
        let A = domains[indexA];
        let vB = ml_dec8(ml, offset + 1 + 2);
        let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1));

        ASSERT_LOG2('   - A is a leaf var, B a constant (', vB, ')');
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut iseq A;', indexR, '=', indexA, '==? c  ->  ', domain__debug(domains[indexR]), '=', domain__debug(A), '==?', vB);
          let vR = force(indexR);
          ASSERT(domain_removeValue(A, vB), 'A should be able to reflect R=0 with B');
          ASSERT(domain_containsValue(A, vB), 'A should be able to reflect R=1 with B');
          domains[indexA] = vR ? domain_createValue(vB) : domain_removeValue(A, vB);
        });
        ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
        ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${vars[indexR]} = ${vars[indexA]} ==? L${vB}`));
        ml_eliminate(ml, offset, sizeof);
        --counts[indexA];
        --counts[indexR];
        pc = offset + sizeof;
        return;
      }
    }

    pc = offset + sizeof;
  }

  function cutIsNeq(ml, offset, sizeof, lenA, lenB, lenR) {
    ASSERT_LOG2(' -- cutIsNeq', offset, sizeof, lenA, lenB, lenR);
    if (lenR === 2) {
      let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + lenA + lenB));
      ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR], 'meta:', varMeta[indexR]);
      ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
      if (counts[indexR] === 1) {
        let indexA = lenA === 1 ? ml_dec8(ml, 1 + offset) : getFinalIndex(ml_dec16(ml, 1 + offset));
        let indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA));
        if (counts[indexR] === 1) {
          ASSERT_LOG2('   - R is a leaf var');
          solveStack.push(domains => {
            ASSERT_LOG2(' - cut isneq R;', indexR, '=', indexA, '!=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '!=?', domain__debug(domains[indexB]));
            let vA = lenA === 1 ? indexA : force(indexA);
            let vB = lenB === 1 ? indexB : force(indexB);
            let vR = vA !== vB ? 1 : 0;
            ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A!=?B=R', vA, vB, vR, domain__debug(domains[indexR]));
            domains[indexR] = domain_createValue(vR);
          });
          ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
          ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${indexR} = ${indexA} !=? ${indexB}`));
          ml_eliminate(ml, pc, sizeof);
          --counts[indexA];
          --counts[indexB];
          --counts[indexR];
          pc = offset + sizeof;
          return;
        }
      }
    }

    ASSERT(lenA === 2, 'we normalize constants for isneq');
    if (lenB === 1) {
      let indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      if (counts[indexA] === 1) {
        // A is leaf, B is constant, cut the constraint, A can reflect B and C afterwards
        // we assume that A contains a valid value for B and both cases C=0 and C=1
        let A = domains[indexA];
        let vB = ml_dec8(ml, offset + 1 + 2);
        let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1));

        ASSERT_LOG2('   - A is a leaf var, B a constant (', vB, ')');
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut isneq A;', indexR, '=', indexA, '!=? c  ->  ', domain__debug(domains[indexR]), '=', domain__debug(A), '!=?', vB);
          let vR = force(indexR);
          ASSERT(domain_removeValue(A, vB), 'A should be able to reflect R=0 with B');
          ASSERT(domain_containsValue(A, vB), 'A should be able to reflect R=1 with B');
          domains[indexA] = vR ? domain_removeValue(A, vB) : domain_createValue(vB);
        });
        ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
        ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${vars[indexR]} = ${vars[indexA]} !=? L${vB}`));
        ml_eliminate(ml, offset, sizeof);
        --counts[indexA];
        --counts[indexR];
        pc = offset + sizeof;
        return;
      }
    }

    pc = offset + sizeof;
  }

  function cutIsLt(ml, offset, sizeof, lenA, lenB, lenR) {
    ASSERT_LOG2(' -- cutIsLt', offset, sizeof, lenA, lenB, lenR);
    if (lenR === 2) {
      let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + lenA + lenB));
      ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR], 'meta:', varMeta[indexR]);
      ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
      if (counts[indexR] === 1) {
        let indexA = lenA === 1 ? ml_dec8(ml, 1 + offset) : getFinalIndex(ml_dec16(ml, 1 + offset));
        let indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA));
        if (counts[indexR] === 1) {
          ASSERT_LOG2('   - R is a leaf var');
          solveStack.push(domains => {
            ASSERT_LOG2(' - cut islt R;', indexR, '=', indexA, '<?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<?', domain__debug(domains[indexB]));
            let vA = lenA === 1 ? indexA : force(indexA);
            let vB = lenB === 1 ? indexB : force(indexB);
            let vR = vA < vB ? 1 : 0;
            ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A<?B=R;', vA, '<?', vB, '=', vR, domain__debug(domains[indexR]));
            domains[indexR] = domain_createValue(vR);
          });
          ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
          ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${indexR} = ${indexA} <? ${indexB}`));
          ml_eliminate(ml, pc, sizeof);
          --counts[indexA];
          --counts[indexB];
          --counts[indexR];
        }
      }
    }

    if (lenB === 1) {
      let indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      if (counts[indexA] === 1) {
        // A is leaf, B is constant, cut the constraint, A can reflect B and C afterwards
        // we assume that A contains a valid value for B and both cases C=0 and C=1
        let A = domains[indexA];
        let vB = ml_dec8(ml, offset + 1 + 2);
        let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1));

        ASSERT_LOG2('   - A is a leaf var, B a constant (', vB, ')');
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut islt A;', indexR, '=', indexA, '<? c  ->  ', domain__debug(domains[indexR]), '=', domain__debug(A), '<?', vB);
          let vR = force(indexR);
          ASSERT(domain_removeGte(A, vB), 'A should be able to reflect R=0 with B');
          ASSERT(domain_removeLtUnsafe(A, vB), 'A should be able to reflect R=1 with B');
          domains[indexA] = vR ? domain_removeGte(A, vB) : domain_removeLtUnsafe(A, vB);
        });
        ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
        ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${vars[indexR]} = ${vars[indexA]} <? L${vB}`));
        ml_eliminate(ml, offset, sizeof);
        --counts[indexA];
        --counts[indexR];
        pc = offset + sizeof;
        return;
      }
    }

    if (lenA === 1) {
      let indexB = getFinalIndex(ml_dec16(ml, offset + 1));
      if (counts[indexB] === 1) {
        // B is leaf, A is constant, cut the constraint, B can reflect A and C afterwards
        // we assume that B contains a valid value for A and both cases C=0 and C=1
        let B = domains[indexB];
        let vA = ml_dec8(ml, offset + 1);
        let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 1 + 2));

        ASSERT_LOG2('   - A is a leaf var, B a constant (', vA, ')');
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut islt B;', indexR, '= c <?', indexB, ' ->  ', domain__debug(domains[indexR]), '=', vA, '<?', domain__debug(B));
          let vR = force(indexR);
          ASSERT(domain_removeLtUnsafe(B, vA), 'B should be able to reflect R=0 with A');
          ASSERT(domain_removeGte(B, vA), 'B should be able to reflect R=1 with A');
          domains[indexB] = vR ? domain_removeLtUnsafe(B, vA) : domain_removeGte(B, vA);
        });
        ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
        ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${vars[indexR]} = L${vA} <? ${vars[indexB]}`));
        ml_eliminate(ml, offset, sizeof);
        --counts[indexB];
        --counts[indexR];
        pc = offset + sizeof;
        return;
      }
    }

    pc = offset + sizeof;
  }

  function cutIsLte(ml, offset, sizeof, lenA, lenB, lenR) {
    ASSERT_LOG2(' -- cutIsLte', offset, sizeof, lenA, lenB, lenR);
    if (lenR === 2) {
      let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + lenA + lenB));
      ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR], 'meta:', varMeta[indexR]);
      ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
      if (counts[indexR] === 1) {
        let indexA = lenA === 1 ? ml_dec8(ml, 1 + offset) : getFinalIndex(ml_dec16(ml, 1 + offset));
        let indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA));
        if (counts[indexR] === 1) {
          ASSERT_LOG2('   - R is a leaf var');
          solveStack.push(domains => {
            ASSERT_LOG2(' - cut islte R;', indexR, '=', indexA, '<=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<=?', domain__debug(domains[indexB]));
            let vA = lenA === 1 ? indexA : force(indexA);
            let vB = lenB === 1 ? indexB : force(indexB);
            let vR = vA <= vB ? 1 : 0;
            ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A<=?B=R;', vA, '<?', vB, '=', vR, domain__debug(domains[indexR]));
            domains[indexR] = domain_createValue(vR);
          });
          ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
          ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${indexR} = ${indexA} <=? ${indexB}`));
          ml_eliminate(ml, pc, sizeof);
          --counts[indexA];
          --counts[indexB];
          --counts[indexR];
          pc = offset + sizeof;
          return;
        }
      }
    }

    if (lenB === 1) {
      let indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      if (counts[indexA] === 1) {
        // A is leaf, B is constant, cut the constraint, A can reflect B and C afterwards
        // we assume that A contains a valid value for B and both cases C=0 and C=1
        let A = domains[indexA];
        let vB = ml_dec8(ml, offset + 1 + 2);
        let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1));

        ASSERT_LOG2('   - A is a leaf var, B a constant (', vB, ')');
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut islt A;', indexR, '=', indexA, '<=? c  ->  ', domain__debug(domains[indexR]), '=', domain__debug(A), '<=?', vB);
          let vR = force(indexR);
          ASSERT(domain_removeGtUnsafe(A, vB), 'A should be able to reflect R=0 with B');
          ASSERT(domain_removeLte(A, vB), 'A should be able to reflect R=1 with B');
          domains[indexA] = vR ? domain_removeGtUnsafe(A, vB) : domain_removeLte(A, vB);
        });
        ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
        ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${vars[indexR]} = ${vars[indexA]} <=? L${vB}`));
        ml_eliminate(ml, offset, sizeof);
        --counts[indexA];
        --counts[indexR];
        pc = offset + sizeof;
        return;
      }
    }

    if (lenA === 1) {
      let indexB = getFinalIndex(ml_dec16(ml, offset + 1));
      if (counts[indexB] === 1) {
        // B is leaf, A is constant, cut the constraint, B can reflect A and C afterwards
        // we assume that B contains a valid value for A and both cases C=0 and C=1
        let B = domains[indexB];
        let vA = ml_dec8(ml, offset + 1);
        let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 1 + 2));

        ASSERT_LOG2('   - A is a leaf var, B a constant (', vA, ')');
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut islt B;', indexR, '= c <=?', indexB, ' ->  ', domain__debug(domains[indexR]), '=', vA, '<=?', domain__debug(B));
          let vR = force(indexR);
          ASSERT(domain_removeLtUnsafe(B, vA), 'B should be able to reflect R=0 with A');
          ASSERT(domain_removeGte(B, vA), 'B should be able to reflect R=1 with A');
          domains[indexB] = vR ? domain_removeLtUnsafe(B, vA) : domain_removeGte(B, vA);
        });
        ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
        ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${vars[indexR]} = L${vA} <=? ${vars[indexB]}`));
        ml_eliminate(ml, offset, sizeof);
        --counts[indexB];
        --counts[indexR];
        pc = offset + sizeof;
        return;
      }
    }

    pc = offset + sizeof;
  }

  function cutPlus(ml, offset) {
    ASSERT_LOG2(' -- cutPlus', offset);
    // note: we cant simply eliminate leaf vars because they still constrain
    // the allowed distance between the other two variables and if you
    // eliminate this constraint, that limitation is not enforced anymore.
    let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 2));
    ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR], 'meta:', varMeta[indexR]);
    ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
    if (cutPlusR(offset, indexR)) return;
    if (cutPlusAB(offset, indexR, 'A', 1, 'B', 1 + 2)) return;
    if (cutPlusAB(offset, indexR, 'B', 1 + 2, 'A', 1)) return;
    pc = offset + SIZEOF_VVV;
  }
  function cutPlusR(offset, indexR) {
    ASSERT_LOG2(' - cutPlusR', offset, indexR, 'count=', counts[indexR]);
    if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      // even though R is a dud, it cant be plainly eliminated!
      // however, if the range of R wraps the complete range of
      // A+B then that means the distance between A and B is not
      // restricted and we can defer this constraint, anyways.
      // (this could happen when C=A+B with C=*)
      // note that since R is a leaf var it cant be constrained
      // any further except by this constraint, so it cannot be
      // the case that another constraint invalidates this step.

      let indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      let indexB = getFinalIndex(ml_dec16(ml, offset + 1 + 2));
      let A = domains[indexA];
      let B = domains[indexB];
      let R = domains[indexR];
      ASSERT_LOG2(' ->', domain__debug(R), '=', domain__debug(A), '+', domain__debug(B));

      // you could also simply add the domains and check if the result intersected with R equals the result.
      let lo = domain_min(A) + domain_min(B);
      let hi = domain_max(A) + domain_max(B);
      ASSERT(domain_min(R) >= lo, 'should be minified');
      ASSERT(domain_max(R) <= hi, 'should be minified');
      if (R === domain_createRange(lo, hi)) {
        // regardless of A and B, every addition between them is contained in R
        // this means we can eliminate R safely without breaking minimal distance A B
        solveStack.push(_ => {
          ASSERT_LOG2(' - cut plus R;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '+', domain__debug(domains[indexB]));
          let vA = force(indexA);
          let vB = force(indexB);
          let vR = vA + vB;
          ASSERT(Number.isInteger(vR), 'should be integer result');
          ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A+B=R', vA, vB, vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        });
        ml_eliminate(ml, pc, SIZEOF_VVV);
        --counts[indexA];
        --counts[indexB];
        --counts[indexR];
        pc = offset + SIZEOF_VVV;
        return true;
      }

      if (R === domain_createRange(1, 2) && A === domain_createRange(0, 1) && B === domain_createRange(0, 1)) {
        ASSERT_LOG2('   - [12]=[01]+[01] is actually an OR');
        solveStack.push(_ => {
          ASSERT_LOG2(' - cut plus R=A|B;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '+', domain__debug(domains[indexB]));
          let vA = force(indexA);
          let vB = force(indexB);
          let vR = vA + vB;
          ASSERT(Number.isInteger(vR), 'should be integer result');
          ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A+B=R', vA, vB, vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        });
        ASSERT_LOG2(' - Rewrite to A|B');
        // rewrite to `A | B` (inclusive OR)
        // R can later reflect the result
        // (while this won't relieve stress on A or B, it will be one less var to actively worry about)
        ml_vvv2vv(ml, offset, ML_VV_OR, indexA, indexB);
        --counts[indexR];
        pc = offset; // revisit...
        return true;
      }
      if (R === domain_createRange(0, 1) && A === domain_createRange(0, 1) && B === domain_createRange(0, 1)) { // more generic... max(R)<max(A)+max(B) and size(A)=2 and size(B)=2 and min(A)=0 and min(B)=0 (in that case also optimize the forcing if already non-zero)
        ASSERT_LOG2('   - [01]=[01]+[01] is actually a NAND');
        solveStack.push(_ => {
          ASSERT_LOG2(' - cut plus R=A!&B;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '+', domain__debug(domains[indexB]));
          let vA = force(indexA);
          let vB = force(indexB);
          let vR = vA + vB;
          ASSERT(Number.isInteger(vR), 'should be integer result');
          ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A+B=R', vA, vB, vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        });
        ASSERT_LOG2(' - Rewrite to A!&B');
        // rewrite to `A !& B` (not AND) to enforce that they can't both be 1 (... "non-zero")
        // R can later reflect the result
        // (while this won't relieve stress on A or B, it will be one less var to actively worry about)
        ml_vvv2vv(ml, offset, ML_VV_NAND, indexA, indexB);
        --counts[indexR];
        pc = offset; // revisit...
        return true;
      }
    } else if (counts[indexR] === 2) {
      // scan for pattern (R = A+B) & (S = R==?2) -> S = isAll(A B). a bit tedious to scan for but worth it.
      let otherOffset = lastOffset[indexR];
      ASSERT(otherOffset > 0, 'offset should exist and cant be the first op');
      if (ml_dec8(ml, otherOffset) === ML_V8V_ISEQ && getFinalIndex(ml_dec16(ml, otherOffset + 1)) === indexR && ml_dec8(ml, otherOffset + 3) === 2) {
        // okay the "other side" is checking whether the result is 2 so if the two plus args are bools we can reduce

        let indexA = getFinalIndex(ml_dec16(ml, offset + 1));
        let indexB = getFinalIndex(ml_dec16(ml, offset + 1 + 2));
        let A = domains[indexA];
        let B = domains[indexB];
        ASSERT_LOG2(' ->', domain__debug(domains[indexR]), '=', domain__debug(A), '+', domain__debug(B));
        ASSERT(A === domain_createRange(0, 1) && B === domain_createRange(0, 1), 'I think this has to be the case now? R should minmax the args and neither arg can be solved so they must be bools');
        if (A === domain_createRange(0, 1) && B === domain_createRange(0, 1)) {
          ASSERT_LOG2(' - found isAll pattern, rewriting plus and eliminating isEq');
          // match. rewrite plus isAll and remove the isEq. adjust counts accordingly
          let indexS = getFinalIndex(ml_dec16(ml, otherOffset + 1 + 2 + 1)); // other op is a v8v_isEq and we want its R
          ASSERT(domains[indexS] === domain_createRange(0, 1), 'S should be a bool');

          solveStack.push(domains => {
            ASSERT_LOG2(' - cut plus -> isAll; ', indexR, '= isAll(', indexA, ',', indexB, ')  ->  ', domain__debug(domains[indexR]), ' = isAll(', domain__debug(domains[indexA]), ',', domain__debug(domains[indexB]), ')');
            ASSERT(domain_min(domains[indexR]) === 0 && domain_max(domains[indexR]) === 2, 'R should have all values');
            domains[indexR] = domain_createValue(force(indexA) + force(indexB));
          });

          // for the record, _this_ is why ML_ISALL2 exists at all. we cant use ML_ISALL because it has a larger footprint than ML_PLUS
          ml_vvv2vvv(ml, offset, ML_ISALL2, indexA, indexB, indexS);
          ml_eliminate(ml, otherOffset, SIZEOF_V8V);
          // R=A+B, S=R==?2  ->  S=isall(A,B). so only the count for R is reduced
          counts[indexR] -= 2;
        }
      }
    }
    return false;
  }
  function cutPlusAB(offset, indexR, X, deltaX, Y, deltaY) {
    ASSERT_LOG2(' - _cutPlusAB:', X, Y, offset, indexR, deltaX, deltaY);
    let indexA = getFinalIndex(ml_dec16(ml, offset + deltaX));
    if (counts[indexA] === 1) {
      let A = domains[indexA];
      let indexB = getFinalIndex(ml_dec16(ml, offset + deltaY));
      let B = domains[indexB];
      let vB = domain_getValue(B);
      ASSERT_LOG2('   -', X, ' is a leaf var, ', Y, '=', domain__debug(B));
      if (vB >= 0) {
        let oR = domains[indexR];
        ASSERT_LOG2('   - and', Y, 'is solved to', vB, 'so intersect R to ' + X + '+' + vB + ', defer ' + X + ', and eliminate the constraint');
        let R = domain_intersection(domain_plus(A, B), oR);
        if (R !== oR) {
          ASSERT_LOG2(' - intersecting R with ' + X + '+vB', domain__debug(oR), 'n', (domain__debug(A) + '+' + domain__debug(B) + '=' + domain__debug(domain_plus(A, B))), '->', domain__debug(R));
          if (!R) return emptyDomain = true;
          domains[indexR] = R;
        }
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut plus R=' + X + '+c;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '+', domain__debug(domains[indexB]));
          let vA = force(indexA);
          let vB = force(indexB);
          let vR = vA + vB;
          ASSERT(Number.isInteger(vR), 'should be integer result');
          ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A+B=R', vA, vB, vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        });
        ml_eliminate(ml, pc, SIZEOF_VVV);
        --counts[indexA];
        --counts[indexB];
        --counts[indexR];
        pc = offset + SIZEOF_VVV;
        return true;
      }
    }
    return false;
  }

  function cutSum(ml, offset) {
    let len = ml_dec16(ml, pc + 1);
    ASSERT(len > 2, 'should have at least three args or otherwise the minifier would have morphed it');

    let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1 + len * 2));

    if (counts[indexR] === 1) {
      let allBool = true; // all args [01]? used later
      let C = ml_dec8(ml, offset + 1 + 2); // constant
      let lo = C;
      let hi = C;
      for (let i = 0; i < len; ++i) {
        let index = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1 + i * 2));
        let domain = domains[index];
        let min = domain_min(domain);
        let max = domain_max(domain);
        ASSERT(min < max, 'arg should not be solved here (minimizer should take care of that)');
        lo += min;
        hi += max;
        if (lo !== 0 || max !== 1) allBool = false;
      }

      let R = domains[indexR];
      ASSERT(domain_min(R) >= lo, 'R should be minimized');
      ASSERT(domain_max(R) <= hi, 'R should be minimized');

      if (R === domain_createRange(lo, hi)) {
        // all possible outcomes of summing any element in the sum args are part of R so
        // R is a leaf and the args arent bound by it so we can safely remove the sum

        // collect the arg indexes (kind of dupe loop but we'd rather not make an array prematurely)
        let args = [];
        for (let i = 0; i < len; ++i) {
          let index = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1 + i * 2));
          args.push(index);
          --counts[index];
        }

        ASSERT_LOG2('   - R is a leaf var that wraps all bounds', indexR, args, domain__debug(R));

        solveStack.push(domains => {
          ASSERT_LOG2(' - cut plus R;', indexR, args, domain__debug(R));
          let vR = C + args.map(force).reduce((a, b) => a + b);
          ASSERT(Number.isInteger(vR), 'should be integer result');
          ASSERT(domain_containsValue(domains[indexR], vR), 'R should already have been reduced to a domain that is valid within any outcome of the sum', vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        });
        ml_eliminate(ml, pc, SIZEOF_C8_COUNT + len * 2 + 2);
        --counts[indexR]; // args already done in above loop

        pc = offset;
        return;
      }

      // if R is [0, n-1] and all args are [0, 1] then rewrite to a NALL
      if (allBool && lo === 0 && R === domain_createRange(0, hi - 1)) {
        // collect the arg indexes (kind of dupe loop but we'd rather not make an array prematurely)
        let args = [];
        for (let i = 0; i < len; ++i) {
          let index = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1 + i * 2));
          args.push(index);
          --counts[index];
        }

        ASSERT_LOG2('   - R is a isNall leaf var, rewriting to NALL', indexR, args, domain__debug(R));

        solveStack.push(domains => {
          ASSERT_LOG2(' - cut plus R;', indexR, args, domain__debug(R));
          let vR = C + args.map(force).reduce((a, b) => a + b);
          ASSERT(Number.isInteger(vR), 'should be integer result');
          ASSERT(domain_containsValue(domains[indexR], vR), 'R should already have been reduced to a domain that is valid within any outcome of the sum', vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        });

        // from sum to nall.
        ml_enc8(ml, offset, ML_NALL);
        ml_enc16(ml, offset + 1, len);
        for (let i = 0; i < len; ++i) {
          ml_enc16(ml, offset + 3 + i * 2, args[i]);
        }
        ml_jump(ml, offset + 3 + len * 2, 3); // result var (16bit) and the constant (8bit). for the rest nall is same as sum
        pc = offset; // revisit
        return;
      }
    } else if (counts[indexR] === 2) {
      let C = ml_dec8(ml, offset + 1 + 2); // constant
      // scan for pattern (R = A+B) & (S = R==?2) -> S = isAll(A B). a bit tedious to scan for but worth it.
      let otherOffset = lastOffset[indexR];
      ASSERT(otherOffset > 0, 'offset should exist and cant be the first op');
      if (ml_dec8(ml, otherOffset) === ML_V8V_ISEQ && getFinalIndex(ml_dec16(ml, otherOffset + 1)) === indexR && ml_dec8(ml, otherOffset + 3) === (C + len)) {
        // okay the "other side" is checking whether the result is max so if all the args are bools we can reduce

        let args = [];
        let allBools = true;
        for (let i = 0; i < len; ++i) {
          let index = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1 + i * 2));
          let domain = domains[index];
          if (domain !== domain_createRange(0, 1)) {
            allBools = false;
            break;
          }
          args.push(index);
        }

        if (allBools) {
          ASSERT_LOG2(' - found isAll pattern, rewriting sum and eliminating isEq');

          // ok, we replace the sum and isEq with `S = isAll(args)`
          // the sum has the biggest footprint so the isall will fit with one byte to spare

          let indexS = getFinalIndex(ml_dec16(ml, otherOffset + 1 + 3));
          ASSERT(domains[indexS] === domain_createRange(0, 1), 'S should be a bool');

          solveStack.push(domains => {
            ASSERT_LOG2(' - cut sum -> isAll');
            let vR = 0;
            for (let i = 0; i < len; ++i) {
              let vN = force(args[i]);
              ASSERT(vN === 0 || vN === 1, 'should be booly');
              if (vN) ++vR;
            }
            ASSERT(domain_min(domains[indexR]) === 0 && domain_max(domains[indexR]) === len, 'R should have all values');
            domains[indexR] = domain_createValue(vR);
          });

          // isall has no constant so we must move all args one to the left
          ml_enc8(ml, offset, ML_ISALL);
          ml_enc16(ml, offset + 1, len);
          for (let i = 0; i < len; ++i) {
            ml_enc16(ml, offset + SIZEOF_COUNT + i * 2, ml_dec16(ml, offset + SIZEOF_C8_COUNT + i * 2));
          }
          ml_enc16(ml, offset + SIZEOF_COUNT + len * 2, indexS);
          ml_jump(ml, offset + SIZEOF_COUNT + len * 2 + 2, SIZEOF_C8_COUNT - SIZEOF_COUNT); // the difference in op footprint is the 8bit constant

          // remove the iseq, regardless
          ml_eliminate(ml, otherOffset, SIZEOF_V8V);

          // R=sum(args), S=R==?2  ->  S=isall(args). so only the count for R is reduced
          counts[indexR] -= 2;
          pc = offset; // revisit
          return;
        }
      }
    }

    pc += SIZEOF_C8_COUNT + len * 2 + 2;
  }

  function cutOr() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    ASSERT_LOG2(' - cutOr', indexA, '|', indexB, 'counts:', counts[indexA], counts[indexB], 'meta:', varMeta[indexA], varMeta[indexB]);

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut or A;', indexA, '|', indexB, '  ->  ', domain__debug(domains[indexA]), '|', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        ASSERT(domain_min(A) === 0 && domain_max(A) > 0, 'A should contain zero and non-zero');
        if (vB === 0) domains[indexA] = domain_removeValue(A, 0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' | ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut or B;', indexA, '|', indexB, '  ->  ', domain__debug(domains[indexA]), '|', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let B = domains[indexB];
        ASSERT(domain_min(B) === 0 && domain_max(B) > 0, 'B should contain zero and non-zero');
        if (vA === 0) domains[indexB] = domain_removeValue(B, 0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' | ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
    } else {
      pc += SIZEOF_VV;
    }
  }

  function cutXor() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    ASSERT_LOG2(' - cutXor', indexA, '^', indexB, 'counts:', counts[indexA], counts[indexB], 'meta:', varMeta[indexA], varMeta[indexB]);

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut xor A;', indexA, '^', indexB, '  ->  ', domain__debug(domains[indexA]), '^', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        ASSERT(domain_min(A) === 0 && domain_max(A) > 0, 'A should contain zero and non-zero');
        if (vB === 0) domains[indexA] = domain_removeValue(A, 0);
        else domains[indexA] = domain_createValue(0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' ^ ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut xor B;', indexA, '^', indexB, '  ->  ', domain__debug(domains[indexA]), '^', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let B = domains[indexB];
        ASSERT(domain_min(B) === 0 && domain_max(B) > 0, 'B should contain zero and non-zero');
        if (vA === 0) domains[indexB] = domain_removeValue(B, 0);
        else domains[indexB] = domain_createValue(0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' ^ ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
    } else {
      pc += SIZEOF_VV;
    }
  }

  function cutNand() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    ASSERT_LOG2(' - cutNand', indexA, '!&', indexB, 'counts:', counts[indexA], counts[indexB], 'meta:', varMeta[indexA], varMeta[indexB]);

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut nand A;', indexA, '!&', indexB, '  ->  ', domain__debug(domains[indexA]), '!&', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let B = domains[indexB];
        let vB = domain_min(B) || force(indexB); // there's no need to force solve B if B doesnt contain a zero anyways
        ASSERT(domain_min(A) === 0, 'A should contain a zero (regardless)');
        if (vB > 0) domains[indexA] = domain_createValue(0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' !& ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
      return;
    }

    if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut nand B;', indexA, '!&', indexB, '  ->  ', domain__debug(domains[indexA]), '!&', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vA = domain_min(A) || force(indexA); // there's no need to force solve A if A doesnt contain a zero anyways
        let B = domains[indexB];
        ASSERT(domain_min(B) === 0, 'A should contain a zero (regardless)');
        if (vA > 0) domains[indexB] = domain_createValue(0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' !& ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
      return;
    }

    if (counts[indexA] === 2) {
      if ((varMeta[indexA] & COUNT_LTE_LHS) && doNandLte(indexA, pc, 'nand')) return;
      if ((varMeta[indexA] & COUNT_ISALL_RESULT) && doNandIsall(indexA, pc, 'nand')) return;
    }

    if (counts[indexB] === 2) {
      if ((varMeta[indexB] & COUNT_LTE_LHS) && doNandLte(indexB, pc, 'nand')) return;
      if ((varMeta[indexB] & COUNT_ISALL_RESULT) && doNandIsall(indexB, pc, 'nand')) return;
    }

    pc += SIZEOF_VV;
  }

  function cutXnor() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    ASSERT_LOG2(' - cutXnor', indexA, '!^', indexB, 'counts:', counts[indexA], counts[indexB], 'meta:', varMeta[indexA], varMeta[indexB]);

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut xnor A;', indexA, '!^', indexB, '  ->  ', domain__debug(domains[indexA]), '!^', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let B = domains[indexB];
        let vB = domain_min(B) || force(indexB); // no need to force solve B if B has no zero anyways
        ASSERT(domain_min(A) === 0 && domain_max(A) > 0, 'A should contain zero and non-zero');
        if (vB === 0) domains[indexA] = domain_createValue(0);
        else domains[indexA] = domain_removeValue(A, 0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' !^ ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut xnor B;', indexA, '!^', indexB, '  ->  ', domain__debug(domains[indexA]), '!^', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vA = domain_min(A) || force(indexA); // no need to force solve A if A has no zero anyways
        let B = domains[indexB];
        ASSERT(domain_min(B) === 0 && domain_max(B) > 0, 'B should contain zero and non-zero');
        if (vA === 0) domains[indexB] = domain_createValue(0);
        else domains[indexB] = domain_removeValue(B, 0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' !^ ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
      --counts[indexB];
    } else if ((varMeta[indexA] & COUNT_BOOLY) || (varMeta[indexB] & COUNT_BOOLY)) {
      // A or B is only used as a boolean (in the zero-nonzero sense, not strictly 0,1)
      // the xnor basically says that if one is zero the other one is too, and otherwise neither is zero
      // cominbing that with the knowledge that both vars are only used for zero-nonzero, one can be
      // considered a pseudo-alias for the other. we replace it with the other var and defer solving it.
      // when possible, pick a strictly boolean domain because it's more likely to allow new tricks.
      // note that for the bool, the actual value is irrelevant. whether it's 1 or 5, the ops will
      // normalize this to zero and non-zero anyways. and by assertion there are no other ops.

      ASSERT_LOG2(' - found bool-eq in a xnor:', indexA, '!^', indexB, '->', varMeta[indexA], varMeta[indexB]);

      // ok, a little tricky, but we're going to consider the bool to be a full alias of the other var
      // only when creating a solution, we will override the value and apply the boolean-esque value
      // to the bool var and assign it either its zero or nonzero value.

      let bA = varMeta[indexA] & COUNT_BOOLY;
      let bB = varMeta[indexB] & COUNT_BOOLY;
      let indexE = indexB;
      let indexK = indexA;
      if (!bB || (bA && domain_isBool(domains[indexA]))) {
        indexE = indexA;
        indexK = indexB;
      }
      let E = domains[indexE]; // remember what E was because it will be replaced by false to mark it an alias
      ASSERT_LOG2(' - pseudo-alias for booly xnor arg;', indexA, '!^', indexB, '  ->  ', domain__debug(domains[indexA]), '!^', domain__debug(domains[indexB]), 'replacing', indexE, 'with', indexK);

      solveStack.push((domains, getDomain) => {
        ASSERT_LOG2(' - resolve booly xnor arg;', indexK, '!^', indexE, '  ->  ', domain__debug(getDomain(indexK)), '!^', domain__debug(E));
        ASSERT(domain_min(E) === 0 && domain_max(E) > 0, 'the E var should be a booly', indexE, domain__debug(E));
        let vK = force(indexK);
        if (vK === 0) domains[indexE] = domain_removeGtUnsafe(E, 0);
        else domains[indexE] = domain_removeValue(E, 0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexE));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' !^ ' + indexB));

      // note: addAlias will push a defer as well. since the defers are resolved in reverse order,
      // we must call addAlias after adding our own defer, otherwise our change will be lost.
      addAlias(indexE, indexK);

      ml_eliminate(ml, pc, SIZEOF_VV);
      // we can add the count of E to that of K and subtract two for eliminating this constraint
      counts[indexK] += counts[indexE] - 2;
      counts[indexE] = 0;

      return;
    } else {
      pc += SIZEOF_VV;
    }
  }

  function cutIsAll() {
    let len = ml_dec16(ml, pc + 1);
    let indexR = getFinalIndex(ml_dec16(ml, pc + SIZEOF_COUNT + len * 2));
    ASSERT_LOG2(' - cutIsAll', indexR, '->', counts[indexR], 'x');

    if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');

      let args = [];
      for (let i = 0; i < len; ++i) {
        args.push(getFinalIndex(ml_dec16(ml, pc + 3 + i * 2)));
      }

      solveStack.push(domains => {
        ASSERT_LOG2(' - cut isall R; ', indexR, '= isAll(', args, ')  ->  ', domain__debug(domains[indexR]), ' = isAll(', args.map(index => domain__debug(domains[index])), ')');
        ASSERT(domains[indexR] === domain_createRange(0, 1), 'R should contain all valid values', domain__debug(domains[indexR]));

        let vR = 1;
        for (let i = 0; i < len; ++i) {
          if (force(args[i]) === 0) {
            vR = 0;
            break;
          }
        }

        domains[indexR] = domain_createValue(vR);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexR + '= isall(' + args + ')'));
      ml_eliminate(ml, pc, SIZEOF_COUNT + len * 2 + 2);
      --counts[indexR];
      for (let i = 0; i < len; ++i) --counts[args[i]];

      return;
    }

    if (counts[indexR] === 2) {
      if ((varMeta[indexR] & COUNT_LTE_LHS) && doIsAllLteLhs(indexR, pc, 'isall')) return;
      if ((varMeta[indexR] & COUNT_LTE_RHS) && doIsAllLteRhs(indexR, pc, 'isall')) return;
      if ((varMeta[indexR] & COUNT_NALL) && doIsAllNall(indexR, pc, 'isall')) return;
      if ((varMeta[indexR] & COUNT_NAND) && doNandIsall(indexR, pc, 'isall')) return;
    }

    pc += SIZEOF_COUNT + len * 2 + 2;
  }

  function cutIsAll2() {
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutIsAll2', indexR, '->', counts[indexR], 'x');

    if (counts[indexR] === 1) {
      let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
      let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut isall2 R; ', indexR, '= isAll(', indexA, ',', indexB, ')  ->  ', domain__debug(domains[indexR]), ' = isAll(', domain__debug(domains[indexA]), ',', domain__debug(domains[indexB]), ')');
        let vR = (force(indexA) === 0 || force(indexB) === 0) ? 0 : 1;
        ASSERT(domains[indexR] === domain_createRange(0, 1), 'R should be bool');
        domains[indexR] = domain_createValue(vR);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexR + '= isall(' + indexA + ',' + indexB + ')'));
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];

      return;
    }

    if (counts[indexR] === 2) {
      if ((varMeta[indexR] & COUNT_LTE_LHS) && doIsAllLteLhs(indexR, pc, 'isall')) return;
      if ((varMeta[indexR] & COUNT_LTE_RHS) && doIsAllLteRhs(indexR, pc, 'isall')) return;
      if ((varMeta[indexR] & COUNT_NALL) && doIsAllNall(indexR, pc, 'isall')) return;
      if ((varMeta[indexR] & COUNT_NAND) && doNandIsall(indexR, pc, 'isall')) return;
    }

    pc += SIZEOF_VVV;
  }

  function cutIsNall() {
    let len = ml_dec16(ml, pc + 1);
    let indexR = getFinalIndex(ml_dec16(ml, pc + SIZEOF_COUNT + len * 2));
    ASSERT_LOG2(' - cutIsNall', indexR, '->', counts[indexR], 'x');

    if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');

      let args = [];
      for (let i = 0; i < len; ++i) {
        args.push(getFinalIndex(ml_dec16(ml, pc + 3 + i * 2)));
      }

      solveStack.push(domains => {
        ASSERT_LOG2(' - cut isnall R; ', indexR, '= isNall(', args, ')  ->  ', domain__debug(domains[indexR]), ' = isNall(', args.map(index => domain__debug(domains[index])), ')');
        ASSERT(domains[indexR] === domain_createRange(0, 1), 'R should contain all valid values');

        let vR = 0;
        for (let i = 0; i < len; ++i) {
          if (force(args[i]) === 0) {
            vR = 1;
            break;
          }
        }

        domains[indexR] = domain_createValue(vR);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexR + '= isnall(' + args + ')'));
      ml_eliminate(ml, pc, SIZEOF_COUNT + len * 2 + 2);
      --counts[indexR];
      for (let i = 0; i < len; ++i) --counts[args[i]];
    } else {
      pc += SIZEOF_COUNT + len * 2 + 2;
    }
  }

  function cutNall() {
    let len = ml_dec16(ml, pc + 1);

    for (let i = 0; i < len; ++i) {
      let index = ml_dec16(ml, pc + 3 + i * 2);

      if (counts[index] === 2) {
        if (varMeta[index] & COUNT_ISALL_RESULT) {
          if (doIsAllNall(index, pc, 'nall')) return;
        }
      }
    }

    pc += SIZEOF_COUNT + len * 2;
  }

  function doLteTwice(sharedVarIndex, offset) {
    ASSERT_LOG2('doLteTwice', sharedVarIndex, 'at', offset, 'and', addrTracker[sharedVarIndex]);
    let otherOffset = addrTracker[sharedVarIndex];
    if (!otherOffset) {
      ASSERT_LOG2(' - havent seen other offset yet, logging this one now (offset=', offset, ')');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }
    if (otherOffset === offset) {
      ASSERT_LOG2(' - same addr, probably from previous loop');
      return false;
    }

    if (!domain_isBool(domains[getFinalIndex(sharedVarIndex)])) {
      ASSERT_LOG2(' - shared var is not a bool, cant apply trick'); // can but wont
      addrTracker[sharedVarIndex] = 0;
      return false;
    }

    let lteOffset1 = offset;
    let lteOffset2 = otherOffset;

    if (ml_dec8(ml, lteOffset1) !== ML_VV_LTE) {
      ASSERT_LOG2(' - offset1 wasnt lte');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }

    if (ml_dec8(ml, lteOffset2) !== ML_VV_LTE) {
      ASSERT_LOG2(' - offset2 wasnt lte');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }

    if (ml_dec16(ml, lteOffset1 + 1) !== sharedVarIndex) {
      ASSERT_LOG2(' - indexA of 1 wasnt the shared index');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }

    if (ml_dec16(ml, lteOffset2 + 1) !== sharedVarIndex) {
      ASSERT_LOG2(' - indexA of 2 wasnt the shared index');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }

    let indexB1 = getFinalIndex(ml_dec16(ml, lteOffset1 + 3));
    let indexB2 = getFinalIndex(ml_dec16(ml, lteOffset2 + 3));

    if (domain_max(domains[indexB1]) > 1 || domain_max(domains[indexB2]) > 1) {
      ASSERT_LOG2(' - only works on boolean domains'); // well not only, but there are some edge cases otherwise
      addrTracker[sharedVarIndex] = 0;
      return false;
    }

    // okay, two lte with the left being the shared index
    // the shared index is a leaf var, eliminate them both

    ml_eliminate(ml, lteOffset1, SIZEOF_VV);
    ml_eliminate(ml, lteOffset2, SIZEOF_VV);

    ASSERT_LOG2(' - A is a leaf constraint, defer it', sharedVarIndex);

    solveStack.push(domains => {
      ASSERT_LOG2(' - 2xlte;1;', sharedVarIndex, '!&', indexB1, '  ->  ', domain__debug(domains[sharedVarIndex]), '<=', domain__debug(domains[indexB1]));
      ASSERT_LOG2(' - 2xlte;2;', sharedVarIndex, '!&', indexB2, '  ->  ', domain__debug(domains[sharedVarIndex]), '<=', domain__debug(domains[indexB2]));

      domains[sharedVarIndex] = domain_removeGtUnsafe(domain_removeGtUnsafe(domains[sharedVarIndex], force(indexB1)), force(indexB2));
    });

    --counts[indexB1];
    --counts[indexB2];
    counts[sharedVarIndex] -= 2;
    addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
    return true;
  }

  function doIsAllLteRhs(sharedVarIndex, offset, forOp) {
    ASSERT_LOG2('doIsAllLteRhs', sharedVarIndex, forOp, 'at', offset, 'and', addrTracker[sharedVarIndex]);
    let otherOffset = addrTracker[sharedVarIndex];
    if (!otherOffset) {
      ASSERT_LOG2(' - havent seen other offset yet, logging this one now (offset=', offset, ')', forOp);
      addrTracker[sharedVarIndex] = offset;
      return false;
    }
    if (otherOffset === offset) {
      ASSERT_LOG2(' - same addr, probably from previous loop');
      return false;
    }

    // we can replace an isall and lte with ltes on the args of the isall
    // B = isall(C D), A <= B  ->   A <= C, A <= D
    // (where B is sharedVarIndex)
    // the isall args are assumed to be booly (containing both zero and non-zero)
    // A <= B meaning A is 0 when B is 0. B is 0 when C or D is 0 and non-zero
    // otherwise. so A <= C or A <= D should force A to match A <= B.

    let lteOffset = forOp === 'lte' ? offset : otherOffset;
    let isallOffset = forOp === 'lte' ? otherOffset : offset;

    // first check whether the saved offset is still valid (it may have been eliminated, although
    // I don't think that's possible with the currently code so the check may be redundant)

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) === ML_VV_LTE) {
      if (ml_dec16(ml, lteOffset + 3) !== sharedVarIndex) {
        ASSERT_LOG2(' - shared var was not right var of the lte, this is probably an old addr');
        addrTracker[sharedVarIndex] = offset;
        return false;
      }

      let indexA = getFinalIndex(ml_dec16(ml, lteOffset + 1));

      ASSERT_LOG2(' - checking isall offset', ml_dec8(ml, isallOffset) === ML_ISALL, ', indexA =', indexA);
      // there are two isalls, need special paths because of different footprints
      if (ml_dec8(ml, isallOffset) === ML_ISALL) {
        let len = ml_dec16(ml, isallOffset + 1);

        if (ml_dec16(ml, isallOffset + 3 + len * 2) !== sharedVarIndex) {
          ASSERT_LOG2(' - shared var was not result var of the isall, this is probably an old addr');
          addrTracker[sharedVarIndex] = offset;
          return false;
        }

        ASSERT_LOG2(' - rewriting B=isall(C D), A <= B  ->  A <= C, A <= D');

        // 2 ltes fit perfectly in the space we have available
        if (len === 2) {
          let left = getFinalIndex(ml_dec16(ml, isallOffset + 3));
          let right = getFinalIndex(ml_dec16(ml, isallOffset + 5));

          // validate domains. for now, only apply the trick on strict bools [0 1]
          ASSERT_LOG2(' - confirming all targeted vars are strict bools', domain__debug(domains[indexA]), domain__debug(domains[left]), domain__debug(domains[right]));
          if (domain_isBool(domains[indexA]) && domain_isBool(domains[left]) && domain_isBool(domains[right])) {
            // compile A<=left and A<=right over the existing two offsets
            ml_vv2vv(ml, lteOffset, ML_VV_LTE, indexA, left);
            ml_cr2vv(ml, isallOffset, len, ML_VV_LTE, indexA, right);

            return doIsAllLteRhsDeferShared(sharedVarIndex, indexA);
          }
        } else if (len < 100) {
          ASSERT_LOG2(' - Attempting to recycle space to stuff', len, 'lte constraints');
          // we have to recycle some space now. 100 is an arbitrary upper bound. the actual bound is the available space to recycle

          // start by collecting len recycled spaces
          let bin = []; // rare case of using an array inside this lib...
          let leftToStore = len;
          let lteSize = SIZEOF_VV; // lte vv
          let nextOffset = 0;
          let spaceLeft = 0;
          let nextSize = 0;
          do {
            if (spaceLeft < lteSize) {
              nextOffset = ml_getRecycleOffset(ml, nextOffset + nextSize, lteSize);
              ASSERT_LOG2('     - Got a new recyclable offset:', nextOffset);
              if (nextOffset === undefined) {
                // not enough spaces to recycle to fill our need; we can't rewrite this one
                ASSERT_LOG2('     - There is not enough space to recycle; bailing this morph');
                return false;
              }
              nextSize = ml_getOpSizeSlow(ml, nextOffset); // probably larger than requested because jumps are consolidated
              spaceLeft = nextSize;
              ASSERT_LOG2('     - It has', nextSize, 'bytes of free space');

              bin.push(nextOffset);
            }
            spaceLeft -= lteSize;
            --leftToStore;
            ASSERT_LOG2('   - Space left at', nextOffset, 'after compiling the LTE:', spaceLeft, ', LTEs left to store:', leftToStore);
          } while (leftToStore > 0);

          ASSERT_LOG2(' - Found', bin.length, 'jumps (', bin, ') which can host the', len, 'lte constraints. Compiling them now');

          let recycleOffset;
          let currentSize = 0;
          for (let i = 0; i < len; ++i) {
            ASSERT_LOG2('   - Compiling an lte to offset=', recycleOffset, 'with remaining size=', currentSize);
            if (currentSize < SIZEOF_VV) {
              recycleOffset = bin.pop(); // note: doing it backwards means we may not deplete the bin if the last space can host more lte's than were left to assign in the last loop. but that's fine either way.
              currentSize = ml_getOpSizeSlow(ml, recycleOffset);
              ASSERT_LOG2('   - Fetched next space from bin; offset=', recycleOffset, 'with size=', currentSize);
            }
            let indexB = ml_dec16(ml, isallOffset + 1 + i * 2);
            ASSERT_LOG2('- Compiling LTE in recycled space', recycleOffset, 'on AB', indexA, indexB);
            ml_recycleVV(ml, recycleOffset, ML_VV_LTE, indexA, indexB);
            recycleOffset += SIZEOF_VV;
            currentSize -= SIZEOF_VV;

            ASSERT(!void ml_validateSkeleton(ml), 'just making sure the recycle didnt screw up');
          }

          // TODO: we could recycle these addresses immediately. slightly more efficient and may cover the edge case where there otherwise wouldnt be enough space.
          ml_eliminate(ml, isallOffset, SIZEOF_COUNT + len * 2 + 2);
          ml_eliminate(ml, lteOffset, SIZEOF_VV);

          ASSERT(!void ml_validateSkeleton(ml), 'just making sure the recycle didnt screw up');
          return doIsAllLteRhsDeferShared(sharedVarIndex, indexA);
        }
      }

      ASSERT_LOG2(' - checking isall offset for other op', ml_dec8(ml, isallOffset) === ML_ISALL2, ', indexA =', indexA);
      if (ml_dec8(ml, isallOffset) === ML_ISALL2) {
        if (ml_dec16(ml, isallOffset + 5) !== sharedVarIndex) {
          ASSERT_LOG2(' - shared var was not result var of the isall, this is probably an old addr');
          addrTracker[sharedVarIndex] = offset;
          return false;
        }
        let left = getFinalIndex(ml_dec16(ml, isallOffset + 1));
        let right = getFinalIndex(ml_dec16(ml, isallOffset + 3));

        // validate domains. for now, only apply the trick on strict bools [0 1]
        ASSERT_LOG2(' - confirming all targeted vars are strict bools', domain__debug(domains[indexA]), domain__debug(domains[left]), domain__debug(domains[right]));
        if (domain_isBool(domains[indexA]) && domain_isBool(domains[left]) && domain_isBool(domains[right])) {
          // compile A<=left and A<=right over the existing two offsets
          ml_vv2vv(ml, lteOffset, ML_VV_LTE, sharedVarIndex, left);
          ml_vvv2vv(ml, isallOffset, ML_VV_LTE, sharedVarIndex, right);

          return doIsAllLteRhsDeferShared(sharedVarIndex, indexA);
        }
      }

      ASSERT_LOG2(' - known addr was not an isall, this is probably an old addr');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }

    ASSERT_LOG2(' - did not eliminate anything');
    return false;
  }
  function doIsAllLteRhsDeferShared(sharedVarIndex, lteIndex) {
    ASSERT_LOG2('   - deferring', sharedVarIndex, 'will be gt', lteIndex);
    solveStack.push(domains => {
      ASSERT_LOG2(' - isall + lte;', lteIndex, '<=', sharedVarIndex, '  ->  ', domain__debug(domains[lteIndex]), '<=', domain__debug(domains[sharedVarIndex]));
      let vA = force(lteIndex);
      domains[sharedVarIndex] = domain_removeGtUnsafe(domains[sharedVarIndex], vA);
    });
    ASSERT(!void (solveStack[solveStack.length - 1]._target = sharedVarIndex));
    ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${lteIndex} <= ${sharedVarIndex}`));

    counts[sharedVarIndex] -= 2;
    addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later

    // revisit this op, it is now an lte
    return true;
  }

  function doIsAllLteLhs(sharedVarIndex, offset, forOp) {
    ASSERT_LOG2('doIsAllLteLhs', sharedVarIndex, domain__debug(domains[sharedVarIndex]), forOp, 'at', offset, 'and', addrTracker[sharedVarIndex]);
    let otherOffset = addrTracker[sharedVarIndex];
    if (!otherOffset) {
      ASSERT_LOG2(' - havent seen other offset yet, logging this one now');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }
    if (otherOffset === offset) {
      ASSERT_LOG2(' - same addr, probably from previous loop');
      return false;
    }

    // this should be `A <= B, A = all?(C D ...)`. A is a leaf var, the other vars become a nall
    // put the nall in place of the isall. should have sufficient space. eliminate the lte.

    let lteOffset = forOp === 'lte' ? offset : otherOffset;
    let isallOffset = forOp === 'lte' ? otherOffset : offset;

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) === ML_VV_LTE) {
      if (ml_dec16(ml, lteOffset + 1) !== sharedVarIndex) {
        ASSERT_LOG2(' - shared var should be left var of the lte but wasnt, this is probably an old addr');
        addrTracker[sharedVarIndex] = offset;
      }

      let indexB = getFinalIndex(ml_dec16(ml, lteOffset + 3));

      ASSERT_LOG2(' - checking isall offset', ml_dec8(ml, isallOffset) === ML_ISALL, ', indexA =', indexB);
      if (ml_dec8(ml, isallOffset) === ML_ISALL) {
        let len = ml_dec16(ml, isallOffset + 1);
        if (sharedVarIndex !== ml_dec16(ml, isallOffset + 3 + len * 2)) {
          ASSERT_LOG2(' - shared var should be R of isall but wasnt, probably old addr');
          addrTracker[sharedVarIndex] = offset;
          return false;
        }

        ASSERT_LOG2(' - rewriting A <= B, A = isall(C D)  ->  nall(B C D)');
        ASSERT_LOG2(' - collecting', len, 'args and asserting strict boolean domains', domain_isBool(domains[sharedVarIndex]), domain__debug(domains[indexB]));

        let args = []; // rare array... but we need the indexes to defer the solution
        for (let i = 0; i < len; ++i) {
          let varIndex = getFinalIndex(ml_dec16(ml, isallOffset + 3 + i * 2));
          if (!domain_isBool(domains[varIndex])) return; // only safe on bools (without more thorough complex checks)
          args.push(varIndex);
        }

        if (domain_isBool(domains[sharedVarIndex]) && domain_isBool(domains[indexB])) {
          ASSERT_LOG2(' - ok, eliminating constraints, deferring', sharedVarIndex, '= nall(', indexB, args, ') --> ', domain__debug(domains[sharedVarIndex]), '= nall(', domain__debug(domains[indexB]), args.map(index => domain__debug(domains[index])), ')');

          ml_eliminate(ml, lteOffset, SIZEOF_VV);

          // rewrite the isall to a nall and be a little clever;
          // we want the rhs of the LTE to be part of the nall and
          // we want the original args of the isall to be part of the nall
          // so all we have to do is copy the rhs over the result and extend
          // the count by one, and replace the opcode of course.
          ml_enc8(ml, isallOffset, ML_NALL);
          ml_enc16(ml, isallOffset + 1, len + 1);
          ml_enc16(ml, isallOffset + 3 + len * 2, indexB);
          // and now the NALL should be `nall(indexB, args...)` with no space left

          return doIsAllLteLhsDeferShared(sharedVarIndex, indexB, args);
        }
      }

      if (ml_dec8(ml, isallOffset) === ML_ISALL2) {
        ASSERT_LOG2(' - isall2, need to recycle now because isall2 is a vvv (sizeof 7) and we need sizeof 9');

        if (sharedVarIndex !== ml_dec16(ml, isallOffset + 5)) {
          ASSERT_LOG2(' - shared var should be R of isall but wasnt, probably old addr');
          addrTracker[sharedVarIndex] = offset;
          return false;
        }

        let leftIndex = getFinalIndex(ml_dec16(ml, isallOffset, 1));
        let rightIndex = getFinalIndex(ml_dec16(ml, isallOffset, 3));

        if (domain_isBool(domains[sharedVarIndex]) && domain_isBool(domains[indexB]) && domain_isBool(domains[leftIndex]) && domain_isBool(domains[rightIndex])) {
          ASSERT_LOG2(' - ok, eliminating constraints, deferring', sharedVarIndex, '= nall(', indexB, leftIndex, rightIndex, ') --> ', domain__debug(domains[sharedVarIndex]), '= nall(', domain__debug(domains[indexB]), domain__debug(domains[leftIndex]), domain__debug(domains[rightIndex]), ')');

          // rewrite vvv to c with len=3
          // this means the op grows in size so we must recycle
          let recycleOffset = ml_getRecycleOffset(ml, 0, SIZEOF_COUNT + 6);
          if (recycleOffset === undefined) return; // no free spot to compile this so skip it until we can morph

          ASSERT_LOG2(' - Recycling', recycleOffset, 'to a nall(ABC) with len=3 (=9)');

          ml_recycleC3(ml, recycleOffset, ML_NALL, indexB, leftIndex, rightIndex);
          ASSERT(!void ml_validateSkeleton(ml), 'just making sure the recycle didnt screw up');
          // remove the old ops
          ml_eliminate(ml, isallOffset, SIZEOF_VVV);
          ml_eliminate(ml, lteOffset, SIZEOF_VV);
          addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later

          return doIsAllLteLhsDeferShared(sharedVarIndex, indexB, [leftIndex, rightIndex]);
        }
      }
    }

    return false;
  }

  function doIsAllLteLhsDeferShared(sharedVarIndex, indexB, args) {
    ASSERT_LOG2(' - A is a leaf constraint, defer it', sharedVarIndex);

    solveStack.push(domains => {
      ASSERT_LOG2(' - isall + lte-lhs;', sharedVarIndex, args);
      // if the lte rhs solved to zero, set the shared var to zero
      // otherwise reflect the state if isall on the other args
      if (domain_isZero(domains[indexB])) {
        domains[sharedVarIndex] = domain_removeGtUnsafe(domains[sharedVarIndex], 0);
      } else {
        let hadZero = false;
        for (let i = 0, len = args.length; i < len + 1; ++i) {
          let index = getFinalIndex(args[i]);
          if (force(index) === 0) {
            domains[sharedVarIndex] = domain_removeGtUnsafe(domains[sharedVarIndex], 0);
            hadZero = true;
            break;
          }
        }
        if (!hadZero) domains[sharedVarIndex] = domain_removeValue(domains[sharedVarIndex], 0);
      }
    });

    // we only eliminated the shared index, the other counts did not change
    counts[sharedVarIndex] -= 2;
    addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
    return true;
  }

  function doNeqLteLhs(sharedVarIndex, offset, forOp) {
    ASSERT_LOG2('doNeqLteLhs', sharedVarIndex, forOp, 'at', offset, 'and', addrTracker[sharedVarIndex]);
    let otherOffset = addrTracker[sharedVarIndex];
    if (!otherOffset) {
      ASSERT_LOG2(' - havent seen other offset yet, logging this one now');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }
    if (offset === otherOffset) {
      ASSERT_LOG2(' - same offset, probably from previous loop');
      return false;
    }

    // this should be `A <= B, A != C`, morph one constraint into `A | C`, eliminate the other constraint, and defer A

    let lteOffset = forOp === 'lte' ? offset : otherOffset;
    let neqOffset = forOp === 'lte' ? otherOffset : offset;

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) === ML_VV_LTE) {
      if (ml_dec16(ml, lteOffset + 1) !== sharedVarIndex) {
        ASSERT_LOG2(' - shared var should be left var of the lte but wasnt');
        addrTracker[sharedVarIndex] = offset;
        return false;
      }

      let indexB = getFinalIndex(ml_dec16(ml, lteOffset + 3));

      ASSERT_LOG2(' - checking neq offset', ml_dec8(ml, neqOffset) === ML_VV_NEQ, ', indexB =', indexB);
      if (ml_dec8(ml, neqOffset) === ML_VV_NEQ) {
        ASSERT_LOG2(' - rewriting A <= B, A != C  ->  B !& C');
        let left = getFinalIndex(ml_dec16(ml, neqOffset + 1));
        let right = getFinalIndex(ml_dec16(ml, neqOffset + 3));

        let indexC = left;
        if (indexC === sharedVarIndex) {
          indexC = right;
        } else if (right !== sharedVarIndex) {
          ASSERT_LOG2(' - shared var should be part of the neq but wasnt');
          addrTracker[sharedVarIndex] = offset;
          return false;
        }

        ASSERT_LOG2(' - asserting strict boolean domains', domain__debug(domains[indexB]), domain__debug(domains[left]), domain__debug(domains[right]));
        if (domain_isBool(domains[indexB]) && domain_isBool(domains[left]) && domain_isBool(domains[right])) {
          ASSERT_LOG2(' - ok, rewriting the lte, eliminating the neq, and defering', sharedVarIndex);

          ml_vv2vv(ml, lteOffset, ML_VV_OR, indexB, indexC);
          ml_eliminate(ml, neqOffset, SIZEOF_VV);

          // only A is cut out, defer it

          solveStack.push(domains => {
            ASSERT_LOG2(' - neq + lte_lhs;', sharedVarIndex, '!=', indexB, '  ->  ', domain__debug(domains[sharedVarIndex]), '!=', domain__debug(domains[indexB]));
            let vB = force(indexB);
            domains[sharedVarIndex] = domain_removeValue(domains[sharedVarIndex], vB);
          });

          counts[sharedVarIndex] -= 2;
          addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
          return true;
        }
      }
    }

    return false;
  }

  function doNeqLteRhs(sharedVarIndex, offset, forOp) {
    //throw 'foxme';
    ASSERT_LOG2('doNeqLteRhs', sharedVarIndex, forOp, 'at', offset, 'and', addrTracker[sharedVarIndex]);
    if (!addrTracker[sharedVarIndex]) {
      ASSERT_LOG2(' - havent seen other offset yet, logging this one now');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }

    // this should be `A <= B, B != C`, morph one constraint into `A !& C`, eliminate the other constraint, and defer B

    let lteOffset = forOp === 'lte' ? offset : addrTracker[sharedVarIndex];
    let neqOffset = forOp === 'lte' ? addrTracker[sharedVarIndex] : offset;

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) === ML_VV_LTE) {
      ASSERT(ml_dec16(ml, lteOffset + 3) === sharedVarIndex, 'shared var should be right var of the lte');

      let indexA = getFinalIndex(ml_dec16(ml, lteOffset + 1));

      ASSERT_LOG2(' - checking neq offset', ml_dec8(ml, neqOffset) === ML_VV_NEQ, ', indexA =', indexA);
      if (ml_dec8(ml, neqOffset) === ML_VV_NEQ) {
        ASSERT_LOG2(' - rewriting A <= B, B != C  ->  A !& C');
        let left = getFinalIndex(ml_dec16(ml, neqOffset + 1));
        let right = getFinalIndex(ml_dec16(ml, neqOffset + 3));

        ASSERT_LOG2(' - asserting strict boolean domains', domain__debug(domains[indexA]), domain__debug(domains[left]), domain__debug(domains[right]));
        if (domain_isBool(domains[indexA]) && domain_isBool(domains[left]) && domain_isBool(domains[right])) {
          ASSERT_LOG2(' - ok, rewriting the lte, eliminating the neq, and defering', sharedVarIndex);
          let indexB = sharedVarIndex === left ? right : left;

          ml_vv2vv(ml, lteOffset, ML_VV_NAND, indexA, indexB);
          ml_eliminate(ml, neqOffset, SIZEOF_VV);

          // only B is cut out, defer it

          solveStack.push(domains => {
            ASSERT_LOG2(' - neq + lte;', indexB, '!=', sharedVarIndex, '  ->  ', domain__debug(domains[indexB]), '!=', domain__debug(domains[sharedVarIndex]));
            let vB = force(indexB);
            domains[sharedVarIndex] = domain_removeValue(domains[sharedVarIndex], vB);
          });

          counts[sharedVarIndex] -= 2;
          addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
          return true;
        }
      }
    }

    return false;
  }

  function doIsAllNall(sharedVarIndex, offset, forOp) {
    ASSERT_LOG2('doIsAllNall', sharedVarIndex, forOp, 'at', offset, 'and', addrTracker[sharedVarIndex]);
    let otherOffset = addrTracker[sharedVarIndex];
    if (!otherOffset) {
      ASSERT_LOG2(' - havent seen other offset yet, logging this one now');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }
    if (otherOffset === offset) {
      //console.error('bla: _'+sharedVarIndex.toString(36)+'_', offset, forOp)
      ASSERT_LOG2(' - from same op, irrelevant?');
      return false;
    }

    // this should be `R = all?(A B), nall(R A D)`
    // if R = 1 then A and B are 1, so the nall will have two 1's, meaning D must be 0
    // if R = 0 then the nall is already satisfied. the nall is not entirely redundant
    // because `R !& D` must be maintained, so rewrite it to a nand (or rather, remove B from it)

    let nallOffset = forOp === 'nall' ? offset : otherOffset;
    let isallOffset = forOp === 'nall' ? otherOffset : offset;

    ASSERT_LOG2(' - checking nall offset', ml_dec8(ml, nallOffset) === ML_NALL);
    if (ml_dec8(ml, nallOffset) === ML_NALL) {
      ASSERT_LOG2(' - checking isall offset', ml_dec8(ml, isallOffset) === ML_ISALL);
      if (ml_dec8(ml, isallOffset) === ML_ISALL) {
        ASSERT_LOG2(' - the ops match. now fingerprint them');
        // initially, for this we need a nall of 3 and a isall of 2
        let nallLen = ml_dec16(ml, nallOffset + 1);
        let isallLen = ml_dec16(ml, isallOffset + 1);

        if (nallLen === 3 && isallLen === 2) {
          ASSERT_LOG2(' - nall has 3 and isall 2 args, check if they share an arg');
          // next; one of the two isalls must occur in the nall
          // letters; S = all?(A B), nall(S C D)   (where S = shared)
          let indexS = sharedVarIndex;
          if (ml_dec16(ml, isallOffset + 7) !== indexS) {
            ASSERT_LOG2(' - this is NOT the isall we were looking at before because the shared index is not part of it');
            addrTracker[sharedVarIndex] = offset;
            return false;
          }
          let indexA = ml_dec16(ml, isallOffset + 3);
          let indexB = ml_dec16(ml, isallOffset + 5);

          let indexC;
          let indexD;

          let indexN1 = ml_dec16(ml, nallOffset + 3);
          let indexN2 = ml_dec16(ml, nallOffset + 5);
          let indexN3 = ml_dec16(ml, nallOffset + 7); // need to verify this anyways
          if (indexN1 === indexS) {
            indexC = indexN2;
            indexD = indexN3;
          } else if (indexN2 === indexS) {
            indexC = indexN1;
            indexD = indexN3;
          } else if (indexN3 === indexS) {
            indexC = indexN1;
            indexD = indexN2;
          } else {
            ASSERT_LOG2(' - this is NOT the nall we were looking at before because the shared index is not part of it');
            addrTracker[sharedVarIndex] = offset;
            return false;
          }

          ASSERT_LOG2(' - nall(', indexS, indexC, indexD, ') and ', indexS, ' = all?(', indexA, indexB, ')');

          // check if B or D is in the isall. apply morph by cutting out the one that matches
          if (indexA === indexC) {
            ASSERT_LOG2(' - A=C so removing', indexA, 'from the nall');
            ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexD);
            addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
            return true;
          }
          if (indexA === indexD) {
            ASSERT_LOG2(' - A=D so removing', indexA, 'from the nall');
            ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexC);
            addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
            return true;
          }
          if (indexB === indexC) {
            ASSERT_LOG2(' - B=C so removing', indexB, 'from the nall');
            ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexD);
            addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
            return true;
          }
          if (indexB === indexD) {
            ASSERT_LOG2(' - B=D so removing', indexB, 'from the nall');
            ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexC);
            addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
            return true;
          }
        }
      }
      ASSERT_LOG2(' - checking isall2 offset', ml_dec8(ml, isallOffset) === ML_ISALL);
      if (ml_dec8(ml, isallOffset) === ML_ISALL2) {
        ASSERT_LOG2(' - the ops match. now fingerprint them');
        // initially, for this we need a nall of 3 and a isall of 2 (which the op tells us already)
        let nallLen = ml_dec16(ml, nallOffset + 1);

        if (nallLen === 3) {
          ASSERT_LOG2(' - nall has 3 and isall2 ... 2 args, check if they share an arg');
          // next; one of the two isalls must occur in the nall
          // letters; S = all?(A B), nall(S C D)   (where S = shared)
          let indexS = sharedVarIndex;
          if (ml_dec16(ml, isallOffset + 5) !== indexS) {
            ASSERT_LOG2(' - this is NOT the isall we were looking at before because the shared index is not part of it');
            addrTracker[sharedVarIndex] = offset;
            return false;
          }
          let indexA = ml_dec16(ml, isallOffset + 1);
          let indexB = ml_dec16(ml, isallOffset + 3);

          let indexC;
          let indexD;

          let indexN1 = ml_dec16(ml, nallOffset + 3);
          let indexN2 = ml_dec16(ml, nallOffset + 5);
          let indexN3 = ml_dec16(ml, nallOffset + 7); // need to verify this anyways
          if (indexN1 === indexS) {
            indexC = indexN2;
            indexD = indexN3;
          } else if (indexN2 === indexS) {
            indexC = indexN1;
            indexD = indexN3;
          } else if (indexN3 === indexS) {
            indexC = indexN1;
            indexD = indexN2;
          } else {
            ASSERT_LOG2(' - this is NOT the nall we were looking at before because the shared index is not part of it');
            addrTracker[sharedVarIndex] = offset;
            return false;
          }

          ASSERT_LOG2(' - nall(', indexS, indexC, indexD, ') and ', indexS, ' = all?(', indexA, indexB, ')');

          // check if B or D is in the isall. apply morph by cutting out the one that matches
          if (indexA === indexC) {
            ASSERT_LOG2(' - A=C so removing', indexA, 'from the nall');
            ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexD);
            addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
            return true;
          }
          if (indexA === indexD) {
            ASSERT_LOG2(' - A=D so removing', indexA, 'from the nall');
            ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexC);
            addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
            return true;
          }
          if (indexB === indexC) {
            ASSERT_LOG2(' - B=C so removing', indexB, 'from the nall');
            ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexD);
            addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
            return true;
          }
          if (indexB === indexD) {
            ASSERT_LOG2(' - B=D so removing', indexB, 'from the nall');
            ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexC);
            addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
            return true;
          }
        }
      }
    }

    return false;
  }

  function doNandLte(sharedVarIndex, offset, forOp) {
    ASSERT_LOG2('doNandLte', sharedVarIndex, forOp, 'at', offset, 'and', addrTracker[sharedVarIndex]);
    let otherOffset = addrTracker[sharedVarIndex];
    if (!otherOffset) {
      ASSERT_LOG2(' - havent seen other offset yet, logging this one now');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }
    if (otherOffset === offset) {
      //console.error('bla: _'+sharedVarIndex.toString(36)+'_', offset, forOp)
      ASSERT_LOG2(' - from same op, irrelevant?');
      return false;
    }

    // this should be `A <= B, A !& C`. A is a leaf var, eliminate both constraints and defer A.

    let lteOffset = forOp === 'lte' ? offset : otherOffset;
    let nandOffset = forOp === 'lte' ? otherOffset : offset;

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) === ML_VV_LTE) {
      if (ml_dec16(ml, lteOffset + 1) !== sharedVarIndex) {
        ASSERT_LOG2(' - shared var should be left var of the lte but wasnt, probably old addr');
        addrTracker[sharedVarIndex] = offset;
        return false;
      }

      let indexB = getFinalIndex(ml_dec16(ml, lteOffset + 3));

      ASSERT_LOG2(' - checking nand offset', ml_dec8(ml, nandOffset) === ML_VV_NAND, ', indexA =', indexB);
      if (ml_dec8(ml, nandOffset) === ML_VV_NAND) {
        ASSERT_LOG2(' - eliminating A <= B, B !& C');
        let left = getFinalIndex(ml_dec16(ml, nandOffset + 1));
        let right = getFinalIndex(ml_dec16(ml, nandOffset + 3));

        if (left !== sharedVarIndex && right !== sharedVarIndex) {
          ASSERT_LOG2(' - shared var should be part of the nand but wasnt, probably old addr');
          addrTracker[sharedVarIndex] = offset;
          return false;
        }

        ASSERT_LOG2(' - asserting strict boolean domains', domain__debug(domains[indexB]), domain__debug(domains[left]), domain__debug(domains[right]));
        if (domain_isBool(domains[indexB]) && domain_isBool(domains[left]) && domain_isBool(domains[right])) {
          ASSERT_LOG2(' - ok, eliminating constraints, deferring', sharedVarIndex);

          let indexA = sharedVarIndex === left ? right : left;

          ml_eliminate(ml, nandOffset, SIZEOF_VV);
          ml_eliminate(ml, lteOffset, SIZEOF_VV);

          ASSERT_LOG2(' - A is a leaf constraint, defer it', sharedVarIndex);

          solveStack.push(domains => {
            ASSERT_LOG2(' - nand + lte;', indexA, '!&', sharedVarIndex, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[sharedVarIndex]));
            ASSERT_LOG2(' - nand + lte;', sharedVarIndex, '<=', indexB, '  ->  ', domain__debug(domains[sharedVarIndex]), '<=', domain__debug(domains[indexB]));
            let vA = force(indexA);
            let vB = force(indexB);
            // if vA is non-zero then sharedVarIndex must be zero, otherwise it must be lte B
            domains[sharedVarIndex] = domain_removeGtUnsafe(domains[sharedVarIndex], vA ? 0 : vB);
          });

          // we eliminated both constraints so all vars involved decount
          --counts[indexA];
          --counts[indexB];
          counts[sharedVarIndex] -= 2;
          addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
          return true;
        }
      }
    }

    return false;
  }

  function doNandIsall(sharedVarIndex, offset, forOp) {
    ASSERT_LOG2('doNandIsall', sharedVarIndex, forOp, 'at', offset, 'and', addrTracker[sharedVarIndex]);
    let otherOffset = addrTracker[sharedVarIndex];
    if (!otherOffset) {
      ASSERT_LOG2(' - havent seen other offset yet, logging this one now');
      addrTracker[sharedVarIndex] = offset;
      return false;
    }
    if (otherOffset === offset) {
      ASSERT_LOG2(' - from same op, irrelevant?');
      return false;
    }

    // this should be `R = all?(A B), R !& C. it rewrites to `nall(A B C)` and R is a leaf var

    let nandOffset = forOp === 'nand' ? offset : otherOffset;
    let isallOffset = forOp === 'nand' ? otherOffset : offset;

    ASSERT_LOG2(' - checking nand offset', ml_dec8(ml, nandOffset) === ML_VV_NAND);
    if (ml_dec8(ml, nandOffset) === ML_VV_NAND) {
      let nandA = ml_dec16(ml, nandOffset + 1);
      let nandB = ml_dec16(ml, nandOffset + 3);

      let indexC = nandA;
      if (nandA === sharedVarIndex) {
        indexC = nandB;
      } else if (nandB !== sharedVarIndex) {
        ASSERT_LOG2(' - shared var should be part of the nand but wasnt, probably old addr');
        addrTracker[sharedVarIndex] = offset;
        return false;
      }

      indexC = getFinalIndex(indexC);

      ASSERT_LOG2(' - checking isall offset', ml_dec8(ml, isallOffset) === ML_ISALL, ', indexC =', indexC);
      if (ml_dec8(ml, isallOffset) === ML_ISALL) {
        let len = ml_dec16(ml, isallOffset + 1);
        if (ml_dec16(ml, isallOffset + SIZEOF_COUNT + len * 2) !== sharedVarIndex) {
          ASSERT_LOG2(' - shared var should be R of isall but wasnt, probably old addr');
          addrTracker[sharedVarIndex] = offset;
          return false;
        }

        let args = []; // rare reason for an array
        for (let i = 0; i < len; ++i) {
          let index = getFinalIndex(ml_dec16(ml, isallOffset + SIZEOF_COUNT + i * 2));
          args.push(index);
        }

        ASSERT_LOG2(' - shared:', sharedVarIndex, ', nand args:', nandA, nandB, ', isall args:', args);

        // move all vars to the nall
        // the isall is a count with result. just replace the result with indexC, inc the len, and compile a nall instead
        // then we'll want to sort the args

        ml_enc8(ml, isallOffset, ML_NALL);
        ml_enc16(ml, isallOffset + 1, len + 1);
        ml_enc16(ml, isallOffset + SIZEOF_COUNT + len * 2, indexC);
        ml_heapSort16bitInline(ml, isallOffset + SIZEOF_COUNT, len + 1);

        // eliminate the old nand, we wont need it anymore
        ml_eliminate(ml, nandOffset, SIZEOF_VV);

        ASSERT_LOG2(' - R is a leaf constraint, defer it', sharedVarIndex);

        solveStack.push(domains => {
          ASSERT_LOG2(' - nand + isall;', indexC, '!&', sharedVarIndex, '  ->  ', domain__debug(domains[indexC]), '!=', domain__debug(domains[sharedVarIndex]));
          ASSERT_LOG2(' - nand + isall;', sharedVarIndex, '= all?(', args, ')  ->  ', domain__debug(domains[sharedVarIndex]), ' = all?(', args.map(index => domain__debug(domains[index])), ')');

          // loop twice: once without forcing to scan for a zero or all-non-zero. second time forces all args.

          let determined = true;
          for (let i = 0; i < args.length; ++i) {
            let index = args[i];
            if (domain_isZero(domains[index])) {
              domains[sharedVarIndex] = domain_removeGtUnsafe(domains[sharedVarIndex], 0);
              return; // done
            }

            if (!domain_hasNoZero(domains[index])) {
              determined = false;
              break;
            }
          }
          if (!determined) {
            for (let i = 0; i < args.length; ++i) {
              if (force(args[i]) === 0) {
                domains[sharedVarIndex] = domain_removeGtUnsafe(domains[sharedVarIndex], 0);
                return; // done
              }
            }
          }
          // either all args already were non-zero or none were zero when forced: isall holds so R>0
          domains[sharedVarIndex] = domain_removeValue(domains[sharedVarIndex], 0);
        });

        // we eliminated R only
        counts[sharedVarIndex] -= 2;
        addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
        return true;
      }

      if (ml_dec8(ml, isallOffset) === ML_ISALL2) {
        let isallA = getFinalIndex(ml_dec16(ml, isallOffset + 1));
        let isallB = getFinalIndex(ml_dec16(ml, isallOffset + 3));

        if (ml_dec16(ml, isallOffset + 5) !== sharedVarIndex) {
          ASSERT_LOG2(' - shared var should be R of isall but wasnt, probably old addr');
          addrTracker[sharedVarIndex] = offset;
          return false;
        }

        ASSERT_LOG2(' - shared:', sharedVarIndex, ', nand args:', nandA, nandB, ', isall args:', isallA, isallB);

        // isall2 has 3 spots (sizeof=7). the nall requires a sizeof_count for len=3 (sizeof=9). we'll need to recycle
        let recycleOffset = ml_getRecycleOffset(ml, 0, SIZEOF_COUNT + 6);
        if (recycleOffset === undefined) return false; // no free spot to compile this so skip it until we can morph

        ASSERT_LOG2(' - Recycling', recycleOffset, 'to a nall(ABC) with len=3 (=9)');

        // sort the args quickly
        let index1 = isallA;
        let index2 = isallB;
        let index3 = indexC;
        let t;
        if (index1 > index2) {
          t = index2;
          index2 = index1;
          index1 = t;
        }
        if (index1 > index3) {
          t = index3;
          index3 = index1;
          index1 = t;
        }
        if (index2 > index3) {
          t = index3;
          index3 = index2;
          index2 = t;
        }

        ml_recycleC3(ml, recycleOffset, ML_NALL, index1, index2, index3);
        ASSERT(!void ml_validateSkeleton(ml), 'just making sure the recycle didnt screw up');
        // remove the old ops
        ml_eliminate(ml, isallOffset, SIZEOF_VVV);
        ml_eliminate(ml, nandOffset, SIZEOF_VV);

        ASSERT_LOG2(' - R is a leaf constraint, defer it', sharedVarIndex);

        solveStack.push(domains => {
          ASSERT_LOG2(' - nand + isall;', indexC, '!&', sharedVarIndex, '  ->  ', domain__debug(domains[indexC]), '!=', domain__debug(domains[sharedVarIndex]));
          ASSERT_LOG2(' - nand + isall;', sharedVarIndex, '= all?(', isallA, isallB, ')  ->  ', domain__debug(domains[sharedVarIndex]), ' = all?(', domain__debug(domains[isallA]), domain__debug(domains[isallB]), ')');

          // loop twice: once without forcing to scan for a zero or all-non-zero. second time forces all args.

          if (domain_isZero(domains[isallA]) || domain_isZero(domains[isallA])) {
            domains[sharedVarIndex] = domain_removeGtUnsafe(domains[sharedVarIndex], 0);
          } else if (domain_hasNoZero(domains[isallA]) && domain_hasNoZero(domains[isallA])) {
            domains[sharedVarIndex] = domain_removeValue(domains[sharedVarIndex], 0);
          } else if (force(isallA) === 0 || force(isallA) === 0) {
            domains[sharedVarIndex] = domain_removeGtUnsafe(domains[sharedVarIndex], 0);
          } else {
            domains[sharedVarIndex] = domain_removeValue(domains[sharedVarIndex], 0);
          }
        });

        // we eliminated R only
        counts[sharedVarIndex] -= 2;
        addrTracker[sharedVarIndex] = 0; // just in case we start recycling space later
        return true;
      }
    }

    return false;
  }

  function cutLoop() {
    ASSERT_LOG2('\n - inner cutLoop');
    pc = 0;
    while (pc < ml.length && !emptyDomain) {
      let pcStart = pc;
      let op = ml[pc];
      ASSERT_LOG2(' -- CU pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, domains, vars));
      switch (op) {
        case ML_VV_EQ:
          return ml_throw(ml, pc, 'eqs should be aliased and eliminated');

        case ML_VV_NEQ:
          cutNeq();
          break;

        case ML_VV_LT:
          cutLt();
          break;

        case ML_VV_LTE:
          cutLte();
          break;

        case ML_V8_EQ:
        case ML_88_EQ:
        case ML_V8_NEQ:
        case ML_88_NEQ:
        case ML_V8_LT:
        case ML_8V_LT:
        case ML_88_LT:
        case ML_V8_LTE:
        case ML_8V_LTE:
        case ML_88_LTE:
          return ml_throw(ml, pc, 'constraints with <= 1 var should be eliminated');

        case ML_NALL:
          cutNall();
          break;

        case ML_DISTINCT:
          ASSERT_LOG2('(todo) d', pc);
          let dlen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_COUNT + dlen * 2;
          break;

        case ML_ISALL:
          cutIsAll();
          break;

        case ML_ISNALL:
          cutIsNall();
          break;

        case ML_ISALL2:
          cutIsAll2();
          break;

        case ML_PLUS:
          cutPlus(ml, pc);
          break;
        case ML_MINUS:
          pc += SIZEOF_VVV;
          //cutMinus(ml, pc);
          break;
        case ML_MUL:
          pc += SIZEOF_VVV;
          //cutMul(ml, pc);
          break;
        case ML_DIV:
          pc += SIZEOF_VVV;
          //cutDiv(ml, pc);
          break;

        case ML_VVV_ISEQ:
          cutIsEq(ml, pc, SIZEOF_VVV, 2, 2, 2);
          break;
        case ML_VVV_ISNEQ:
          cutIsNeq(ml, pc, SIZEOF_VVV, 2, 2, 2);
          break;
        case ML_VVV_ISLT:
          cutIsLt(ml, pc, SIZEOF_VVV, 2, 2, 2);
          break;
        case ML_VVV_ISLTE:
          cutIsLte(ml, pc, SIZEOF_VVV, 2, 2, 2);
          break;

        case ML_V8V_ISEQ:
          cutIsEq(ml, pc, SIZEOF_V8V, 2, 1, 2);
          break;
        case ML_V8V_ISNEQ:
          cutIsNeq(ml, pc, SIZEOF_V8V, 2, 1, 2);
          break;
        case ML_V8V_ISLT:
          cutIsLt(ml, pc, SIZEOF_V8V, 2, 1, 2);
          break;
        case ML_V8V_ISLTE:
          cutIsLte(ml, pc, SIZEOF_V8V, 2, 1, 2);
          break;

        case ML_VV8_ISEQ:
        case ML_VV8_ISNEQ:
        case ML_VV8_ISLT:
        case ML_VV8_ISLTE:
          ASSERT_LOG2('(todo) vv8', pc);
          pc += SIZEOF_VV8;
          break;

        case ML_8VV_ISLT:
          cutIsLt(ml, pc, SIZEOF_8VV, 1, 2, 2);
          break;
        case ML_8VV_ISLTE:
          cutIsLte(ml, pc, SIZEOF_8VV, 1, 2, 2);
          break;

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
          return ml_throw(ml, pc, 'constraints with <= 1 var should be eliminated');

        case ML_8V_SUM:
          cutSum(ml, pc);
          break;

        case ML_PRODUCT:
          ASSERT_LOG2('(todo) p', pc);
          let plen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_COUNT + plen * 2 + 2;
          break;

        case ML_VV_AND:
          return ml_throw(ml, pc, 'ands should be solved and eliminated');
        case ML_VV_OR:
          cutOr();
          break;
        case ML_VV_XOR:
          cutXor();
          break;
        case ML_VV_NAND:
          cutNand();
          break;
        case ML_VV_XNOR:
          cutXnor();
          break;

        case ML_START:
          if (pc !== 0) return ml_throw(ml, pc, ' ! compiler problem @', pcStart);
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
          //console.error('(cut) unknown op', pc,' at', pc,'ctrl+c now or log will fill up');
          //while (true) console.log('beep');
          ml_throw(ml, pc, '(cut) unknown op', pc);
      }
    }
    if (emptyDomain) {
      ASSERT_LOG2('Ended up with an empty domain');
      return;
    }
    ASSERT_LOG2('the implicit end; ml desynced');
    THROW('ML OOB');
  }
}

// BODY_STOP

export {
  cutter,
};
