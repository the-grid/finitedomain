// problem optimizer
// take an input problem and determine whether constraints can be pruned
// or domains cut before actually generating their propagators

import {
  $CHANGED,
  $REJECTED,
  $SOLVED,
  $STABLE,

  ASSERT,
  ASSERT_LOG2,
  ASSERT_NORDOM,
  THROW,
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
  ml_dec8,
  ml_dec16,
  ml_dec32,
  ml_enc8,
  ml_enc16,
  ml_eliminate,
  ml_jump,
  ml_pump,
  ml_skip,
  ml_validateSkeleton,
  ml_vvv2vv,
  ml_vvv2vvv,
} from './ml';
import {
  domain__debug,
  domain_createEmpty,
  domain_createValue,
  domain_getValue,
  domain_hasNoZero,
  domain_intersection,
  domain_intersectionValue,
  domain_invMul,
  domain_isBool,
  domain_isSolved,
  domain_isZero,
  domain_max,
  domain_min,
  domain_mul,
  domain_removeGte,
  domain_removeGtUnsafe,
  domain_removeLte,
  domain_removeLtUnsafe,
  domain_removeValue,
  domain_sharesNoElements,
  domain_size,
} from './domain';
import domain_plus from './domain_plus';
import domain_minus from './domain_minus';

// BODY_START

function min_run(ml, problem, domains, names, firstRun, once) {
  ASSERT_LOG2('min_run, loop:', firstRun, ', byte code:', ml);
  ASSERT_LOG2(ml__debug(ml, 0, 20, problem));
  // now we can access the ml in terms of bytes, jeuj
  let state = min_optimizeConstraints(ml, problem, domains, names, firstRun, once);
  if (state === $SOLVED) {
    ASSERT_LOG2('minimizing solved it!', state); // all constraints have been eliminated
  } else if (state === $REJECTED) {
    ASSERT_LOG2('minimizing rejected it!', state); // an empty domain was found or a literal failed a test
  } else {
    ASSERT_LOG2('pre-optimization finished, not yet solved');
  }
  return state;
}

