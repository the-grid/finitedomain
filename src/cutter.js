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
  SIZEOF_COUNT,
  SIZEOF_C8,

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
  BOUNTY_NOT_BOOLY,

  BOUNTY_ISALL_RESULT,
  BOUNTY_LTE_LHS,
  BOUNTY_LTE_RHS,
  BOUNTY_NALL,
  BOUNTY_NAND,
  BOUNTY_NEQ,

  bounty_collect,
  bounty_getCounts,
  bounty_getMeta,
  bounty_getOffset,
  bounty_markVar,
} from './bounty';


// BODY_START

function cutter(ml, vars, domains, addAlias, getAlias, solveStack) {
  ASSERT_LOG2('\n ## cutter', ml);
  let pc = 0;

  let bounty;

  let lenBefore;
  let emptyDomain = false;
  let removed;
  let loops = 0;
  do {
    ASSERT_LOG2(' # start cutter outer loop', loops);
    bounty = bounty_collect(ml, vars, domains, getAlias, bounty);
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

    let countsA = bounty_getCounts(bounty, indexA);
    let countsB = bounty_getCounts(bounty, indexB);

    ASSERT_LOG2(' - cutNeq', indexA, '!=', indexB, 'counts:', countsA, countsB, ', meta:', bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsA === 2) {
      let metaA = bounty_getMeta(bounty, indexA);
      if ((metaA & BOUNTY_LTE_LHS) && trickNeqLteLhs(indexA, pc, 'neq')) return;
      if ((metaA & BOUNTY_LTE_RHS) && trickNeqLteRhs(indexA, pc, 'neq')) return;
    }

    if (countsB === 2) {
      let metaB = bounty_getMeta(bounty, indexB);
      if ((metaB & BOUNTY_LTE_LHS) && trickNeqLteLhs(indexB, pc, 'neq')) return;
      if ((metaB & BOUNTY_LTE_RHS) && trickNeqLteRhs(indexB, pc, 'neq')) return;
    }

    pc += SIZEOF_VV;
  }

  function cutLt() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));

    let countsA = bounty_getCounts(bounty, indexA);
    let countsB = bounty_getCounts(bounty, indexB);

    ASSERT_LOG2(' - cutLt', indexA, '<', indexB, 'counts:', countsA, countsB, ', meta:', bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsA === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsB === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    pc += SIZEOF_VV;
  }

  function cutLte() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));

    let countsA = bounty_getCounts(bounty, indexA);
    let countsB = bounty_getCounts(bounty, indexB);

    ASSERT_LOG2(' - cutLte', indexA, '<=', indexB, 'counts:', countsA, countsB, ', meta:', bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsA === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut lte A;', indexA, '<=', indexB, '  ->  ', domain__debug(domains[indexA]), '<=', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        domains[indexA] = domain_removeGtUnsafe(A, vB);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexA));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = indexA + ' <= ' + indexB));
      ml_eliminate(ml, pc, SIZEOF_VV);
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsB === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut lte B;', indexA, '<=', indexB, '  ->  ', domain__debug(domains[indexA]), '<=', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let B = domains[indexB];
        domains[indexB] = domain_removeLtUnsafe(B, vA);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexB));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${indexA} <= ${indexB}`));
      ml_eliminate(ml, pc, SIZEOF_VV);
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsA === 2) {
      let metaA = bounty_getMeta(bounty, indexA);
      if ((metaA & BOUNTY_NAND) && trickNandLteLhs(indexA, pc, 'lte')) return;
      if ((metaA & BOUNTY_ISALL_RESULT) && trickIsallLteLhs(indexA, pc, 'lte')) return;
      // note: if it wasnt 2x lte then the flag would contain, at least, another flag as well.
      if (metaA === (BOUNTY_LTE_LHS | BOUNTY_NOT_BOOLY) && trickLteLhsTwice(indexA, pc, 'lte', metaA)) return;
      if ((metaA & BOUNTY_NEQ) && trickNeqLteLhs(indexA, pc, 'lte')) return;
    }

    if (countsB === 2) {
      let metaB = bounty_getMeta(bounty, indexB);
      if ((metaB & BOUNTY_ISALL_RESULT) && trickIsallLteRhs(indexB, pc, 'lte')) return;
      if ((metaB & BOUNTY_NEQ) && trickNeqLteRhs(indexB, pc, 'lte')) return;
    }

    pc += SIZEOF_VV;
  }

  function cutIsEq(ml, offset, sizeof, lenB) {
    ASSERT(1 + 2 + lenB + 2 === sizeof, 'expecting this sizeof');
    let indexA;
    let indexB;
    let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + lenB));
    let countsR = bounty_getCounts(bounty, indexR);

    ASSERT(!void (indexA = getFinalIndex(ml_dec16(ml, offset + 1))));
    ASSERT(!void (indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + 2) : getFinalIndex(ml_dec16(ml, offset + 1 + 2))));
    ASSERT_LOG2(' - cutIsEq', indexR, '=', indexA, '==?', indexB, 'counts:', countsR, bounty_getCounts(bounty, indexA), bounty_getCounts(bounty, indexB), ', meta:', bounty_getMeta(bounty, indexR), bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsR === 1) {
      indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + 2) : getFinalIndex(ml_dec16(ml, offset + 1 + 2));
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut iseq R;', indexR, '=', indexA, '==?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '==?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = lenB === 1 ? indexB : force(indexB);
        let matches = vA === vB ? 1 : 0;
        ASSERT(domain_min(domains[indexR]) === 0 && domain_max(domains[indexR]) > 0, 'A B and R should already have been reduced to domains that are valid within A==?B=R', vA, vB, matches, domain__debug(domains[indexR]));
        domains[indexR] = matches ? domain_removeValue(domains[indexR], 0) : domain_createValue(0);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${indexR} = ${indexA} ==? ${indexB}`));
      ml_eliminate(ml, pc, sizeof);
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      bounty_markVar(bounty, indexR);
      return;
    }

    // note: A can not be a constant because we normalize iseq args that way
    if (lenB === 1) {
      indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      let countsA = bounty_getCounts(bounty, indexA);
      if (countsA === 1) {
        // A is leaf, B is constant, cut the constraint, A can reflect B and C afterwards
        // we assume that A contains a valid value for B and both cases C=0 and C=1
        let A = domains[indexA];
        let vB = ml_dec8(ml, offset + 1 + 2);

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
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexR);
        return;
      }
    }

    pc = offset + sizeof;
  }

  function cutIsNeq(ml, offset, sizeof, lenB) {
    ASSERT(1 + 2 + lenB + 2 === sizeof, 'expecting this sizeof');
    let indexA;
    let indexB;
    let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + lenB));
    let countsR = bounty_getCounts(bounty, indexR);

    ASSERT(!void (indexA = getFinalIndex(ml_dec16(ml, offset + 1))));
    ASSERT(!void (indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + 2) : getFinalIndex(ml_dec16(ml, offset + 1 + 2))));
    ASSERT_LOG2(' - cutIsNeq', indexR, '=', indexA, '!=?', indexB, 'counts:', countsR, bounty_getCounts(bounty, indexA), bounty_getCounts(bounty, indexB), ', meta:', bounty_getMeta(bounty, indexR), bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsR === 1) {
      indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + 2) : getFinalIndex(ml_dec16(ml, offset + 1 + 2));

      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(domains => {
        ASSERT_LOG2(' - cut isneq R;', indexR, '=', indexA, '!=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '!=?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = lenB === 1 ? indexB : force(indexB);
        let vR = vA !== vB ? 1 : 0;
        ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A!=?B=R', vA, vB, vR, domain__debug(domains[indexR]));
        domains[indexR] = domain_createValue(vR);
      });
      ASSERT(!void (solveStack[solveStack.length - 1]._target = indexR));
      ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${indexR} = ${indexA} !=? ${indexB}`));

      ml_eliminate(ml, pc, sizeof);
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      bounty_markVar(bounty, indexR);
      return;
    }

    if (lenB === 1) {
      indexA = getFinalIndex(ml_dec16(ml, offset + 1));
      let countsA = bounty_getCounts(bounty, indexA);
      if (countsA === 1) {
        // A is leaf, B is constant, cut the constraint, A can reflect B and C afterwards
        // we assume that A contains a valid value for B and both cases C=0 and C=1
        let A = domains[indexA];
        let vB = ml_dec8(ml, offset + 1 + 2);

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
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexR);
        return;
      }
    }

    pc = offset + sizeof;
  }

  function cutIsLt(ml, offset, sizeof, lenA, lenB) {
    ASSERT(1 + 2 + lenB + 2 === sizeof, 'expecting this sizeof');
    let indexA;
    let indexB;
    let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + lenA + lenB));
    let countsR = bounty_getCounts(bounty, indexR);

    ASSERT(!void (indexA = lenA === 1 ? ml_dec8(ml, offset + 1) : getFinalIndex(ml_dec16(ml, offset + 1))));
    ASSERT(!void (indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA))));
    ASSERT_LOG2(' - cutIsLt', indexR, '=', indexA, '<?', indexB, 'counts:', countsR, bounty_getCounts(bounty, indexA), bounty_getCounts(bounty, indexB), ', meta:', bounty_getMeta(bounty, indexR), bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsR === 1) {
      indexA = lenA === 1 ? ml_dec8(ml, offset + 1) : getFinalIndex(ml_dec16(ml, offset + 1));
      indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA));

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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      bounty_markVar(bounty, indexR);
      return;
    }

    if (lenB === 1) {
      indexA = lenA === 1 ? ml_dec8(ml, offset + 1) : getFinalIndex(ml_dec16(ml, offset + 1));
      let countsA = bounty_getCounts(bounty, indexA);
      if (countsA === 1) {
        // A is leaf, B is constant, cut the constraint, A can reflect B and C afterwards
        // we assume that A contains a valid value for B and both cases C=0 and C=1
        let A = domains[indexA];
        let vB = ml_dec8(ml, offset + 1 + lenA);

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
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexR);
        return;
      }
    }

    if (lenA === 1) {
      indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA));
      let countsB = bounty_getCounts(bounty, indexB);
      if (countsB === 1) {
        // B is leaf, A is constant, cut the constraint, B can reflect A and C afterwards
        // we assume that B contains a valid value for A and both cases C=0 and C=1
        let B = domains[indexB];
        let vA = ml_dec8(ml, offset + 1);

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
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexR);
        return;
      }
    }

    pc = offset + sizeof;
  }

  function cutIsLte(ml, offset, sizeof, lenA, lenB) {
    ASSERT(1 + 2 + lenB + 2 === sizeof, 'expecting this sizeof');
    let indexA;
    let indexB;
    let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + lenA + lenB));
    let countsR = bounty_getCounts(bounty, indexR);

    ASSERT(!void (indexA = lenA === 1 ? ml_dec8(ml, offset + 1) : getFinalIndex(ml_dec16(ml, offset + 1))));
    ASSERT(!void (indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA))));
    ASSERT_LOG2(' - cutIsLte', indexR, '=', indexA, '<=?', indexB, 'counts:', countsR, bounty_getCounts(bounty, indexA), bounty_getCounts(bounty, indexB), ', meta:', bounty_getMeta(bounty, indexR), bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsR === 1) {
      indexA = lenA === 1 ? ml_dec8(ml, offset + 1) : getFinalIndex(ml_dec16(ml, offset + 1));
      indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA));

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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      bounty_markVar(bounty, indexR);
      return;
    }

    if (lenB === 1) {
      indexA = lenA === 1 ? ml_dec8(ml, offset + 1) : getFinalIndex(ml_dec16(ml, offset + 1));
      let countsA = bounty_getCounts(bounty, indexA);
      if (countsA === 1) {
        // A is leaf, B is constant, cut the constraint, A can reflect B and C afterwards
        // we assume that A contains a valid value for B and both cases C=0 and C=1
        let A = domains[indexA];
        let vB = ml_dec8(ml, offset + 1 + lenA);

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
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexR);
        return;
      }
    }

    if (lenA === 1) {
      indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : getFinalIndex(ml_dec16(ml, offset + 1 + lenA));
      let countsB = bounty_getCounts(bounty, indexB);
      if (countsB === 1) {
        // B is leaf, A is constant, cut the constraint, B can reflect A and C afterwards
        // we assume that B contains a valid value for A and both cases C=0 and C=1
        let B = domains[indexB];
        let vA = ml_dec8(ml, offset + 1);

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
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexR);
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
    ASSERT_LOG2('   - indexR=', indexR, 'counts:', bounty_getCounts(bounty, indexR), 'meta:', bounty_getMeta(bounty, indexR));
    if (cutPlusR(offset, indexR)) return;
    if (cutPlusAB(offset, indexR, 'A', 1, 'B', 1 + 2)) return;
    if (cutPlusAB(offset, indexR, 'B', 1 + 2, 'A', 1)) return;
    pc = offset + SIZEOF_VVV;
  }
  function cutPlusR(offset, indexR) {
    let countsR = bounty_getCounts(bounty, indexR);
    ASSERT_LOG2(' - cutPlusR', offset, indexR, 'count=', countsR);
    if (countsR === 1) {
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
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexR);
        return true;
      }

      if (domain_isBool(A) && domain_isBool(B)) {
        if (R === domain_createRange(1, 2)) {
          ASSERT_LOG2('   - leaf R; [12]=[01]+[01] is actually an OR');
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
          bounty_markVar(bounty, indexR);
          return true;
        }

        if (domain_isBool(R)) {
          ASSERT_LOG2('   - leaf R; [01]=[01]+[01] is actually a NAND');
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
          bounty_markVar(bounty, indexR);
          return true;
        }
      }
    }

    if (countsR === 2) {
      // scan for pattern (R = A+B) & (S = R==?2) -> S = isAll(A B) when A and B are strict bools. a bit tedious to scan for but worth it.
      // (TODO: more generically it applies when all args to the plus/sum are size=2 and booly)
      let offset1 = bounty_getOffset(bounty, indexR, 0);
      let offset2 = bounty_getOffset(bounty, indexR, 1);
      let otherOffset = offset1 === offset ? offset2 : offset1;
      ASSERT(offset1 && offset2 && (offset1 === offset || offset2 === offset), 'if there were two counts Bounty should have collected two offsets for it');
      if (ml_dec8(ml, otherOffset) === ML_V8V_ISEQ && getFinalIndex(ml_dec16(ml, otherOffset + 1)) === indexR && ml_dec8(ml, otherOffset + 3) === 2) {
        // okay the "other side" is checking whether the result is 2 so if the two plus args are bools we can reduce

        let indexA = getFinalIndex(ml_dec16(ml, offset + 1));
        let indexB = getFinalIndex(ml_dec16(ml, offset + 1 + 2));
        let A = domains[indexA];
        let B = domains[indexB];

        ASSERT_LOG2(' ->', domain__debug(domains[indexR]), '=', domain__debug(A), '+', domain__debug(B));
        if (domain_isBool(A) && domain_isBool(B)) {
          ASSERT_LOG2(' - found isAll pattern, rewriting plus and eliminating isEq');
          // match. rewrite plus isAll and remove the isEq. adjust counts accordingly
          let indexS = getFinalIndex(ml_dec16(ml, otherOffset + 1 + 2 + 1)); // other op is a v8v_isEq and we want its R
          ASSERT(domain_isBool(domains[indexS]), 'S should be a bool');

          solveStack.push(domains => {
            ASSERT_LOG2(' - cut plus -> isAll; ', indexR, '= isAll(', indexA, ',', indexB, ')  ->  ', domain__debug(domains[indexR]), ' = isAll(', domain__debug(domains[indexA]), ',', domain__debug(domains[indexB]), ')');
            ASSERT(domain_min(domains[indexR]) === 0 && domain_max(domains[indexR]) === 2, 'R should have all values');
            domains[indexR] = domain_createValue(force(indexA) + force(indexB));
          });

          // for the record, _this_ is why ML_ISALL2 exists at all. we cant use ML_ISALL because it has a larger footprint than ML_PLUS
          // TODO: this was before recycling was a thing. we will soon remove isall2 and use recycling instead
          ml_vvv2vvv(ml, offset, ML_ISALL2, indexA, indexB, indexS);
          ml_eliminate(ml, otherOffset, SIZEOF_V8V);
          // R=A+B, S=R==?2  ->  S=isall(A,B). so only the count for R is reduced
          bounty_markVar(bounty, indexR);
        }
      }
    }

    return false;
  }
  function cutPlusAB(offset, indexR, X, deltaX, Y, deltaY) {
    ASSERT_LOG2(' - _cutPlusAB:', X, Y, offset, indexR, deltaX, deltaY);
    let indexA = getFinalIndex(ml_dec16(ml, offset + deltaX));
    let countsA = bounty_getCounts(bounty, indexA);
    if (countsA === 1) {
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
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexR);
        return true;
      }
    }
    return false;
  }

  function cutSum(ml, offset) {
    let len = ml_dec16(ml, pc + 1);
    ASSERT(len > 2, 'should have at least three args or otherwise the minifier would have morphed it');

    let indexR = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1 + len * 2));
    let countsR = bounty_getCounts(bounty, indexR);

    if (countsR === 1) {
      let allBool = true; // all args [01]? used later
      let C = ml_dec8(ml, offset + 1 + 2); // constant
      let lo = C;
      let hi = C;
      for (let i = 0; i < len; ++i) {
        let index = getFinalIndex(ml_dec16(ml, offset + SIZEOF_C8 + i * 2));
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
          let index = getFinalIndex(ml_dec16(ml, offset + SIZEOF_C8 + i * 2));
          args.push(index);
          bounty_markVar(bounty, index);
        }

        ASSERT_LOG2('   - R is a leaf var that wraps all bounds', indexR, args, domain__debug(R));
        solveStack.push(domains => {
          ASSERT_LOG2(' - cut plus R;', indexR, args, domain__debug(R));
          let vR = C + args.map(force).reduce((a, b) => a + b);
          ASSERT(Number.isInteger(vR), 'should be integer result');
          ASSERT(domain_containsValue(domains[indexR], vR), 'R should already have been reduced to a domain that is valid within any outcome of the sum', vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        });

        ml_eliminate(ml, pc, SIZEOF_C8 + len * 2 + 2);
        bounty_markVar(bounty, indexR); // args already done in above loop
        return;
      }

      // if R is [0, n-1] and all args are [0, 1] then rewrite to a NALL
      if (allBool && lo === 0 && R === domain_createRange(0, hi - 1)) {
        // collect the arg indexes (kind of dupe loop but we'd rather not make an array prematurely)
        let args = [];
        for (let i = 0; i < len; ++i) {
          let index = getFinalIndex(ml_dec16(ml, offset + 1 + 2 + 1 + i * 2));
          args.push(index);
          bounty_markVar(bounty, index);
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
          ml_enc16(ml, offset + SIZEOF_COUNT + i * 2, args[i]);
        }
        ml_jump(ml, offset + SIZEOF_COUNT + len * 2, 3); // result var (16bit) and the constant (8bit). for the rest nall is same as sum
        bounty_markVar(bounty, indexR); // args already done in above loop
        return;
      }
    }

    if (countsR === 2) {
      let C = ml_dec8(ml, offset + 1 + 2); // constant
      // scan for pattern (R = sum(A B C) & (S = R==?3) -> S = isAll(A B C). a bit tedious to scan for but worth it.
      let offset1 = bounty_getOffset(bounty, indexR, 0);
      let offset2 = bounty_getOffset(bounty, indexR, 1);
      let otherOffset = offset1 === offset ? offset2 : offset1;
      ASSERT(otherOffset > 0, 'offset should exist and cant be the first op');
      if (ml_dec8(ml, otherOffset) === ML_V8V_ISEQ && getFinalIndex(ml_dec16(ml, otherOffset + 1)) === indexR && ml_dec8(ml, otherOffset + 3) === (C + len)) {
        // okay the "other side" is checking whether the result is max so if all the args are bools we can reduce

        let args = [];
        let allBools = true;
        for (let i = 0; i < len; ++i) {
          let index = getFinalIndex(ml_dec16(ml, offset + SIZEOF_C8 + i * 2));
          let domain = domains[index];
          if (!domain_isBool(domain)) {
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
            ml_enc16(ml, offset + SIZEOF_COUNT + i * 2, ml_dec16(ml, offset + SIZEOF_C8 + i * 2));
          }
          ml_enc16(ml, offset + SIZEOF_COUNT + len * 2, indexS);
          ml_jump(ml, offset + SIZEOF_COUNT + len * 2 + 2, SIZEOF_C8 - SIZEOF_COUNT); // the difference in op footprint is the 8bit constant

          // remove the iseq, regardless
          ml_eliminate(ml, otherOffset, SIZEOF_V8V);

          // R=sum(args), S=R==?2  ->  S=isall(args). so only the count for R is reduced
          bounty_markVar(bounty, indexR);
          return;
        }
      }
    }

    pc += SIZEOF_C8 + len * 2 + 2;
  }

  function cutOr() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));

    let countsA = bounty_getCounts(bounty, indexA);
    let countsB = bounty_getCounts(bounty, indexB);

    ASSERT_LOG2(' - cutOr', indexA, '|', indexB, 'counts:', countsA, countsB, ', meta:', bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsA === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsB === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    pc += SIZEOF_VV;
  }

  function cutXor() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));

    let countsA = bounty_getCounts(bounty, indexA);
    let countsB = bounty_getCounts(bounty, indexB);

    ASSERT_LOG2(' - cutXor', indexA, '^', indexB, 'counts:', countsA, countsB, ', meta:', bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsA === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsB === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    pc += SIZEOF_VV;
  }

  function cutNand() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));

    let countsA = bounty_getCounts(bounty, indexA);
    let countsB = bounty_getCounts(bounty, indexB);

    ASSERT_LOG2(' - cutNand', indexA, '!&', indexB, 'counts:', countsA, countsB, ', meta:', bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsA === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsB === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsA === 2) {
      let metaA = bounty_getMeta(bounty, indexA);
      if ((metaA & BOUNTY_LTE_LHS) && trickNandLteLhs(indexA, pc, 'nand')) return;
      if ((metaA & BOUNTY_ISALL_RESULT) && trickNandIsall(indexA, pc, 'nand')) return;
    }

    if (countsB === 2) {
      let metaB = bounty_getMeta(bounty, indexB);
      if ((metaB & BOUNTY_LTE_LHS) && trickNandLteLhs(indexB, pc, 'nand')) return;
      if ((metaB & BOUNTY_ISALL_RESULT) && trickNandIsall(indexB, pc, 'nand')) return;
    }

    pc += SIZEOF_VV;
  }

  function cutXnor() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));

    let countsA = bounty_getCounts(bounty, indexA);
    let countsB = bounty_getCounts(bounty, indexB);

    ASSERT_LOG2(' - cutXnor', indexA, '!^', indexB, 'counts:', countsA, countsB, ', meta:', bounty_getMeta(bounty, indexA), bounty_getMeta(bounty, indexB));

    if (countsA === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    if (countsB === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      return;
    }

    let metaA = bounty_getMeta(bounty, indexA);
    let metaB = bounty_getMeta(bounty, indexB);
    let boolyA = !(metaA & BOUNTY_NOT_BOOLY);
    let boolyB = !(metaB & BOUNTY_NOT_BOOLY);
    if (boolyA || boolyB) {
      // A or B is only used as a boolean (in the zero-nonzero sense, not strictly 0,1)
      // the xnor basically says that if one is zero the other one is too, and otherwise neither is zero
      // cominbing that with the knowledge that both vars are only used for zero-nonzero, one can be
      // considered a pseudo-alias for the other. we replace it with the other var and defer solving it.
      // when possible, pick a strictly boolean domain because it's more likely to allow new tricks.
      // note that for the bool, the actual value is irrelevant. whether it's 1 or 5, the ops will
      // normalize this to zero and non-zero anyways. and by assertion there are no other ops.

      ASSERT_LOG2(' - found bool-eq in a xnor:', indexA, '!^', indexB, '->', metaA, metaB);

      // ok, a little tricky, but we're going to consider the bool to be a full alias of the other var
      // only when creating a solution, we will override the value and apply the boolean-esque value
      // to the bool var and assign it either its zero or nonzero value.

      let indexE = indexB;
      let indexK = indexA;
      if (!boolyB || (boolyA && domain_isBool(domains[indexA]))) { // if A wasnt booly use B, otherwise A must be booly
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
      // we can add the count of E to that of K and subtract two for eliminating this constraint (due to alias is now identity hence -2)
      bounty_markVar(bounty, indexK);
      bounty_markVar(bounty, indexE);
      return;
    }

    pc += SIZEOF_VV;
  }

  function cutIsAll() {
    let len = ml_dec16(ml, pc + 1);
    let indexR = getFinalIndex(ml_dec16(ml, pc + SIZEOF_COUNT + len * 2));
    let countsR = bounty_getCounts(bounty, indexR);

    ASSERT_LOG2(' - cutIsAll', indexR, '->', countsR, 'x');

    if (countsR === 1) {
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
      bounty_markVar(bounty, indexR);
      for (let i = 0; i < len; ++i) {
        bounty_markVar(bounty, args[i]);
      }

      return;
    }

    if (countsR === 2) {
      let metaR = bounty_getMeta(bounty, indexR);
      if ((metaR & BOUNTY_LTE_LHS) && trickIsallLteLhs(indexR, pc, 'isall')) return;
      if ((metaR & BOUNTY_LTE_RHS) && trickIsallLteRhs(indexR, pc, 'isall')) return;
      if ((metaR & BOUNTY_NALL) && trickIsallNall(indexR, pc, 'isall')) return;
      if ((metaR & BOUNTY_NAND) && trickNandIsall(indexR, pc, 'isall')) return;
    }

    pc += SIZEOF_COUNT + len * 2 + 2;
  }

  function cutIsAll2() {
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    let countsR = bounty_getCounts(bounty, indexR);

    ASSERT_LOG2(' - cutIsAll2', indexR, '->', countsR, 'x');

    if (countsR === 1) {
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
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      bounty_markVar(bounty, indexR);
      return;
    }

    if (countsR === 2) {
      let metaR = bounty_getMeta(bounty, indexR);
      if ((metaR & BOUNTY_LTE_LHS) && trickIsallLteLhs(indexR, pc, 'isall')) return;
      if ((metaR & BOUNTY_LTE_RHS) && trickIsallLteRhs(indexR, pc, 'isall')) return;
      if ((metaR & BOUNTY_NALL) && trickIsallNall(indexR, pc, 'isall')) return;
      if ((metaR & BOUNTY_NAND) && trickNandIsall(indexR, pc, 'isall')) return;
    }

    pc += SIZEOF_VVV;
  }

  function cutIsNall() {
    let len = ml_dec16(ml, pc + 1);
    let indexR = getFinalIndex(ml_dec16(ml, pc + SIZEOF_COUNT + len * 2));
    let countsR = bounty_getCounts(bounty, indexR);

    ASSERT_LOG2(' - cutIsNall', indexR, '->', countsR, 'x');

    if (countsR === 1) {
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
      bounty_markVar(bounty, indexR);
      for (let i = 0; i < len; ++i) {
        bounty_markVar(bounty, args[i]);
      }
      return;
    }

    pc += SIZEOF_COUNT + len * 2 + 2;
  }

  function cutNall() {
    let len = ml_dec16(ml, pc + 1);

    for (let i = 0; i < len; ++i) {
      let index = ml_dec16(ml, pc + 3 + i * 2);
      let countsi = bounty_getCounts(bounty, index);

      if (countsi === 2) {
        let meta = bounty_getMeta(bounty, index);
        if ((meta & BOUNTY_ISALL_RESULT) && trickIsallNall(index, pc, 'nall')) return;
      }
    }

    pc += SIZEOF_COUNT + len * 2;
  }

  function trickLteLhsTwice(varIndex, offset, meta) {
    let offset1 = bounty_getOffset(bounty, varIndex, 0);
    let offset2 = bounty_getOffset(bounty, varIndex, 1);
    ASSERT(offset === offset1 || offset === offset2, 'expecting current offset to be one of the two offsets found', offset, varIndex, meta);

    // this var gets marked whether we return true or false so do it immediately
    bounty_markVar(bounty, varIndex);

    ASSERT_LOG2('trickLteLhsTwice', varIndex, 'at', offset, 'and', offset1, '/', offset2, 'metaFlags:', meta);

    if (offset !== offset1 && ml_dec8(ml, offset1) !== ML_VV_LTE) {
      ASSERT_LOG2(' - offset1 wasnt lte');
      return false;
    }

    if (offset !== offset2 && ml_dec8(ml, offset2) !== ML_VV_LTE) {
      ASSERT_LOG2(' - offset2 wasnt lte');
      return false;
    }

    if (ml_dec16(ml, offset1 + 1) !== varIndex) {
      ASSERT_LOG2(' - indexA of 1 wasnt the shared index');
      return false;
    }

    if (ml_dec16(ml, offset1 + 1) !== varIndex) {
      ASSERT_LOG2(' - indexA of 2 wasnt the shared index');
      return false;
    }

    let indexB1 = getFinalIndex(ml_dec16(ml, offset1 + 3));
    let indexB2 = getFinalIndex(ml_dec16(ml, offset2 + 3));

    if (domain_max(domains[indexB1]) > 1 || domain_max(domains[indexB2]) > 1) {
      ASSERT_LOG2(' - only works on boolean domains'); // well not only, but there are some edge cases otherwise
      return false;
    }

    // okay, two lte with the left being the shared index
    // the shared index is a leaf var, eliminate them both

    ml_eliminate(ml, offset1, SIZEOF_VV);
    ml_eliminate(ml, offset2, SIZEOF_VV);

    ASSERT_LOG2(' - A is a leaf constraint, defer it', varIndex);

    solveStack.push(domains => {
      ASSERT_LOG2(' - 2xlte;1;', varIndex, '!&', indexB1, '  ->  ', domain__debug(domains[varIndex]), '<=', domain__debug(domains[indexB1]));
      ASSERT_LOG2(' - 2xlte;2;', varIndex, '!&', indexB2, '  ->  ', domain__debug(domains[varIndex]), '<=', domain__debug(domains[indexB2]));

      domains[varIndex] = domain_removeGtUnsafe(domain_removeGtUnsafe(domains[varIndex], force(indexB1)), force(indexB2));
    });

    bounty_markVar(bounty, indexB1);
    bounty_markVar(bounty, indexB2);
    return true;
  }

  function trickIsallLteRhs(varIndex, offset, forOp) {
    let offset1 = bounty_getOffset(bounty, varIndex, 0);
    let offset2 = bounty_getOffset(bounty, varIndex, 1);
    ASSERT(offset === offset1 || offset === offset2, 'expecting current offset to be one of the two offsets found', offset, varIndex);

    ASSERT_LOG2('trickIsallLteRhs', varIndex, forOp, 'at', offset, '->', offset1, offset2);

    bounty_markVar(bounty, varIndex); // this happens for any code branch

    return _trickIsallLteRhs(varIndex, (forOp === 'lte' && offset === offset1) ? offset1 : offset2, (forOp !== 'lte' && offset === offset1) ? offset1 : offset2);
  }
  function _trickIsallLteRhs(varIndex, lteOffset, isallOffset) {
    // we can replace an isall and lte with ltes on the args of the isall
    // B = isall(C D), A <= B  ->   A <= C, A <= D
    // (where B is sharedVarIndex)
    // if A turns out to be a leaf var for only being lte_lhs then
    // everything will dissolve through another trick function
    // (only) the isall args are assumed to be booly (containing both zero and non-zero)
    // A <= B meaning A is 0 when B is 0. B is 0 when C or D is 0 and non-zero
    // otherwise. so A <= C or A <= D should force A to match A <= B.

    // first check whether the offsets are still valid (an lte_lhs trick may have removed/updated the lte for example)

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) !== ML_VV_LTE) {
      ASSERT_LOG2(' - no longer lte. bailing.');
      return false;
    }

    if (ml_dec16(ml, lteOffset + 3) !== varIndex) {
      ASSERT_LOG2(' - shared var was not rhs of the lte');
      return false;
    }

    let indexA = getFinalIndex(ml_dec16(ml, lteOffset + 1));

    ASSERT_LOG2(' - checking isall offset', ml_dec8(ml, isallOffset) === ML_ISALL, ', indexA =', indexA);
    // there are two isalls, need special paths because of different footprints
    if (ml_dec8(ml, isallOffset) === ML_ISALL) {
      let len = ml_dec16(ml, isallOffset + 1);

      if (ml_dec16(ml, isallOffset + SIZEOF_COUNT + len * 2) !== varIndex) {
        ASSERT_LOG2(' - shared var was not result var of the isall');
        return false;
      }

      ASSERT_LOG2(' - rewriting B=isall(C D), A <= B  ->  A <= C, A <= D');

      // 2 ltes fit perfectly in the space we have available
      if (len === 2) {
        let left = getFinalIndex(ml_dec16(ml, isallOffset + 3));
        let right = getFinalIndex(ml_dec16(ml, isallOffset + 5));

        // validate domains. for now, only apply the trick on strict bools [0 1]. only required for the isall args.
        ASSERT_LOG2(' - confirming all targeted vars are strict bools', domain__debug(domains[indexA]), domain__debug(domains[left]), domain__debug(domains[right]));
        if (domain_isBool(domains[left]) && domain_isBool(domains[right])) {
          // compile A<=left and A<=right over the existing two offsets
          ml_vv2vv(ml, lteOffset, ML_VV_LTE, indexA, left);
          ml_cr2vv(ml, isallOffset, len, ML_VV_LTE, indexA, right);

          // must mark all affected vars. their bounty data is probably obsolete now.
          bounty_markVar(bounty, indexA);
          bounty_markVar(bounty, left); // C
          bounty_markVar(bounty, right); // D

          return trickIsallLteRhsDeferShared(varIndex, indexA);
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

        // confirm all isall args are bool
        for (let i = 0; i < len; ++i) {
          let indexB = getFinalIndex(ml_dec16(ml, isallOffset + SIZEOF_COUNT + i * 2));
          if (domain_max(domains[indexB]) > 1) {
            ASSERT_LOG2('     - not all isall args are bool so bailing this morph');
            return false;
          }
        }

        let recycleOffset;
        let currentSize = 0;
        for (let i = 0; i < len; ++i) {
          ASSERT_LOG2('   - Compiling an lte to offset=', recycleOffset, 'with remaining size=', currentSize);
          if (currentSize < SIZEOF_VV) {
            recycleOffset = bin.pop(); // note: doing it backwards means we may not deplete the bin if the last space can host more lte's than were left to assign in the last loop. but that's fine either way.
            currentSize = ml_getOpSizeSlow(ml, recycleOffset);
            ASSERT_LOG2('   - Fetched next space from bin; offset=', recycleOffset, 'with size=', currentSize);
          }
          let indexB = ml_dec16(ml, isallOffset + SIZEOF_COUNT + i * 2);
          ASSERT_LOG2('- Compiling LTE in recycled space', recycleOffset, 'on AB', indexA, indexB);
          ml_recycleVV(ml, recycleOffset, ML_VV_LTE, indexA, indexB);
          recycleOffset += SIZEOF_VV;
          currentSize -= SIZEOF_VV;
          bounty_markVar(bounty, indexB);

          ASSERT(!void ml_validateSkeleton(ml), 'just making sure the recycle didnt screw up');
        }

        // TODO: we could recycle these addresses immediately. slightly more efficient and may cover the edge case where there otherwise wouldnt be enough space.
        ml_eliminate(ml, isallOffset, SIZEOF_COUNT + len * 2 + 2);
        ml_eliminate(ml, lteOffset, SIZEOF_VV);

        // the other vars were marked in the last loop
        bounty_markVar(bounty, indexA);

        ASSERT(!void ml_validateSkeleton(ml), 'just making sure the recycle didnt screw up');
        return trickIsallLteRhsDeferShared(varIndex, indexA);
      }
    }

    ASSERT_LOG2(' - checking isall offset for other op', ml_dec8(ml, isallOffset) === ML_ISALL2, ', indexA =', indexA);
    if (ml_dec8(ml, isallOffset) === ML_ISALL2) {
      if (ml_dec16(ml, isallOffset + 5) !== varIndex) {
        ASSERT_LOG2(' - shared var was not result var of the isall, this is probably an old addr');
        return false;
      }
      let left = getFinalIndex(ml_dec16(ml, isallOffset + 1));
      let right = getFinalIndex(ml_dec16(ml, isallOffset + 3));

      // validate domains. for now, only apply the trick on strict bools [0 1] for the isall args
      ASSERT_LOG2(' - confirming all targeted vars are strict bools', domain__debug(domains[indexA]), domain__debug(domains[left]), domain__debug(domains[right]));
      if (domain_isBool(domains[left]) && domain_isBool(domains[right])) {
        // compile A<=left and A<=right over the existing two offsets
        ml_vv2vv(ml, lteOffset, ML_VV_LTE, varIndex, left);
        ml_vvv2vv(ml, isallOffset, ML_VV_LTE, varIndex, right);
        bounty_markVar(bounty, left);
        bounty_markVar(bounty, right);

        return trickIsallLteRhsDeferShared(varIndex, indexA);
      }
    }

    ASSERT_LOG2(' - was not isall. bailing.');
    return false;
  }
  function trickIsallLteRhsDeferShared(varIndex, lteIndex) {
    // TODO: this has to check the isall args because lte is not strict enough
    ASSERT_LOG2('   - deferring', varIndex, 'will be gt', lteIndex);
    solveStack.push(domains => {
      THROW('fixme');
      ASSERT_LOG2(' - isall + lte;', lteIndex, '<=', varIndex, '  ->  ', domain__debug(domains[lteIndex]), '<=', domain__debug(domains[varIndex]));
      let vA = force(lteIndex);
      domains[varIndex] = domain_removeGtUnsafe(domains[varIndex], vA);
    });
    ASSERT(!void (solveStack[solveStack.length - 1]._target = varIndex));
    ASSERT(!void (solveStack[solveStack.length - 1]._meta = `${lteIndex} <= ${varIndex}`));

    // revisit this op, it is now an lte
    return true;
  }

  function trickIsallLteLhs(varIndex, offset, forOp) {
    let offset1 = bounty_getOffset(bounty, varIndex, 0);
    let offset2 = bounty_getOffset(bounty, varIndex, 1);
    ASSERT(offset === offset1 || offset === offset2, 'expecting current offset to be one of the two offsets found', offset, varIndex);

    ASSERT_LOG2('trickIsallLteLhs', varIndex, forOp, 'at', offset, '->', offset1, offset2);

    bounty_markVar(bounty, varIndex); // happens in any code branch

    // this should be `A <= B, A = all?(C D ...)`. A is a leaf var, the other vars become a nall
    // put the nall in place of the isall. should have sufficient space. eliminate the lte.

    let lteOffset = (forOp === 'lte' && offset === offset1) ? offset1 : offset2;
    let isallOffset = (forOp !== 'lte' && offset === offset1) ? offset1 : offset2;

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) !== ML_VV_LTE) {
      ASSERT_LOG2(' - did not match. bailing');
      return false;
    }

    if (ml_dec16(ml, lteOffset + 1) !== varIndex) {
      ASSERT_LOG2(' - shared var should be left var of the lte but wasnt, this is probably an old addr');
      return false;
    }

    let indexB = getFinalIndex(ml_dec16(ml, lteOffset + 3));

    ASSERT_LOG2(' - checking isall offset', ml_dec8(ml, isallOffset) === ML_ISALL, ', indexA =', indexB);
    if (ml_dec8(ml, isallOffset) === ML_ISALL) {
      let len = ml_dec16(ml, isallOffset + 1);
      if (varIndex !== ml_dec16(ml, isallOffset + 3 + len * 2)) {
        ASSERT_LOG2(' - shared var should be R of isall but wasnt, probably old addr');
        return false;
      }

      ASSERT_LOG2(' - rewriting A <= B, A = isall(C D)  ->  nall(B C D)');
      ASSERT_LOG2(' - collecting', len, 'args and asserting strict boolean domains', domain_isBool(domains[varIndex]), domain__debug(domains[indexB]));

      let args = []; // rare array... but we need the indexes to defer the solution
      for (let i = 0; i < len; ++i) {
        let index = getFinalIndex(ml_dec16(ml, isallOffset + SIZEOF_COUNT + i * 2));
        // only safe on bools (without more thorough complex checks)
        if (!domain_isBool(domains[index])) {
          ASSERT_LOG2(' - at least one arg wasnt bool. bailing');
          return false;
        }
        args.push(index);
      }

      if (domain_isBool(domains[varIndex]) && domain_isBool(domains[indexB])) {
        ASSERT_LOG2(' - ok, eliminating constraints, deferring', varIndex, '= nall(', indexB, args, ') --> ', domain__debug(domains[varIndex]), '= nall(', domain__debug(domains[indexB]), args.map(index => domain__debug(domains[index])), ')');

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

        return trickIsallLteLhsDeferShared(varIndex, indexB, args);
      }
    }

    if (ml_dec8(ml, isallOffset) === ML_ISALL2) {
      ASSERT_LOG2(' - isall2, need to recycle now because isall2 is a vvv (sizeof 7) and we need sizeof 9');

      if (varIndex !== ml_dec16(ml, isallOffset + 5)) {
        ASSERT_LOG2(' - shared var should be R of isall but wasnt, probably old addr');
        return false;
      }

      let leftIndex = getFinalIndex(ml_dec16(ml, isallOffset, 1));
      let rightIndex = getFinalIndex(ml_dec16(ml, isallOffset, 3));

      if (domain_isBool(domains[varIndex]) && domain_isBool(domains[indexB]) && domain_isBool(domains[leftIndex]) && domain_isBool(domains[rightIndex])) {
        ASSERT_LOG2(' - ok, eliminating constraints, deferring', varIndex, '= nall(', indexB, leftIndex, rightIndex, ') --> ', domain__debug(domains[varIndex]), '= nall(', domain__debug(domains[indexB]), domain__debug(domains[leftIndex]), domain__debug(domains[rightIndex]), ')');

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

        return trickIsallLteLhsDeferShared(varIndex, indexB, [leftIndex, rightIndex]);
      }
    }

    ASSERT_LOG2(' - no change');
    return false;
  }
  function trickIsallLteLhsDeferShared(varIndex, indexB, args) {
    ASSERT_LOG2(' - A is a leaf constraint, defer it', varIndex);

    solveStack.push(domains => {
      ASSERT_LOG2(' - isall + lte-lhs;', varIndex, args);
      // if the lte rhs solved to zero, set the shared var to zero
      // otherwise reflect the state if isall on the other args
      if (domain_isZero(domains[indexB])) {
        domains[varIndex] = domain_removeGtUnsafe(domains[varIndex], 0);
      } else {
        let hadZero = false;
        for (let i = 0, len = args.length; i < len + 1; ++i) {
          let index = getFinalIndex(args[i]);
          if (force(index) === 0) {
            domains[varIndex] = domain_removeGtUnsafe(domains[varIndex], 0);
            hadZero = true;
            break;
          }
        }
        if (!hadZero) domains[varIndex] = domain_removeValue(domains[varIndex], 0);
      }
    });

    for (let i = 0, len = args.length; i < len; ++i) {
      bounty_markVar(bounty, args[i]);
    }
    bounty_markVar(bounty, indexB);
    return true;
  }

  function trickNeqLteLhs(varIndex, offset, forOp) {
    let offset1 = bounty_getOffset(bounty, varIndex, 0);
    let offset2 = bounty_getOffset(bounty, varIndex, 1);
    ASSERT(offset === offset1 || offset === offset2, 'expecting current offset to be one of the two offsets found', offset, varIndex);

    bounty_markVar(bounty, varIndex); // happens in any code branch

    // this should be `A <= B, A != C`, morph one constraint into `A | C`, eliminate the other constraint, and defer A

    let lteOffset = (forOp === 'lte' && offset === offset1) ? offset1 : offset2;
    let neqOffset = (forOp !== 'lte' && offset === offset1) ? offset1 : offset2;

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) !== ML_VV_LTE) {
      ASSERT_LOG2(' - op wasnt lte so bailing');
      return false;
    }

    if (ml_dec16(ml, lteOffset + 1) !== varIndex) {
      ASSERT_LOG2(' - shared var should be left var of the lte but wasnt');
      return false;
    }

    let indexB = getFinalIndex(ml_dec16(ml, lteOffset + 3));

    ASSERT_LOG2(' - checking neq offset', ml_dec8(ml, neqOffset) === ML_VV_NEQ, ', indexB =', indexB);
    if (ml_dec8(ml, neqOffset) !== ML_VV_NEQ) {
      ASSERT_LOG2(' - op wasnt neq so bailing');
      return false;
    }

    ASSERT_LOG2(' - rewriting A <= B, A != C  ->  B !& C');
    let left = getFinalIndex(ml_dec16(ml, neqOffset + 1));
    let right = getFinalIndex(ml_dec16(ml, neqOffset + 3));

    let indexC = left;
    if (indexC === varIndex) {
      indexC = right;
    } else if (right !== varIndex) {
      ASSERT_LOG2(' - shared var should be part of the neq but wasnt');
      return false;
    }

    ASSERT_LOG2(' - asserting strict boolean domains', domain__debug(domains[indexB]), domain__debug(domains[left]), domain__debug(domains[right]));
    if (!domain_isBool(domains[indexB]) || !domain_isBool(domains[left]) || !domain_isBool(domains[right])) {
      ASSERT_LOG2(' - args werent bool so bailing', domain_isBool(domains[indexB]), domain_isBool(domains[left]), domain_isBool(domains[right]));
      return false;
    }
    ASSERT_LOG2(' - ok, rewriting the lte, eliminating the neq, and defering', varIndex);

    ml_vv2vv(ml, lteOffset, ML_VV_OR, indexB, indexC);
    ml_eliminate(ml, neqOffset, SIZEOF_VV);

    // only A is cut out, defer it

    solveStack.push(domains => {
      ASSERT_LOG2(' - neq + lte_lhs;', varIndex, '!=', indexB, '  ->  ', domain__debug(domains[varIndex]), '!=', domain__debug(domains[indexB]));
      let vB = force(indexB);
      domains[varIndex] = domain_removeValue(domains[varIndex], vB);
    });

    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexC);
    return true;
  }

  function trickNeqLteRhs(varIndex, offset, forOp) {
    let offset1 = bounty_getOffset(bounty, varIndex, 0);
    let offset2 = bounty_getOffset(bounty, varIndex, 1);
    ASSERT(offset === offset1 || offset === offset2, 'expecting current offset to be one of the two offsets found', offset, varIndex);

    bounty_markVar(bounty, varIndex); // happens in any code branch

    // this should be `A <= B, B != C`, morph one constraint into `A !& C`, eliminate the other constraint, and defer B

    let lteOffset = (forOp === 'lte' && offset === offset1) ? offset1 : offset2;
    let neqOffset = (forOp !== 'lte' && offset === offset1) ? offset1 : offset2;

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) !== ML_VV_LTE) {
      ASSERT_LOG2(' - op wasnt lte so bailing');
      return false;
    }
    ASSERT(ml_dec16(ml, lteOffset + 3) === varIndex, 'shared var should be right var of the lte');

    let indexA = getFinalIndex(ml_dec16(ml, lteOffset + 1));

    ASSERT_LOG2(' - checking neq offset', ml_dec8(ml, neqOffset) === ML_VV_NEQ, ', indexA =', indexA);
    if (ml_dec8(ml, neqOffset) !== ML_VV_NEQ) {
      ASSERT_LOG2(' - op wasnt lte so bailing');
      return false;
    }

    let left = getFinalIndex(ml_dec16(ml, neqOffset + 1));
    let right = getFinalIndex(ml_dec16(ml, neqOffset + 3));

    ASSERT_LOG2(' - asserting strict boolean domains', domain__debug(domains[indexA]), domain__debug(domains[left]), domain__debug(domains[right]));
    if (!domain_isBool(domains[indexA]) || !domain_isBool(domains[left]) || !domain_isBool(domains[right])) {
      ASSERT_LOG2(' - at least one arg non bool so bailing');
      return false;
    }

    ASSERT_LOG2(' - ok, rewriting the lte, eliminating the neq, and defering', varIndex);
    ASSERT_LOG2(' - rewriting A <= B, B != C  ->  A !& C');
    let indexB = varIndex === left ? right : left;

    ml_vv2vv(ml, lteOffset, ML_VV_NAND, indexA, indexB);
    ml_eliminate(ml, neqOffset, SIZEOF_VV);

    // only B is cut out, defer it

    solveStack.push(domains => {
      ASSERT_LOG2(' - neq + lte;', indexB, '!=', varIndex, '  ->  ', domain__debug(domains[indexB]), '!=', domain__debug(domains[varIndex]));
      let vB = force(indexB);
      domains[varIndex] = domain_removeValue(domains[varIndex], vB);
    });

    bounty_markVar(bounty, left);
    bounty_markVar(bounty, right);
    return true;
  }

  function trickIsallNall(varIndex, offset, forOp) {
    let offset1 = bounty_getOffset(bounty, varIndex, 0);
    let offset2 = bounty_getOffset(bounty, varIndex, 1);
    ASSERT(offset === offset1 || offset === offset2, 'expecting current offset to be one of the two offsets found', offset, varIndex);

    bounty_markVar(bounty, varIndex); // happens in any code branch

    ASSERT_LOG2('trickIsallNall', varIndex, 'at', offset, 'and', offset1, '/', offset2, 'metaFlags:', bounty_getMeta(bounty, varIndex));

    let nallOffset = (forOp === 'nall' && offset === offset1) ? offset1 : offset2;
    let isallOffset = (forOp !== 'nall' && offset === offset1) ? offset1 : offset2;

    // this should be `R = all?(A B), nall(R A D)`
    // if R = 1 then A and B are 1, so the nall will have two 1's, meaning D must be 0
    // if R = 0 then the nall is already satisfied. the nall is not entirely redundant
    // because `R !& D` must be maintained, so rewrite it to a nand (or rather, remove B from it)

    ASSERT_LOG2(' - checking nall offset', ml_dec8(ml, nallOffset) === ML_NALL);
    if (ml_dec8(ml, nallOffset) !== ML_NALL) {
      ASSERT_LOG2(' - op wasnt nall so bailing');
      return false;
    }

    ASSERT_LOG2(' - checking isall offset', ml_dec8(ml, isallOffset) === ML_ISALL);
    if (ml_dec8(ml, isallOffset) === ML_ISALL) {
      ASSERT_LOG2(' - the ops match. now fingerprint them');
      // initially, for this we need a nall of 3 and a isall of 2
      let nallLen = ml_dec16(ml, nallOffset + 1);
      let isallLen = ml_dec16(ml, isallOffset + 1);

      if (nallLen !== 3 || isallLen !== 2) {
        ASSERT_LOG2(' - fingerprint didnt match so bailing');
        return false;
      }

      ASSERT_LOG2(' - nall has 3 and isall 2 args, check if they share an arg');
      // next; one of the two isalls must occur in the nall
      // letters; S = all?(A B), nall(S C D)   (where S = shared)
      let indexS = varIndex;
      if (ml_dec16(ml, isallOffset + 7) !== indexS) {
        ASSERT_LOG2(' - this is NOT the isall we were looking at before because the shared index is not part of it');
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
        return false;
      }

      ASSERT_LOG2(' - nall(', indexS, indexC, indexD, ') and ', indexS, ' = all?(', indexA, indexB, ')');

      // check if B or D is in the isall. apply morph by cutting out the one that matches
      if (indexA === indexC) {
        ASSERT_LOG2(' - A=C so removing', indexA, 'from the nall');
        ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexD);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexD);
        return true;
      }
      if (indexA === indexD) {
        ASSERT_LOG2(' - A=D so removing', indexA, 'from the nall');
        ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexC);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexC);
        return true;
      }
      if (indexB === indexC) {
        ASSERT_LOG2(' - B=C so removing', indexB, 'from the nall');
        ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexD);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexD);
        return true;
      }
      if (indexB === indexD) {
        ASSERT_LOG2(' - B=D so removing', indexB, 'from the nall');
        ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexC);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexC);
        return true;
      }
    }
    ASSERT_LOG2(' - checking isall2 offset', ml_dec8(ml, isallOffset) === ML_ISALL);
    if (ml_dec8(ml, isallOffset) === ML_ISALL2) {
      ASSERT_LOG2(' - the ops match. now fingerprint them');
      // initially, for this we need a nall of 3 and a isall of 2 (which the op tells us already)
      let nallLen = ml_dec16(ml, nallOffset + 1);

      if (nallLen !== 3) {
        ASSERT_LOG2(' - fingerprint did not match so bailing');
        return false;
      }

      ASSERT_LOG2(' - nall has 3 and isall2 ... 2 args, check if they share an arg');
      // next; one of the two isalls must occur in the nall
      // letters; S = all?(A B), nall(S C D)   (where S = shared)
      let indexS = varIndex;
      if (ml_dec16(ml, isallOffset + 5) !== indexS) {
        ASSERT_LOG2(' - this is NOT the isall we were looking at before because the shared index is not part of it');
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
        return false;
      }

      ASSERT_LOG2(' - nall(', indexS, indexC, indexD, ') and ', indexS, ' = all?(', indexA, indexB, ')');

      // check if B or D is in the isall. apply morph by cutting out the one that matches
      if (indexA === indexC) {
        ASSERT_LOG2(' - A=C so removing', indexA, 'from the nall');
        ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexD);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexD);
        return true;
      }
      if (indexA === indexD) {
        ASSERT_LOG2(' - A=D so removing', indexA, 'from the nall');
        ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexC);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexC);
        return true;
      }
      if (indexB === indexC) {
        ASSERT_LOG2(' - B=C so removing', indexB, 'from the nall');
        ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexD);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexC);
        return true;
      }
      if (indexB === indexD) {
        ASSERT_LOG2(' - B=D so removing', indexB, 'from the nall');
        ml_c2vv(ml, nallOffset, nallLen, ML_VV_NAND, indexS, indexC);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        bounty_markVar(bounty, indexC);
        return true;
      }
    }

    return false;
  }

  function trickNandLteLhs(varIndex, offset, forOp) {
    let offset1 = bounty_getOffset(bounty, varIndex, 0);
    let offset2 = bounty_getOffset(bounty, varIndex, 1);
    ASSERT(offset === offset1 || offset === offset2, 'expecting current offset to be one of the two offsets found', offset, varIndex);

    bounty_markVar(bounty, varIndex); // happens in any code branch

    // this should be `A <= B, A !& C`. A is a leaf var, eliminate both constraints and defer A.

    let lteOffset = (forOp === 'lte' && offset === offset1) ? offset1 : offset2;
    let nandOffset = (forOp !== 'lte' && offset === offset1) ? offset1 : offset2;

    ASSERT_LOG2(' - checking lte offset', ml_dec8(ml, lteOffset) === ML_VV_LTE);
    if (ml_dec8(ml, lteOffset) !== ML_VV_LTE) {
      ASSERT_LOG2(' - op wasnt lte so bailing');
      return false;
    }

    if (ml_dec16(ml, lteOffset + 1) !== varIndex) {
      ASSERT_LOG2(' - shared var should be left var of the lte but wasnt, probably old addr');
      return false;
    }

    let indexB = getFinalIndex(ml_dec16(ml, lteOffset + 3));

    ASSERT_LOG2(' - checking nand offset', ml_dec8(ml, nandOffset) === ML_VV_NAND, ', indexA =', indexB);
    if (ml_dec8(ml, nandOffset) !== ML_VV_NAND) {
      ASSERT_LOG2(' - op wasnt nand so bailing');
      return false;
    }

    let left = getFinalIndex(ml_dec16(ml, nandOffset + 1));
    let right = getFinalIndex(ml_dec16(ml, nandOffset + 3));

    if (left !== varIndex && right !== varIndex) {
      ASSERT_LOG2(' - shared var should be part of the nand but wasnt, probably old addr');
      return false;
    }

    ASSERT_LOG2(' - asserting strict boolean domains', domain__debug(domains[indexB]), domain__debug(domains[left]), domain__debug(domains[right]));
    if (!domain_isBool(domains[indexB]) || !domain_isBool(domains[left]) || !domain_isBool(domains[right])) {
      ASSERT_LOG2(' - at least some arg wasnt bool so bailing');
      return false;
    }

    ASSERT_LOG2(' - ok, eliminating constraints, deferring', varIndex);
    ASSERT_LOG2(' - eliminating A <= B, B !& C');

    let indexA = varIndex === left ? right : left;

    ml_eliminate(ml, nandOffset, SIZEOF_VV);
    ml_eliminate(ml, lteOffset, SIZEOF_VV);

    ASSERT_LOG2(' - A is a leaf constraint, defer it', varIndex);

    solveStack.push(domains => {
      ASSERT_LOG2(' - nand + lte;', indexA, '!&', varIndex, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[varIndex]));
      ASSERT_LOG2(' - nand + lte;', varIndex, '<=', indexB, '  ->  ', domain__debug(domains[varIndex]), '<=', domain__debug(domains[indexB]));
      let vA = force(indexA);
      let vB = force(indexB);
      // if vA is non-zero then varIndex must be zero, otherwise it must be lte B
      domains[varIndex] = domain_removeGtUnsafe(domains[varIndex], vA ? 0 : vB);
    });

    // we eliminated both constraints so all vars involved decount
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    return true;
  }

  function trickNandIsall(varIndex, offset, forOp) {
    let offset1 = bounty_getOffset(bounty, varIndex, 0);
    let offset2 = bounty_getOffset(bounty, varIndex, 1);
    ASSERT(offset === offset1 || offset === offset2, 'expecting current offset to be one of the two offsets found', offset, varIndex);

    bounty_markVar(bounty, varIndex); // happens in any code branch

    ASSERT_LOG2('trickNandIsall', varIndex, 'at', offset, 'and', offset1, '/', offset2, 'metaFlags:', bounty_getMeta(bounty, varIndex));

    // this should be `R = all?(A B), R !& C. it rewrites to `nall(A B C)` and R is a leaf var

    let nandOffset = (forOp === 'nand' && offset === offset1) ? offset1 : offset2;
    let isallOffset = (forOp !== 'nand' && offset === offset1) ? offset1 : offset2;

    ASSERT_LOG2(' - checking nand offset', ml_dec8(ml, nandOffset) === ML_VV_NAND);
    if (ml_dec8(ml, nandOffset) !== ML_VV_NAND) {
      ASSERT_LOG2(' - op wasnt nand so bailing');
      return false;
    }

    let nandA = ml_dec16(ml, nandOffset + 1);
    let nandB = ml_dec16(ml, nandOffset + 3);

    let indexC = nandA;
    if (nandA === varIndex) {
      indexC = nandB;
    } else if (nandB !== varIndex) {
      ASSERT_LOG2(' - shared var should be part of the nand but wasnt, probably old addr');
      return false;
    }

    indexC = getFinalIndex(indexC);

    ASSERT_LOG2(' - checking isall offset', ml_dec8(ml, isallOffset) === ML_ISALL, ', indexC =', indexC);
    if (ml_dec8(ml, isallOffset) === ML_ISALL) {
      let len = ml_dec16(ml, isallOffset + 1);
      if (ml_dec16(ml, isallOffset + SIZEOF_COUNT + len * 2) !== varIndex) {
        ASSERT_LOG2(' - shared var should be R of isall but wasnt, probably old addr');
        return false;
      }

      let args = []; // rare reason for an array
      for (let i = 0; i < len; ++i) {
        let index = getFinalIndex(ml_dec16(ml, isallOffset + SIZEOF_COUNT + i * 2));
        args.push(index);
        bounty_markVar(bounty, index);
      }

      ASSERT_LOG2(' - shared:', varIndex, ', nand args:', nandA, nandB, ', isall args:', args);
      ASSERT_LOG2(' - morphing  `R = all?(A B), R !& C` to `nall(A B C)`');

      // move all vars to the nall
      // the isall is a count with result. just replace the result with indexC, inc the len, and compile a nall instead
      // then we'll want to sort the args

      ml_enc8(ml, isallOffset, ML_NALL);
      ml_enc16(ml, isallOffset + 1, len + 1);
      ml_enc16(ml, isallOffset + SIZEOF_COUNT + len * 2, indexC);
      ml_heapSort16bitInline(ml, isallOffset + SIZEOF_COUNT, len + 1);

      // eliminate the old nand, we wont need it anymore
      ml_eliminate(ml, nandOffset, SIZEOF_VV);

      ASSERT_LOG2(' - R is a leaf constraint, defer it', varIndex);

      solveStack.push(domains => {
        ASSERT_LOG2(' - nand + isall;', indexC, '!&', varIndex, '  ->  ', domain__debug(domains[indexC]), '!=', domain__debug(domains[varIndex]));
        ASSERT_LOG2(' - nand + isall;', varIndex, '= all?(', args, ')  ->  ', domain__debug(domains[varIndex]), ' = all?(', args.map(index => domain__debug(domains[index])), ')');

        // loop twice: once without forcing to scan for a zero or all-non-zero. second time forces all args.

        let determined = true;
        for (let i = 0; i < args.length; ++i) {
          let index = args[i];
          if (domain_isZero(domains[index])) {
            domains[varIndex] = domain_removeGtUnsafe(domains[varIndex], 0);
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
              domains[varIndex] = domain_removeGtUnsafe(domains[varIndex], 0);
              return; // done
            }
          }
        }
        // either all args already were non-zero or none were zero when forced: isall holds so R>0
        domains[varIndex] = domain_removeValue(domains[varIndex], 0);
      });

      return true;
    }

    if (ml_dec8(ml, isallOffset) === ML_ISALL2) {
      let isallA = getFinalIndex(ml_dec16(ml, isallOffset + 1));
      let isallB = getFinalIndex(ml_dec16(ml, isallOffset + 3));

      if (ml_dec16(ml, isallOffset + 5) !== varIndex) {
        ASSERT_LOG2(' - shared var should be R of isall but wasnt, probably old addr');
        return false;
      }

      ASSERT_LOG2(' - shared:', varIndex, ', nand args:', nandA, nandB, ', isall args:', isallA, isallB);
      ASSERT_LOG2(' - morphing  `R = all?(A B), R !& C` to `nall(A B C)`');

      // isall2 has 3 spots (sizeof=7). the nall requires a sizeof_count for len=3 (sizeof=9). we'll need to recycle
      let recycleOffset = ml_getRecycleOffset(ml, 0, SIZEOF_COUNT + 6);
      if (recycleOffset === undefined) {
        ASSERT_LOG2(' - no free spot to compile this so skip it until we can morph');
        return false;
      }

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

      ASSERT_LOG2(' - R is a leaf constraint, defer it', varIndex);

      solveStack.push(domains => {
        ASSERT_LOG2(' - nand + isall;', indexC, '!&', varIndex, '  ->  ', domain__debug(domains[indexC]), '!=', domain__debug(domains[varIndex]));
        ASSERT_LOG2(' - nand + isall;', varIndex, '= all?(', isallA, isallB, ')  ->  ', domain__debug(domains[varIndex]), ' = all?(', domain__debug(domains[isallA]), domain__debug(domains[isallB]), ')');

        // loop twice: once without forcing to scan for a zero or all-non-zero. second time forces all args.

        if (domain_isZero(domains[isallA]) || domain_isZero(domains[isallA])) {
          domains[varIndex] = domain_removeGtUnsafe(domains[varIndex], 0);
        } else if (domain_hasNoZero(domains[isallA]) && domain_hasNoZero(domains[isallA])) {
          domains[varIndex] = domain_removeValue(domains[varIndex], 0);
        } else if (force(isallA) === 0 || force(isallA) === 0) {
          domains[varIndex] = domain_removeGtUnsafe(domains[varIndex], 0);
        } else {
          domains[varIndex] = domain_removeValue(domains[varIndex], 0);
        }
      });

      bounty_markVar(bounty, isallA);
      bounty_markVar(bounty, isallB);
      bounty_markVar(bounty, indexC);
      return true;
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

        case ML_ISNONE:
          ASSERT_LOG2('(todo) none', pc);
          let nlen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_COUNT + nlen * 2 + 2;
          break;

        case ML_PLUS:
          cutPlus(ml, pc);
          break;
        case ML_MINUS:
          pc += SIZEOF_VVV;
          break;
        case ML_MUL:
          pc += SIZEOF_VVV;
          break;
        case ML_DIV:
          pc += SIZEOF_VVV;
          break;

        case ML_VVV_ISEQ:
          cutIsEq(ml, pc, SIZEOF_VVV, 2);
          break;
        case ML_VVV_ISNEQ:
          cutIsNeq(ml, pc, SIZEOF_VVV, 2);
          break;
        case ML_VVV_ISLT:
          cutIsLt(ml, pc, SIZEOF_VVV, 2, 2);
          break;
        case ML_VVV_ISLTE:
          cutIsLte(ml, pc, SIZEOF_VVV, 2, 2);
          break;

        case ML_V8V_ISEQ:
          cutIsEq(ml, pc, SIZEOF_V8V, 1);
          break;
        case ML_V8V_ISNEQ:
          cutIsNeq(ml, pc, SIZEOF_V8V, 1);
          break;
        case ML_V8V_ISLT:
          cutIsLt(ml, pc, SIZEOF_V8V, 2, 1);
          break;
        case ML_V8V_ISLTE:
          cutIsLte(ml, pc, SIZEOF_V8V, 2, 1);
          break;

        case ML_8VV_ISLT:
          cutIsLt(ml, pc, SIZEOF_8VV, 1, 2);
          break;
        case ML_8VV_ISLTE:
          cutIsLte(ml, pc, SIZEOF_8VV, 1, 2);
          break;

        case ML_VV8_ISEQ:
        case ML_VV8_ISNEQ:
        case ML_VV8_ISLT:
        case ML_VV8_ISLTE:
          return ml_throw(ml, pc, 'reifiers with constant R should have been morphed');

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

        case ML_DEBUG:
          pc += SIZEOF_V;
          break;

        case ML_JMP:
          let delta = ml_dec16(ml, pc + 1);
          pc += SIZEOF_V + delta;
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
