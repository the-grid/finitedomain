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
  ml_jump,
  ml_throw,
  ml_vvv2vv,
  ml_vvv2vvv,
} from './ml';
import {
  domain__debug,
  domain_containsValue,
  domain_createValue,
  domain_createRange,
  domain_intersection,
  domain_isBool,
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
  //COUNT_NONE,
  COUNT_BOOLY,
  //COUNT_ISALL_RESULT,

  counter,
} from './counter';

// BODY_START

function cutter(ml, vars, domains, addAlias, getAlias, solveStack) {
  ASSERT_LOG2('\n ## cutter', ml);
  let pc = 0;
  let lastOffset;
  let varMeta;
  let counts;
  let lenBefore;
  let emptyDomain = false;
  let removed;
  let loops = 0;
  do {
    ASSERT_LOG2(' # outer cutloop', loops);
    lastOffset = new Array(domains.length).fill(0); // offset of op containing var; only tag the last occurrence of a var. so zero is never actually used here for count>1
    varMeta = new Array(domains.length).fill(COUNT_BOOLY); // track certain properties of each var, is it a booly, used in an isall, etc. cutter can use these stats for cutting decisions.
    counts = counter(ml, vars, domains, getAlias, lastOffset, varMeta);
    lenBefore = solveStack.length;
    cutLoop();
    removed = solveStack.length - lenBefore;
    console.log(' - cutter outer loop', loops, 'removed', removed, 'constraints, emptyDomain =', emptyDomain);
    ++loops;
  } while (removed && !emptyDomain);

  if (emptyDomain) return -1;
  return loops;

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

    if (counts[indexA] === 1) {
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
    } else if (counts[indexB] === 1) {
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
    } else {
      pc += SIZEOF_VV;
    }
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
    } else if (counts[indexB] === 1) {
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
    } else {
      pc += SIZEOF_VV;
    }
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
    } else if (counts[indexB] === 1) {
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
    } else {
      pc += SIZEOF_VV;
    }
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
    } else if (counts[indexB] === 1) {
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
    } else {
      pc += SIZEOF_VV;
    }
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
    } else {
      pc += SIZEOF_COUNT + len * 2 + 2;
    }
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
    } else {
      pc += SIZEOF_VVV;
    }
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

  function cutLoop() {
    ASSERT_LOG2('\n - inner cutLoop');
    pc = 0;
    while (pc < ml.length && !emptyDomain) {
      let pcStart = pc;
      let op = ml[pc];
      ASSERT_LOG2(' -- CL pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, domains, vars));
      switch (op) {
        case ML_VV_EQ:
          return THROW('eqs should be aliased and eliminated');

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
          return THROW('constraints with <= 1 var should be eliminated');

        case ML_NALL:
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
          return THROW('constraints with <= 1 var should be eliminated');

        case ML_8V_SUM:
          cutSum(ml, pc);
          break;

        case ML_PRODUCT:
          ASSERT_LOG2('(todo) p', pc);
          let plen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_COUNT + plen * 2 + 2;
          break;

        case ML_VV_AND:
          return THROW('ands should be solved and eliminated');
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
          ml_throw('unknown op', pc);
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