function min_optimizeConstraints(ml, problem, domains, names, firstRun, once) {
  ASSERT_LOG2('min_optimizeConstraints', ml);
  ASSERT_LOG2(problem.domains.length > 100 ? '' : '  <' + problem.domains.map((d, i) => i + ' : ' + problem.varNames[i] + ' : ' + domain__debug(problem.getDomain(i))).join('>, <') + '>');
  ASSERT_LOG2('minimize sweep, ml len=', ml.length, ', firstRun=', firstRun, 'once=', once);
  let varChanged = true;
  let onlyJumps = true;
  let emptyDomain = false;
  let lastPcOffset = 0;
  let lastOp = 0;
  let pc = 0;
  let loops = 0;
  let constraints = 0; // count a constraint going forward, ignore jumps, reduce when restarting from same pc

  let {
    addVar,
    addAlias,
    getAlias,
    getDomain,
    setDomain,
  } = problem;

  while (varChanged) {
    ++loops;
    //console.log('- looping', loops);
    console.time('-> min_loop ' + loops);
    ASSERT_LOG2('min outer loop');
    varChanged = false;
    pc = 0;
    constraints = 0;
    let ops = min_innerLoop();
    ASSERT_LOG2('changed?', varChanged, 'only jumps?', onlyJumps, 'empty domain?', emptyDomain);
    if (emptyDomain) {
      console.log('Empty domain at', lastPcOffset, 'for opcode', lastOp, [ml__debug(ml, lastPcOffset, 1, problem)], ml.slice(lastPcOffset, lastPcOffset + 10));
      console.error('Empty domain, problem rejected');
    }
    console.timeEnd('-> min_loop ' + loops);
    console.log('   - ops this loop:', ops, 'constraints:', constraints);
    if (emptyDomain) return $REJECTED;
    if (onlyJumps) return $SOLVED;

    ASSERT_LOG2('intermediate state:');
    ASSERT_LOG2(ml__debug(ml, 0, 20, problem));
    if (once) break;
    firstRun = false;
  }
  if (loops === 1) return $STABLE;
  return $CHANGED;

  // ####################################################################################

  function readIndex(ml, offset) {
    // get an index from ml. check for alias, and if so, immediately compile back the alias to improve future fetches.
    let index = ml_dec16(ml, offset);
    let alias = getAlias(index);
    if (alias !== index) ml_enc16(ml, offset, alias);
    return alias;
  }

  function getDomainFast(index) {
    ASSERT(index >= 0 && index <= 0xffff, 'expecting valid index', index);
    ASSERT(getAlias(index) === index, 'index should be unaliased', index, getAlias(index));

    let domain = getDomain(index, true);
    ASSERT(domain, 'domain cant be falsy', domain);
    ASSERT_NORDOM(domain);

    if (!domain) setEmpty(index, 'bad state (empty domain should have been detected sooner)');
    return domain;
  }

  function updateDomain(index, domain, desc) {
    ASSERT_LOG2(' - updateDomain; {', index, '} updated from', domain__debug(getDomain(index)), 'to', domain__debug(domain));
    ASSERT(!domain || domain_intersection(getDomain(index), domain), 'should never add new values to a domain, only remove them', 'index=', index, 'old=', domain__debug(getDomain(index)), 'new=', domain__debug(domain), 'desc=', desc);

    setDomain(index, domain);

    if (domain) varChanged = true;
    else emptyDomain = true;

    return emptyDomain;
  }

  function setEmpty(index, desc) {
    ASSERT_LOG2(' - :\'( setEmpty({', index, '})', desc);
    emptyDomain = true;
    if (index >= 0) updateDomain(index, domain_createEmpty(), 'explicitly empty' + (desc ? '; ' + desc : ''));
  }

  function min_innerLoop() {
    let ops = 0;
    onlyJumps = true;
    while (pc < ml.length && !emptyDomain) {
      ++ops;
      ++constraints;
      let pcStart = pc;
      lastPcOffset = pc;
      let op = ml[pc];
      lastOp = op;

      ASSERT_LOG2('# CRc[' + pcStart + ']:', op, '(0x' + op.toString(16) + ')');
      switch (op) {
        case ML_START:
          if (pc !== 0) {
            ASSERT_LOG2('reading a op=zero at position ' + pc + ' which should not happen', ml.slice(Math.max(pc - 100, 0), pc), '<here>', ml.slice(pc, pc + 100));
            return THROW(' ! optimizer problem @', pc);
          }
          ++pc;
          --constraints; // not a constraint
          break;

        case ML_STOP:
          ASSERT_LOG2(' ! good end @', pcStart);
          --constraints; // not a constraint
          return ops;

        case ML_EQ:
          ASSERT_LOG2('- eq vv @', pcStart);
          min_eq(ml, pc);
          break;

        case ML_NEQ:
          ASSERT_LOG2('- neq vv @', pcStart);
          min_neq(ml, pc);
          break;

        case ML_LT:
          ASSERT_LOG2('- lt vv @', pcStart);
          min_lt(ml, pc);
          break;

        case ML_LTE:
          ASSERT_LOG2('- lte vv @', pcStart);
          min_lte(ml, pc);
          break;

        case ML_NALL:
          ASSERT_LOG2('- nall @', pcStart);
          min_nall(ml, pc);
          break;

        case ML_ISALL:
          ASSERT_LOG2('- isall @', pcStart);
          min_isAll(ml, pc);
          break;

        case ML_ISALL2:
          ASSERT_LOG2('- isall2 @', pcStart);
          min_isAll2(ml, pc);
          break;

        case ML_ISNALL:
          ASSERT_LOG2('- isnall @', pcStart);
          min_isNall(ml, pc);
          break;

        case ML_ISNONE:
          ASSERT_LOG2('- isnone @', pcStart);
          min_isNone(ml, pc);
          break;

        case ML_DISTINCT:
          ASSERT_LOG2('- distinct @', pcStart);
          min_distinct(ml, pc);
          break;

        case ML_PLUS:
          ASSERT_LOG2('- plus @', pcStart);
          min_plus(ml, pc);
          break;

        case ML_MINUS:
          ASSERT_LOG2('- minus @', pcStart);
          min_minus(ml, pc);
          break;

        case ML_MUL:
          ASSERT_LOG2('- mul @', pcStart);
          min_mul(ml, pc);
          break;

        case ML_DIV:
          ASSERT_LOG2('- div @', pcStart);
          min_div(ml, pc);
          break;

        case ML_ISEQ:
          ASSERT_LOG2('- iseq vvv @', pcStart);
          min_isEq(ml, pc);
          break;

        case ML_ISNEQ:
          ASSERT_LOG2('- isneq vvv @', pcStart);
          min_isNeq(ml, pc);
          break;

        case ML_ISLT:
          ASSERT_LOG2('- islt vvv @', pcStart);
          min_isLt(ml, pc);
          break;

        case ML_ISLTE:
          ASSERT_LOG2('- islte vvv @', pcStart);
          min_isLte(ml, pc);
          break;

        case ML_SUM:
          ASSERT_LOG2('- sum @', pcStart);
          min_sum(ml, pc);
          break;

        case ML_PRODUCT:
          ASSERT_LOG2('- product @', pcStart);
          min_product(ml, pc);
          break;

        case ML_AND:
          ASSERT_LOG2('- and @', pcStart);
          min_and(ml, pc);
          break;

        case ML_OR:
          ASSERT_LOG2('- or @', pcStart);
          min_or(ml, pc);
          break;

        case ML_XOR:
          ASSERT_LOG2('- xor @', pcStart);
          min_xor(ml, pc);
          break;

        case ML_NAND:
          ASSERT_LOG2('- nand @', pcStart);
          min_nand(ml, pc);
          break;

        case ML_XNOR:
          ASSERT_LOG2('- xnor @', pcStart);
          min_xnor(ml, pc);
          break;

        case ML_DEBUG:
          ASSERT_LOG2('- debug @', pc);
          pc += SIZEOF_V;
          break;

        case ML_NOOP:
          ASSERT_LOG2('- noop @', pc);
          min_moveTo(ml, pc, 1);
          --constraints; // not a constraint
          break;
        case ML_NOOP2:
          ASSERT_LOG2('- noop2 @', pc);
          min_moveTo(ml, pc, 2);
          --constraints; // not a constraint
          break;
        case ML_NOOP3:
          ASSERT_LOG2('- noop3 @', pc);
          min_moveTo(ml, pc, 3);
          --constraints; // not a constraint
          break;
        case ML_NOOP4:
          ASSERT_LOG2('- noop4 @', pc);
          min_moveTo(ml, pc, 4);
          --constraints; // not a constraint
          break;
        case ML_JMP:
          ASSERT_LOG2('- jmp @', pc);
          min_moveTo(ml, pc, SIZEOF_V + ml_dec16(ml, pc + 1));
          --constraints; // not a constraint
          break;
        case ML_JMP32:
          ASSERT_LOG2('- jmp32 @', pc);
          min_moveTo(ml, pc, SIZEOF_W + ml_dec32(ml, pc + 1));
          --constraints; // not a constraint
          break;

        default:
          THROW('(mn) unknown op: 0x' + op.toString(16), ' at', pc);
      }
      if (pc === pcStart) {
        ASSERT_LOG2(' - restarting op from same pc...');
        --constraints; // constraint may have been eliminated
      }
    }
    if (emptyDomain) {
      return ops;
    }
    return THROW('Derailed; expected to find STOP before EOF');
  }

  function min_moveTo(ml, offset, len) {
    ASSERT_LOG2(' - trying to move from', offset, 'to', offset + len, 'delta = ', len);
    switch (ml_dec8(ml, offset + len)) {
      case ML_NOOP:
      case ML_NOOP2:
      case ML_NOOP3:
      case ML_NOOP4:
      case ML_JMP:
      case ML_JMP32:
        ASSERT_LOG2('- moving to another jump so merging them now');
        ml_jump(ml, offset, len);
        pc = offset; // restart, make sure the merge worked
        break;
      default:
        pc = offset + len;
        break;
    }
  }

  function min_eq(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);

    if (indexA !== indexB) {
      let A = getDomainFast(indexA, 1);
      let B = getDomainFast(indexB, 3);

      ASSERT_LOG2(' = min_eq', indexA, '==', indexB, '   ->   ', domain__debug(A), '==', domain__debug(B));
      if (!A || !B) return;

      let R = domain_intersection(A, B);
      ASSERT_LOG2(' ->', domain__debug(R));
      if (A !== R) updateDomain(indexA, R, '(A) == B');
      if (B !== R) updateDomain(indexB, R, 'A == (B)');
      if (!R) return;

      // if R is solved, there's no way that A can become neq to B, so then we dont need to alias it.
      if (!domain_isSolved(R)) addAlias(indexB, indexA);
      varChanged = true;
    }

    // we can remove this constraint. eq will be enforced at solution-building time. an alias is added unless already solved.
    ASSERT_LOG2(' - eliminating eq', indexA, '==', indexB);
    ml_eliminate(ml, offset, SIZEOF_VV);
  }

  function min_neq(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let A = getDomainFast(indexA, 1);
    let B = getDomainFast(indexB, 3);

    ASSERT_LOG2(' = min_neq', indexA, '!=', indexB, '   ->   ', domain__debug(A), '!=', domain__debug(B));
    if (indexA === indexB) return setEmpty(indexA, 'X!=X falsum'); // (relevant) artifact case
    if (!A || !B) return;

    let solved = false;

    // if either is solved then the other domain should
    // become the result of unsolved_set "minus" solved_set
    let vA = domain_getValue(A);
    if (vA >= 0) {
      let oB = B;
      B = domain_removeValue(B, vA);
      if (oB !== B && updateDomain(indexB, B, 'A neq B with A solved')) return;
      solved = true;
    } else {
      let vB = domain_getValue(B);
      if (domain_getValue(B) >= 0) {
        let oA = A;
        A = domain_removeValue(A, vB);
        if (A !== oA && updateDomain(indexA, A, 'A neq B with B solved')) return;
        solved = true;
      }
    }

    // if the two domains share no elements the constraint is already satisfied
    if (!solved && !domain_intersection(A, B)) solved = true;

    ASSERT_LOG2(' ->', domain__debug(A), '!=', domain__debug(B), ', solved?', solved);

    // solved if the two domains (now) intersect to an empty domain
    if (solved) {
      ASSERT_LOG2(' - No element overlapping between', indexA, 'and', indexB, 'left so we can eliminate this neq');
      ASSERT(domain_sharesNoElements(A, B), 'if A or B solves, the code should have solved the neq');
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VV;
    }
  }

  function min_lt(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let A = getDomainFast(indexA, 1);
    let B = getDomainFast(indexB, 3);

    ASSERT_LOG2(' = min_lt', indexA, '<', indexB, '   ->   ', domain__debug(A), '<', domain__debug(B));
    if (indexA === indexB) return setEmpty(indexA, 'X<X falsum'); // (relevant) artifact case
    if (!A || !B) return;

    // relative comparison is easy; cut away any non-intersecting
    // values that violate the desired outcome. only when a A and
    // B have multiple intersecting values we have to keep this
    // constraint
    let oA = A;
    A = domain_removeGte(A, domain_max(B));
    if (A !== oA && updateDomain(indexA, A, 'A lt B')) return;

    let oB = B;
    B = domain_removeLte(B, domain_min(A));
    if (B !== oB && updateDomain(indexB, B, 'A lt B')) return;

    ASSERT_LOG2(' ->', domain__debug(A), '<', domain__debug(B));

    // any value in A must be < any value in B
    if (domain_max(A) < domain_min(B)) {
      ASSERT_LOG2(' - Eliminating lt because max(A)<min(B)');
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VV;
    }
  }

  function min_lte(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let A = getDomainFast(indexA, 1);
    let B = getDomainFast(indexB, 3);

    ASSERT_LOG2(' = min_lte', indexA, '<=', indexB, '   ->   ', domain__debug(A), '<=', domain__debug(B));
    if (!A || !B) return;

    if (indexA !== indexB) {
 // X <= X is a tautology

      // relative comparison is easy; cut away any non-intersecting
      // values that violate the desired outcome. only when a A and
      // B have multiple intersecting values we have to keep this
      // constraint

      let oA = A;
      A = domain_removeGtUnsafe(A, domain_max(B));
      if (A !== oA && updateDomain(indexA, A, 'A lte B')) return;

      // A is (now) empty so just remove it
      let oB = B;
      B = domain_removeLtUnsafe(B, domain_min(A));
      if (B !== oB && updateDomain(indexB, B, 'A lte B')) return;
    }

    ASSERT_LOG2(' ->', domain__debug(A), '<=', domain__debug(B));

    // any value in A must be < any value in B
    if (domain_max(A) <= domain_min(B)) {
      ASSERT_LOG2(' - Eliminating lte because max(A)<=min(B)');
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else if (indexA === indexB) {
      ASSERT_LOG2(' - Eliminating lte because max(A)<=min(A) is a tautology (once solved)');
      ml_eliminate(ml, offset, SIZEOF_VV);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VV;
    }
  }

  function min_nall(ml, offset) {
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let offsetArgs = offset + SIZEOF_COUNT;
    let opSize = SIZEOF_COUNT + argCount * 2;

    ASSERT_LOG2(' = min_nall', argCount, 'x');
    ASSERT_LOG2('  - ml for this nall:', ml.slice(offset, offset + opSize));
    ASSERT_LOG2('  -', Array.from(Array(argCount)).map((n, i) => readIndex(ml, offsetArgs + i * 2)));
    ASSERT_LOG2('  -', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))));

    if (!argCount) return setEmpty(-1, 'nall without args is probably a bug');

    let countStart = argCount;
    let lastIndex = -1;
    let lastDomain;

    // a nall only ensures at least one of its arg solves to zero
    for (let i = argCount - 1; i >= 0; --i) { // backwards because we're pruning dud indexes
      let index = readIndex(ml, offsetArgs + i * 2);
      let domain = getDomainFast(index);

      ASSERT_LOG2('  - loop i=', i, 'index=', index, 'domain=', domain__debug(domain));
      if (!domain) return;

      if (domain_min(domain) > 0 || lastIndex === index) {
        // remove var from list
        ASSERT_LOG2(lastIndex === index ? ' - removing redundant dupe var from nall' : ' - domain contains no zero so remove var from this constraint');

        // now
        // - move all indexes bigger than the current back one position
        // - compile the new count back in
        // - compile a NOOP in the place of the last element
        ASSERT_LOG2('  - moving further domains one space forward (from ', i + 1, ' / ', argCount, ')');
        min_spliceArgSlow(ml, offsetArgs, argCount, i, false);
        --argCount;
      } else if (domain_isZero(domain)) {
        // remove constraint
        ASSERT_LOG2(' - domain solved to zero so constraint is satisfied');
        ml_eliminate(ml, offset, SIZEOF_COUNT + 2 * countStart);
        return;
      } else {
        // arg contains a 0 and is unsolved
        ASSERT_LOG2(' - domain contains zero and is not solved so leave it alone');
        lastIndex = index;
        lastDomain = domain;
      }
    }

    if (argCount === 0) {
      ASSERT_LOG2(' - Nall has no var left to be zero; rejecting problem');
      // this is a bad state: all vars were removed from this constraint which
      // means none of the args were zero and the constraint doesnt hold
      return setEmpty(lastIndex, 'nall; none of the args were zero');
    } else if (argCount === 1) {
      ASSERT_LOG2(' - Nall has one var left; forcing it to zero');
      // force set last index to zero and remove constraint. this should not
      // reject (because then the var would have been removed in loop above)
      // but do it "safe" anyways, just in case.
      let domain = domain_removeGtUnsafe(lastDomain, 0);
      if (lastDomain !== domain && updateDomain(lastIndex, domain)) return;
      ml_eliminate(ml, offset, SIZEOF_COUNT + 2 * countStart);
    } else if (argCount === 2) {
      ASSERT_LOG2(' - Nall has two vars left; morphing to a nand');
      // recompile as nand
      // list of vars should not have any holes (not even after elimination above) so we can just copy them.
      // ml len of this nall should be 7 bytes (op=1, count=2, A=2, B=2)
      // note: skip the count when reading!
      ml_enc8(ml, offset, ML_NAND);
      ml_pump(ml, offsetCount, 0, 2, 4); // copies the first arg over count and the second arg over the first
      // this should open up at least 2 bytes, maybe more, so skip anything from the old op right after the new op
      ml_skip(ml, offset + SIZEOF_VV, (SIZEOF_COUNT + 2 * countStart) - SIZEOF_VV);
    } else if (countStart !== argCount) {
      ASSERT_LOG2(' - recording new argcount and freeing up space');
      ml_enc16(ml, offsetCount, argCount); // write new count
      let free = (countStart - argCount) * 2;
      ml_jump(ml, offset + opSize - free, free);
      // note: still have to restart op because ml_jump may have clobbered the old end of the op with a new jump
    } else {
      ASSERT_LOG2(' - not only jumps...');

      onlyJumps = false;
      pc = offset + opSize;
    }
  }

  function min_isAll(ml, offset) {
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;
    let offsetArgs = offset + SIZEOF_COUNT;
    let offsetR = offset + opSize - 2;

    let indexR = readIndex(ml, offsetR);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_isAll', argCount, 'x');
    ASSERT_LOG2('  - ml for this isAll:', ml.slice(offset, offset + opSize));
    ASSERT_LOG2('  -', indexR, '= all?(', Array.from(Array(argCount)).map((n, i) => readIndex(ml, offsetArgs + i * 2)), ')');
    ASSERT_LOG2('  -', domain__debug(R), '= all?(', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))), ')');

    if (!R) return;

    if (domain_isZero(R)) {
      ASSERT_LOG2(' - R is 0 so morph to nall and revisit');
      // compile to nall and revisit
      ml_enc8(ml, offset, ML_NALL);
      ml_jump(ml, offset + opSize - 2, 2); // difference between nall with R=0 and an isAll is the result var (16bit)
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' - R is non-zero so remove zero from all args and eliminate constraint');
      for (let i = 0; i < argCount; ++i) {
        let index = readIndex(ml, offsetArgs + i * 2);
        let domain = getDomainFast(index);
        ASSERT_LOG2('    - index=', index, 'dom=', domain__debug(domain));
        if (!domain) return;
        let newDomain = domain_removeValue(domain, 0);
        if (newDomain !== domain && updateDomain(index, newDomain)) return;
      }
      ml_eliminate(ml, offset, opSize);
      return;
    }

    // R is unresolved. check whether R can be determined
    ASSERT(domain_min(R) === 0 && domain_max(R) > 0, 'R is unresolved here', R);
    let allNonZero = true;
    let someAreZero = false;
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offsetArgs + i * 2);
      let domain = getDomainFast(index);
      ASSERT_LOG2('    - index=', index, 'dom=', domain__debug(domain));

      // reflect isAll,
      // R=0 when at least one arg is zero
      // R>0 when all args have no zero

      if (domain_isZero(domain)) {
        ASSERT_LOG2(' - found a zero, breaking loop because R=0');
        someAreZero = true;
        break; // this permanently sets R to 0; no need to loop further
      } else if (domain_min(domain) === 0) {
        // arg has zero and non-zero values so R (at least) cant be set to 1 yet
        allNonZero = false;
      }
    }

    if (someAreZero) {
      ASSERT_LOG2(' - At least one arg was zero so R=0 and constraint can be removed');
      let oR = R;
      R = domain_removeGtUnsafe(R, 0);
      if (R !== oR) updateDomain(indexR, R);
      ml_eliminate(ml, offset, opSize);
    } else if (allNonZero) {
      ASSERT_LOG2(' - No arg had zero so R=1 and constraint can be removed');
      let oR = R;
      R = domain_removeValue(R, 0);
      if (R !== oR) updateDomain(indexR, R);
      ml_eliminate(ml, offset, opSize);
    } else {
      // TODO: prune all args here that are nonzero? is that worth it?

      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + opSize;
    }
  }

  function min_isAll2(ml, offset) {
    // isall with exactly 2 args

    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_isAll2', indexR, '=', indexA, '&?', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '&?', domain__debug(B));
    if (!A || !B || !R) return;

    if (domain_isZero(R)) {
      ASSERT_LOG2(' - R is 0 so morph to nand and revisit');
      ml_vvv2vv(ml, offset, ML_NAND, indexA, indexB);
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' - R is non-zero so remove zero from all args and eliminate constraint');
      let oA = A;
      A = domain_removeValue(A, 0);
      if (A !== oA) updateDomain(indexA, A, 'isall2 A with R=1');
      let oB = B;
      B = domain_removeValue(B, 0);
      if (B !== oB) updateDomain(indexB, B, 'isall2 A with R=1');
      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    if (domain_isZero(A) || domain_isZero(B)) {
      ASSERT_LOG2(' - A or B is zero so R=0, eliminate constraint');
      let oR = R;
      R = domain_createValue(0);
      if (R !== oR) updateDomain(indexR, R, 'isall2 R=0 because A=0 or B=0');
      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    if (domain_hasNoZero(A) && domain_hasNoZero(B)) {
      ASSERT_LOG2(' - A and B have no zero so R>0, eliminate constraint');
      let oR = R;
      R = domain_removeValue(R, 0);
      if (R !== oR) updateDomain(indexR, R, 'isall2 R=1 because A>0 and B>0');
      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function min_isNall(ml, offset) {
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;
    let offsetArgs = offset + SIZEOF_COUNT;
    let offsetR = offset + opSize - 2;

    let indexR = readIndex(ml, offsetR);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_isNall', argCount, 'x');
    ASSERT_LOG2('  - ml for this isNall:', ml.slice(offset, offset + opSize));
    ASSERT_LOG2('  -', indexR, '= nall?(', Array.from(Array(argCount)).map((n, i) => readIndex(ml, offsetArgs + i * 2)), ')');
    ASSERT_LOG2('  -', domain__debug(R), '= nall?(', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))), ')');

    if (!R) return;

    if (domain_isZero(R)) {
      ASSERT_LOG2(' - R=0 so; !nall so; all so; we must remove zero from all args and eliminate constraint');
      for (let i = 0; i < argCount; ++i) {
        let index = readIndex(ml, offsetArgs + i * 2);
        let domain = getDomainFast(index);
        ASSERT_LOG2('    - index=', index, 'dom=', domain__debug(domain));
        if (!domain) return;
        let newDomain = domain_removeValue(domain, 0);
        if (newDomain !== domain && updateDomain(index, newDomain)) return;
      }
      ml_eliminate(ml, offset, opSize);
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' - R>0 so; nall. just morph and revisit');
      ml_enc8(ml, offset, ML_NALL);
      ml_jump(ml, offset + opSize - 2, 2); // difference between nall and isNall is the result var (16bit)
      return;
    }

    // R is unresolved. check whether R can be determined
    ASSERT(domain_min(R) === 0 && domain_max(R) > 0, 'R is unresolved here', R);
    let allNonZero = true;
    let someAreZero = false;
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offsetArgs + i * 2);
      let domain = getDomainFast(index);
      ASSERT_LOG2('    - index=', index, 'dom=', domain__debug(domain));

      // reflect isNall,
      // R=0 when all args have no zero
      // R>0 when at least one arg is zero

      if (domain_isZero(domain)) {
        ASSERT_LOG2(' - found a zero, breaking loop because R=0');
        someAreZero = true;
        break; // this permanently sets R to 0; no need to loop further
      } else if (domain_min(domain) === 0) {
        // arg has zero and non-zero values so R (at least) cant be set to 1 yet
        allNonZero = false;
      }
    }

    if (someAreZero) {
      ASSERT_LOG2(' - At least one arg was zero so R>=1 and constraint can be removed');
      let oR = R;
      R = domain_removeValue(R, 0);
      if (R !== oR) updateDomain(indexR, R, 'isnall, R>=1 because at least one var was zero');
      ml_eliminate(ml, offset, opSize);
    } else if (allNonZero) {
      ASSERT_LOG2(' - No arg had a zero so R=0 and constraint can be removed');
      let oR = R;
      R = domain_removeGtUnsafe(R, 0);
      if (R !== oR) updateDomain(indexR, R);
      ml_eliminate(ml, offset, opSize);
    } else {
      // TODO: prune all args here that are nonzero? is that worth it?

      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + opSize;
    }
  }

  function min_isNone(ml, offset) {
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;
    let offsetArgs = offset + SIZEOF_COUNT;
    let offsetR = offset + opSize - 2;

    let indexR = readIndex(ml, offsetR);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_isNone', argCount, 'x');
    ASSERT_LOG2('  - ml for this isNone:', ml.slice(offset, offset + opSize));
    ASSERT_LOG2('  -', indexR, '= none?(', Array.from(Array(argCount)).map((n, i) => readIndex(ml, offsetArgs + i * 2)), ')');
    ASSERT_LOG2('  -', domain__debug(R), '= none?(', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))), ')');

    if (!R) return;

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2('    - R>=1 so set all args to zero and eliminate');
      for (let i = 0; i < argCount; ++i) {
        let index = readIndex(ml, offsetArgs + i * 2);
        let domain = getDomainFast(index);
        ASSERT_LOG2('    - index=', index, 'dom=', domain__debug(domain));
        if (!domain) return;
        let newDomain = domain_removeGtUnsafe(domain, 0);
        if (newDomain !== domain && updateDomain(index, newDomain)) return;
      }
      ml_eliminate(ml, offset, opSize);
      return;
    }

    // R has a zero or is zero, determine whether there is any nonzero arg, or whether they are all zero
    let nonZero = false;
    let allZero = true;
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offsetArgs + i * 2);
      let domain = getDomainFast(index);
      ASSERT_LOG2('    - index=', index, 'dom=', domain__debug(domain));

      // reflect isNone,
      // R=0 when at least one arg is nonzero
      // R>0 when all args are zero

      if (domain_hasNoZero(domain)) {
        nonZero = true;
        break;
      }
      if (!domain_isZero(domain)) {
        allZero = false;
      }
    }

    if (nonZero) {
      ASSERT_LOG2(' - at least one arg had no zero so R=0, eliminate constraint');
      let oR = R;
      R = domain_removeGtUnsafe(R, 0);
      if (R !== oR) updateDomain(indexR, R, 'isnone R=0 because an arg had no zero');
      ml_eliminate(ml, offset, opSize);
    } else if (allZero) {
      ASSERT_LOG2(' - isnone, all args are 0 so R>=1, remove constraint');
      let oR = R;
      R = domain_removeValue(R, 0);
      if (R !== oR) updateDomain(indexR, R, 'isnone R>=1 because all args were zero');
      ml_eliminate(ml, offset, opSize);
    } else {
      // TODO: prune all args here that are zero? is that worth it?

      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_COUNT + argCount * 2 + 2;
    }
  }

  function min_distinct(ml, offset) {
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let offsetArgs = offset + SIZEOF_COUNT;
    let opSize = SIZEOF_COUNT + argCount * 2;

    ASSERT_LOG2(' = min_distinct', argCount, 'x');
    ASSERT_LOG2('  - ml for this distinct:', ml.slice(offset, offset + opSize));
    ASSERT_LOG2('  - indexes:', Array.from(Array(argCount)).map((n, i) => readIndex(ml, offsetArgs + i * 2)).join(', '));
    ASSERT_LOG2('  - domains:', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))).join(', '));

    if (!argCount) return setEmpty(-1, 'distinct without args is probably a bug');

    let countStart = argCount;

    // a distinct is basically a pyramid of neq's; one for each unique pair of the set
    // we loop back to front because we're splicing out vars while looping
    for (let i = argCount - 1; i >= 0; --i) {
      let indexA = readIndex(ml, offsetArgs + i * 2);
      let A = getDomainFast(indexA);
      ASSERT_LOG2('  - loop i=', i, 'index=', indexA, 'domain=', domain__debug(A));
      if (!A) return;

      let v = domain_getValue(A);
      if (v >= 0) {
        ASSERT_LOG2('  - solved, so removing', v, 'from all other domains and index', indexA, 'from the constraint');
        for (let j = 0; j < argCount; ++j) { // gotta loop through all args. args wont be removed in this loop.
          if (j !== i) {
            let indexB = readIndex(ml, offsetArgs + j * 2);
            let oB = getDomainFast(indexB);
            ASSERT_LOG2('    - loop j=', j, 'index=', indexB, 'domain=', domain__debug(oB));
            if (indexA === indexB) return updateDomain(indexA, domain_createEmpty(), 'distinct had this var twice, x!=x is a falsum'); // edge case

            let B = domain_removeValue(oB, v);
            if (B !== oB && updateDomain(indexB, B, 'distinct arg')) return;
          }
        }
        // so none of the other args have v and none of them ended up empty

        // now
        // - move all indexes bigger than the current back one position
        // - compile the new count back in
        // - compile a NOOP in the place of the last element
        ASSERT_LOG2('  - moving further domains one space forward (from ', i + 1, ' / ', argCount, ')', i + 1 < argCount);
        min_spliceArgSlow(ml, offsetArgs, argCount, i, true); // move R as well
        --argCount;
      }
    }

    if (argCount <= 1) {
      ASSERT_LOG2(' - Count is', argCount, '; eliminating constraint');
      ASSERT(argCount >= 0, 'cant be negative');
      ml_eliminate(ml, offset, opSize);
    } else if (argCount === 2) {
      ASSERT_LOG2(' - Count=2, recompiling to regular neq');
      // recompile as neq
      // list of vars should not have any holes (not even after elimination above) so we can just copy them.
      // ml len of this distinct should be 7 bytes (op=1, count=2, A=2, B=2)
      // note: skip the count when reading!
      ml_enc8(ml, offset, ML_NEQ);
      ml_pump(ml, offsetCount, 0, 2, 4); // copies the first arg over count and the second arg over the first
      // this should open up at least 2 bytes, maybe more, so skip anything from the old op right after the new op
      ml_skip(ml, offset + SIZEOF_VV, opSize - SIZEOF_VV);
    } else if (argCount !== countStart) {
      ASSERT_LOG2('  - recompiling new count (', argCount, ')');
      ml_enc16(ml, offset + 1, argCount);
      ASSERT_LOG2('  - compiling noop into empty spots'); // this hasnt happened yet
      ml_skip(ml, offsetArgs + argCount * 2, (countStart - argCount) * 2);
      // need to restart op because the skip may have clobbered the next op offset
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + opSize;
    }
  }

  function min_plus(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_plus', indexR, '=', indexA, '+', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '+', domain__debug(B));
    if (!A || !B || !R) return;

    // note: A + B = C   ==>   <loA + loB, hiA + hiB>
    // but:  A - B = C   ==>   <loA - hiB, hiA - loB>   (so the lo/hi of B gets swapped!)
    // keep in mind that any number oob <sub,sup> gets pruned in either case, this makes
    // plus and minus are not perfect (counter-intuitively): `[0, 2] - [0, 4] = [0, 2]`

    let ooA = A;
    let ooB = B;
    let ooR = R;

    let oA, oB, oR;
    let loops = 0;
    do {
      ++loops;
      ASSERT_LOG2(' - plus propagation step...', loops, domain__debug(R), '=', domain__debug(A), '+', domain__debug(B));
      oA = A;
      oB = B;
      oR = R;

      R = domain_intersection(R, domain_plus(A, B));
      A = domain_intersection(A, domain_minus(R, B));
      B = domain_intersection(B, domain_minus(R, A));
    } while (A !== oA || B !== oB || R !== oR);

    ASSERT_LOG2(' ->', 'R:', domain__debug(R), '= A:', domain__debug(A), '+ B:', domain__debug(B));

    if (loops > 1) {
      if (A !== ooA) updateDomain(indexA, A, 'plus A');
      if (B !== ooB) updateDomain(indexB, B, 'plus B');
      if (R !== ooR) updateDomain(indexR, R, 'plus R');
      if (!A || !B || !R) return;
    }

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) {
      ASSERT_LOG2(' - All args are solved so removing constraint');
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ml_eliminate(ml, offset, SIZEOF_VVV);
    } else if (min_plusAB(offset, indexB, indexA, indexR, A, B, R, 'A', 'B')) {
      return;
    } else if (min_plusAB(offset, indexA, indexB, indexR, B, A, R, 'B', 'A')) {
      return;
    } else {
      ASSERT_LOG2(' - not only jumps');
      onlyJumps = false;
      pc = offset + SIZEOF_VVV;
    }
  }
  function min_plusAB(offset, indexY, indexX, indexR, X, Y, R, nameX, nameY) {
    ASSERT_LOG2(' - min_plusAB', nameX, nameY, domain__debug(R), '=', domain__debug(X), '+', domain__debug(Y));
    ASSERT(domain_isSolved(X) + domain_isSolved(Y) + domain_isSolved(R) <= 1, 'at least two vars arent solved');
    let vX = domain_getValue(X);
    if (vX >= 0) {
      // note Y and R are _not_ solved here
      if (vX === 0) {
        ASSERT_LOG2(' -', nameX, '=0 so ', nameY, '0==R, rewriting op to eq');
        // rewrite to Y == R
        ml_vvv2vv(ml, offset, ML_EQ, indexR, indexY);
        return true;
      }

      let maxB = domain_max(Y);
      if (maxB <= 1 && domain_size(R) === 2 && vX < 0xff) {
        ASSERT(domain_max(R) > 1, 'if', nameY, '<= 1 then R must be >1 because R=B+A and ', nameX, ' is non-zero and', nameY, 'is not solved (both checked above) so R must be at least [1,2]');
        // B = R ==? A or B = R !=? A, that depends on max(R)==A
        ASSERT_LOG2(' -', nameX + '>0, ' + nameY + '<=1, size(R)=2. Morphing to iseq: ', (domain_max(R) === vX ? nameY + ' = R ==? ' + nameX : nameY + ' = R !=? ' + nameX), '->', domain__debug(Y), '=', domain__debug(R), (domain_max(R) === vX ? '==?' : '!=?'), vX);
        ml_vvv2vvv(ml, offset, domain_max(R) === vX ? ML_ISEQ : ML_ISNEQ, indexR, indexX, indexY);
        return true;
      }

      if (domain_max(R) <= 1 && domain_size(Y) === 2) {
        // A = R ==? B or A = R !=? B, that depends on max(B)==A
        ASSERT_LOG2(' - ' + nameX + ' > 0 R <= 1 and size(' + nameY + ')=2. Morphing to iseq: ', (maxB === vX ? 'R = B ==? A' : 'R = B !=? A'), '->', domain__debug(R), '=', domain__debug(Y), (maxB === vX ? '==?' : '!=?'), vX);
        ml_vvv2vvv(ml, offset, maxB === vX ? ML_ISEQ : ML_ISNEQ, indexY, indexX, indexR);
        return true;
      }
    }
  }

  function min_minus(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_minus', indexR, '=', indexA, '-', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '-', domain__debug(B));
    if (!A || !B || !R) return;

    // C = A - B   -> A = B + C, B = C - A
    // note: A - B = C   ==>   <loA - hiB, hiA - loB>
    // but:  A + B = C   ==>   <loA + loB, hiA + hiB>   (so the lo/hi of B gets swapped!)
    // keep in mind that any number oob <sub,sup> gets trimmed in either case.
    // this trimming may affect "valid" numbers in the other domains so that needs back-propagation.

    let ooA = A;
    let ooB = B;
    let ooR = R;

    let oA, oB, oR;
    let loops = 0;
    do {
      ++loops;
      ASSERT_LOG2(' - minus propagation step...', loops, domain__debug(R), '=', domain__debug(A), '+', domain__debug(B));
      oA = A;
      oB = B;
      oR = R;

      R = domain_intersection(R, domain_minus(A, B));
      A = domain_intersection(A, domain_plus(R, B));
      B = domain_intersection(B, domain_minus(A, R));
    } while (A !== oA || B !== oB || R !== oR);

    ASSERT_LOG2(' ->', 'A:', domain__debug(A), 'B:', domain__debug(B), 'R:', domain__debug(R));

    if (loops > 1) {
      if (A !== ooA) updateDomain(indexA, A, 'minus A');
      if (B !== ooB) updateDomain(indexB, B, 'minus B');
      if (R !== ooR) updateDomain(indexR, R, 'minus R');
      if (!A || !B || !R) return;
    }

    ASSERT((domain_isSolved(A) + domain_isSolved(B) + domain_isSolved(R)) !== 2, 'if two vars are solved the third should be solved as well');

    if (domain_isSolved(R) && domain_isSolved(A)) { // minR==maxR&&minA==maxA
      ASSERT(domain_isSolved(B), 'if two are solved then all three must be solved');
      ml_eliminate(ml, offset, SIZEOF_VVV);
    } else if (domain_getValue(A) === 0) { // maxA==0
      ASSERT_LOG2(' - A=0 so B==R, rewriting op to eq');
      ml_vvv2vv(ml, offset, ML_EQ, indexB, indexR);
    } else if (domain_getValue(B) === 0) { // maxB==0
      ASSERT_LOG2(' - B=0 so A==R, rewriting op to eq');
      ml_vvv2vv(ml, offset, ML_EQ, indexA, indexR);
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + SIZEOF_VVV;
    }
  }

  function min_mul(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_mul', indexR, '=', indexA, '*', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '*', domain__debug(B));
    if (!A || !B || !R) return;

    // C = A * B, B = C / A, A = C / B
    // note: A * B = C   ==>   <loA * loB, hiA * hiB>
    // but:  A / B = C   ==>   <loA / hiB, hiA / loB> and has rounding/div-by-zero issues! instead use "inv-mul" tactic
    // keep in mind that any number oob <sub,sup> gets pruned in either case. x/0=0
    // when dividing "do the opposite" of integer multiplication. 5/4=[] because there is no int x st 4*x=5
    // only outer bounds are evaluated here...

    let ooA = A;
    let ooB = B;
    let ooR = R;

    let oA, oB, oR;
    let loops = 0;
    do {
      ++loops;
      ASSERT_LOG2(' - mul propagation step...', loops, domain__debug(R), '=', domain__debug(A), '+', domain__debug(B));
      oA = A;
      oB = B;
      oR = R;

      R = domain_intersection(R, domain_mul(A, B));
      A = domain_intersection(A, domain_invMul(R, B));
      B = domain_intersection(B, domain_invMul(R, A));
    } while (A !== oA || B !== oB || R !== oR);

    ASSERT_LOG2(' ->', 'A:', domain__debug(A), 'B:', domain__debug(B), 'R:', domain__debug(R));

    if (loops > 1) {
      if (A !== ooA) updateDomain(indexA, A, 'mul A');
      if (B !== ooB) updateDomain(indexB, B, 'mul B');
      if (R !== ooR) updateDomain(indexR, R, 'mul R');
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

  function min_div(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_div', indexR, '=', indexA, '*', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '/', domain__debug(B));
    if (!A || !B || !R) return;

    // R = A / B, A = R * B, B = A / R
    // note:  A / B = C   ==>   <loA / hiB, hiA / loB> and has rounding/div-by-zero issues!
    // but: A * B = C   ==>   <loA * loB, hiA * hiB> use "inv-div" tactic
    // basically remove any value from the domains that can not lead to a valid integer result A/B=C

    let ooA = A;
    let ooB = B;
    let ooR = R;

    let oA, oB, oR;
    let loops = 0;
    do {
      ++loops;
      ASSERT_LOG2(' - div propagation step...', loops, domain__debug(R), '=', domain__debug(A), '/', domain__debug(B));
      oA = A;
      oB = B;
      oR = R;

      R = domain_intersection(R, domain_invMul(A, B));
      ASSERT_LOG2('   -> div:', loops, domain__debug(R), '=', domain__debug(A), '/', domain__debug(B));
      A = domain_intersection(A, domain_mul(R, B));
      ASSERT_LOG2('   -> mul:', loops, domain__debug(R), '=', domain__debug(A), '/', domain__debug(B));
      B = domain_intersection(B, domain_invMul(A, R));
      ASSERT_LOG2('   -> div:', loops, domain__debug(R), '=', domain__debug(A), '/', domain__debug(B));
    } while (A !== oA || B !== oB || R !== oR);

    ASSERT_LOG2(' ->', 'R:', domain__debug(R), '=', 'A:', domain__debug(A), '/', 'B:', domain__debug(B));

    // edge case for division (not multiplication)
    if (domain_isZero(B)) return updateDomain(indexR, domain_createEmpty(), 'div by zero');

    if (loops > 1) {
      if (A !== ooA) updateDomain(indexA, A, 'div A');
      if (B !== ooB) updateDomain(indexB, B, 'div B');
      if (R !== ooR) updateDomain(indexR, R, 'div R');
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

  function min_isEq(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_isEq', indexR, '=', indexA, '==?', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '==?', domain__debug(B));
    if (!A || !B || !R) return;

    let vA = domain_getValue(A);
    let vB = domain_getValue(B);

    if (vA >= 0 && vB >= 0) {
      ASSERT_LOG2(' - A and B are solved so we can determine R and eliminate the constraint');

      let oR = R;
      if (A === B) {
        R = domain_removeValue(R, 0);
        if (R !== oR) updateDomain(indexR, R, 'iseq R: A==B');
      } else {
        R = domain_intersectionValue(R, 0);
        if (R !== oR) updateDomain(indexR, R, 'iseq R: A!=B');
      }

      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    // A and B arent both solved. check R
    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! R=0 while A or B isnt solved, changing iseq to neq and revisiting');
      ml_vvv2vv(ml, offset, ML_NEQ, indexA, indexB);
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! R>=1 while A or B isnt solved, changing iseq to eq and revisiting');
      ml_vvv2vv(ml, offset, ML_EQ, indexA, indexB);
      return;
    }

    if (indexA === indexB) {
      ASSERT_LOG2(' ! index A === index B so R should be truthy and we can eliminate the constraint');
      let oR = R;
      R = domain_removeValue(R, 0);
      if (R !== oR) updateDomain(indexR, R, 'iseq R: A==B');
      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    if (!domain_intersection(A, B)) {
      ASSERT_LOG2(' - no overlap between', indexA, 'and', indexB, ' (', domain__debug(A), domain__debug(B), ') so R becomes 0 and constraint is removed');
      let oR = R;
      R = domain_removeGtUnsafe(R, 0);
      if (R !== oR) updateDomain(indexR, R, 'isEq no overlap A B so R=0');
      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    // there are some bool-domain-specific tricks we can apply
    if (domain_isBool(R)) {
      // if A=0|1, B=[0 1], R=[0 1] we can recompile this to NEQ or EQ
      if (vA >= 0 && vA <= 1 && domain_isBool(B)) {
        ASSERT_LOG2(' ! [01]=0|1==?[01] so morphing to n/eq and revisiting');
        // - A=0: 0==A=1, 1==A=0: B!=R
        // - A=1: 0==A=0, 1==A=1: B==R
        ml_vvv2vv(ml, offset, vA === 0 ? ML_NEQ : ML_EQ, indexB, indexR);
        return;
      }

      // if A=[0 1], B=0|1, R=[0 1] we can recompile this to NEQ or EQ
      if (vB >= 0 && vB <= 1 && domain_isBool(A)) {
        ASSERT_LOG2(' ! [01]=[01]==?0|1 so morphing to n/eq and revisiting');
        // - B=0: 0==B=1, 1==B=0: A!=R
        // - B=1: 0==B=0, 1==B=1: A==R
        ml_vvv2vv(ml, offset, vB === 0 ? ML_NEQ : ML_EQ, indexA, indexR);
        return;
      }

      if (vB >= 0) {
        // check for [01]=[00xx]==?x because in that case we can rewrite it to a XNOR
        if (domain_min(A) === 0 && domain_max(A) === vB && domain_size(A) === 2) {
          // [0,1] = [0,0, vB,vB] ==? vB    ->   (R=0 & A=0) | (R=1 & A=vB)  --> XNOR
          ASSERT_LOG2(' ! [01]=[00xx]==?x so morphing to XNOR and revisiting');
          ml_vvv2vv(ml, offset, ML_XNOR, indexA, indexR);
          return;
        }
      }
      if (vA >= 0) {
        // check for [01]=x==?[00xx] because in that case we can rewrite it to a XNOR
        if (domain_min(B) === 0 && domain_max(B) === vA && domain_size(B) === 2) {
          // [0,1] = [0,0, vB,vB] ==? vB    ->   (R=0 & A=0) | (R=1 & A=vB)  --> XNOR
          ASSERT_LOG2(' ! [01]=x==?[00xx] so morphing to XNOR and revisiting');
          ml_vvv2vv(ml, offset, ML_XNOR, indexB, indexR);
          return;
        }
      }
    }

    ASSERT_LOG2(' ->', domain__debug(R), '=', domain__debug(A), '==?', domain__debug(B));
    ASSERT(domain_min(R) === 0 && domain_max(R) > 0, 'R should be a booly at this point', domain__debug(R));

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function min_isNeq(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_isNeq', indexR, '=', indexA, '!=?', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '!=?', domain__debug(B));
    if (!A || !B || !R) return;

    if (domain_isSolved(A) && domain_isSolved(B)) {
      ASSERT_LOG2(' - A and B are solved so we can determine R');
      let oR = R;
      if (A === B) {
        R = domain_removeGtUnsafe(R, 0);
        if (R !== oR) updateDomain(indexR, R, 'isneq R; A==B');
      } else {
        R = domain_removeValue(R, 0);
        if (R !== oR) updateDomain(indexR, R, 'isneq R; A!=B');
      }
      ml_eliminate(ml, offset, SIZEOF_VVV);
      return;
    }

    // R should be 0 if A==B. R should be >0 if A!==B
    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! R=0, changing isneq to eq and revisiting');
      ml_vvv2vv(ml, offset, ML_EQ, indexA, indexB);
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! R>0, changing isneq to neq and revisiting');
      ml_vvv2vv(ml, offset, ML_NEQ, indexA, indexB);
      return;
    }

    ASSERT_LOG2(' ->', domain__debug(R), '=', domain__debug(A), '!=?', domain__debug(B));
    ASSERT_LOG2(' - not only jumps...');
    ASSERT(domain_min(R) === 0 && domain_max(R) >= 1, 'R should be boolable at this point');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function min_isLt(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_isLt', indexR, '=', indexA, '<?', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '<?', domain__debug(B));
    if (!A || !B || !R) return;

    let oR = R;
    if (!domain_isSolved(R)) {
      if (domain_max(A) < domain_min(B)) R = domain_removeValue(R, 0);
      else if (domain_min(A) >= domain_max(B)) R = domain_removeGtUnsafe(R, 0);
    }
    if (R !== oR && !updateDomain(indexR, R, 'islt; solving R because A < B or A >= B')) return;

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args

    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lte with swapped args in its place', indexB, 'and', indexA);
      ml_vvv2vv(ml, offset, ML_LTE, indexB, indexA);
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lt in its place for', indexA, 'and', indexB);
      ml_vvv2vv(ml, offset, ML_LT, indexA, indexB);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function min_isLte(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let offsetR = offset + 5;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let indexR = readIndex(ml, offsetR);

    let A = getDomainFast(indexA);
    let B = getDomainFast(indexB);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_isLte', indexR, '=', indexA, '<=?', indexB, '   ->   ', domain__debug(R), '=', domain__debug(A), '<=?', domain__debug(B));
    if (!A || !B || !R) return;

    let oR = R;
    if (!domain_isSolved(R)) {
      // if R isn't set you can't really update A or B. so we don't.
      if (domain_max(A) <= domain_min(B)) R = domain_removeValue(R, 0);
      else if (domain_min(A) > domain_max(B)) R = domain_removeGtUnsafe(R, 0);
    }
    if (R !== oR && updateDomain(indexR, R, 'islte; solving R because A and B are solved')) return;

    // if R is solved replace this isLt with an lt or "gt" and repeat.
    // the appropriate op can then prune A and B accordingly.
    // in this context, the inverse for lt is an lte with swapped args

    if (domain_isZero(R)) {
      ASSERT_LOG2(' ! result var solved to 0 so compiling an lt with swapped args in its place', indexB, 'and', indexA);
      ml_vvv2vv(ml, offset, ML_LT, indexB, indexA);
      return;
    }

    if (domain_hasNoZero(R)) {
      ASSERT_LOG2(' ! result var solved to 1 so compiling an lte in its place', indexA, 'and', indexB);
      ml_vvv2vv(ml, offset, ML_LTE, indexA, indexB);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VVV;
  }

  function min_sum(ml, offset) {
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;
    let offsetArgs = offset + SIZEOF_COUNT;
    let offsetR = offset + opSize - 2;

    let indexR = readIndex(ml, offsetR);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_sum', argCount, 'x');
    ASSERT_LOG2('  - ml for this sum:', ml.slice(offset, offset + opSize));
    ASSERT_LOG2('  - indexes:', indexR, '= sum(', Array.from(Array(argCount)).map((n, i) => readIndex(ml, offsetArgs + i * 2)).join(', '), ')');
    ASSERT_LOG2('  - domains:', domain__debug(R), '= sum(', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))).join(', '), ')');

    if (!R) return;

    // a sum is basically a pyramid of plusses; (A+B)+(C+D) etc
    // we loop back to front because we're splicing out vars while looping

    // replace all constants by one constant
    // prune the result var by intersecting it with the sum of the actual args
    // in limited cases we can prune some of the arg values if the result forces
    // that (if the result is max 10 then inputs can be pruned of any value > 10)
    // we cant really do anything else

    ASSERT_LOG2(' - first loop to get the sum of the args and constants');
    let sum = domain_createValue(0);
    let constants = 0;
    let constantSum = 0;
    for (let i = 0; i < argCount; ++i) {
      let argOffset = offsetArgs + i * 2;
      let index = readIndex(ml, argOffset);
      let domain = getDomainFast(index);
      ASSERT_LOG2('    - i=', i, ', offset=', argOffset, ', index=', index, 'dom=', domain__debug(domain), ', constants before:', constants, 'sum of constant before:', constantSum);
      let v = domain_getValue(domain);
      if (v >= 0) {
        ASSERT_LOG2('      - this is a constant! value =', v);
        ++constants;
        constantSum += v;
      }
      sum = domain_plus(sum, domain);
    }

    ASSERT_LOG2(' - total sum=', domain__debug(sum), ', constantSum=', constantSum, 'with', constants, 'constants. applying to R', domain__debug(R), '=>', domain__debug(domain_intersection(sum, R)));

    let oR = R;

    if (constants === argCount) { // bit of an edge case, though it can happen after multiple passes
      ASSERT_LOG2(' - all sum args are constants so R must simply eq their sum, eliminating constraint');
      R = domain_intersectionValue(R, constantSum);
      if (R !== oR) updateDomain(indexR, R, 'setting R to sum of constants');
      ml_eliminate(ml, offset, opSize);
      return;
    }

    R = domain_intersection(sum, R);
    ASSERT_LOG2(' - Updated R from', domain__debug(oR), 'to', domain__debug(R));
    if (R !== oR && updateDomain(indexR, R, 'sum; updating R with outer bounds of its args;')) return;

    ASSERT(constantSum <= domain_max(R), 'the sum of constants should not exceed R', constantSum);

    // get R without constants to apply to var args
    let subR = constantSum ? domain_minus(R, domain_createValue(constantSum)) : R;
    ASSERT(subR, 'R-constants should not be empty', constantSum);

    ASSERT_LOG2(' - Now back propagating R to the args. R-constants:', domain__debug(subR));

    // have to count constants and sum again because if a var occurs twice and this
    // updates it to a constant, the second one would otherwise be missed as old.
    constants = 0;
    constantSum = 0;

    // we can only trim bounds, not a full intersection (!)
    // note that trimming may lead to more constants so dont eliminate them here (KIS)
    let minSR = domain_min(subR);
    let maxSR = domain_max(subR);
    let varIndex1 = -1; // track non-constants for quick optimizations for one or two vars
    let varIndex2 = -1;
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offsetArgs + i * 2);
      let domain = getDomainFast(index);
      ASSERT_LOG2('    - i=', i, ', index=', index, 'dom=', domain__debug(domain));
      let v = domain_getValue(domain);
      if (v >= 0) {
        ASSERT_LOG2('      - old constant (or var that occurs twice and is now a new constant)', v);
        ++constants;
        constantSum += v;
      } else {
        // so the idea is that any value in an arg that could not even appear in R if all other args
        // were zero, is a value that cant ever yield a solution. those are the values we trim here.
        // this process takes constants in account (hence subR) because they don't have a choice.
        let newDomain = domain_removeLtUnsafe(domain, minSR);
        newDomain = domain_removeGtUnsafe(domain, maxSR);
        if (newDomain !== domain && updateDomain(index, newDomain, 'plus arg; trim invalid values')) return;

        v = domain_getValue(newDomain);
        if (v >= 0) {
          ASSERT_LOG2('      - new constant', v);
          // arg is NOW also a constant
          ++constants;
          constantSum += v;
        } else if (varIndex1 === -1) {
          ASSERT_LOG2('      - first non-constant');
          varIndex1 = index;
        } else if (varIndex2 === -1) {
          ASSERT_LOG2('      - second non-constant');
          varIndex2 = index;
        }
      }
    }

    ASSERT_LOG2(' -> There are now', constants, 'constants and', argCount - constants, 'actual vars. Constants sum to', constantSum, ', R=', domain__debug(R));
    ASSERT_LOG2(' -> Current args: ', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))).join(' '), ' Result:', domain__debug(R));

    let valuesToSumLeft = (argCount - constants) + (constantSum === 0 ? 0 : 1);
    ASSERT_LOG2(' - args:', argCount, ', constants:', constants, ', valuesToSumLeft=', valuesToSumLeft, ', constantSum=', constantSum, ', varIndex1=', varIndex1, ', varIndex2=', varIndex2);
    ASSERT(valuesToSumLeft > 0 || (constantSum === 0 && argCount === constants), 'a sum with args cant have no values left here unless there are only zeroes (it implies empty domains and should incur early returns)', valuesToSumLeft);

    if (valuesToSumLeft === 2) {
      ASSERT_LOG2(' - Two concrete vars/values left to sum, rewriting to a plus');
      ASSERT_LOG2(' - Var 1 is index', varIndex1, 'and var 2 is', (constantSum ? 'the constant ' + constantSum : 'var index ' + varIndex2));
      ASSERT(varIndex1 >= 0 && (constantSum ? varIndex2 === -1 : varIndex2 >= 0), 'if there are non-zero constants there should not be a second non-constant here otherwise expecting a second var');

      // morph the sum to a plus with either a constant and a var or with two vars

      let newIndexA = varIndex1;
      let newIndexB = constantSum ? addVar(undefined, constantSum, undefined, false, true) : varIndex2;

      ASSERT(argCount >= 2, 'old sum needs to be big enough to fit the plus. it should have had at least two args to get to this point in code, which is sufficient');
      ASSERT(opSize > SIZEOF_VVV, 'expecting to have some space left after morph');
      ml_enc8(ml, offset, ML_PLUS);
      ml_enc16(ml, offset + 1, newIndexA);
      ml_enc16(ml, offset + 3, newIndexB);
      ml_enc16(ml, offset + 5, indexR);
      ml_skip(ml, offset + SIZEOF_VVV, opSize - SIZEOF_VVV);

      ASSERT_LOG2(' - Changed to a plus on index', newIndexA, 'and', (constants ? 'constant value ' + constantSum : 'index ' + newIndexB));
      ASSERT_LOG2(' - ml for this sum now:', ml.slice(offset, offset + opSize));
    } else if (valuesToSumLeft === 1) { // ignore constants if they are zero!
      ASSERT(varIndex2 === -1, 'we shouldnt have found a second var', varIndex2);
      if (constantSum > 0) {
        ASSERT_LOG2(' - Using the sum of constants:', constantSum);
        ASSERT(varIndex1 === -1, 'so we didnt find a first var', varIndex1);
        varIndex1 = addVar(undefined, constantSum, false, false, true);
      }

      ASSERT_LOG2(' - Morphing to an eq with', varIndex1);
      ASSERT(opSize > SIZEOF_VV, 'should always have enough space');
      ASSERT(varIndex1 >= 0, 'index should be valid (even if its for the constant sum)');
      // the len of this sum is at least op+len+arg+R or 1 + 2 + 2 + 2 = 7. the len
      // of an eq is always 5 (1+2+2) so just replace it and append a noop2 to it
      ml_enc8(ml, offset, ML_EQ);
      ml_enc16(ml, offset + 1, varIndex1);
      ml_enc16(ml, offset + 3, indexR);
      ml_skip(ml, offset + SIZEOF_VV, opSize - SIZEOF_VV);

      ASSERT_LOG2(' - Changed to an eq on index=', varIndex1, 'and indexR= ' + indexR);
      ASSERT_LOG2(' - ml for this sum now:', ml.slice(offset, offset + opSize));
    } else if (constants > 1) {
      ASSERT_LOG2(' - Unable to morph but there are', constants, 'constants to collapse to a single arg with value', constantSum);
      // there are constants and they did not morph or eliminate the constraint; consolidate them.
      // loop backwards, remove all constants except one, move all other args back to compensate,
      // only update the index of the last constant, update the count, compile a jump for the new trailing space

      let newOpSize = opSize - (constants - 1) * 2;

      for (let i = argCount - 1; i >= 0 && constants; --i) {
        let argOffset = offsetArgs + i * 2;
        let index = readIndex(ml, argOffset);
        let domain = getDomainFast(index);
        ASSERT_LOG2('    - i=', i, ', index=', index, 'dom=', domain__debug(domain));
        if (domain_isSolved(domain)) {
          if (constants === 1) {
            ASSERT_LOG2('      - Overwriting the last constant at', argOffset, 'with an index for total constant value', constantSum);
            let index = addVar(undefined, constantSum, false, false, true);
            ml_enc16(ml, offsetArgs + i * 2, index);
            break; // probably not that useful, might even be bad to break here
          } else {
            ASSERT_LOG2('      - found a constant to remove at', argOffset, ', moving further domains one space forward (from ', i + 1, ' / ', argCount, ')', i + 1 < argCount);
            ASSERT(constants > 0, 'should have some constants');
            min_spliceArgSlow(ml, offsetArgs, argCount, i, true); // also moves R
            --argCount;
          }
          --constants;
        }
      }

      ml_enc16(ml, offset + 1, argCount);
      // now "blank out" the space of eliminated constants, they should be at the end of the op
      ml_skip(ml, offset + newOpSize, opSize - newOpSize);

      ASSERT_LOG2(' - Cleaned up constant args');
      ASSERT_LOG2(' - ml for this sum now:', ml.slice(offset, offset + opSize));
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + opSize;
    }
  }

  function min_spliceArgSlow(ml, argsOffset, argCount, argIndex, includingResult) {
    ASSERT_LOG2('      - min_spliceArgSlow(', argsOffset, argCount, argIndex, includingResult, ')');
    let toCopy = argCount;
    if (includingResult) ++toCopy;
    for (let i = argIndex + 1; i < toCopy; ++i) {
      let fromOffset = argsOffset + i * 2;
      let toOffset = argsOffset + (i - 1) * 2;
      ASSERT_LOG2('        - moving', ((includingResult && i === argCount - 1) ? 'R' : 'arg ' + (i + (includingResult ? 0 : 1)) + '/' + argCount), 'at', fromOffset, 'and', fromOffset + 1, 'moving to', toOffset, 'and', toOffset + 1);
      ml[toOffset] = ml[fromOffset];
      ml[toOffset + 1] = ml[fromOffset + 1];
    }
  }

  function min_product(ml, offset) {
    let offsetCount = offset + 1;
    let argCount = ml_dec16(ml, offsetCount);
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;
    let offsetArgs = offset + SIZEOF_COUNT;
    let offsetR = offset + opSize - 2;

    let indexR = readIndex(ml, offsetR);
    let R = getDomainFast(indexR);

    ASSERT_LOG2(' = min_product', argCount, 'x');
    ASSERT_LOG2('  - ml for this product:', ml.slice(offset, offset + opSize));
    ASSERT_LOG2('  - indexes:', indexR, '= product(', Array.from(Array(argCount)).map((n, i) => readIndex(ml, offsetArgs + i * 2)).join(', '), ')');
    ASSERT_LOG2('  - domains:', domain__debug(R), '= product(', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))).join(', '), ')');

    if (!R) return;

    // a product is basically a pyramid of muls; (A*B)*(C*D) etc
    // we loop back to front because we're splicing out vars while looping

    // replace all constants by one constant
    // prune the result var by intersecting it with the product of the actual args
    // in limited cases we can prune some of the arg values if the result forces
    // that (if the result is max 10 then inputs can be pruned of any value > 10)
    // we cant really do anything else

    ASSERT_LOG2(' - first loop to get the product of the args and constants');
    let product = domain_createValue(1);
    let constants = 0;
    let constantProduct = 1;
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offsetArgs + i * 2);
      let domain = getDomainFast(index);
      ASSERT_LOG2('    - i=', i, ', index=', index, 'dom=', domain__debug(domain), ', constant product before:', constantProduct);
      let v = domain_getValue(domain);
      if (v >= 0) {
        ++constants;
        constantProduct *= v;
      }
      product = domain_mul(product, domain);
    }

    ASSERT_LOG2(' - total product=', domain__debug(product), ', constantProduct=', constantProduct, 'with', constants, 'constants. applying to R', domain__debug(R), '=', domain__debug(domain_intersection(product, R)));

    let oR = R;

    if (constants === argCount) { // bit of an edge case, though it can happen after multiple passes
      ASSERT_LOG2(' - all product args are constants so R must simply eq their product, eliminating constraint;', domain__debug(R), '&', domain__debug(domain_createValue(constantProduct)), '=', domain__debug(domain_intersectionValue(R, constantProduct)));
      R = domain_intersectionValue(R, constantProduct);
      if (R !== oR) updateDomain(indexR, R, 'setting R to product of constants');
      ml_eliminate(ml, offset, opSize);
      return;
    }

    if (constantProduct === 0) {
      // edge case; if a constant produced zero then R will be zero and all args are free
      ASSERT_LOG2(' - there was a zero constant so R=0 and all args are free, eliminating constraint');
      R = domain_intersectionValue(R, 0);
      if (R !== oR) updateDomain(indexR, R, 'setting R to zero');
      ml_eliminate(ml, offset, opSize);
      return;
    }

    R = domain_intersection(product, R);
    ASSERT_LOG2(' - Updated R from', domain__debug(oR), 'to', domain__debug(R));
    if (R !== oR && updateDomain(indexR, R, 'product; updating R with outer bounds of its args;')) return;

    if (domain_isZero(R)) {
      ASSERT_LOG2(' - R=0 so at least one arg must be 0, morph this to a nall');
      ml_enc8(ml, offset, ML_NALL);
      ml_skip(ml, offset + opSize - 2, 2); // cuts off R
      return;
    }

    // from this point R isnt zero and none of the args is solved to zero (but could still have it in their domain!)
    // this simplifies certain decisions :)

    ASSERT(domain_invMul(R, constantProduct), 'R should be a multiple of the constant sum');
    ASSERT(domain_min(R) === 0 || Number.isFinite(domain_min(R) / constantProduct), 'min(R) should be the result of the constants multiplied by other values, so dividing it should result in an integer');
    ASSERT(Number.isFinite(domain_max(R) / constantProduct), 'max(R) should be the result of the constants multiplied by other values, so dividing it should result in an integer');

    // get R without constants to apply to var args
    let subR = constantProduct === 1 ? R : domain_invMul(R, domain_createValue(constantProduct));
    ASSERT(subR, 'R-constants should not be empty');

    ASSERT_LOG2(' - Now back propagating R to the args, R without constants:', domain__debug(subR));

    // we can only trim bounds, not a full intersection (!)
    // note that trimming may lead to more constants so dont eliminate them here (KIS)
    let minSR = domain_min(subR);
    let maxSR = domain_max(subR);
    let varIndex1 = -1; // track non-constants for quick optimizations for one or two vars
    let varIndex2 = -1;
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offsetArgs + i * 2);
      let domain = getDomainFast(index);
      ASSERT_LOG2('    - i=', i, ', index=', index, 'dom=', domain__debug(domain));
      let v = domain_getValue(domain);
      if (v < 0) { // ignore constants
        // so the idea is that any value in an arg that could not even appear in R if all other args
        // were zero, is a value that cant ever yield a solution. those are the values we trim here.
        // this process takes constants in account (hence subR) because they don't have a choice.
        let newDomain = domain_removeLtUnsafe(domain, minSR);
        newDomain = domain_removeGtUnsafe(domain, maxSR);
        if (newDomain !== domain && updateDomain(index, newDomain, 'product arg; trim invalid values')) return;

        v = domain_getValue(newDomain);
        if (v >= 0) {
          ASSERT_LOG2('      - constant', v);
          // arg is NOW also a constant
          ++constants;
          constantProduct += v;
        } else if (varIndex1 === -1) {
          ASSERT_LOG2('      - first non-constant');
          varIndex1 = index;
        } else if (varIndex2 === -1) {
          ASSERT_LOG2('      - second non-constant');
          varIndex2 = index;
        }
      }
    }

    ASSERT_LOG2(' -> There are now', constants, 'constants and', argCount - constants, 'actual vars. Constants mul to', constantProduct, ', R=', domain__debug(R));
    ASSERT_LOG2(' -> Current args: ', Array.from(Array(argCount)).map((n, i) => domain__debug(getDomainFast(readIndex(ml, offsetArgs + i * 2)))).join(' '), ' Result:', domain__debug(R));

    let valuesToMulLeft = (argCount - constants) + (constantProduct === 1 ? 0 : 1);
    ASSERT(valuesToMulLeft > 0 || (constantProduct === 1 && argCount === constants), 'a product with args cant have no values left here unless the constants are all 1 (it implies empty domains and should incur early returns)', valuesToMulLeft);

    if (valuesToMulLeft === 2) {
      ASSERT_LOG2(' - Two concrete vars/values left to mul, rewriting to a mul');
      ASSERT_LOG2(' - Var 1 is index', varIndex1, 'and var 2 is', (constantProduct ? 'the constant ' + constantProduct : 'var index ' + varIndex2));
      ASSERT(varIndex1 >= 0 && (constantProduct ? varIndex2 === -1 : varIndex2 >= 0), 'if there are non-zero constants there should not be a second non-constant here otherwise expecting a second var');

      // morph the product to a mul with either a constant and a var or with two vars

      let newIndexA = varIndex1;
      let newIndexB = constantProduct ? addVar(undefined, constantProduct, undefined, false, true) : varIndex2;

      ASSERT(argCount >= 2, 'old product needs to be big enough to fit the plus. it should have had at least two args to get to this point in code, which is sufficient');
      ASSERT(opSize > SIZEOF_VVV, 'expecting to have some space left after morph');
      ml_enc8(ml, offset, ML_MUL);
      ml_enc16(ml, offset + 1, newIndexA);
      ml_enc16(ml, offset + 3, newIndexB);
      ml_enc16(ml, offset + 5, indexR);
      ml_skip(ml, offset + SIZEOF_VVV, opSize - SIZEOF_VVV);

      ASSERT(ml_validateSkeleton(ml, 'min_product; case 1'));

      ASSERT_LOG2(' - Changed to a mul on index', newIndexA, 'and', (constants ? 'constant value ' + constantProduct : 'index ' + newIndexB));
      ASSERT_LOG2(' - ml for this product now:', ml.slice(offset, offset + opSize));
    } else if (valuesToMulLeft === 1) { // ignore constants if they are zero!
      ASSERT(varIndex2 === -1, 'we shouldnt have found a second var', varIndex2);
      if (constantProduct !== 1) {
        ASSERT_LOG2(' - Using the product of constants:', constantProduct);
        ASSERT(varIndex1 === -1, 'so we didnt find a first var', varIndex1);
        varIndex1 = addVar(undefined, constantProduct, false, false, true);
      }

      ASSERT_LOG2(' - Morphing to an eq with', varIndex1);
      ASSERT(opSize > SIZEOF_VV, 'should always have enough space');
      // the len of this product is at least op+len+arg+R or 1 + 2 + 2 + 2 = 7. the len
      // of an eq is always 5 (1+2+2) so just replace it and append a noop2 to it
      ml_enc8(ml, offset, ML_EQ);
      ml_enc16(ml, offset + 1, varIndex1);
      ml_enc16(ml, offset + 3, indexR);
      ml_skip(ml, offset + SIZEOF_VV, opSize - SIZEOF_VV);

      ASSERT(ml_validateSkeleton(ml, 'min_product; case 2'));

      ASSERT_LOG2(' - Changed to an eq on index=', varIndex1, 'and indexR= ' + indexR);
      ASSERT_LOG2(' - ml for this product now:', ml.slice(offset, offset + opSize));
    } else if (constants > 1) {
      ASSERT_LOG2(' - Unable to morph but there are', constants, 'constants to collapse to a single arg with value', constantProduct);
      // there are constants and they did not morph or eliminate the constraint; consolidate them.
      // loop backwards, remove all constants except one, move all other args back to compensate,
      // only update the index of the last constant, update the count, compile a jump for the new trailing space

      let newOpSize = opSize - (constants - 1) * 2;

      for (let i = argCount - 1; i >= 0 && constants; --i) {
        let index = readIndex(ml, offsetArgs + i * 2);
        let domain = getDomainFast(index);
        ASSERT_LOG2('    - i=', i, ', index=', index, 'dom=', domain__debug(domain), ', constant?', domain_isSolved(domain));
        if (domain_isSolved(domain)) {
          if (constants === 1) {
            ASSERT_LOG2(' - Overwriting the last constant with an index for the total constant value');
            let index = addVar(undefined, constantProduct, false, false, true);
            ml_enc16(ml, offsetArgs + i * 2, index);
          } else {
            ASSERT_LOG2('  - found a constant, moving further domains one space forward (from ', i + 1, ' / ', argCount, ')', i + 1 < argCount);
            ASSERT(constants > 0, 'should have some constants');
            min_spliceArgSlow(ml, offsetArgs, argCount, i, true); // move R as well
            --argCount;
          }
          --constants;
        }
      }

      let emptySpace = opSize - newOpSize;
      ASSERT_LOG2(' - constants squashed, compiling new length (', argCount, ') and a jump for the empty space (', emptySpace, 'bytes )');
      ml_enc16(ml, offset + 1, argCount);
      // now "blank out" the space of eliminated constants, they should be at the end of the op
      ASSERT(emptySpace > 0, 'since at least two constants were squashed there should be some bytes empty now');
      ml_skip(ml, offset + newOpSize, emptySpace);

      ASSERT_LOG2(' - ml for this product now:', ml.slice(offset, offset + opSize));
      ASSERT(ml_validateSkeleton(ml, 'min_product; case 3'));

      ASSERT_LOG2(' - Cleaned up constant args');
    } else {
      ASSERT_LOG2(' - not only jumps...');
      onlyJumps = false;
      pc = offset + opSize;
    }
  }

  function min_and(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let A = getDomainFast(indexA, 1);
    let B = getDomainFast(indexB, 3);

    ASSERT_LOG2(' = min_and', indexA, '|', indexB, '   ->   ', domain__debug(A), '&', domain__debug(B));
    if (!A || !B) return;

    let oA = A;
    A = domain_removeValue(oA, 0);
    if (oA !== A && updateDomain(indexA, A, 'AND A')) return;

    let oB = B;
    B = domain_removeValue(oB, 0);
    if (oB !== B && updateDomain(indexB, B, 'AND B')) return;

    ASSERT_LOG2(' ->', domain__debug(A), '&', domain__debug(B));

    ml_eliminate(ml, offset, SIZEOF_VV);
  }

  function min_or(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let A = getDomainFast(indexA, 1);
    let B = getDomainFast(indexB, 3);

    ASSERT_LOG2(' = min_or', indexA, '|', indexB, '   ->   ', domain__debug(A), '|', domain__debug(B));
    if (!A || !B) return;

    if (domain_isZero(A)) {
      ASSERT_LOG2(' - A=0 so remove 0 from B', domain__debug(B), '->', domain__debug(domain_removeValue(B, 0)));
      let oB = B;
      B = domain_removeValue(oB, 0);
      if (B !== oB) updateDomain(indexB, B, 'OR B');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_isZero(B)) {
      ASSERT_LOG2(' - B=0 so remove 0 from A', domain__debug(A), '->', domain__debug(domain_removeValue(A, 0)));
      let oA = A;
      A = domain_removeValue(oA, 0);
      if (A !== oA) updateDomain(indexA, A, 'OR A');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_hasNoZero(A) || domain_hasNoZero(B)) {
      ASSERT_LOG2(' - at least A or B has no zero so remove constraint');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VV;
  }

  function min_xor(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let A = getDomainFast(indexA, 1);
    let B = getDomainFast(indexB, 3);

    ASSERT_LOG2(' = min_xor', indexA, '^', indexB, '   ->   ', domain__debug(A), '^', domain__debug(B));
    if (!A || !B) return;

    if (domain_isZero(A)) {
      ASSERT_LOG2(' - A=0 so B must be >=1');
      let oB = B;
      B = domain_removeValue(B, 0);
      if (B !== oB) updateDomain(indexB, B, 'xor B>=1');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_isZero(B)) {
      ASSERT_LOG2(' - B=0 so A must be >=1');
      let oA = A;
      A = domain_removeValue(A, 0);
      if (A !== oA) updateDomain(indexA, A, 'xor A>=1');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_hasNoZero(A)) {
      ASSERT_LOG2(' - A>=1 so B must be 0');
      let oB = B;
      B = domain_removeGtUnsafe(B, 0);
      if (B !== oB) updateDomain(indexB, B, 'xor B=0');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_hasNoZero(B)) {
      ASSERT_LOG2(' - B>=1 so A must be 0');
      let oA = A;
      A = domain_removeGtUnsafe(A, 0);
      if (A !== oA) updateDomain(indexA, A, 'xor A=0');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VV;
  }

  function min_nand(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let A = getDomainFast(indexA, 1);
    let B = getDomainFast(indexB, 3);

    ASSERT_LOG2(' = min_nand', indexA, '!&', indexB, '   ->   ', domain__debug(A), '!&', domain__debug(B));
    if (!A || !B) return;

    if (indexA === indexB) {
      let oA = A;
      A = domain_removeGtUnsafe(A, 0);
      if (A !== oA) updateDomain(indexA, A, '`A !& A` means A is zero');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_isZero(A) || domain_isZero(B)) {
      ASSERT_LOG2(' - A=0 or B=0, eliminating constraint');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_hasNoZero(A)) {
      ASSERT_LOG2(' - A>=1 so B must be 0');
      let oB = B;
      B = domain_removeGtUnsafe(B, 0);
      if (B !== oB) updateDomain(indexB, B, 'nand B');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_hasNoZero(B)) {
      ASSERT_LOG2(' - B>=1 so A must be 0');
      let oA = A;
      A = domain_removeGtUnsafe(A, 0);
      if (A !== oA) updateDomain(indexA, A, 'nand A');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VV;
  }

  function min_xnor(ml, offset) {
    let offsetA = offset + 1;
    let offsetB = offset + 3;
    let indexA = readIndex(ml, offsetA);
    let indexB = readIndex(ml, offsetB);
    let A = getDomainFast(indexA, 1);
    let B = getDomainFast(indexB, 3);

    ASSERT_LOG2(' = min_xnor', indexA, '!^', indexB, '   ->   ', domain__debug(A), '!^', domain__debug(B));
    if (!A || !B) return;

    if (domain_isZero(A)) {
      ASSERT_LOG2(' - A=0 so B must be 0');
      let oB = B;
      B = domain_removeGtUnsafe(B, 0);
      if (B !== oB) updateDomain(indexB, B, 'xnor B');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_isZero(B)) {
      ASSERT_LOG2(' - B=0 so A must be 0');
      let oA = A;
      A = domain_removeGtUnsafe(A, 0);
      if (A !== oA) updateDomain(indexA, A, 'xnor A');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_hasNoZero(A)) {
      ASSERT_LOG2(' - A>=1 so B must be >=1');
      let oB = B;
      B = domain_removeValue(B, 0);
      if (B !== oB) updateDomain(indexB, B, 'xnor B');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    if (domain_hasNoZero(B)) {
      ASSERT_LOG2(' - B>=1 so A must be >=1');
      let oA = A;
      A = domain_removeValue(A, 0);
      if (A !== oA) updateDomain(indexA, A, 'xnor A');
      ml_eliminate(ml, offset, SIZEOF_VV);
      return;
    }

    ASSERT_LOG2(' - not only jumps...');
    onlyJumps = false;
    pc = offset + SIZEOF_VV;
  }
}

// BODY_STOP

export {
  min_run,
  min_optimizeConstraints,
};
