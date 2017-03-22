import {
  ASSERT,
  ASSERT_LOG2,
} from './helpers';

import {
  ML_START,
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
  ML_STOP,

  SIZEOF_V,
  SIZEOF_W,
  SIZEOF_VV,
  SIZEOF_VVV,
  SIZEOF_COUNT,

  ml__debug,
  ml_dec16,
  ml_dec32,
  ml_eliminate,
  ml_heapSort16bitInline,
  ml_throw,
  ml_vvv2vv,
} from './ml';
import {
  domain__debug,
  domain_containsValue,
  domain_createValue,
  domain_getValue,
  domain_size,
  domain_hasNoZero,
  domain_intersection,
  domain_isSolved,
  domain_removeValue,
} from './domain';

// BODY_START

// these global counters can be used to trace problems or print a dsl at explicit steps in the solve
let __runCounter = 0;
let __opCounter = 0;

function deduper(ml, problem) {
  ++__runCounter;
  ASSERT_LOG2('\n ## pr_dedupe', __runCounter, ml);

  let getDomain = problem.getDomain;
  let setDomain = problem.setDomain;
  let getAlias = problem.getAlias;
  let addVar = problem.addVar;
  let addAlias = problem.addAlias;

  let pc = 0;
  let constraintHash = {}; // keys are A@B or R=A@B and the vars can be an index (as is) or a literal prefixed with #
  let debugHash = {};
  let removed = 0;
  let aliased = 0;
  let emptyDomain = false;
  innerLoop();
  console.log(' - dedupe removed', removed, 'constraints and aliased', aliased, 'result vars, emptyDomain=', emptyDomain);


  //console.log(mlToDsl(ml, problem, counter(ml, problem), {debug: false, hashNames: false, indexNames: true, groupedConstraints: true}));
  //throw 'stop now.';

  return emptyDomain ? -1 : aliased; // if aliases were created the minifier will want another go.

  function dedupePairU(op) {
    let indexA = getAlias(ml_dec16(ml, pc + 1));
    let indexB = getAlias(ml_dec16(ml, pc + 3));

    if (indexB < indexA) {
      let t = indexB;
      indexB = indexA;
      indexA = t;
    }

    _dedupePairAny(op, indexA, indexB);
  }
  function dedupePairO(op) {
    let indexA = getAlias(ml_dec16(ml, pc + 1));
    let indexB = getAlias(ml_dec16(ml, pc + 3));

    _dedupePairAny(op, indexA, indexB);
  }
  function _dedupePairAny(op, indexA, indexB) {
    let key = op + ':' + indexA + ',' + indexB;
    let debugString = op + ':' + domain__debug(getDomain(indexA, true)) + ',' + domain__debug(getDomain(indexB, true));

    if (constraintHash[key] !== undefined) {
      ASSERT_LOG2(' - _dedupePairAny; Found dupe constraint; eliminating the second one');
      ASSERT_LOG2('    - #1:', debugHash[key]);
      ASSERT_LOG2('    - #2:', debugString);
      ml_eliminate(ml, pc, SIZEOF_VV);
      return;
    }

    constraintHash[key] = 1;
    debugHash[key] = debugString;
    pc += SIZEOF_VV;
  }

  function dedupeTripU(op) {
    // this assumes the assignment is a fixed value, not booly like reifiers
    // because in this case we can safely alias any R that with the same A@B

    let indexA = getAlias(ml_dec16(ml, pc + 1));
    let indexB = getAlias(ml_dec16(ml, pc + 3));
    let indexR = getAlias(ml_dec16(ml, pc + 5));

    if (indexB < indexA) {
      let t = indexB;
      indexB = indexA;
      indexA = t;
    }

    _dedupeTripAny(op, indexA, indexB, indexR);
  }
  function dedupeTripO(op) {
    // this assumes the assignment is a fixed value, not booly like reifiers
    // because in this case we can safely alias any R that with the same A@B

    let indexA = getAlias(ml_dec16(ml, pc + 1));
    let indexB = getAlias(ml_dec16(ml, pc + 3));
    let indexR = getAlias(ml_dec16(ml, pc + 5));

    _dedupeTripAny(op, indexA, indexB, indexR);
  }
  function _dedupeTripAny(op, indexA, indexB, indexR) {
    let key = op + ':' + indexA + ',' + indexB;
    let debugString = op + ':' + domain__debug(getDomain(indexR, true)) + '=' + domain__debug(getDomain(indexA, true)) + ',' + domain__debug(getDomain(indexB, true));

    let index = constraintHash[key];
    if (index !== undefined) {
      index = getAlias(index);
      ASSERT_LOG2(' - _dedupeTripAny; Found dupe constraint; eliminating the second one, aliasing', indexR, 'to', index);
      ASSERT_LOG2('    - #1:', debugHash[key]);
      ASSERT_LOG2('    - #2:', debugString);
      ml_eliminate(ml, pc, SIZEOF_VVV);
      if (indexR !== index) {
        let R = domain_intersection(getDomain(indexR, true), getDomain(index, true));
        if (!R) return emptyDomain = true;
        // this probably wont matter for most of the cases, but it could make a difference
        //setDomain(indexR, R); // (useless)
        setDomain(index, R);
        addAlias(indexR, index);
      }
      return;
    }

    constraintHash[key] = indexR;
    debugHash[key] = debugString;
    pc += SIZEOF_VVV;
  }

  function dedupeReifierTripU(op) {
    // iseq, isneq, isall2
    // the tricky example:
    // ####
    // : A, B 1
    // : R [0 1]
    // : S [0 0 2 2]
    // R = A ==? B
    // S = A ==? B
    // ####
    // in this case R and S are "booly alias" but not actual alias
    // basically this translates into a xnor (if R then S, if S then R)

    let indexA = getAlias(ml_dec16(ml, pc + 1));
    let indexB = getAlias(ml_dec16(ml, pc + 3));

    if (indexB < indexA) {
      let t = indexB;
      indexB = indexA;
      indexA = t;
    }

    _dedupeReifierTripAny(op, indexA, indexB);
  }
  function dedupeReifierTripO(op) {
    // islt, islte
    // the tricky example:
    // ####
    // : A, B 1
    // : R [0 1]
    // : S [0 0 2 2]
    // R = A <=? B
    // S = A <=? B
    // ####
    // in this case R and S are "booly alias" but not actual alias
    // basically this translates into a xnor (if R then S, if S then R)

    let indexA = getAlias(ml_dec16(ml, pc + 1));
    let indexB = getAlias(ml_dec16(ml, pc + 3));

    _dedupeReifierTripAny(op, indexA, indexB);
  }
  function _dedupeReifierTripAny(op, indexA, indexB) {
    let indexR = getAlias(ml_dec16(ml, pc + 5));

    // we'll add a key by all three indexes and conditionally also on the args and the domain of R

    let key = op + ':' + indexR + '=' + indexA + ',' + indexB;
    let debugString = op + ':' + domain__debug(getDomain(indexR, true)) + '=' + domain__debug(getDomain(indexA, true)) + ',' + domain__debug(getDomain(indexB, true));

    ASSERT_LOG2('   - key=', key, ';', constraintHash[key] !== undefined);
    if (constraintHash[key] !== undefined) {
      ASSERT_LOG2(' - dedupeReifierTripU; Found dupe constraint; eliminating the second one');
      ASSERT_LOG2('    - #1:', debugHash[key]);
      ASSERT_LOG2('    - #2:', debugString);
      ml_eliminate(ml, pc, SIZEOF_VVV);
      return;
    }

    constraintHash[key] = 1;
    debugHash[key] = debugString;

    let R = getDomain(indexR, true);
    let safeR = !domain_hasNoZero(R) && domain_size(R) <= 2;
    ASSERT_LOG2('   - R:', domain__debug(R), ', size=', domain_size(R), ', has zero:', !domain_hasNoZero(R), '--> is safe?', safeR);
    if (safeR) {
      // okay R has only two values and one of them is zero
      // try to match the arg constraints only. if we find a dupe with
      // the same R domain then we can alias that R with this one

      // we'll encode the domain instead of indexR to prevent
      // multiple args on different R's to clash

      // while R may not look it, it still represents a unique domain so we can use the
      // encoded value as is here. wrap it to prevent clashes with indexes and numdoms
      let key2 = op + ':[' + R + ']' + '=' + indexA + ',' + indexB;
      ASSERT_LOG2('   - key2:', key2);

      let index = constraintHash[key2];
      if (index !== undefined) {
        index = getAlias(index);
        ASSERT_LOG2(' - _dedupeTripAny; Found dupe reifier; eliminating the second one, aliasing', indexR, 'to', index);
        ASSERT_LOG2('    - #1:', debugHash[key2]);
        ASSERT_LOG2('    - #2:', debugString);
        ml_eliminate(ml, pc, SIZEOF_VVV);
        ASSERT(indexR !== index, 'this case should have been caught by the other deduper');
        ASSERT(getDomain(indexR) === getDomain(index), 'should have already asserted that these two domains have only two values, a zero and a non-zero, and that they are equal');
        addAlias(indexR, index);
        return;
      }

      constraintHash[key2] = indexR;
      debugHash[key2] = debugString;
    }

    pc += SIZEOF_VVV;
  }

  function dedupeBoolyList(op) {
    // isall, isnall, isnone
    // the tricky example:
    // ####
    // : A, B, C 1
    // : R [0 1]
    // : S [0 0 2 2]
    // R = xxx?(A B C)
    // S = xxx?(A B C)
    // ####
    // in this case R and S are "booly alias" but not actual alias
    // basically this translates into a xnor (if R then S, if S then R)

    let argCount = ml_dec16(ml, pc + 1);
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;

    // first we want to sort the list. we'll do this inline to prevent array creation
    ml_heapSort16bitInline(ml, pc + SIZEOF_COUNT, argCount);

    // now collect them. the key should end up with an ordered list
    let args = '';
    let debugArgs = '';
    for (let i = 0; i < argCount; ++i) {
      let index = getAlias(ml_dec16(ml, pc + SIZEOF_COUNT + i * 2));
      args += index + ' ';
      debugArgs += domain__debug(getDomain(index, true));
    }

    let indexR = getAlias(ml_dec16(ml, pc + SIZEOF_COUNT + argCount * 2));

    // we'll add a key with indexR and conditionally one with just the domain of R

    let key = op + ':' + indexR + '=' + args;
    let debugString = op + ':' + domain__debug(getDomain(indexR, true)) + '=' + debugArgs;

    ASSERT_LOG2('   - key=', key, ';', constraintHash[key] !== undefined);
    if (constraintHash[key] !== undefined) {
      ASSERT_LOG2(' - dedupeBoolyList; Found dupe constraint; eliminating the second one');
      ASSERT_LOG2('    - #1:', debugHash[key]);
      ASSERT_LOG2('    - #2:', debugString);
      ml_eliminate(ml, pc, opSize);
      return;
    }

    constraintHash[key] = 1;
    debugHash[key] = debugString;

    let R = getDomain(indexR, true);
    let safeR = !domain_hasNoZero(R) && domain_size(R) === 2; // dont do <=2 because [0 0] is a constant and irrelevant here (and also caught by the above check, anyways)
    ASSERT_LOG2('   - R:', domain__debug(R), ', size=', domain_size(R), ', has zero:', !domain_hasNoZero(R), '--> is safe?', safeR);
    if (safeR) {
      // okay R has only two values and one of them is zero
      // try to match the arg constraints only. if we find a dupe with
      // the same R domain then we can alias that R with this one

      // we'll encode the domain instead of indexR to prevent
      // multiple args on different R's to clash

      // while R may not look it, it still represents a unique domain so we can use the
      // encoded value as is here. wrap it to prevent clashes with indexes and numdoms
      let key2 = op + ':[' + R + ']' + '=' + args;
      ASSERT_LOG2('   - key2:', key2);

      let index = constraintHash[key2];
      if (index !== undefined) {
        index = getAlias(index);
        ASSERT_LOG2(' - dedupeBoolyList; Found dupe reifier; eliminating the second one, aliasing', indexR, 'to', index);
        ASSERT_LOG2('    - #1:', debugHash[key2]);
        ASSERT_LOG2('    - #2:', debugString);
        ml_eliminate(ml, pc, opSize);
        ASSERT(indexR !== index, 'this case should have been caught by the other deduper');
        ASSERT(getDomain(indexR) === getDomain(index), 'should have already asserted that these two domains have only two values, a zero and a non-zero, and that they are equal');
        addAlias(indexR, index);
        return;
      }

      constraintHash[key2] = indexR;
      debugHash[key2] = debugString;
    }

    pc += opSize;
  }

  function dedupeNonBoolyList(op) {
    // sum, product

    let argCount = ml_dec16(ml, pc + 1);
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;

    // first we want to sort the list. we'll do this inline to prevent array creation
    ml_heapSort16bitInline(ml, pc + SIZEOF_COUNT, argCount);

    // now collect them. the key should end up with an ordered list
    let args = '';
    let debugArgs = '';
    for (let i = 0; i < argCount; ++i) {
      let argIndex = getAlias(ml_dec16(ml, pc + SIZEOF_COUNT + i * 2));
      args += argIndex + ' ';
      debugArgs += domain__debug(getDomain(argIndex, true));
    }

    let indexR = getAlias(ml_dec16(ml, pc + SIZEOF_COUNT + argCount * 2));

    // we'll add a key without indexR because the results of these ops are fixed (unlike booly ops)

    let key = op + ':' + '=' + args;
    let debugString = op + ':' + debugArgs;

    let index = constraintHash[key];
    if (index !== undefined) {
      index = getAlias(index);
      ASSERT_LOG2(' - dedupeNonBoolyList; Found dupe reifier; eliminating the second one, aliasing', indexR, 'to', index);
      ASSERT_LOG2('    - #1:', debugHash[key]);
      ASSERT_LOG2('    - #2:', debugString);
      ml_eliminate(ml, pc, opSize);
      if (indexR !== index) { // R = A <=? A (artifact)
        let domain = domain_intersection(getDomain(index, true), getDomain(indexR, true));
        setDomain(index, domain);
        addAlias(indexR, index);
      }
      return;
    }

    constraintHash[key] = indexR;
    debugHash[key] = debugString;

    pc += opSize;
  }

  function dedupeVoidList(op) {
    // sum, product

    let argCount = ml_dec16(ml, pc + 1);
    let opSize = SIZEOF_COUNT + argCount * 2;

    // first we want to sort the list. we'll do this inline to prevent array creation
    ml_heapSort16bitInline(ml, pc + SIZEOF_COUNT, argCount);

    // now collect them. the key should end up with an ordered list
    let args = '';
    let debugArgs = '';
    for (let i = 0; i < argCount; ++i) {
      let argIndex = getAlias(ml_dec16(ml, pc + SIZEOF_COUNT + i * 2));
      args += argIndex + ' ';
      debugArgs += domain__debug(getDomain(argIndex, true));
    }

    let key = op + ':' + '=' + args;
    let debugString = op + ':' + debugArgs;

    if (constraintHash[key] !== undefined) {
      ASSERT_LOG2(' - dedupeVoidList; Found dupe constraint; eliminating the second one');
      ASSERT_LOG2('    - #1:', debugHash[key]);
      ASSERT_LOG2('    - #2:', debugString);
      ml_eliminate(ml, pc, opSize);
      return;
    }

    constraintHash[key] = 1;
    debugHash[key] = debugString;

    pc += opSize;
  }

  function dedupeInvIseqIsneq(op) {
    ASSERT_LOG2(' - dedupeInvIseqIsneq;', op);
    // looking for this pattern:
    // : X [2 3]
    // R = X ==? 2
    // S = X !=? 3
    // which means R !^ S, or even == when R and S are size=2,min=0,R==S

    let indexA = getAlias(ml_dec16(ml, pc + 1));
    let indexB = getAlias(ml_dec16(ml, pc + 3));
    let indexR = getAlias(ml_dec16(ml, pc + 5));

    // if A or B is a constant, then B will be a constant afterwards, and A (only) as well if they are both constants
    if (indexB < indexA) {
      let t = indexB;
      indexB = indexA;
      indexA = t;
    }

    let A = getDomain(indexA, true);
    let B = getDomain(indexB, true);

    // verify fingerprint
    if (domain_size(A) !== 2) {
      ASSERT_LOG2(' - size(A) != 2, bailing');
      return false;
    }

    let vB = domain_getValue(B);
    if (vB < 0 || !domain_containsValue(A, vB)) {
      ASSERT_LOG2(' - B wasnt a constant or A didnt contain B, bailing');
      return false;
    }

    // fingerprint matches. A contains the solved value B and one other value
    // check if opposite op is known

    let invA = domain_removeValue(A, vB);
    ASSERT(domain_isSolved(invA), 'if A had two values and one of them vB, then invA should have one value');
    let otherValue = domain_getValue(invA);
    let indexInvA = addVar(undefined, otherValue, false, false, true); // just gets the index for this constant
    ASSERT(getDomain(indexInvA) === domain_createValue(otherValue), 'should alias to a constant');
    let invOp = op === '==?' ? '!=?' : '==?';
    let key = invOp + ':' + indexA + ',' + indexInvA;
    let debugString = op + ':' + domain__debug(getDomain(indexR, true)) + '=' + domain__debug(getDomain(indexA, true)) + ',' + domain__debug(getDomain(indexB, true));

    let indexS = constraintHash[key];
    if (indexS === undefined) {
      let thisKey = op + ':' + indexA + ',' + indexB;
      ASSERT_LOG2(' - opposite for ' + op + ' (' + invOp + ') doesnt exist, adding this key then bailing');
      ASSERT_LOG2(' - checked for key=', key, ', now adding key:', thisKey);

      constraintHash[thisKey] = indexR;
      debugHash[thisKey] = debugString;

      return false;
    }

    ASSERT_LOG2(' - found the opposite of this constraint;');
    ASSERT_LOG2('    - #1:', debugHash[key]);
    ASSERT_LOG2('    - #2:', debugString);
    ASSERT_LOG2(' - indexR !^ indexS, and perhaps indexR == indexS, check that case first');

    let R = getDomain(indexR, true);
    if (domain_size(R) === 2 && !domain_hasNoZero(R) && R === getDomain(indexS, true)) {
      ASSERT_LOG2(' - indexR == indexS because', domain__debug(R), 'has two elements, one of them zero, and R==S');
      addAlias(indexR, indexS);
      ml_eliminate(ml, pc, SIZEOF_VVV);
    } else {
      ASSERT_LOG2(' - indexR !^ indexS because R=', domain__debug(R), ', S=', domain__debug(getDomain(indexS, true)), '; R may still end up with a different value from S');
      ml_vvv2vv(ml, pc, ML_XNOR, indexR, indexS);
    }

    // dont update pc
    return true;
  }

  function innerLoop() {
    while (pc < ml.length && !emptyDomain) {
      ++__opCounter;
      let op = ml[pc];
      ASSERT_LOG2(' -- DD pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, problem, true));
      switch (op) {

        case ML_EQ:
          dedupePairU('==');
          break;
        case ML_NEQ:
          dedupePairU('!=');
          break;
        case ML_LT:
          dedupePairO('<');
          break;
        case ML_LTE:
          dedupePairO('<=');
          break;
        case ML_AND:
          dedupePairU('&');
          break;
        case ML_OR:
          dedupePairU('|');
          break;
        case ML_XOR:
          dedupePairU('^');
          break;
        case ML_NAND:
          dedupePairU('!&');
          break;
        case ML_XNOR:
          dedupePairU('!^');
          break;

        case ML_ISEQ:
          if (!dedupeInvIseqIsneq('==?')) dedupeReifierTripU('==?');
          break;
        case ML_ISNEQ:
          if (!dedupeInvIseqIsneq('!=?')) dedupeReifierTripU('!=?');
          break;
        case ML_ISLT:
          dedupeReifierTripO('<?');
          break;
        case ML_ISLTE:
          dedupeReifierTripO('<=?');
          break;
        case ML_ISALL2:
          dedupeReifierTripU('isall');
          break;

        case ML_ISALL:
          dedupeBoolyList('isall');
          break;
        case ML_ISNALL:
          dedupeBoolyList('isnall');
          break;
        case ML_ISNONE:
          dedupeBoolyList('isnone');
          break;

        case ML_NALL:
          dedupeVoidList('nall');
          break;
        case ML_DISTINCT:
          dedupeVoidList('distinct');
          break;

        case ML_PLUS:
          dedupeTripU('+');
          break;
        case ML_MINUS:
          dedupeTripO('-');
          break;
        case ML_MUL:
          dedupeTripU('*');
          break;
        case ML_DIV:
          dedupeTripO('/');
          break;

        case ML_SUM:
          dedupeNonBoolyList('sum');
          break;
        case ML_PRODUCT:
          dedupeNonBoolyList('product');
          break;

        case ML_START:
          if (pc !== 0) {
            return ml_throw(ml, pc, 'deduper problem found START');
          }
          ++pc;
          break;

        case ML_STOP:
          return constraintHash;

        case ML_DEBUG:
          pc += SIZEOF_V;
          return;

        case ML_JMP:
          pc += SIZEOF_V + ml_dec16(ml, pc + 1);
          break;
        case ML_JMP32:
          pc += SIZEOF_W + ml_dec32(ml, pc + 1);
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
          ml_throw(ml, pc, '(dd) unknown op');
      }
    }
    if (!emptyDomain) ml_throw(ml, pc, '(dd) ML OOB');
  }
}

// BODY_STOP

export {
  deduper,
};
