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
  ml_dec8,
  ml_dec16,
  ml_eliminate,
  ml_throw,
} from './ml';
import {
  domain__debug,
  domain_containsValue,
  domain_createValue,
  domain_min,
  domain_getValue,
  domain_removeValue,
  domain_removeGte,
  domain_removeLte,
  domain_removeGtUnsafe,
  domain_removeLtUnsafe,

} from './domain';

// BODY_START

function cutter(ml, vars, domains, getAlias, solveStack) {
  ASSERT_LOG2('\n ## cutter', ml);
  let pc = 0;
  let counts;
  let lenBefore;
  let removed;
  do {
    counts = new Array(domains.length).fill(0);
    countLoop();
    lenBefore = solveStack.length;
    cutLoop();
    removed = solveStack.length - lenBefore;
    ASSERT_LOG2(' - cutter removed', removed, 'constraints');
  } while (removed);

  function getFinalIndex(index, _max = 50) {
    if (_max <= 0) THROW('damnit');
    ASSERT_LOG2('getFinalIndex: ' + index + ' -> ' + domains[index]);
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

  function count(delta) {
    let n = ml_dec16(ml, pc + delta);
    ASSERT(n < domains.length, 'should be a valid index', n);
    let index = getFinalIndex(n);
    ASSERT(index < domains.length, 'should be a valid index', index);
    ++counts[index];
  }

  function countLoop() {
    pc = 0;
    ASSERT_LOG2(' - countLoop');
    while (pc < ml.length) {
      let pcStart = pc;
      let op = ml[pc];
      ASSERT_LOG2(' -- pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, domains, vars));
      switch (op) {
        case ML_VV_EQ:
        case ML_VV_NEQ:
        case ML_VV_LT:
        case ML_VV_LTE:
          count(1);
          count(3);
          pc += SIZEOF_VV;
          break;

        case ML_V8_EQ:
        case ML_V8_NEQ:
        case ML_V8_LT:
        case ML_V8_LTE:
          count(1);
          pc += SIZEOF_V8;
          break;

        case ML_8V_LT:
        case ML_8V_LTE:
          count(2);
          pc += SIZEOF_8V;
          break;

        case ML_88_EQ:
        case ML_88_NEQ:
        case ML_88_LT:
        case ML_88_LTE:
          pc += SIZEOF_88;
          break;

        case ML_DISTINCT:
          // note: distinct cant have multiple counts of same var because that would reject
          let dlen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < dlen; ++i) {
            count(3 + i * 2);
          }
          pc += SIZEOF_COUNT + dlen * 2;
          break;

        case ML_PLUS:
        case ML_MINUS:
        case ML_MUL:
        case ML_DIV:
        case ML_VVV_ISEQ:
        case ML_VVV_ISNEQ:
        case ML_VVV_ISLT:
        case ML_VVV_ISLTE:
          count(1);
          count(3);
          count(5);
          pc += SIZEOF_VVV;
          break;

        case ML_V8V_ISEQ:
        case ML_V8V_ISNEQ:
        case ML_V8V_ISLT:
        case ML_V8V_ISLTE:
          ASSERT_LOG2('islte');
          count(1);
          ASSERT_LOG2('- a');
          count(3);
          ASSERT_LOG2('- b');
          pc += SIZEOF_V8V;
          break;

        case ML_VV8_ISEQ:
        case ML_VV8_ISNEQ:
        case ML_VV8_ISLT:
        case ML_VV8_ISLTE:
          count(1);
          count(3);
          pc += SIZEOF_VV8;
          break;

        case ML_8VV_ISLT:
        case ML_8VV_ISLTE:
          count(2);
          count(4);
          pc += SIZEOF_8VV;
          break;

        case ML_88V_ISEQ:
        case ML_88V_ISNEQ:
        case ML_88V_ISLT:
        case ML_88V_ISLTE:
          count(3);
          pc += SIZEOF_88V;
          break;

        case ML_V88_ISEQ:
        case ML_V88_ISNEQ:
        case ML_V88_ISLT:
        case ML_V88_ISLTE:
          count(1);
          pc += SIZEOF_V88;
          break;

        case ML_8V8_ISLT:
        case ML_8V8_ISLTE:
          count(2);
          pc += SIZEOF_8V8;
          break;

        case ML_888_ISEQ:
        case ML_888_ISNEQ:
        case ML_888_ISLT:
        case ML_888_ISLTE:
          pc += SIZEOF_888;
          break;

        case ML_8V_SUM:
          // TODO: count multiple occurrences of same var once
          let slen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < slen; ++i) {
            count(4 + i * 2);
          }
          pc += SIZEOF_C8_COUNT + slen * 2 + 2;
          break;

        case ML_PRODUCT:
          // TODO: count multiple occurrences of same var once
          let plen = ml_dec16(ml, pc + 1);
          for (let i = 0; i < plen; ++i) {
            count(3 + i * 2);
          }
          pc += SIZEOF_COUNT + plen * 2 + 2;
          break;

        case ML_UNUSED:
          return THROW(' ! compiler problem @', pcStart);

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
          ml_throw(ml, pc, 'unknown op');
      }
    }
    THROW('ML OOB');
  }

  function force(varIndex) {
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
    ASSERT_LOG2(' - cutNeq', indexA, '!=', indexB, 'counts:', counts[indexA], counts[indexB]);

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut neq A;', indexA, '!=', indexB, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        domains[indexA] = domain_removeValue(A, vB);
      });
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexB];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut neq B;', indexA, '!=', indexB, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let B = domains[indexB];
        domains[indexB] = domain_removeValue(B, vA);
      });
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
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
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut lt A;', indexA, '<', indexB, '  ->  ', domain__debug(domains[indexA]), '<', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        ASSERT_LOG2('   - Setting', indexA, '(', domain__debug(A), ') to be lt', indexB, '(', vB, ')');
        domains[indexA] = domain_removeGte(A, vB);
      });
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexB];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        let vA = force(indexA);
        let B = domains[indexB];
        ASSERT_LOG2(' - cut lt B; Setting', indexA, '(', vA, ') to be lt', indexB, '(', domain__debug(B), ')');
        domains[indexB] = domain_removeLte(B, vA);
      });
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
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
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut lte A;', indexA, '<=', indexB, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[indexB]));
        let A = domains[indexA];
        let vB = force(indexB);
        domains[indexA] = domain_removeGtUnsafe(A, vB);
      });
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexB];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut lte B;', indexA, '<=', indexB, '  ->  ', domain__debug(domains[indexA]), '!=', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let B = domains[indexB];
        domains[indexB] = domain_removeLtUnsafe(B, vA);
      });
      ml_eliminate(ml, pc, SIZEOF_VV);
      --counts[indexA];
    } else {
      pc += SIZEOF_VV;
    }
  }
/*
  function cutPlus() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutPlus', indexR, '=', indexA, '+', indexB);
    // R = A + B

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut plus A;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '+', domain__debug(domains[indexB]));
        let vB = force(indexB);
        let vR = force(indexR);
        let vA = vR - vB;
        ASSERT(Number.isInteger(vA), 'the subtraction should result in an integer', vA);
        ASSERT(vA >= SUB, 'A B and R should already have been reduced to domains that are valid within A+B=R');
        ASSERT(domain_containsValue(domains[indexA], vA), 'resulting value should exist within domain');
        domains[indexA] = domain_createValue(vA);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut plus B;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '+', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vR = force(indexR);
        let vB = vR - vA;
        ASSERT(Number.isInteger(vB), 'the subtraction should result in an integer', vB);
        ASSERT(vB >= SUB, 'A B and R should already have been reduced to domains that are valid within A+B=R');
        ASSERT(domain_containsValue(domains[indexB], vB), 'resulting value should exist within domain');
        domains[indexB] = domain_createValue(vB);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut plus R;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '+', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = force(indexB);
        let vR = vA + vB;
        ASSERT(Number.isInteger(vR), 'the addition should result in an integer', vR);
        ASSERT(vR <= SUP, 'A B and R should already have been reduced to domains that are valid within A+B=R');
        ASSERT(domain_containsValue(domains[indexR], vR), 'resulting value should exist within domain');
        domains[indexR] = domain_createValue(vR);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];
    }
  }

  function cutMinus() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutMinus', indexR, '=', indexA, '-', indexB);
    // R = A - B

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut minus A;', indexR, '=', indexA, '-', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '-', domain__debug(domains[indexB]));
        let vB = force(indexB);
        let vR = force(indexR);
        let vA = vR + vB;
        ASSERT(Number.isInteger(vA), 'the addition should result in an integer', vA);
        ASSERT(vA <= SUP, 'A B and R should already have been reduced to domains that are valid within A-B=R');
        ASSERT(domain_containsValue(domains[indexA], vA), 'resulting value should exist within domain');
        domains[indexA] = domain_createValue(vA);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut minus B;', indexR, '=', indexA, '-', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '-', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vR = force(indexR);
        let vB = vA - vR;
        ASSERT(Number.isInteger(vB), 'the subtraction should result in an integer', vB);
        ASSERT(vB <= SUP, 'A B and R should already have been reduced to domains that are valid within A-B=R');
        ASSERT(domain_containsValue(domains[indexB], vB), 'resulting value should exist within domain');
        domains[indexB] = domain_createValue(vB);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut minus R;', indexR, '=', indexA, '-', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '-', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = force(indexB);
        let vR = vA - vB;
        ASSERT(Number.isInteger(vR), 'the subtraction should result in an integer', vR);
        ASSERT(vR >= SUB, 'A B and R should already have been reduced to domains that are valid within A-B=R');
        ASSERT(domain_containsValue(domains[indexR], vR), 'resulting value should exist within domain');
        domains[indexR] = domain_createValue(vR);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];
    }
  }

  function cutMul() {
    // TODO: verify this is acting properly around edge cases (*0)
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutMul', indexR, '=', indexA, '*', indexB);
    // R = A * B

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut mul A;', indexR, '=', indexA, '*', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '*', domain__debug(domains[indexB]));
        let vB = force(indexB);
        let vR = force(indexR);
        let vA = vB ? vR / vB : domain_min(domains[indexA]);
        ASSERT(Number.isInteger(vA), 'the division should result in an integer', vA); // note: non-OOB div cant be OOB
        ASSERT(domain_containsValue(domains[indexA], vA), 'A B and R should already have been reduced to domains that are valid within A*B=R', vA, vB, vR, domain__debug(domains[indexA]));
        domains[indexA] = domain_createValue(vA);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut mul B;', indexR, '=', indexA, '*', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '*', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vR = force(indexR);
        let vB = vA ? vR / vA : domain_min(domains[indexB]);
        ASSERT(Number.isInteger(vB), 'the division should result in an integer', vB); // note: non-OOB div cant be OOB
        ASSERT(domain_containsValue(domains[indexB], vB), 'A B and R should already have been reduced to domains that are valid within A*B=R', vA, vB, vR, domain__debug(domains[indexB]));
        domains[indexB] = domain_createValue(vB);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut mul R;', indexR, '=', indexA, '*', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '*', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = force(indexB);
        let vR = vA * vB;
        ASSERT(Number.isInteger(vR), 'the multiplication should result in an integer', vR);
        ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A*B=R', vA, vB, vR, domain__debug(domains[indexR]));
        domains[indexR] = domain_createValue(vR);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];
    }
  }

  function cutDiv() {
    // TODO: verify this is acting properly around edge cases (/0)
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutDiv', indexR, '=', indexA, '/', indexB);
    // R = A / B

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut div A;', indexR, '=', indexA, '/', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '/', domain__debug(domains[indexB]));
        let vR = force(indexR);
        if (vR === 0) {
          ASSERT(domain_containsValue(domains[indexA], 0), 'if R contains 0 then A must also contain 0');
          domains[indexA] = domain_createValue(0); // 0/B=0 regardless of B so dont force B here
        } else {
          let vB = force(indexB);
          let vA = vR * vB;
          ASSERT(Number.isInteger(vA), 'the division should result in an integer', vR);
          ASSERT(domain_containsValue(domains[indexA], vA), 'A B and R should already have been reduced to domains that are valid within A/B=R', vA, vB, vR, domain__debug(domains[indexA]));
          domains[indexA] = domain_createValue(vA);
        }
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut div B;', indexR, '=', indexA, '/', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '/', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vR = force(indexR);
        if (vA !== 0) { // 0/B=0 regardless of B so dont update B here
          let vB = vA * vR;
          ASSERT(vR !== 0, 'if A isnt 0 then R isnt 0 either');
          ASSERT(Number.isInteger(vA), 'the division should result in an integer', vR);
          ASSERT(domain_containsValue(domains[indexB], vB), 'A B and R should already have been reduced to domains that are valid within A/B=R', vA, vB, vR, domain__debug(domains[indexB]));
          domains[indexB] = domain_createValue(vB);
        }
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut div R;', indexR, '=', indexA, '/', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '/', domain__debug(domains[indexB]));
        let vA = force(indexA);
        if (vA === 0) {
          ASSERT(domain_containsValue(domains[indexR], 0), 'if A=0 then R must contain 0 as well');
          domains[indexR] = domain_createValue(0); // no need to update B so dont force it
        } else {
          let vB = force(indexB);
          let vR = vA / vB;
          ASSERT(Number.isInteger(vA), 'the division should result in an integer', vR);
          ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A/B=R', vA, vB, vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        }
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];
    }
  }


  function cutIsEq() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutIsEq', indexR, '=', indexA, '==?', indexB);
    // R = A ==? B

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut iseq A;', indexR, '=', indexA, '==?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '==?', domain__debug(domains[indexB]));
        let vB = force(indexB);
        let vR = force(indexR);
        let newA = vR ? domain_createValue(vB) : domain_removeValue(domains[indexA], vB);
        ASSERT(vR ? domain_containsValue(domains[A], vB) : newA, 'A B and R should already have been reduced to domains that are valid within A==?B=R', newA, vB, vR, domain__debug(domains[indexA]), vR ? domain_containsValue(domains[A], vB) : newA);
        domains[indexA] = newA;
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut iseq B;', indexR, '=', indexA, '==?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '==?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vR = force(indexR);
        let newB = vR ? domain_createValue(vA) : domain_removeValue(domains[indexB], vA);
        ASSERT(vR ? domain_containsValue(domains[B], vA) : newB, 'A B and R should already have been reduced to domains that are valid within A==?B=R', vA, newB, vR, domain__debug(domains[indexB]));
        domains[indexB] = newB;
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut iseq R;', indexR, '=', indexA, '==?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '==?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = force(indexB);
        let vR = vA === vB ? 1 : 0;
        ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A==?B=R', vA, vB, vR, domain__debug(domains[indexR]));
        domains[indexR] = domain_createValue(vR);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];
    }
  }

  function cutIsNeq() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutIsNeq', indexR, '=', indexA, '!=?', indexB);
    // R = A !=? B

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut isneq A;', indexR, '=', indexA, '!=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '!=?', domain__debug(domains[indexB]));
        let vB = force(indexB);
        let vR = force(indexR);
        let newA = vR ? domain_removeValue(domains[indexA], vB) : domain_createValue(vB);
        ASSERT(vR ? newA : domain_containsValue(domains[indexA], vB), 'A B and R should already have been reduced to domains that are valid within A!=?B=R', domain__debug(newA), vB, vR, domain__debug(domains[indexA]));
        domains[indexA] = newA;
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut isneq B;', indexR, '=', indexA, '!=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '!=?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vR = force(indexR);
        let newB = vR ? domain_removeValue(domains[indexB], vA) : domain_createValue(vA);
        ASSERT(vR ? newB : domain_containsValue(domains[indexB], vA), 'A B and R should already have been reduced to domains that are valid within A!=?B=R', vA, domain__debug(newB), vR, domain__debug(domains[indexA]));
        domains[indexB] = newB;
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut isneq R;', indexR, '=', indexA, '!=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '!=?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = force(indexB);
        let vR = vA !== vB ? 1 : 0;
        ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A!=?B=R', vA, vB, vR, domain__debug(domains[indexR]));
        domains[indexR] = domain_createValue(vR);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];
    }
  }

  function cutIsLt() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutIsLt', indexR, '=', indexA, '<?', indexB);
    // R = A <? B

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut islt A;', indexR, '=', indexA, '<?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<?', domain__debug(domains[indexB]));
        let vB = force(indexB);
        let vR = force(indexR);
        ASSERT(vR ? domain_min(domains[indexA]) < domain_max(domains[indexB]) : domain_max(domains[indexA]) >= domain_min(domains[indexB]), 'A B and R should already have been reduced to domains that are valid within A<?B=R');
        domains[indexA] = vR ? domain_removeGte(domains[indexA], vB) : domain_removeLtUnsafe(domains[indexA], vB);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut islt B;', indexR, '=', indexA, '<?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vR = force(indexR);
        ASSERT(vR ? domain_min(domains[indexA]) < domain_max(domains[indexB]) : domain_max(domains[indexA]) >= domain_min(domains[indexB]), 'A B and R should already have been reduced to domains that are valid within A<?B=R');
        domains[indexA] = vR ? domain_removeGte(domains[indexB], vA) : domain_removeLtUnsafe(domains[indexB], vA);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut islt R;', indexR, '=', indexA, '<?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = force(indexB);
        ASSERT(domain_containsValue(domains[indexR], vA < vB ? 1 : 0), 'A B and R should already have been reduced to domains that are valid within A<?B=R');
        domains[indexR] = domain_createValue(vA < vB ? 1 : 0);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];
    }
  }

  function cutIsLte() {
    let indexA = getFinalIndex(ml_dec16(ml, pc + 1));
    let indexB = getFinalIndex(ml_dec16(ml, pc + 3));
    let indexR = getFinalIndex(ml_dec16(ml, pc + 5));
    ASSERT_LOG2(' - cutIsLte', indexR, '=', indexA, '<=?', indexB);
    // R = A <? B

    if (counts[indexA] === 1) {
      ASSERT_LOG2('   - A is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut islte A;', indexR, '=', indexA, '<=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<=?', domain__debug(domains[indexB]));
        let vB = force(indexB);
        let vR = force(indexR);
        ASSERT(vR ? domain_min(domains[indexA]) <= domain_max(domains[indexB]) : domain_max(domains[indexA]) > domain_min(domains[indexB]), 'A B and R should already have been reduced to domains that are valid within A<=?B=R');
        domains[indexA] = vR ? domain_removeGtUnsafe(domains[indexA], vB) : domain_removeLte(domains[indexA], vB);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexB] === 1) {
      ASSERT_LOG2('   - B is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut islte B;', indexR, '=', indexA, '<=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<=?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vR = force(indexR);
        ASSERT(vR ? domain_min(domains[indexA]) <= domain_max(domains[indexB]) : domain_max(domains[indexA]) > domain_min(domains[indexB]), 'A B and R should already have been reduced to domains that are valid within A<=?B=R');
        domains[indexA] = vR ? domain_removeGtUnsafe(domains[indexB], vA) : domain_removeLte(domains[indexB], vA);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexB];
      --counts[indexR];
    } else if (counts[indexR] === 1) {
      ASSERT_LOG2('   - R is a leaf var');
      solveStack.push(_ => {
        ASSERT_LOG2(' - cut islte R;', indexR, '=', indexA, '<=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<=?', domain__debug(domains[indexB]));
        let vA = force(indexA);
        let vB = force(indexB);
        ASSERT(domain_containsValue(domains[indexR], vA < vB ? 1 : 0), 'A B and R should already have been reduced to domains that are valid within A<=?B=R');
        domains[indexR] = domain_createValue(vA < vB ? 1 : 0);
      });
      ml_eliminate(ml, pc, SIZEOF_VVV);
      --counts[indexA];
      --counts[indexB];
    }
  }
  */

  function cutIsEq(ml, offset, sizeof, lenA, lenB, lenR) {
    ASSERT_LOG2(' -- cutIsEq', offset, sizeof, lenA, lenB, lenR);
    if (lenR === 2) {
      let indexR = ml_dec16(ml, offset + 1 + lenA + lenB);
      ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR]);
      ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
      if (counts[indexR] === 1) {
        let indexA = lenA === 1 ? ml_dec8(ml, 1 + offset) : ml_dec16(ml, 1 + offset);
        let indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : ml_dec16(ml, offset + 1 + lenA);
        ASSERT_LOG2('   - R is a leaf var');
        solveStack.push(_ => {
          ASSERT_LOG2(' - cut iseq R;', indexR, '=', indexA, '==?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '==?', domain__debug(domains[indexB]));
          let vA = force(indexA);
          let vB = force(indexB);
          let vR = vA === vB ? 1 : 0;
          ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A==?B=R', vA, vB, vR, domain__debug(domains[indexR]));
          domains[indexR] = domain_createValue(vR);
        });
        ml_eliminate(ml, pc, sizeof);
        --counts[indexA];
        --counts[indexB];
      }
    }
    pc = offset + sizeof;
  }

  function cutIsNeq(ml, offset, sizeof, lenA, lenB, lenR) {
    ASSERT_LOG2(' -- cutIsNeq', offset, sizeof, lenA, lenB, lenR);
    if (lenR === 2) {
      let indexR = ml_dec16(ml, offset + 1 + lenA + lenB);
      ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR]);
      ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
      if (counts[indexR] === 1) {
        let indexA = lenA === 1 ? ml_dec8(ml, 1 + offset) : ml_dec16(ml, 1 + offset);
        let indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : ml_dec16(ml, offset + 1 + lenA);
        if (counts[indexR] === 1) {
          ASSERT_LOG2('   - R is a leaf var');
          solveStack.push(_ => {
            ASSERT_LOG2(' - cut isneq R;', indexR, '=', indexA, '!=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '!=?', domain__debug(domains[indexB]));
            let vA = force(indexA);
            let vB = force(indexB);
            let vR = vA !== vB ? 1 : 0;
            ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A!=?B=R', vA, vB, vR, domain__debug(domains[indexR]));
            domains[indexR] = domain_createValue(vR);
          });
          ml_eliminate(ml, pc, sizeof);
          --counts[indexA];
          --counts[indexB];
        }
      }
    }
    pc = offset + sizeof;
  }

  function cutIsLt(ml, offset, sizeof, lenA, lenB, lenR) {
    ASSERT_LOG2(' -- cutIsLt', offset, sizeof, lenA, lenB, lenR);
    if (lenR === 2) {
      let indexR = ml_dec16(ml, offset + 1 + lenA + lenB);
      ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR]);
      ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
      if (counts[indexR] === 1) {
        let indexA = lenA === 1 ? ml_dec8(ml, 1 + offset) : ml_dec16(ml, 1 + offset);
        let indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : ml_dec16(ml, offset + 1 + lenA);
        if (counts[indexR] === 1) {
          ASSERT_LOG2('   - R is a leaf var');
          solveStack.push(_ => {
            ASSERT_LOG2(' - cut islt R;', indexR, '=', indexA, '<?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<?', domain__debug(domains[indexB]));
            let vA = force(indexA);
            let vB = force(indexB);
            let vR = vA < vB ? 1 : 0;
            ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A<?B=R;', vA, '<?', vB, '=', vR, domain__debug(domains[indexR]));
            domains[indexR] = domain_createValue(vR);
          });
          ml_eliminate(ml, pc, sizeof);
          --counts[indexA];
          --counts[indexB];
        }
      }
    }
    pc = offset + sizeof;
  }

  function cutIsLte(ml, offset, sizeof, lenA, lenB, lenR) {
    ASSERT_LOG2(' -- cutIsLte', offset, sizeof, lenA, lenB, lenR);
    if (lenR === 2) {
      let indexR = ml_dec16(ml, offset + 1 + lenA + lenB);
      ASSERT_LOG2('   - indexR=', indexR, 'counts:', counts[indexR]);
      ASSERT(typeof counts[indexR] === 'number', 'expecting valid offset');
      if (counts[indexR] === 1) {
        let indexA = lenA === 1 ? ml_dec8(ml, 1 + offset) : ml_dec16(ml, 1 + offset);
        let indexB = lenB === 1 ? ml_dec8(ml, offset + 1 + lenA) : ml_dec16(ml, offset + 1 + lenA);
        if (counts[indexR] === 1) {
          ASSERT_LOG2('   - R is a leaf var');
          solveStack.push(_ => {
            ASSERT_LOG2(' - cut islte R;', indexR, '=', indexA, '<=?', indexB, '  ->  ', domain__debug(domains[indexR]), '=', domain__debug(domains[indexA]), '<=?', domain__debug(domains[indexB]));
            let vA = force(indexA);
            let vB = force(indexB);
            let vR = vA <= vB ? 1 : 0;
            ASSERT(domain_containsValue(domains[indexR], vR), 'A B and R should already have been reduced to domains that are valid within A<=?B=R;', vA, '<?', vB, '=', vR, domain__debug(domains[indexR]));
            domains[indexR] = domain_createValue(vR);
          });
          ml_eliminate(ml, pc, sizeof);
          --counts[indexA];
          --counts[indexB];
        }
      }
    }
    pc = offset + sizeof;
  }

  function cutLoop() {
    ASSERT_LOG2(' - cutLoop');
    pc = 0;
    while (pc < ml.length) {
      let pcStart = pc;
      let op = ml[pc];
      ASSERT_LOG2(' -- pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, domains, vars));
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

        case ML_DISTINCT:
          ASSERT_LOG2('(todo) d', pc);
          let dlen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_COUNT + dlen * 2;
          break;

        case ML_PLUS:
          ASSERT_LOG2('(todo) +', pc);
          pc += SIZEOF_VVV;
          //cutPlus();
          break;
        case ML_MINUS:
          ASSERT_LOG2('(todo) -', pc);
          pc += SIZEOF_VVV;
          //cutMinus();
          break;
        case ML_MUL:
          ASSERT_LOG2('(todo) *', pc);
          pc += SIZEOF_VVV;
          //cutMul();
          break;
        case ML_DIV:
          ASSERT_LOG2('(todo) /', pc);
          pc += SIZEOF_VVV;
          //cutDiv();
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
        case ML_8VV_ISLTE:
          ASSERT_LOG2('(todo) 8vv', pc);
          pc += SIZEOF_8VV;
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
          ASSERT_LOG2('(todo) s', pc);
          let slen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_C8_COUNT + slen * 2 + 2;
          break;

        case ML_PRODUCT:
          ASSERT_LOG2('(todo) p', pc);
          let plen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_COUNT + plen * 2 + 2;
          break;

        case ML_UNUSED:
          return THROW(' ! compiler problem @', pcStart);

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
    ASSERT_LOG2('the implicit end; ml desynced');
    THROW('ML OOB');
  }
}

// BODY_STOP

export {
  cutter,
};
