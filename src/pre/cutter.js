// note: you can use the tool at https://qfox.github.io/logic-table-filter/ to test some of these tricks
// enter the names of the vars, the formulae (in proper JS), and the var considered a leaf and you can
// quickly see whether the rewrite is valid or not.

import {
  ASSERT,
  TRACE,
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
  ml_getOpSizeSlow,
  ml_getRecycleOffset,
  ml_getRecycleOffsets,
  ml_jump,
  ml_recycles,
  ml_throw,
  ml_validateSkeleton,

  ml_any2c,
  ml_c2vv,
  ml_cr2vv,
  ml_vv2vv,
  ml_vvv2vv,
  ml_vvv2vvv,
} from './ml';
import {
  domain__debug,
  domain_booly,
  domain_containsValue,
  domain_createEmpty,
  domain_createValue,
  domain_createRange,
  domain_hasNoZero,
  domain_intersection,
  domain_intersectionValue,
  domain_isBool,
  domain_isSolved,
  domain_isZero,
  domain_min,
  domain_max,
  domain_getValue,
  domain_removeValue,
  domain_removeGte,
  domain_removeLte,
  domain_removeGtUnsafe,
  domain_removeLtUnsafe,
  domain_size,
} from './domain';
import domain_plus from './domain_plus';

import {
  BOUNTY_MAX_OFFSETS_TO_TRACK,
  //BOUNTY_ISALL_RESULT_ONLY_FLAG,
  BOUNTY_ISALL_RESULT,
  //BOUNTY_ISEQ_ARG_ONLY_FLAG,
  BOUNTY_ISEQ_ARG,
  BOUNTY_LTE_LHS_ONLY_FLAG,
  BOUNTY_LTE_LHS,
  BOUNTY_LTE_RHS_ONLY_FLAG,
  BOUNTY_LTE_RHS,
  //BOUNTY_NALL_ONLY_FLAG,
  BOUNTY_NALL,
  BOUNTY_NAND_ONLY_FLAG,
  BOUNTY_NAND,
  BOUNTY_NEQ_ONLY_FLAG,
  BOUNTY_NEQ,
  BOUNTY_NOT_BOOLY_ONLY_FLAG,
  BOUNTY_OR_ONLY_FLAG,
  BOUNTY_OR,
  //BOUNTY_OTHER_ONLY_FLAG,
  //BOUNTY_OTHER_BOOLY,
  //BOUNTY_OTHER_NONBOOLY,
  //BOUNTY_PLUS_RESULT_ONLY_FLAG,
  BOUNTY_PLUS_RESULT,
  //BOUNTY_SUM_RESULT_ONLY_FLAG,
  BOUNTY_SUM_RESULT,

  bounty__debug,
  bounty__debugMeta,
  bounty_collect,
  bounty_getCounts,
  bounty_getMeta,
  bounty_getOffset,
  bounty_markVar,
} from './bounty';

// BODY_START


function cutter(ml, problem, once) {
  TRACE('\n ## cutter', ml);

  let getDomain = problem.getDomain;
  let setDomain = problem.setDomain;
  let addAlias = problem.addAlias;
  let getAlias = problem.getAlias;
  let solveStack = problem.solveStack;
  let isConstant = problem.isConstant;

  let pc = 0;

  let bounty;

  let stacksBefore;
  let emptyDomain = false;
  let changes = 0;
  let loops = 0;
  do {
    console.time('-> cut_loop ' + loops);
    TRACE(' # start cutter outer loop', loops);
    bounty = bounty_collect(ml, problem, bounty);

    stacksBefore = solveStack.length;
    changes = 0;
    cutLoop();
    console.timeEnd('-> cut_loop ' + loops);
    console.log('   - end cutter outer loop', loops, ', removed:', solveStack.length - stacksBefore, ' vars, total changes:', changes, ', emptyDomain =', emptyDomain, 'once=', once);
    ++loops;
  } while (!emptyDomain && changes && !once);

  TRACE('## exit cutter');
  if (emptyDomain) return -1;
  return loops;

  function somethingChanged() {
    ++changes;
  }

  function readIndex(ml, offset) {
    ASSERT(ml instanceof Buffer, 'ml should be a buffer');
    ASSERT(typeof offset === 'number' && offset >= 0 && offset <= ml.length, 'expecting valid offset');
    ASSERT(arguments.length === 2, 'only two args');
    return getAlias(ml_dec16(ml, offset));
  }

  function getMeta(bounty, index, _debug) {
    ASSERT(typeof index === 'number' && index >= 0 && index <= 0xffff, 'expecting valid index');
    ASSERT(arguments.length === 2 || arguments.length === 3, 'only two or three args');
    if (!isConstant(index)) return bounty_getMeta(bounty, index, _debug);
    return 0;
  }

  function getCounts(bounty, index) {
    ASSERT(typeof index === 'number' && index >= 0 && index <= 0xffff, 'expecting valid index');
    ASSERT(arguments.length === 2, 'no more than two args');
    if (!isConstant(index)) return bounty_getCounts(bounty, index);
    return 0;
  }

  // ##############

  function cutNeq(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);

    TRACE(' ! cutNeq; ', indexA, '!=', indexB, '::', domain__debug(getDomain(indexA, true)), '!=', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    TRACE('  - counts:', countsA, countsB, ', meta:', countsA && getMeta(bounty, indexA), countsB && getMeta(bounty, indexB));

    if (countsA === 1) {
      return leafNeq(ml, offset, indexA, indexB, indexA, indexB);
    }

    if (countsB === 1) {
      return leafNeq(ml, offset, indexB, indexA, indexA, indexB);
    }

    let TRICK_INV_NEQ_FLAGS = BOUNTY_LTE_LHS_ONLY_FLAG | BOUNTY_LTE_RHS_ONLY_FLAG | BOUNTY_OR_ONLY_FLAG | BOUNTY_NAND_ONLY_FLAG;

    if (countsA >= 2 && countsA <= BOUNTY_MAX_OFFSETS_TO_TRACK) {
      let metaA = getMeta(bounty, indexA);
      TRACE('  - meta A:', bounty__debugMeta(metaA));

      // first remove the booly flag, then check if it has any targeted ops, then check if it has no other stuff
      let m = (metaA | BOUNTY_NOT_BOOLY_ONLY_FLAG) ^ BOUNTY_NOT_BOOLY_ONLY_FLAG;
      let hasGoodOps = m & TRICK_INV_NEQ_FLAGS;
      let hasBadOps = (m | TRICK_INV_NEQ_FLAGS | BOUNTY_NEQ_ONLY_FLAG) ^ (TRICK_INV_NEQ_FLAGS | BOUNTY_NEQ_ONLY_FLAG);
      if ((metaA & BOUNTY_NEQ) === BOUNTY_NEQ && hasGoodOps && !hasBadOps) {
        if (trickNeqElimination(indexA, countsA)) return;
      }
    }

    if (countsB >= 2 && countsB <= BOUNTY_MAX_OFFSETS_TO_TRACK) {
      let metaB = getMeta(bounty, indexB);
      TRACE('  - meta B:', bounty__debugMeta(metaB));

      // first remove the booly flag, then check if it has any targeted ops, then check if it has no other stuff
      let m = (metaB | BOUNTY_NOT_BOOLY_ONLY_FLAG) ^ BOUNTY_NOT_BOOLY_ONLY_FLAG;
      let hasGoodOps = m & TRICK_INV_NEQ_FLAGS;
      let hasBadOps = (m | TRICK_INV_NEQ_FLAGS | BOUNTY_NEQ_ONLY_FLAG) ^ (TRICK_INV_NEQ_FLAGS | BOUNTY_NEQ_ONLY_FLAG);

      TRACE('  - has good:', hasGoodOps, ', hasBad:', hasBadOps);

      if (hasGoodOps && !hasBadOps) {
        if (trickNeqElimination(indexB, countsB)) return;
      }
    }

    pc += SIZEOF_VV;
  }

  function cutLt(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);

    TRACE(' ! cutLt; ', indexA, '<', indexB, '::', domain__debug(getDomain(indexA, true)), '<', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    TRACE('  - counts:', countsA, countsB, ', meta:', countsA && getMeta(bounty, indexA), countsB && getMeta(bounty, indexB));

    if (countsA === 1) {
      return leafLt(ml, offset, indexA, indexB, 'lhs');
    }

    if (countsB === 1) {
      return leafLt(ml, offset, indexA, indexB, 'rhs');
    }

    pc += SIZEOF_VV;
  }

  function cutLte(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);

    TRACE(' ! cutLte; ', indexA, '<=', indexB, '::', domain__debug(getDomain(indexA, true)), '<=', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    TRACE('  - counts:', countsA, countsB, ', meta:', countsA && bounty__debugMeta(getMeta(bounty, indexA)), countsB && bounty__debugMeta(getMeta(bounty, indexB)));

    if (countsA === 1) {
      return leafLte(ml, offset, indexA, indexB, 'lhs');
    }

    if (countsB === 1) {
      return leafLte(ml, offset, indexA, indexB, 'rhs');
    }

    if (countsA > 0) {
      let metaA = getMeta(bounty, indexA);

      if (countsA === 2) {
        if ((metaA & BOUNTY_NAND) === BOUNTY_NAND && trickNandLteLhs(ml, indexA, offset, metaA, countsA)) return;
        // note: if it wasnt 2x lte then the flag would contain, at least, another flag as well.
        if (metaA === BOUNTY_LTE_LHS && trickLteLhsTwice(indexA, offset, metaA, countsA)) return;
      }

      if (countsA >= 3) {
        if (metaA === (BOUNTY_OR | BOUNTY_NAND | BOUNTY_LTE_LHS) && trickOrLteLhsNands(indexA, countsA)) return;
        if (metaA === (BOUNTY_OR | BOUNTY_NAND | BOUNTY_LTE_LHS | BOUNTY_LTE_RHS) && trickOrNandLteBoth(indexA, countsA)) return;
      }

      if (countsA > 1) {
        if ((metaA & BOUNTY_ISALL_RESULT) === BOUNTY_ISALL_RESULT && trickLteLhsIsall(ml, offset, indexA, metaA, countsA)) return;
      }
    }

    if (countsB === 2) {
      let metaB = getMeta(bounty, indexB);
      if (metaB === (BOUNTY_LTE_RHS | BOUNTY_ISALL_RESULT) && trickLteRhsIsallEntry(indexB, offset, metaB, countsB)) return;
    }

    pc += SIZEOF_VV;
  }

  function cutIsEq(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);
    let indexR = readIndex(ml, offset + 5);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);
    let countsR = getCounts(bounty, indexR);

    TRACE(' ! cutIsEq; ', indexR, '=', indexA, '==?', indexB, '::', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexA, true)), '==?', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));
    TRACE('  - counts:', countsR, countsA, countsB, ', meta:', countsR && bounty__debugMeta(getMeta(bounty, indexR)), countsA && bounty__debugMeta(getMeta(bounty, indexA)), countsB && bounty__debugMeta(getMeta(bounty, indexB)));

    if (countsR === 1) {
      return leafIsEq(ml, offset, indexA, indexB, indexR, indexR);
    }

    if (countsA === 1) {
      ASSERT(!domain_isSolved(getDomain(indexA, true)), 'A cannot be solved (bounty ignores constants so count would be 0)');
      if (canCutIseqForArg(indexA, indexB, indexR)) {
        return leafIsEq(ml, offset, indexA, indexB, indexR, indexA);
      }
    }

    if (countsB === 1) {
      // not covered, kept here just in case the above assertion doesnt hold in prod
      ASSERT(!domain_isSolved(getDomain(indexB, true)), 'B cannot be solved (bounty ignores constants so count would be 0)');
      if (canCutIseqForArg(indexB, indexA, indexR)) {
        return leafIsEq(ml, offset, indexA, indexB, indexR, indexB);
      }
    }

    pc = offset + SIZEOF_VVV;
  }
  function canCutIseqForArg(indexL, indexO, indexR) {
    TRACE('   - canCutIseqForArg;', indexL, indexO, indexR, '->', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexL, true)), '==?', domain__debug(getDomain(indexO, true)));
    // an iseq can only be leaf-cut on an arg if the leaf can represent all outcomes
    // so if C is solved, solve as eq or neq.
    // otherwise make sure the leaf contains all vars of the other var and at least one var that's not in there
    // as long as that's impossible we can't cut it without implicitly forcing vars

    // first check whether R is booly-solved, this would mean fewer values to check

    let R = getDomain(indexR, true);
    if (domain_isZero(R)) {
      TRACE('    - R=0 and size(L)>2 so cuttable');
      // L contains at least two values so regardless of the state of O, L can fulfill !=
      ASSERT(domain_size(L) >= 2, 'see?');
      return true;
    }

    // R=1 or R=booly is more involved because we at least
    // need to know whether L contains all values in O

    let L = getDomain(indexL, true);
    let O = getDomain(indexO, true);
    let LO = domain_intersection(L, O); // <-- this tells us that
    TRACE('    - LO:', domain__debug(LO));

    if (domain_hasNoZero(R)) {
      // only cut if we are certain L can represent eq in any way O solves

      if (!LO) {
        TRACE('    - R>=1 and A contains no value in B so reject');
        // no values in L and O match so reject
        setDomain(indexL, domain_createEmpty(), false, true);
        return false;
      }

      if (LO === O) {
        TRACE('    - R>=1 and A contains all values in B so cuttable');
        // this means L contains all values in O (and maybe more, dont care)
        // which means L can uphold the eq for any value of O
        return true;
      }

      TRACE('    - R>=1 and A contains some but not all B so not cuttable, yet');
      // there's no guarantee O solves to a value in L so we cant cut safely
      return true;
    }

    TRACE('    - R unresolved, cuttable if L contains all values in O and then some;', LO === O, LO !== L, 'so:', LO === O && LO !== L);
    // we dont know R so L should contain all values in O (LO==O) and at least
    // one value not in O (LO != O), to consider this a safe cut. otherwise dont.
    return LO === O && LO !== L;
  }

  function cutIsNeq(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);
    let indexR = readIndex(ml, offset + 5);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);
    let countsR = getCounts(bounty, indexR);

    TRACE(' ! cutIsNeq; ', indexR, '=', indexA, '!=?', indexB, '::', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexA, true)), '!=?', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));
    TRACE('  - counts:', countsR, countsA, countsB, ', meta:', countsR && bounty__debugMeta(getMeta(bounty, indexR)), countsA && bounty__debugMeta(getMeta(bounty, indexA)), countsB && bounty__debugMeta(getMeta(bounty, indexB)));

    if (countsR === 1) {
      return leafIsNeq(ml, offset, indexA, indexB, indexR, indexR);
    }

    if (countsA === 1) {
      ASSERT(!domain_isSolved(getDomain(indexA, true)), 'A cannot be solved (bounty ignores constants so count would be 0)');
      if (canCutIsneqForArg(indexA, indexB, indexR)) {
        return leafIsNeq(ml, offset, indexA, indexB, indexR, indexA);
      }
    }

    if (countsB === 1) {
      // not covered, kept here just in case the above assertion doesnt hold in prod
      ASSERT(!domain_isSolved(getDomain(indexB, true)), 'B cannot be solved (bounty ignores constants so count would be 0)');
      if (canCutIsneqForArg(indexB, indexA, indexR)) {
        return leafIsNeq(ml, offset, indexA, indexB, indexR, indexB);
      }
    }

    pc = offset + SIZEOF_VVV;
  }
  function canCutIsneqForArg(indexL, indexO, indexR) {
    TRACE('   - canCutIsneqForArg;', indexL, indexO, indexR, '->', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexL, true)), '!=?', domain__debug(getDomain(indexO, true)));
    // an isneq can only be leaf-cut on an arg if the leaf can represent all outcomes
    // so if C is solved, solve as eq or neq.
    // otherwise make sure the leaf contains all vars of the other var and at least one var that's not in there
    // as long as that's impossible we can't cut it without implicitly forcing vars

    // first check whether R is booly-solved, this would mean fewer values to check

    let R = getDomain(indexR, true);
    if (domain_hasNoZero(R)) {
      TRACE('    - R=0 and size(L)>2 so cuttable');
      // L contains at least two values so regardless of the state of O, L can fulfill !=
      ASSERT(domain_size(L) >= 2, 'see?');
      return true;
    }

    // R=1 or R=booly is more involved because we at least
    // need to know whether L contains all values in O

    let L = getDomain(indexL, true);
    let O = getDomain(indexO, true);
    let LO = domain_intersection(L, O); // <-- this tells us that
    TRACE('    - LO:', domain__debug(LO));
    if (domain_isZero(R)) {
      // only cut if we are certain L can represent eq in any way O solves

      if (!LO) {
        TRACE('    - R>=1 and A contains no value in B so reject');
        // no values in L and O match so reject
        setDomain(indexL, domain_createEmpty(), false, true);
        return false;
      }

      if (LO === O) {
        TRACE('    - R>=1 and A contains all values in B so cuttable');
        // this means L contains all values in O (and maybe more, dont care)
        // which means L can uphold the eq for any value of O
        return true;
      }

      TRACE('    - R>=1 and A contains some but not all B so not cuttable, yet');
      // there's no guarantee O solves to a value in L so we cant cut safely
      return true;
    }

    TRACE('    - R unresolved, cuttable if L contains all values in O and then some;', LO === O, LO !== L, 'so:', LO === O && LO !== L);
    // we dont know R so L should contain all values in O (LO==O) and at least
    // one value not in O (LO != O), to consider this a safe cut. otherwise dont.
    return LO === O && LO !== L;
  }

  function cutIsLt(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);
    let indexR = readIndex(ml, offset + 5);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);
    let countsR = getCounts(bounty, indexR);

    TRACE(' ! cutIsLt; ', indexR, '=', indexA, '<?', indexB, '::', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexA, true)), '<?', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));
    TRACE('  - counts:', countsR, countsA, countsB, ', meta:', countsR && bounty__debugMeta(getMeta(bounty, indexR)), countsA && bounty__debugMeta(getMeta(bounty, indexA)), countsB && bounty__debugMeta(getMeta(bounty, indexB)));

    if (countsR === 1) {
      return leafIsLt(ml, offset, indexA, indexB, indexR, indexR);
    }

    if (countsA === 1) {
      if (canCutIsltForArg(indexA, indexB, indexR, indexA, indexB)) {
        return leafIsLt(ml, offset, indexA, indexB, indexR, indexA);
      }
    }

    if (countsB === 1) {
      if (canCutIsltForArg(indexB, indexA, indexR, indexA, indexB)) {
        return leafIsLt(ml, offset, indexA, indexB, indexR, indexB);
      }
    }

    pc = offset + SIZEOF_VVV;
  }
  function canCutIsltForArg(indexL, indexO, indexR, indexA, indexB) {
    TRACE('   - canCutIsltForArg;', indexL, indexO, indexR, '->', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexA, true)), '<?', domain__debug(getDomain(indexB, true)));
    // an islt can only be leaf-cut on an arg if the leaf can represent all outcomes
    // so if C is solved, solve as eq or neq.
    // otherwise make sure the leaf contains all vars of the other var and at least one var that's not in there
    // as long as that's impossible we can't cut it without implicitly forcing vars

    // keep in mind A and B are ordered and cant be swapped

    // first check whether R is booly-solved, this would mean fewer values to check

    let A = getDomain(indexA, true);
    let B = getDomain(indexB, true);
    let R = getDomain(indexR, true);

    if (domain_hasNoZero(R)) {
      TRACE('   - R>0');
      // if L is A, O must have at least one value below min(B). otherwise it must have at least one value > max(A).
      if (indexL === indexA) return domain_min(A) < domain_min(B);
      else return domain_max(B) > domain_max(A);
    }

    if (domain_isZero(R)) {
      TRACE('   - R=0');
      // if L is A, O must have at least one value >= min(B). otherwise it must have at least one value <= max(A).
      if (indexL === indexA) return domain_min(A) >= domain_min(B);
      else return domain_max(B) <= domain_max(A);
    }

    // R unresolved. O must have at least both values to represent R=0 and R>=1

    if (indexL === indexA) {
      TRACE('   - R unresolved, L=A', domain_min(A) < domain_min(B), domain_max(A) >= domain_max(B));
      // L must contain a value < min(B) and a value >= max(B)
      return domain_min(A) < domain_min(B) && domain_max(A) >= domain_max(B);
    }

    TRACE('   - R unresolved, L=B', domain_max(B), '>', domain_max(A), '->', domain_max(B) > domain_max(A), domain_min(B), '<=', domain_min(A), '->', domain_min(B) <= domain_min(A));
    // L is B, L must contain one value above max(A) and one value <= min(A)
    return domain_max(B) > domain_max(A) && domain_min(B) <= domain_min(A);
  }

  function cutIsLte(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);
    let indexR = readIndex(ml, offset + 5);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);
    let countsR = getCounts(bounty, indexR);

    TRACE(' ! cutIsLte; ', indexR, '=', indexA, '<=?', indexB, '::', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexA, true)), '<=?', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));
    TRACE('  - counts:', countsR, countsA, countsB, ', meta:', countsR && bounty__debugMeta(getMeta(bounty, indexR)), countsA && bounty__debugMeta(getMeta(bounty, indexA)), countsB && bounty__debugMeta(getMeta(bounty, indexB)));

    if (countsR === 1) {
      return leafIsLte(ml, offset, indexA, indexB, indexR, indexR);
    }

    if (countsA === 1) {
      if (canCutIslteForArg(indexA, indexB, indexR, indexA, indexB)) {
        return leafIsLte(ml, offset, indexA, indexB, indexR, indexA);
      }
    }

    if (countsB === 1) {
      if (canCutIslteForArg(indexB, indexA, indexR, indexA, indexB)) {
        return leafIsLte(ml, offset, indexA, indexB, indexR, indexB);
      }
    }

    pc = offset + SIZEOF_VVV;
  }
  function canCutIslteForArg(indexL, indexO, indexR, indexA, indexB) {
    TRACE('   - canCutIslteForArg;', indexL, indexO, indexR, '->', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexA, true)), '<=?', domain__debug(getDomain(indexB, true)));
    // an islte can only be leaf-cut on an arg if the leaf can represent all outcomes
    // so if C is solved, solve as eq or neq.
    // otherwise make sure the leaf contains all vars of the other var and at least one var that's not in there
    // as long as that's impossible we can't cut it without implicitly forcing vars

    // keep in mind A and B are ordered and cant be swapped

    // first check whether R is booly-solved, this would mean fewer values to check

    let A = getDomain(indexA, true);
    let B = getDomain(indexB, true);
    let R = getDomain(indexR, true);

    if (domain_hasNoZero(R)) {
      TRACE('   - R>0');
      // if L is A, O must have at least one value <= min(B). otherwise it must have at least one value gte max(A).
      if (indexL === indexA) return domain_min(A) <= domain_min(B);
      else return domain_max(B) >= domain_max(A);
    }

    if (domain_isZero(R)) {
      TRACE('   - R=0');
      // if L is A, O must have at least one value > min(B). otherwise it must have at least one value < max(A).
      if (indexL === indexA) return domain_min(A) > domain_min(B);
      else return domain_max(B) < domain_max(A);
    }

    // R unresolved. O must have at least both values to represent R=0 and R>=1

    if (indexL === indexA) {
      TRACE('   - R unresolved, L=A', domain_min(A) <= domain_min(B), domain_max(A) > domain_max(B));
      // L must contain a value <= min(B) and a value > max(B)
      return domain_min(A) <= domain_min(B) && domain_max(A) > domain_max(B);
    }

    TRACE('   - R unresolved, L=B', domain_max(B), '>=', domain_max(A), '->', domain_max(B) >= domain_max(A), domain_min(B), '<', domain_min(A), '->', domain_min(B) < domain_min(A));
    // L is B, L must contain one value gte max(A) and one value below min(A)
    return domain_max(B) >= domain_max(A) && domain_min(B) < domain_min(A);
  }

  function cutPlus(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);
    let indexR = readIndex(ml, offset + 5);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);
    let countsR = getCounts(bounty, indexR);

    TRACE(' ! cutPlus; ', indexR, '=', indexA, '+', indexB, '::', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexA, true)), '+', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));
    TRACE('  - counts:', countsR, countsA, countsB, ', meta:', countsR && bounty__debugMeta(getMeta(bounty, indexR)), countsA && bounty__debugMeta(getMeta(bounty, indexA)), countsB && bounty__debugMeta(getMeta(bounty, indexB)));

    // note: we cant simply eliminate leaf vars because they still constrain
    // the allowed distance between the other two variables and if you
    // eliminate this constraint, that limitation is not enforced anymore.
    // so thread carefully.

    if (countsR === 1) {
      TRACE('   - R is only used in one constraint (could be a cuttable leaf)');
      // even though R is a leaf, it cant be plainly eliminated!

      let A = getDomain(indexA, true);
      let B = getDomain(indexB, true);
      let R = getDomain(indexR, true);

      // R can only be eliminated if all possible additions between A and B occur in it
      // because in that case it no longer serves as a constraint to force certain distance(s)

      let AB = domain_plus(A, B);

      // note that this means the intersection AB to R should equal AB (not R because it could
      // contain even more values, even though those simply can't lead to a solution)

      if (domain_intersection(R, AB) === AB) {
        // we can safely defer R
        return leafPlusFull(ml, offset, indexA, indexB, indexR);
      }

      // there are some other tricks possible on strictly bool domains
      if (domain_isBool(A) && domain_isBool(B)) {
        if (R === domain_createRange(1, 2)) {
          return trickPlusIsOr(ml, offset, indexA, indexB, indexR); // [12]=[01]+[01] => A|B
        }

        if (domain_isBool(R)) {
          return trickPlusIsNand(ml, offset, indexA, indexB, indexR); // [01]=[01]+[01] => A!&B
        }
      }
    }

    if (countsR === 2) {
      let metaR = getMeta(bounty, indexR);
      if (metaR === (BOUNTY_PLUS_RESULT | BOUNTY_ISEQ_ARG) && trickPlusIseq(ml, offset, indexA, indexB, indexR, countsR, metaR)) return;
    }

    if (countsA === 1) {
      ASSERT(!domain_isSolved(getDomain(indexA, true)), 'a constant is ignored by bounty so cant have counts=1');
      let B = getDomain(indexB, true);
      if (domain_getValue(B) >= 0) {
        if (leafPlusArg(ml, offset, indexA, indexB, indexR, indexA, indexB)) return;
      }
    }

    if (countsB === 1) {
      ASSERT(!domain_isSolved(getDomain(indexB, true)), 'a constant is ignored by bounty so cant have counts=1');
      let A = getDomain(indexA, true);
      if (domain_getValue(A) >= 0) {
        // I dont think code can reach here because args are ordered and constants always end up in B, but just in case that somewhere doesnt happen let's keep it in here
        if (leafPlusArg(ml, offset, indexB, indexA, indexR, indexA, indexB)) return;
      }
    }

    pc = offset + SIZEOF_VVV;
  }

  function cutSum(ml, offset) {
    let argCount = ml_dec16(ml, offset + 1);
    let argsOffset = offset + SIZEOF_COUNT;
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;

    let indexR = readIndex(ml, argsOffset + argCount * 2);
    let countsR = getCounts(bounty, indexR);

    TRACE(' ! cutSum; R=', indexR);
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));

    if (countsR === 1) {
      let allBool = true; // all args [01]? used later
      let sum = domain_createValue(0);
      for (let i = 0; i < argCount; ++i) {
        let index = readIndex(ml, argsOffset + i * 2);
        let domain = getDomain(index, true);

        sum = domain_plus(sum, domain);
        if (!domain_isBool(domain)) allBool = false;
      }

      let R = getDomain(indexR, true);

      if (sum === domain_intersection(R, sum)) { // are all possible outcomes of the sum of args in R? then R is a cuttable leaf
        // all possible outcomes of summing any element in the sum args are part of R so
        // R is a leaf and the args aren't bound by it so we can safely remove the sum
        return leafSumR(ml, offset, argCount, indexR);
      }

      // if R is [0, n-1] and all n args are [0, 1] then rewrite to a NALL
      if (allBool && R === domain_createRange(0, argCount - 1)) {
        return trickSumNall(ml, offset, argCount, indexR);
      }
    }

    if (countsR === 2) {
      let metaR = getMeta(bounty, indexR);
      // (R = sum(A B C) & (S = R==?3) -> S = isAll(A B C)
      // we already confirmed that R is for a sum, so we can strictly compare the flag to check for it being an iseq arg
      if (metaR === (BOUNTY_ISEQ_ARG | BOUNTY_SUM_RESULT) && trickSumIseq(ml, offset, indexR, countsR, metaR)) return;
    }

    pc += opSize;
  }

  function cutOr(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);

    TRACE(' ! cutOr; ', indexA, '|', indexB, '::', domain__debug(getDomain(indexA, true)), '|', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    TRACE('  - counts:', countsA, countsB, ', meta:', countsA && getMeta(bounty, indexA), countsB && getMeta(bounty, indexB));

    if (countsA === 1) {
      return leafOr(ml, offset, indexA, indexB, indexA, indexB);
    }

    if (countsB === 1) {
      return leafOr(ml, offset, indexB, indexA, indexA, indexB);
    }

    pc += SIZEOF_VV;
  }

  function cutXor(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);

    TRACE(' ! cutXor; ', indexA, '^', indexB, '::', domain__debug(getDomain(indexA, true)), '^', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    TRACE('  - counts:', countsA, countsB, ', meta:', countsA && getMeta(bounty, indexA), countsB && getMeta(bounty, indexB));

    if (countsA === 1) {
      return leafXor(ml, offset, indexA, indexB, indexA, indexB);
    }

    if (countsB === 1) {
      return leafXor(ml, offset, indexB, indexA, indexA, indexB);
    }

    pc += SIZEOF_VV;
  }

  function cutNand(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);

    TRACE(' ! cutNand; ', indexA, '!&', indexB, '::', domain__debug(getDomain(indexA, true)), '!&', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    TRACE('  - counts:', countsA, countsB, ', meta:', countsA && getMeta(bounty, indexA), countsB && getMeta(bounty, indexB));

    if (countsA === 1) {
      return leafNand(ml, offset, indexA, indexB, indexA, indexB);
    }

    if (countsB === 1) {
      return leafNand(ml, offset, indexB, indexA, indexA, indexB);
    }

    if (countsA > 0) {
      let metaA = getMeta(bounty, indexA);
      if (metaA === BOUNTY_NAND) {
        // A is only used in nands. eliminate them all and defer A
        if (trickNandOnly(indexA, countsA)) return;
      }
    }

    if (countsB > 0) {
      let metaB = getMeta(bounty, indexB);

      if (metaB === BOUNTY_NAND) {
        // B is only used in nands. eliminate them all and defer B
        if (trickNandOnly(indexB, countsB)) return;
      }
    }

    pc += SIZEOF_VV;
  }

  function cutXnor(ml, offset) {
    let indexA = readIndex(ml, offset + 1);
    let indexB = readIndex(ml, offset + 3);

    let countsA = getCounts(bounty, indexA);
    let countsB = getCounts(bounty, indexB);

    TRACE(' ! cutXnor; ', indexA, '!^', indexB, '::', domain__debug(getDomain(indexA, true)), '!^', domain__debug(getDomain(indexB, true)));
    ASSERT(!countsA || !domain_isSolved(getDomain(indexA, true)), 'if it has counts it shouldnt be solved', countsA, indexA, domain__debug(getDomain(indexA, true)));
    ASSERT(!countsB || !domain_isSolved(getDomain(indexB, true)), 'if it has counts it shouldnt be solved', countsB, indexB, domain__debug(getDomain(indexB, true)));
    TRACE('  - counts:', countsA, countsB, ', meta:', countsA && getMeta(bounty, indexA), countsB && getMeta(bounty, indexB));

    if (countsA === 1) {
      return leafXnor(ml, offset, indexA, indexB, indexA, indexB);
    }

    if (countsB === 1) {
      return leafXnor(ml, offset, indexB, indexA, indexA, indexB);
    }

    // (do we care about constants here? technically the minimizer should eliminate xnors with constants... so, no?)
    if (countsA > 0 && countsB > 0) {
      let metaA = getMeta(bounty, indexA);
      let metaB = getMeta(bounty, indexB);
      TRACE(' - considering whether A and B are xnor pseudo aliases; A:', bounty__debugMeta(metaA), 'B:', bounty__debugMeta(metaB));
      let boolyA = (metaA & BOUNTY_NOT_BOOLY_ONLY_FLAG) !== BOUNTY_NOT_BOOLY_ONLY_FLAG;
      let boolyB = (metaB & BOUNTY_NOT_BOOLY_ONLY_FLAG) !== BOUNTY_NOT_BOOLY_ONLY_FLAG;
      TRACE('  ->', boolyA, '||', boolyB);
      if (boolyA || boolyB) {
        // we declare A and alias of B. they are both used as booly only and the xnor states that if and
        // only if A is truthy then B must be truthy too. since we confirmed both are only used as booly
        // their actual non-zero values are irrelevant and the rewrite is safe. the last thing to make
        // sure is that the domains are updated afterwards and not synced and clobbered by the alias code.
        return trickXnorPseudoEq(ml, offset, indexA, boolyA, indexB, boolyB);
      }
    }

    pc += SIZEOF_VV;
  }

  function cutIsAll(ml, offset) {
    let argCount = ml_dec16(ml, offset + 1);
    let argsOffset = offset + SIZEOF_COUNT;
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;

    let indexR = readIndex(ml, argsOffset + argCount * 2);
    let countsR = getCounts(bounty, indexR);

    TRACE(' ! cutIsAll; R=', indexR, ', counts:', countsR, ', metaR:', bounty__debugMeta(getMeta(bounty, indexR, true)));
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));

    if (countsR > 0) {
      if (countsR === 1) {
        // when R is a leaf, the isall args are not bound by it nor the reifier so they are free
        return leafIsall(ml, offset, argCount, indexR);
      }

      let metaR = getMeta(bounty, indexR);

      if (countsR === 2) {
        // this path should only be taken in isall2 so its pretty redundant here. but maybe.
        if (metaR === (BOUNTY_NALL | BOUNTY_ISALL_RESULT) && trickIsall1Nall(ml, indexR, offset, countsR, metaR)) return;
      }

      if (metaR === (BOUNTY_NAND | BOUNTY_ISALL_RESULT) && trickNandIsall1(ml, indexR, offset, countsR, metaR)) return;
    }

    pc += opSize;
  }

  function cutIsAll2(ml, offset) {
    let indexR = readIndex(ml, offset + 5);
    let countsR = getCounts(bounty, indexR);

    TRACE(' - cutIsAll2', indexR);
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));

    if (countsR > 0) {
      if (countsR === 1) {
        // when R is a leaf, the isall args are not bound by it nor the reifier so they are free
        let indexA = readIndex(ml, offset + 1);
        let indexB = readIndex(ml, offset + 3);
        // when R is a leaf, the isall args are not bound by it nor the reifier so they are free
        return leafIsall2(ml, offset, indexA, indexB, indexR);
      }

      let metaR = getMeta(bounty, indexR);

      if (countsR === 2) {
        if ((metaR & BOUNTY_NALL) === BOUNTY_NALL && trickIsall2Nall(ml, indexR, offset, countsR, metaR)) return;
      }

      if (metaR === (BOUNTY_NAND | BOUNTY_ISALL_RESULT) && trickNandIsall2(ml, indexR, offset, metaR, countsR)) return;
    }

    pc += SIZEOF_VVV;
  }

  function cutIsNall(ml, offset) {
    let argCount = ml_dec16(ml, offset + 1);
    let argsOffset = offset + SIZEOF_COUNT;
    let opSize = SIZEOF_COUNT + argCount * 2 + 2;

    let indexR = readIndex(ml, argsOffset + argCount * 2);
    let countsR = getCounts(bounty, indexR);

    TRACE(' ! cutIsNall; R=', indexR);
    ASSERT(!countsR || !domain_isSolved(getDomain(indexR, true)), 'if it has counts it shouldnt be solved', countsR, indexR, domain__debug(getDomain(indexR, true)));

    if (countsR === 1) {
      return leafIsnall(ml, offset, argCount, indexR, countsR);
    }

    pc += opSize;
  }

  // ##############

  function leafNeq(ml, offset, leafIndex, otherIndex, indexA, indexB) {
    TRACE('   - leafNeq;', leafIndex, 'is a leaf var, A != B,', indexA, '!=', indexB);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafNeq; solving', indexA, '!=', indexB, '  ->  ', domain__debug(getDomain(indexA)), '!=', domain__debug(getDomain(indexB)));

      let A = getDomain(indexA);
      let B = getDomain(indexB);
      if (domain_size(A) < domain_size(B)) {
        let v = force(indexA);
        setDomain(indexB, domain_removeValue(B, v));
      } else {
        let v = force(indexB);
        setDomain(indexA, domain_removeValue(A, v));
      }
      ASSERT(getDomain(indexA) !== getDomain(indexB), 'D ought to have at least a value other dan v');
    });

    ml_eliminate(ml, offset, SIZEOF_VV);
    bounty_markVar(bounty, leafIndex);
    bounty_markVar(bounty, otherIndex);
    somethingChanged();
  }

  function leafLt(ml, offset, indexA, indexB, leafSide) {
    TRACE('   - leafLt;', leafSide, 'is a leaf var, A < B,', indexA, '<', indexB);
    ASSERT(typeof indexA === 'number', 'index A should be number', indexA);
    ASSERT(typeof indexB === 'number', 'index B should be number', indexB);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafLt; solving', indexA, '<', indexB, '  ->  ', domain__debug(getDomain(indexA)), '<', domain__debug(getDomain(indexB)));

      let A = getDomain(indexA);
      let B = getDomain(indexB);

      let maxA = domain_max(A);
      let minB = domain_min(B);

      if (maxA > minB) {
        if (domain_isSolved(A)) {
          let nB = domain_removeLte(B, maxA);
          ASSERT(nB, 'shouldnt be empty');
          setDomain(indexB, nB);
        } else {
          let nA = domain_removeGte(A, minB);
          ASSERT(nA, 'shouldnt be empty');
          setDomain(indexA, nA);
        }
      }
    });

    ml_eliminate(ml, offset, SIZEOF_VV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    somethingChanged();
  }

  function leafLte(ml, offset, indexA, indexB, leafSide) {
    TRACE('   - leafLte;', leafSide, 'is a leaf var, A <= B,', indexA, '<=', indexB);
    ASSERT(typeof indexA === 'number', 'index A should be number', indexA);
    ASSERT(typeof indexB === 'number', 'index B should be number', indexB);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafLte; solving', indexA, '<=', indexB, '  ->  ', domain__debug(getDomain(indexA)), '<=', domain__debug(getDomain(indexB)));

      let A = getDomain(indexA);
      let B = getDomain(indexB);

      let maxA = domain_max(A);
      let minB = domain_min(B);

      if (maxA > minB) {
        if (domain_isSolved(A)) {
          let nB = domain_removeLtUnsafe(B, maxA);
          ASSERT(nB, 'shouldnt be empty');
          setDomain(indexB, nB);
        } else {
          let nA = domain_removeGtUnsafe(A, minB);
          ASSERT(nA, 'shouldnt be empty');
          setDomain(indexA, nA);
        }
      }
    });

    ml_eliminate(ml, offset, SIZEOF_VV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    somethingChanged();
  }

  function leafIsEq(ml, offset, indexA, indexB, indexR, indexL) {
    TRACE('   - leafIsEq; index', indexL, 'is a leaf var, R = A ==? B,', indexR, '=', indexA, '==?', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '==?', domain__debug(getDomain(indexB)));

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafIsEq; leaf=', indexL, ';', indexR, '=', indexA, '==?', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '==?', domain__debug(getDomain(indexB)));

      let R = getDomain(indexR);
      if (!domain_isSolved(R)) {
        let A = getDomain(indexA);
        let B = getDomain(indexB);
        let AB = domain_intersection(A, B);
        if (!AB) {
          TRACE('   - A&B is empty so R=0');
          R = domain_booly(R, false);
        } else if (domain_isSolved(A)) {
          TRACE('   - A is solved so R=A==B', A === B);
          R = domain_booly(R, A === B);
        } else if (domain_isSolved(B)) {
          TRACE('   - B is solved and A wasnt. A&B wasnt empty so we can set A=B');
          setDomain(indexA, B);
          R = domain_booly(R, true);
        } else {
          TRACE('   - some values overlap between A and B and neither is solved.. force all');
          let v = domain_min(AB);
          let V = domain_createValue(v);
          setDomain(indexA, V);
          setDomain(indexB, V);
          R = domain_booly(R, true);
        }
      }

      ASSERT(R, 'leaf should at least have the resulting value');
      setDomain(indexR, R);
    });

    ml_eliminate(ml, offset, SIZEOF_VVV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function leafIsNeq(ml, offset, indexA, indexB, indexR, indexL) {
    TRACE('   - leafIsNeq; index', indexL, 'is a leaf var, R = A !=? B,', indexR, '=', indexA, '!=?', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '!=?', domain__debug(getDomain(indexB)));

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafIsNeq; leaf=', indexL, ';', indexR, '=', indexA, '!=?', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '!=?', domain__debug(getDomain(indexB)));

      let R = getDomain(indexR);
      if (domain_isZero(R) || domain_hasNoZero(R)) {
        TRACE('   - R is already booly solved');
        return;
      }

      let A = getDomain(indexA);
      let B = getDomain(indexB);

      let AB = domain_intersection(A, B);
      TRACE('   - intersection AB:', domain__debug(AB));

      if (!AB) {
        TRACE('   - AB is empty so R>0');
        setDomain(indexR, domain_booly(R, true));
        return;
      }

      let vA = domain_getValue(A);
      if (vA >= 0) {
        if (A === B) {
          TRACE('   - A is solved and ==B so R=0');
          setDomain(indexR, domain_booly(R, false));
          return;
        }

        TRACE('   - A is solved and !=B so remove it from B and set R>0');
        setDomain(indexB, domain_removeValue(B, vA)); // either B is solved to not-A or it has multiple values. either way this is safe.
        setDomain(indexR, domain_booly(R, true));
        return;
      }

      let vB = domain_getValue(B);
      if (vB >= 0) {
        TRACE('   - B is solved and A wasnt so remove B from A and set R>0');
        setDomain(indexA, domain_removeValue(A, vB));
        setDomain(indexR, domain_booly(R, true));
        return;
      }

      TRACE('   - A and B werent solved so forcing B and removing it from A and setting R>0');
      vB = force(indexB);
      setDomain(indexA, domain_removeValue(A, vB));
      setDomain(indexR, domain_booly(R, true));
    });

    ml_eliminate(ml, offset, SIZEOF_VVV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function leafIsLt(ml, offset, indexA, indexB, indexR, indexL) {
    TRACE('   - leafIsLt;', indexL, 'is a leaf var, R = A <? B,', indexR, '=', indexA, '<?', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '<?', domain__debug(getDomain(indexB)));

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafIsLt; leaf=', indexL, ';', indexR, '=', indexA, '<?', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '<?', domain__debug(getDomain(indexB)));

      let A = getDomain(indexA);
      let B = getDomain(indexB);
      let R = getDomain(indexR);
      let minA = domain_min(A);
      let maxA = domain_max(A);
      let minB = domain_min(B);
      let maxB = domain_max(B);

      if (maxA < minB) {
        TRACE('   - A already < B so R>0');
        setDomain(indexR, domain_booly(R, true));
        return;
      }

      if (minA >= maxB) {
        TRACE('   - A already >= B so R=0');
        setDomain(indexR, domain_booly(R, false));
        return;
      }

      let vA = domain_getValue(A);
      let vB = domain_getValue(B);

      if (vA >= 0) {
        if (vB >= 0) {
          TRACE('   - A and B solved', vA < vB);
          setDomain(indexR, domain_booly(R, vA < vB));
          return;
        }

        TRACE('   - A solved, forcing state to R>0');
        setDomain(indexB, domain_removeLte(B, vA));
        setDomain(indexR, domain_booly(R, true)); // arbitrary choice
        return;
      }

      if (vB >= 0) {
        TRACE('   - B solved, forcing state to R>0');
        setDomain(indexA, domain_removeGte(A, vB));
        setDomain(indexR, domain_booly(R, true)); // arbitrary choice
        return;
      }

      // arbitrary choice
      TRACE('   - neither solved, forcing state to R>0', minA, maxA, minB, maxB);
      vB = force(indexB);
      let nA = domain_removeGte(A, vB);
      if (nA) {
        setDomain(indexA, nA);
        setDomain(indexR, domain_booly(R, true));
      } else {
        ASSERT(domain_min(A) >= vB, 'if we cant remove gte values then we must only contain gte values');
        setDomain(indexR, domain_booly(R, false));
      }
    });

    ml_eliminate(ml, offset, SIZEOF_VVV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function leafIsLte(ml, offset, indexA, indexB, indexR, indexL) {
    TRACE('   - leafIsLte;', indexL, 'is a leaf var, R = A <=? B,', indexR, '=', indexA, '<=?', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '<=?', domain__debug(getDomain(indexB)));

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafIsLt; leaf=', indexL, ';', indexR, '=', indexA, '<=?', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '<=?', domain__debug(getDomain(indexB)));

      let A = getDomain(indexA);
      let B = getDomain(indexB);
      let R = getDomain(indexR);
      let minA = domain_min(A);
      let maxA = domain_max(A);
      let minB = domain_min(B);
      let maxB = domain_max(B);

      if (maxA <= minB) {
        TRACE('   - A already <= B so R>0');
        setDomain(indexR, domain_booly(R, true));
        return;
      }

      if (minA > maxB) {
        TRACE('   - A already > B so R=0');
        setDomain(indexR, domain_booly(R, false));
        return;
      }

      let vA = domain_getValue(A);
      let vB = domain_getValue(B);

      if (vA >= 0) {
        if (vB >= 0) {
          TRACE('   - A and B solved', vA < vB);
          setDomain(indexR, domain_booly(R, vA <= vB));
          return;
        }

        TRACE('   - A solved, forcing state to R>0');
        setDomain(indexB, domain_removeLtUnsafe(B, vA));
        setDomain(indexR, domain_booly(R, true)); // arbitrary choice
        return;
      }

      if (vB >= 0) {
        TRACE('   - B solved, forcing state to R>0');
        setDomain(indexA, domain_removeGtUnsafe(A, vB));
        setDomain(indexR, domain_booly(R, true)); // arbitrary choice
        return;
      }

      // arbitrary choice
      TRACE('   - neither solved, forcing state to R>0', minA, maxA, minB, maxB);
      vB = force(indexB);
      let nA = domain_removeGtUnsafe(A, vB);
      if (nA) {
        setDomain(indexA, nA);
        setDomain(indexR, domain_booly(R, true));
      } else {
        ASSERT(domain_min(A) >= vB, 'if we cant remove gt values then we must only contain gt values');
        setDomain(indexR, domain_booly(R, false));
      }
    });

    ml_eliminate(ml, offset, SIZEOF_VVV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function leafPlusFull(ml, offset, indexA, indexB, indexR) {
    TRACE('   - leafPlusFull;', indexR, 'is a leaf var, R = A <=? B,', indexR, '=', indexA, '+', indexB);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafPlusFull;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '+', domain__debug(getDomain(indexB)));
      let vA = force(indexA);
      let vB = force(indexB);
      let vR = vA + vB;
      let R = getDomain(indexR);
      R = domain_intersectionValue(R, vR);
      ASSERT(R, 'leaf should contain the value');
      setDomain(indexR, R);
    });

    ml_eliminate(ml, offset, SIZEOF_VVV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function leafPlusArg(ml, plusOffset, leafIndex, constIndex, indexR, indexA, indexB) {
    TRACE('   - leafPlusArg;', leafIndex, 'is a leaf var, the other arg a constant (', domain__debug(getDomain(constIndex, true)), '), R = A + B,', indexR, '=', indexA, '+', indexB);
    ASSERT(!domain_isSolved(getDomain(leafIndex)), 'L should not yet be solved at this point');
    ASSERT(domain_isSolved(getDomain(constIndex)), 'C should be solved at this point');

    // remove values from R that are not in L+C. then alias
    let oR = getDomain(indexR, true);
    let L = getDomain(leafIndex, true);
    let C = getDomain(constIndex, true);
    let LC = domain_plus(L, C);
    let R = domain_intersection(oR, LC);
    if (R !== oR) {
      // minifier should trim R down to the sum of its args...
      setDomain(indexR, R, true, true);
      if (!R) return;
    }

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafPlusArg;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '+', domain__debug(getDomain(indexB)));
      let oL = getDomain(leafIndex);
      let vO = force(constIndex);
      let vR = force(indexR);
      ASSERT(vR - vO >= 0, 'shouldnt go OOB');
      let L = domain_intersectionValue(oL, vR - vO);
      ASSERT(L, 'leaf should contain the value');
      if (L !== oL) setDomain(leafIndex, L);
    });

    ml_eliminate(ml, plusOffset, SIZEOF_VVV);
    bounty_markVar(bounty, leafIndex);
    bounty_markVar(bounty, constIndex);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function leafSumR(ml, offset, argCount, indexR) {
    TRACE('   - leafSumR;', indexR, 'is a leaf var, R = sum(', argCount, 'x ),', indexR, '= sum(...)');

    // collect the arg indexes (kind of dupe loop but we'd rather not make an array prematurely)
    let args = [];
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offset + SIZEOF_COUNT + i * 2);
      args.push(index);
      bounty_markVar(bounty, index);
    }

    TRACE('   - collected sum arg indexes;', args);
    TRACE('   - collected sum arg domains;', args.map(index => domain__debug(getDomain(index))).join(', '));

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafSumR;', indexR, '= sum(', args, ')  ->  ', domain__debug(getDomain(indexR)), '= sum(', args.map(index => domain__debug(getDomain(index))).join(', '), ')');
      let vR = args.map(force).reduce((a, b) => a + b);
      ASSERT(Number.isInteger(vR), 'should be integer result');
      let R = domain_intersectionValue(getDomain(indexR), vR);
      ASSERT(R, 'R should contain solution value');
      setDomain(indexR, R);
    });

    ml_eliminate(ml, offset, SIZEOF_COUNT + argCount * 2 + 2);
    bounty_markVar(bounty, indexR); // args already done in above loop
    somethingChanged();
  }

  function leafOr(ml, offset, leafIndex, otherIndex, indexA, indexB) {
    TRACE('   - leafOr;', leafIndex, 'is a leaf var, A | B,', indexA, '|', indexB);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafOr; solving', indexA, '|', indexB, '  ->  ', domain__debug(getDomain(indexA)), '|', domain__debug(getDomain(indexB)));

      // check if either is solved to zero, in that case force the other to non-zero.
      // if neither is zero and both have zero, force the leaf to non-zero.
      // otherwise no change because OR will be satisfied.

      let A = getDomain(otherIndex);
      let B = getDomain(leafIndex);
      if (domain_isZero(A)) {
        TRACE(' - forcing the leaf index,', leafIndex, ', to non-zero because the other var is zero');
        setDomain(leafIndex, domain_removeValue(B, 0));
      } else if (domain_isZero(B)) {
        TRACE(' - forcing the other index,', otherIndex, ', to non-zero because the leaf var was already zero');
        setDomain(otherIndex, domain_removeValue(A, 0));
      } else if (!domain_hasNoZero(A) && !domain_hasNoZero(A)) {
        TRACE(' - neither was booly solved so forcing the leaf index,', leafIndex, ', to non-zero to satisfy the OR');
        setDomain(leafIndex, domain_removeValue(B, 0));
      } else {
        TRACE(' - no change.');
      }
    });

    ml_eliminate(ml, offset, SIZEOF_VV);
    bounty_markVar(bounty, leafIndex);
    bounty_markVar(bounty, otherIndex);
    somethingChanged();
  }

  function leafXor(ml, offset, leafIndex, otherIndex, indexA, indexB) {
    TRACE('   - leafXor;', leafIndex, 'is a leaf var, A ^ B,', indexA, '^', indexB);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafXor; solving', indexA, '^', indexB, '  ->  ', domain__debug(getDomain(indexA)), '^', domain__debug(getDomain(indexB)));

      // check if either is solved to zero, in that case force the other to non-zero.
      // check if either side is non-zero. in that case force the other to zero
      // confirm that both sides are booly-solved, force them to if not.

      let A = getDomain(indexA);
      let B = getDomain(indexB);
      if (domain_isZero(A)) {
        TRACE(' - forcing B to non-zero because A is zero');
        setDomain(indexB, domain_removeValue(B, 0));
      } else if (domain_isZero(B)) {
        TRACE(' - forcing A to non-zero because B was already zero');
        setDomain(indexA, domain_removeValue(A, 0));
      } else if (domain_hasNoZero(A)) {
        TRACE(' - A was non-zero so forcing B to zero');
        setDomain(indexB, domain_removeGtUnsafe(B, 0));
      } else if (domain_hasNoZero(B)) {
        TRACE(' - B was non-zero so forcing A to zero');
        setDomain(indexA, domain_removeGtUnsafe(A, 0));
      } else {
        TRACE(' - neither was booly solved. forcing A to zero and B to non-zero');
        setDomain(indexA, domain_removeValue(A, 0));
        setDomain(indexB, domain_removeGtUnsafe(B, 0));
      }
    });

    ml_eliminate(ml, offset, SIZEOF_VV);
    bounty_markVar(bounty, leafIndex);
    bounty_markVar(bounty, otherIndex);
    somethingChanged();
  }

  function leafNand(ml, offset, leafIndex, otherIndex, indexA, indexB) {
    TRACE('   - leafNand;', leafIndex, 'is a leaf var, A !& B,', indexA, '!&', indexB);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafNand; solving', indexA, '!&', indexB, '  ->  ', domain__debug(getDomain(indexA)), '!&', domain__debug(getDomain(indexB)));

      // check if either has no zero, in that case solve other to zero
      // otherwise no change

      let A = getDomain(otherIndex);
      let B = getDomain(leafIndex);
      if (domain_hasNoZero(A)) {
        TRACE(' - A has no zero so B must be zero');
        setDomain(leafIndex, domain_removeGtUnsafe(B, 0));
      } else if (domain_hasNoZero(B)) {
        TRACE(' - B has no zero so A must be zero');
        setDomain(otherIndex, domain_removeGtUnsafe(A, 0));
      } else if (!domain_isZero(A) && !domain_isZero(B)) {
        TRACE(' - neither A nor B is zero or non-zero so force A to zero');
        setDomain(indexA, domain_removeGtUnsafe(A, 0));
      } else {
        TRACE(' - no change.');
      }
    });

    ml_eliminate(ml, offset, SIZEOF_VV);
    bounty_markVar(bounty, leafIndex);
    bounty_markVar(bounty, otherIndex);
    somethingChanged();
  }

  function leafXnor(ml, offset, leafIndex, otherIndex, indexA, indexB) {
    TRACE('   - leafXnor;', leafIndex, 'is a leaf var, A !^ B,', indexA, '!^', indexB);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafXnor; solving', indexA, '!^', indexB, '  ->  ', domain__debug(getDomain(indexA)), '!^', domain__debug(getDomain(indexB)));

      // check if a var is solved to zero, if so solve the other var to zero as well
      // check if a var is solved to non-zero, if so solve the other var to non-zero as well
      // otherwise force(A), let B follow that result

      let A = getDomain(indexA);
      let B = getDomain(indexB);
      if (domain_isZero(A)) {
        TRACE(' - forcing B to zero because A is zero');
        setDomain(indexB, domain_removeGtUnsafe(B, 0));
      } else if (domain_isZero(B)) {
        TRACE(' - forcing A to zero because B is zero');
        setDomain(indexA, domain_removeGtUnsafe(A, 0));
      } else if (domain_hasNoZero(A)) {
        TRACE(' - forcing B to non-zero because A is non-zero');
        setDomain(indexB, domain_removeValue(B, 0));
      } else if (domain_hasNoZero(B)) {
        TRACE(' - forcing A to non-zero because B is non-zero');
        setDomain(indexA, domain_removeValue(A, 0));
      } else {
        // TODO: force() and repeat above steps
        TRACE(' - neither was booly solved. forcing both to non-zero', domain__debug(domain_removeValue(A, 0)), domain__debug(domain_removeValue(B, 0))); // non-zero gives more options? *shrug*
        setDomain(indexA, domain_removeValue(A, 0));
        setDomain(indexB, domain_removeValue(B, 0));
      }
    });

    ml_eliminate(ml, offset, SIZEOF_VV);
    bounty_markVar(bounty, leafIndex);
    bounty_markVar(bounty, otherIndex);
    somethingChanged();
  }

  function leafIsall(ml, offset, argCount, indexR) {
    TRACE('   - leafIsall;', indexR, 'is a leaf var, R = all?(', argCount, 'x ),', indexR, '= all?(...)');

    let args = [];
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offset + SIZEOF_COUNT + i * 2);
      args.push(index);
      bounty_markVar(bounty, index);
    }

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafIsall; ', indexR, '= isAll(', args, ')  ->  ', domain__debug(getDomain(indexR)), ' = isAll(', args.map(index => domain__debug(getDomain(index))), ')');
      let vR = 1;
      for (let i = 0; i < argCount; ++i) {
        if (force(args[i]) === 0) {
          vR = 0;
          break;
        }
      }
      let oR = getDomain(indexR);
      let R = domain_booly(oR, vR);
      ASSERT(R, 'R should be able to at least represent the solution');
      setDomain(indexR, R);
    });

    ml_eliminate(ml, offset, SIZEOF_COUNT + argCount * 2 + 2);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function leafIsall2(ml, offset, indexA, indexB, indexR) {
    TRACE('   - leafIsall2;', indexR, 'is a leaf var, R = all(A B),', indexR, '= all?(', indexA, indexB, ')');

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafIsall2;', indexR, '= all?(', indexA, indexB, ')  ->  ', domain__debug(getDomain(indexR)), '= all?(', domain__debug(getDomain(indexA)), domain__debug(getDomain(indexB)), ')');
      let vA = force(indexA);
      let vB = vA && force(indexB); // dont force B if A is already 0
      let R = getDomain(indexR);
      R = domain_booly(R, (vA & vB) > 0);
      ASSERT(R, 'leaf should at least have the resulting value');
      setDomain(indexR, R);
    });

    ml_eliminate(ml, offset, SIZEOF_VVV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function leafIsnall(ml, offset, argCount, indexR, counts) {
    TRACE('   - leafIsnall;', indexR, 'is a leaf var with counts:', counts, ', R = nall?(', argCount, 'x ),', indexR, '= all?(...)');

    let args = [];
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offset + SIZEOF_COUNT + i * 2);
      args.push(index);
      bounty_markVar(bounty, index);
    }

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - leafIsnall; ', indexR, '= isNall(', args, ')  ->  ', domain__debug(getDomain(indexR)), ' = isNall(', args.map(index => domain__debug(getDomain(index))), ')');
      let vR = 0;
      for (let i = 0; i < argCount; ++i) {
        if (force(args[i]) === 0) {
          vR = 1;
          break;
        }
      }
      let oR = getDomain(indexR);
      let R = domain_booly(oR, vR);
      ASSERT(R, 'R should be able to at least represent the solution');
      setDomain(indexR, R);
    });

    ml_eliminate(ml, offset, SIZEOF_COUNT + argCount * 2 + 2);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  // ##############

  function trickPlusIsOr(ml, offset, indexA, indexB, indexR) {
    // [12]=[01]+[01]   ->   A | B
    TRACE('   - trickPlusIsOr; [12]=[01]+[01] is actually an OR');

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - trickPlusIsOr R=A|B;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '+', domain__debug(getDomain(indexB)));
      let vA = force(indexA);
      let vB = force(indexB);
      let vR = vA + vB;
      ASSERT(Number.isInteger(vR), 'should be integer result');
      let R = domain_intersectionValue(getDomain(indexR), vR);
      ASSERT(R, 'R should not be empty here');
      setDomain(indexR, R);
    });

    TRACE(' - Morph plus to A|B');
    // rewrite to `A | B` (inclusive OR)
    // R can later reflect the result
    // (while this won't relieve stress on A or B, it will be one less var to actively worry about)
    ml_vvv2vv(ml, offset, ML_OR, indexA, indexB);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function trickPlusIsNand(ml, offset, indexA, indexB, indexR) {
    // [01]=[01]+[01]   ->   A !& B
    TRACE('   - trickPlusIsNand; [01]=[01]+[01] is actually a NAND');

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - trickPlusIsNand R=A!&B;', indexR, '=', indexA, '+', indexB, '  ->  ', domain__debug(getDomain(indexR)), '=', domain__debug(getDomain(indexA)), '+', domain__debug(getDomain(indexB)));
      let vA = force(indexA);
      let vB = force(indexB);
      let vR = vA + vB;
      ASSERT(Number.isInteger(vR), 'should be integer result');
      let R = domain_intersectionValue(getDomain(indexR), vR);
      ASSERT(R, 'R should not be empty here');
      setDomain(indexR, R);
    });

    TRACE(' - Rewrite to A!&B');
    // rewrite to `A !& B` (not AND) to enforce that they can't both be 1 (... "non-zero")
    // R can later reflect the result
    // (while this won't relieve stress on A or B, it will be one less var to actively worry about)
    ml_vvv2vv(ml, offset, ML_NAND, indexA, indexB);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    somethingChanged();
  }

  function trickSumNall(ml, offset, argCount, indexR) {
    // [0 0 n-1 n-1]=sum([01] [01] [01]   ->   nall(...)
    TRACE('   - trickSumNall; [0 0 n-1 n-1]=sum([01] [01] [01] ...) is actually a NALL', indexR);

    // collect the arg indexes (kind of dupe loop but we'd rather not make an array prematurely)
    let args = [];
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, offset + SIZEOF_COUNT + i * 2);
      args.push(index);
      bounty_markVar(bounty, index);
    }

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - trickSumNall nall(A B);', indexR, '= sum(', args, ')  ->  ', domain__debug(getDomain(indexR)), '= sum(', args.map(index => domain__debug(getDomain(index))), ')');

      let vR = args.map(force).reduce((a, b) => a + b);
      ASSERT(Number.isInteger(vR), 'should be integer result');
      let R = domain_intersectionValue(getDomain(indexR), vR);
      ASSERT(R, 'R should not be empty here');
      setDomain(indexR, R);
    });

    // from sum to nall.
    ml_enc8(ml, offset, ML_NALL);
    ml_enc16(ml, offset + 1, argCount);
    for (let i = 0; i < argCount; ++i) {
      ml_enc16(ml, offset + SIZEOF_COUNT + i * 2, args[i]);
    }
    ml_jump(ml, offset + SIZEOF_COUNT + argCount * 2, 2); // result var (16bit). for the rest nall is same as sum
    bounty_markVar(bounty, indexR); // args already done in above loop
    somethingChanged();
  }

  function trickLteLhsTwice(indexS, offset, meta, counts) {
    // S <= A, S <= B   ->   * (S=leaf, drop both)

    let offset1 = bounty_getOffset(bounty, indexS, 0);
    let offset2 = bounty_getOffset(bounty, indexS, 1);
    TRACE('trickLteLhsTwice', indexS, 'at', offset, 'and', offset1, '/', offset2, 'metaFlags:', meta, '`S <= A, S <= B   ->   * (S=leaf, drop both)`');

    // the next asserts should have been verified by the bounty hunter, so they are only verified in ASSERTs
    ASSERT(counts === 2, 'the indexS should only be part of two constraints', counts, bounty__debugMeta(meta), 'wtf?', meta);
    ASSERT(meta === (BOUNTY_LTE_LHS | BOUNTY_NOT_BOOLY_ONLY_FLAG), 'in both constraints the shared index should be the lhs of an lte');
    ASSERT(offset === offset1, 'expecting current offset to be the first recorded (because its the first visited and both are lte so both follow the same code path');
    ASSERT(ml_dec8(ml, offset1) === ML_LTE, 'offset1 should be lte');
    ASSERT(ml_dec8(ml, offset2) === ML_LTE, 'offset2 should be lte');
    ASSERT(ml_dec16(ml, offset1 + 1) === indexS, 'shared index should be lhs of offset1');
    ASSERT(ml_dec16(ml, offset2 + 1) === indexS, 'shared index should be lhs of offset2');

    let indexA = readIndex(ml, offset1 + 3);
    let indexB = readIndex(ml, offset2 + 3);

    // [01] <= [01], [01] <= [01]
    // [05] <= [09], [05] <= [04]
    // [34] <= [02], [34] <= [45] -> reject
    // [34] <= [05], [34] <= [05] -> possibly reject at solve time (so not leaf...)

    let S = getDomain(indexS, true);
    let A = getDomain(indexA, true);
    let B = getDomain(indexB, true);
    ASSERT(A && B && S, 'domains should not be empty');

    let minS = domain_min(S);
    let maxS = domain_max(S);
    // this case shouldnt be possible if minimizer does its job properly
    if (domain_min(A) < minS || domain_min(B) < minS || domain_max(A) < maxS || domain_max(B) < maxS) {
      // leaf S can not (yet) reflect every value of A and B such that S<A and S<B at solve time is guaranteed to hold. postpone this cut.
      TRACE(' - the shared var can not yet reflect all values of A and B so cannot cut yet, bailing', domain__debug(S), domain__debug(A), domain__debug(B));
      return false;
    }

    TRACE(' - okay, S is a leaf constraint, eliminating both ltes, defer S');

    // okay, two lte with the left being the shared index
    // the shared var holds under lte for any value of A and B
    // the shared index is a leaf var, eliminate them both

    ml_eliminate(ml, offset1, SIZEOF_VV);
    ml_eliminate(ml, offset2, SIZEOF_VV);

    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - 2xlte; offset1;', indexS, '!&', indexA, '  ->  ', domain__debug(getDomain(indexS)), '<=', domain__debug(getDomain(indexA)));
      TRACE(' - 2xlte; offset2;', indexS, '!&', indexB, '  ->  ', domain__debug(getDomain(indexS)), '<=', domain__debug(getDomain(indexB)));

      let S = S = domain_removeGtUnsafe(domain_removeGtUnsafe(getDomain(indexS), force(indexA)), force(indexB));
      ASSERT(S, 'S should be able to reflect the solution');
      setDomain(indexS, S);
    });

    bounty_markVar(bounty, indexS);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    somethingChanged();
    return true;
  }

  function trickLteLhsIsall(ml, lteOffset, indexA, meta, countsA) {
    // S <= A, S = all?(A B)   ->   S = all?(A B)
    // (the isall subsumes the lte, regardless of other constraints)

    TRACE('trickLteLhsTwice', indexA, 'at', lteOffset, 'metaFlags:', bounty__debugMeta(meta), '`S <= A, S = all?(A B ...)   ->   S = all?(A B ...)`');
    TRACE(' - lte:', readIndex(ml, lteOffset + 1), '<=', indexA, '->', domain__debug(getDomain(readIndex(ml, lteOffset + 1), true)), '<=', domain__debug(getDomain(indexA, true)));

    // the next asserts should have been verified by the bounty hunter, so they are only verified in ASSERTs
    ASSERT(countsA > 1, 'the indexA should only be part of two constraints', countsA, bounty__debugMeta(meta), 'wtf?', meta);
    ASSERT(countsA === getCounts(bounty, indexA), 'correct value?', countsA === getCounts(bounty, indexA));
    ASSERT((meta & BOUNTY_LTE_LHS) === BOUNTY_LTE_LHS && (meta & BOUNTY_ISALL_RESULT) === BOUNTY_ISALL_RESULT, 's must at least be an lte lhs and isall result var');
    ASSERT(ml_dec8(ml, lteOffset) === ML_LTE, 'lteOffset should be lte');
    ASSERT(ml_dec16(ml, lteOffset + 1) === indexA, 'shared index should be lhs of lteOffset');

    let indexB = readIndex(ml, lteOffset + 3);

    let toCheck = Math.min(countsA, BOUNTY_MAX_OFFSETS_TO_TRACK);

    // note: it's not guaranteed that we'll actually see an isall in this loop
    // if countsA is higher than the max number of offsets tracked by bounty
    // in that case nothing happens and the redundant constraint persists. no biggie
    for (let i = 0; i < toCheck; ++i) {
      TRACE('   - fetching #', i, '/', toCheck, '(', countsA, '|', BOUNTY_MAX_OFFSETS_TO_TRACK, ')');
      let offset = bounty_getOffset(bounty, indexA, i);
      TRACE('   - #' + i, ', offset =', offset);
      if (offset !== lteOffset) {
        let op = ml_dec8(ml, offset);
        if (op === ML_ISALL) {
          if (_trickLteLhsIsall1(lteOffset, offset, indexA, indexB)) return true;
        } else if (op === ML_ISALL2) {
          if (_trickLteLhsIsall2(lteOffset, offset, indexA, indexB)) return true;
        }
      }
    }

    TRACE(' - end of trickLteLhsIsall');
    return false;
  }
  function _trickLteLhsIsall1(lteOffset, isallOffset, indexA, indexB) {
    // A <= B, A = all?(B C D ...) -> drop lte

    let argCount = readIndex(ml, isallOffset + 1);
    let indexR = readIndex(ml, isallOffset + SIZEOF_COUNT + argCount * 2);
    TRACE('     - isall 1 with an argCount of', argCount, ', indexR=', indexR, '=indexA=', indexA, 'cross checking all args to match', indexB);
    ASSERT(indexA === indexR, 'A should be R, should be asserted by bounty');

    // scan for any arg index == B
    for (let i = 0; i < argCount; ++i) {
      let argIndex = readIndex(ml, isallOffset + SIZEOF_COUNT + i * 2);
      if (argIndex === indexB) {
        TRACE('     - arg index is indexB, match. this is R <= A, R = all?(A ...) so eliminate the lte');
        ml_eliminate(ml, lteOffset, SIZEOF_VV);
        bounty_markVar(bounty, indexA);
        bounty_markVar(bounty, indexB);
        somethingChanged();
        return true;
      }
    }
    return false;
  }
  function _trickLteLhsIsall2(lteOffset, isallOffset, indexA, indexB) {
    // A <= B, A = all?(B C) -> drop lte

    TRACE('     - isall 2;', readIndex(ml, isallOffset + 5), '= all?(', readIndex(ml, isallOffset + 1), readIndex(ml, isallOffset + 3), ') and ', indexA, '<=', indexB);
    ASSERT(indexA === readIndex(ml, isallOffset + 5), 'A should be R, should be asserted by bounty');

    if (readIndex(ml, isallOffset + 1) === indexB || readIndex(ml, isallOffset + 3) === indexB) { // doesnt really matter which arg matches
      TRACE('     - indexX or indexY is indexB, match. this is R <= A, R = all?(A ...) so eliminate the lte');
      ml_eliminate(ml, lteOffset, SIZEOF_VV);
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      somethingChanged();
      return true;
    }
    return false;
  }

  function trickLteRhsIsallEntry(indexS, lteOffset, meta, counts) {
    // A <= S, S = all?(B C...)    ->    A <= B, A <= C

    let offset1 = bounty_getOffset(bounty, indexS, 0);
    let offset2 = bounty_getOffset(bounty, indexS, 1);
    TRACE('trickLteRhsIsallEntry; ', indexS, 'at', lteOffset, '->', offset1, offset2, '` A <= S, S = all?(B C...)    ->    A <= B, A <= C`');
    ASSERT(lteOffset === offset1 || lteOffset === offset2, 'expecting current offset to be one of the two offsets found', lteOffset, indexS);

    let isallOffset = lteOffset === offset1 ? offset2 : offset1;

    // this stuff should have been checked by the bounty hunter, so we tuck them in ASSERTs
    ASSERT(ml_dec8(ml, lteOffset) === ML_LTE, 'lte offset should be an lte');
    ASSERT(ml_dec8(ml, isallOffset) === ML_ISALL || ml_dec8(ml, isallOffset) === ML_ISALL2, 'isall offset should be either isall op');
    ASSERT(meta === (BOUNTY_LTE_RHS | BOUNTY_ISALL_RESULT), 'kind of redundant, but this is what bounty should have yielded for this var');
    ASSERT(counts === 2, 'S should only appear in two constraints');
    ASSERT((ml_dec8(ml, isallOffset) === ML_ISALL ? readIndex(ml, isallOffset + SIZEOF_COUNT + ml_dec16(ml, isallOffset + 1) * 2) : readIndex(ml, isallOffset + 5)) === indexS, 'S should the result of the isall');

    // we can replace an isall and lte with ltes on the args of the isall
    // A <= S, S = isall(C D)   ->    A <= C, A <= D

    // note that A amust be strict bool and A must have a 0 for this to be safe. S is our shared var here.
    // [01] <= [01], [01] = isall(....)

    // if you dont apply this condition:
    // [0 0 5 5 9 9] <= [0 0 9 9], [0 0 9 9] = isall([55], [66])
    // after the morph A _must_ be 0 or 5 while before it could also be 9.

    let indexA = readIndex(ml, lteOffset + 1);
    let A = getDomain(indexA, true);
    ASSERT(indexS === readIndex(ml, lteOffset + 3), 'S should be rhs of lte');
    let S = getDomain(indexS, true);

    // mostly A will be [01] but dont rule out valid cases when A=0 or A=1
    // A or C (or both) MUST be boolean bound or this trick may be bad (A=100,S=100,C=1,D=1 -> 100<=10,100<=10 while it should pass)

    if (domain_max(A) > 1 && domain_max(S) > 1) {
      TRACE(' - neither A nor S was boolean bound, bailing', domain__debug(A), domain__debug(S));
      return false;
    }

    if (domain_hasNoZero(S)) {
      // (dead code because minifier should eliminate an isall when R>=1)
      TRACE('- S has no zero which it would need to reflect any solution as a leaf, bailing', domain__debug(S));
      // (unless the isall was already solved, but the minimizer should take care of that)
      return false;
    }

    if (domain_max(A) > domain_max(S)) {
      // (dead code because minifier should eliminate an isall when R=0)
      TRACE(' - max(A) > max(S) so there is a value in A that S couldnt satisfy A<=S so we must bail', domain__debug(A), domain__debug(S));
      // we can only trick if S can represent any valuation of A and there is a reject possible so no
      // note that this shouldnt happen when the minimizer runs to the max, but could in single cycle mode
      return false;
    }

    TRACE(' - A and S are okay proceeding with morph, A:', domain__debug(A), 'S:', domain__debug(S));

    if (ml_dec8(ml, isallOffset) === ML_ISALL) {
      TRACE(' - op is MS_ISALL (1)');
      return trickLteRhsIsall1(ml, lteOffset, isallOffset, indexA, indexS);
    } else {
      TRACE(' - op is MS_ISALL2');
      return trickLteRhsIsall2(ml, lteOffset, isallOffset, indexA, indexS);
    }
  }
  function trickLteRhsIsall1(ml, lteOffset, isallOffset, indexA, indexS) {
    let argCount = ml_dec16(ml, isallOffset + 1);
    TRACE(' - trickLteRhsIsall1; an isall1 with', argCount, 'args; rewriting A <= S, S=isall(X Y Z ...)  ->  A <= X, A <= Y, A <= Z, ...');

    let A = getDomain(indexA, true);
    let maxA = domain_max(A);
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, isallOffset + SIZEOF_COUNT + i * 2);
      let domain = getDomain(index, true);
      if (domain_max(domain) < maxA) {
        TRACE(' - there is an isall arg whose max is lower than max(A), this leads to a lossy morph so we must bail', i, index, domain__debug(domain), '<', domain__debug(A));
        return false;
      }
    }

    // we can recylce space but its relatively expensive to search for empty space;
    // we can fit 2 ltes in our existing constraints (lte is 5, isall with 2 args is (1+2+2*2+2=9), so one lte in each)
    // we can fit 3 ltes in our existing constraints (lte is 5, isall with 2 args is (1+2+3*2+2=11), so two ltes in the isall)
    // four or more wont fit so for those we need to recycle spaces

    if (argCount <= 1) return false; // this is an alias or a bug, but ignore this case here
    if (argCount === 2) { // dead code since args=2 should become isall2 and this is isall1
      trickLteRhsIsall1a2(ml, lteOffset, isallOffset, indexA, indexS);
    } else if (argCount === 3) {
      trickLteRhsIsall1a3(ml, lteOffset, isallOffset, indexA, indexS, 3);
    } else {
      let pass = trickLteRhsIsall1a4p(ml, lteOffset, isallOffset, argCount, indexA, indexS);
      if (!pass) return false;
    }

    return true;
  }
  function trickLteRhsIsall1a2(ml, lteOffset, isallOffset, indexA, indexS) {
    // isall has two args
    TRACE(' - trickLteRhsIsall1a2; an isall with 2 args; lteOffset:', lteOffset, 'isallOffset:', isallOffset, 'indexA:', indexA, 'indexR:', indexS);

    let indexX = readIndex(ml, isallOffset + 3);
    let indexY = readIndex(ml, isallOffset + 5);

    // compile A<=left and A<=right over the existing two offsets
    ml_vv2vv(ml, lteOffset, ML_LTE, indexA, indexX);
    ml_cr2vv(ml, isallOffset, 2, ML_LTE, indexA, indexY);

    // must mark all affected vars. their bounty data is probably obsolete now.
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexS);
    bounty_markVar(bounty, indexX);
    bounty_markVar(bounty, indexY);
    somethingChanged();

    TRACE('   - deferring', indexS, 'will be gt', indexA, 'and the result of an isall');
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - trickLteRhsIsall1a2;', indexS, '= all?(', indexX, indexY, ')  ->  ', domain__debug(getDomain(indexS)), '= all?(', domain__debug(getDomain(indexX)), domain__debug(getDomain(indexY)), ')');
      let vX = force(indexX);
      let vY = force(indexY);
      let oS = getDomain(indexS);
      ASSERT(domain_isBool(oS), 'S was a strict bool, right');
      let S = domain_booly(oS, vX && vY); // note: S was a strict bool so this should be fine
      ASSERT(S, 'S should not be empty here');
      setDomain(indexS, S);
    });
  }
  function trickLteRhsIsall1a3(ml, lteOffset, isallOffset, indexA, indexS, _argCount) {
    // isall has three args
    TRACE(' - trickLteRhsIsall1a3; an isall with 3 args; lteOffset:', lteOffset, 'isallOffset:', isallOffset, 'indexA:', indexA, 'indexR:', indexS);

    let indexX = readIndex(ml, isallOffset + 3);
    let indexY = readIndex(ml, isallOffset + 5);
    let indexZ = readIndex(ml, isallOffset + 7);
    _trickLteRhsIsall1a3(ml, lteOffset, isallOffset, indexA, indexS, indexX, indexY, indexZ, SIZEOF_COUNT + _argCount * 2 + 2, _argCount);

    TRACE('   - deferring', indexS, 'will be gt', indexA, 'and the result of an isall');
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - trickLteRhsIsall1a3;', indexS, '= all?(', indexX, indexY, indexZ, ')  ->  ', domain__debug(getDomain(indexS)), '= all?(', domain__debug(getDomain(indexX)), domain__debug(getDomain(indexY)), domain__debug(getDomain(indexZ)), ')');
      let vX = force(indexX);
      let vY = force(indexY);
      let vZ = force(indexZ);
      let oS = getDomain(indexS);
      ASSERT(domain_isBool(oS), 'S was a strict bool, right');
      let S = domain_booly(oS, vX && vY && vZ); // note: S was a strict bool so this should be fine
      ASSERT(S, 'S should not be empty here');
      setDomain(indexS, S);
    });
  }
  function _trickLteRhsIsall1a3(ml, lteOffset, isallOffset, indexA, indexS, indexX, indexY, indexZ, sizeofIsall, _argCount) {
    // isall has three args (left). it may have had more originally.
    TRACE(' - _trickLteRhsIsall1a3; lteOffset:', lteOffset, 'isallOffset:', isallOffset, 'indexA:', indexA, 'indexR:', indexS, 'indexX:', indexX, 'indexY:', indexY, 'indexZ:', indexZ, 'sizeofIsall:', sizeofIsall, '_argCount:', _argCount);
    ASSERT(sizeofIsall === ml_getOpSizeSlow(ml, isallOffset), 'should get correct isall sizeof');
    ASSERT(ml[isallOffset] === ML_ISALL, '3 args means isall1 not isall2');
    ASSERT(sizeofIsall === SIZEOF_COUNT + _argCount * 2 + 2, 'just checking', _argCount, sizeofIsall);

    // the first lte replaces the existing lte
    ml_vv2vv(ml, lteOffset, ML_LTE, indexA, indexX);

    // note: cant use ml_cr2vv for the next one because assumptions are not binary safe due to how jumps are consolidated
    ASSERT(SIZEOF_COUNT + 3 * 2 + 2 === 11, 'if this changes the code below probably needs to be updated as well');

    TRACE(' - compiling first lte starting at', isallOffset);
    // second lte, into first half of isall
    ml_enc8(ml, isallOffset, ML_LTE);
    ml_enc16(ml, isallOffset + 1, indexA);
    ml_enc16(ml, isallOffset + 3, indexY);

    isallOffset += SIZEOF_VV;

    TRACE(' - compiling second lte starting at', isallOffset);
    // third lte, into second half of lte
    ml_enc8(ml, isallOffset, ML_LTE);
    ml_enc16(ml, isallOffset + 1, indexA);
    ml_enc16(ml, isallOffset + 3, indexZ);

    let left = sizeofIsall - (SIZEOF_VV + SIZEOF_VV);
    TRACE(' - compiling jump starting at', isallOffset, 'for', left, 'bytes, old size was', sizeofIsall);
    ml_jump(ml, isallOffset + SIZEOF_VV, left);

    ASSERT(ml_validateSkeleton(ml, '_trickLteRhsIsall1a3'));

    // must mark all affected vars. their bounty data is probably obsolete now.
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexS);
    bounty_markVar(bounty, indexX);
    bounty_markVar(bounty, indexY);
    bounty_markVar(bounty, indexZ);
    somethingChanged();
  }
  function trickLteRhsIsall1a4p(ml, lteOffset, isallOffset, argCount, indexA, indexS) {
    // isall has four or more args
    TRACE(' - trickLteRhsIsall1a4p. Attempting to recycle space to stuff', argCount, 'lte constraints');

    // we have to recycle some space now. we wont know whether we can
    // actually do the morph until we've collected enough space for it.

    // we'll use lteOffset and isallOffset to compile the last 3 args so only need space for the remaining ones
    ASSERT(argCount >= 4, 'this function should only be called for 4+ isall args');
    let toRecycle = argCount - 3;

    // start by collecting toRecycle recycled spaces
    let bins = ml_getRecycleOffsets(ml, 0, toRecycle, SIZEOF_VV);
    if (!bins) {
      TRACE(' - Was unable to find enough free space to fit', argCount, 'ltes, bailing');
      return false;
    }

    TRACE(' - Found', bins.length, 'jumps (', bins, ') which can host (at least)', toRecycle, 'lte constraints. Compiling them now');

    // okay, now we'll morph. be careful about clobbering existing indexes... start with
    // last address to make sure jumps dont clobber existing jump offsets in the bin

    let args = []; // need this list for deferred solving
    let i = 0;
    while (i < toRecycle) {
      let currentOffset = bins.pop();
      ASSERT(ml_dec8(ml, currentOffset) === ML_JMP, 'should only get jumps here'); // might trap a case where we clobber
      let size = ml_getOpSizeSlow(ml, currentOffset);
      ASSERT(size >= SIZEOF_VV, 'this is what we asked for');
      do {
        let indexB = readIndex(ml, isallOffset + SIZEOF_COUNT + i * 2);
        TRACE('  - compiling lte:', indexA, '<=', indexB, ' -> ', domain__debug(getDomain(indexA, true)), '<=', domain__debug(getDomain(indexB, true)));
        bounty_markVar(bounty, indexB);
        args.push(indexB);

        ml_enc8(ml, currentOffset, ML_LTE);
        ml_enc16(ml, currentOffset + 1, indexA);
        ml_enc16(ml, currentOffset + 3, indexB);

        ++i;
        size -= SIZEOF_VV;
        currentOffset += SIZEOF_VV;
      } while (size >= SIZEOF_VV && i < toRecycle);
      if (size) ml_jump(ml, currentOffset, size);
      ASSERT(!void ml_validateSkeleton(ml), 'trickLteRhsIsall1a4p compiling ltes'); // cant check earlier
    }

    // now burn off the last three isall args by recycling our existing isall+lte offsets
    let indexX = readIndex(ml, isallOffset + SIZEOF_COUNT + (argCount - 3) * 2);
    let indexY = readIndex(ml, isallOffset + SIZEOF_COUNT + (argCount - 2) * 2);
    let indexZ = readIndex(ml, isallOffset + SIZEOF_COUNT + (argCount - 1) * 2);
    args.push(indexX, indexY, indexZ);
    _trickLteRhsIsall1a3(ml, lteOffset, isallOffset, indexA, indexS, indexX, indexY, indexZ, SIZEOF_COUNT + argCount * 2 + 2, argCount);

    TRACE('   - deferring', indexS, 'will be gt', indexA, 'and the result of an isall');
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - trickLteRhsIsall1a4p;', indexS, '= all?(', args, ')  ->  ', domain__debug(getDomain(indexS)), '= all?(', args.map(index => domain__debug(getDomain(index))), ')');

      let result = args.reduce((prev, now) => prev && now) > 0; // true if every arg was non-zero
      let oS = getDomain(indexS);
      ASSERT(domain_isBool(oS), 'S was a strict bool, right');
      let S = domain_booly(oS, result); // note: S was a strict bool so this should be fine
      ASSERT(S, 'S should not be empty here');
      setDomain(indexS, S);
    });
  }
  function trickLteRhsIsall2(ml, lteOffset, isallOffset, indexA, indexS) {
    TRACE(' - trickLteRhsIsall2');

    let indexX = readIndex(ml, isallOffset + 1);
    let indexY = readIndex(ml, isallOffset + 3);
    ASSERT(indexS === readIndex(ml, isallOffset + 5), 'the lte rhs should be the isall r');

    // compile A<=left and A<=right over the existing two offsets
    ml_vv2vv(ml, lteOffset, ML_LTE, indexA, indexX);
    ml_vvv2vv(ml, isallOffset, ML_LTE, indexA, indexY);

    // must mark all affected vars. their bounty data is probably obsolete now.
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexS);
    bounty_markVar(bounty, indexX);
    bounty_markVar(bounty, indexY);
    somethingChanged();

    TRACE('   - deferring', indexS, 'will be gt', indexA, 'and the result of an isall');
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - trickLteRhsIsall2;', indexS, '= all?(', indexX, indexY, ')  ->  ', domain__debug(getDomain(indexS)), '= all?(', domain__debug(getDomain(indexX)), domain__debug(getDomain(indexY)), ')');
      let vX = force(indexX);
      let vY = force(indexY);
      let oS = getDomain(indexS);
      ASSERT(domain_isBool(oS), 'S was a strict bool, right');
      let S = domain_booly(oS, vX && vY); // note: S was a strict bool so this should be fine
      ASSERT(S, 'S should not be empty here');
      setDomain(indexS, S);
    });

    return true;
  }

  function trickIsall1Nall(ml, indexR, isallOffset, counts, meta) {
    // R = all?(A B), nall(R A D)   ->    R = all?(A B), R !& D

    let offset1 = bounty_getOffset(bounty, indexR, 0);
    let offset2 = bounty_getOffset(bounty, indexR, 1);

    TRACE('trickIsall1Nall', indexR, 'at', isallOffset, 'and', offset1, '/', offset2, 'metaFlags:', getMeta(bounty, indexR, true), '`R = all?(A B), nall(R A D)   ->    R = all?(A B), R !& D`');

    let nallOffset = offset1 === isallOffset ? offset2 : offset1;
    let argCountNall = ml_dec16(ml, nallOffset + 1);
    let argCountIsall = ml_dec16(ml, isallOffset + 1);

    // this stuff should have been checked by the bounty hunter, so we tuck them in ASSERTs
    ASSERT(meta === (BOUNTY_NALL | BOUNTY_ISALL_RESULT), 'the var should only be part of a nall and the result of an isall');
    ASSERT(counts === 2, 'R should only appear in two constraints');
    ASSERT(isallOffset === offset1 || isallOffset === offset2, 'expecting current offset to be one of the two offsets found', isallOffset, indexR);
    ASSERT(ml_dec8(ml, isallOffset) === ML_ISALL, 'isall offset should be an isall (1)');
    ASSERT(ml_dec8(ml, nallOffset) === ML_NALL, 'other offset should be a nall');
    ASSERT(getAlias(indexR) === indexR, 'should be unaliased');
    ASSERT(readIndex(ml, isallOffset + SIZEOF_COUNT + argCountIsall * 2) === indexR, 'var should be R of isall');

    // this should be `R = all?(A B ...), nall(R A D)`
    // if R = 1 then A and B (etc) are 1, so the nall will have two 1's, meaning D must be 0
    // if R = 0 then the nall is already satisfied. neither the nall nor the isall is redundant
    // because `R !& D` must be maintained, so rewrite it to a nand (or rather, remove the shared arg from the nall)

    if (argCountNall !== 3) {
      TRACE(' - fingerprint didnt match (', argCountNall, ' !== 3) so bailing');
      return false;
    }

    // (this is kind of dead code since isall1 wont get 2 args and that's required for this trick)
    TRACE(' - nall has 3 args, check if it shares an arg with the isall');
    // next; one of the two isalls must occur in the nall
    // R = all?(A B), nall(R A C)
    // R = all?(A B), nall(X Y Z)

    // nall args
    let indexX = readIndex(ml, nallOffset + SIZEOF_COUNT);
    let indexY = readIndex(ml, nallOffset + SIZEOF_COUNT + 2);
    let indexZ = readIndex(ml, nallOffset + SIZEOF_COUNT + 4);
    TRACE(' - nall(' + [indexX, indexY, indexZ] + ') -> nall(', [domain__debug(getDomain(indexX, true)), domain__debug(getDomain(indexY)), domain__debug(getDomain(indexZ))], ')');

    for (let i = 0; i < argCountIsall; ++i) {
      let argIndex = readIndex(ml, isallOffset + SIZEOF_COUNT + i * 2);
      if (argIndex === indexX) {
        TRACE(' - isall arg', i, 'matches the first arg of nall. morphing nall to nand on the other two args (', indexY, indexZ, ') and returning');
        ml_c2vv(ml, nallOffset, argCountNall, ML_NAND, indexY, indexZ);
        // this only affected the nall and its args so no need to mark the isall vars
        bounty_markVar(bounty, indexX);
        bounty_markVar(bounty, indexY);
        bounty_markVar(bounty, indexZ);
        somethingChanged();
        return true;
      }
      if (argIndex === indexY) {
        TRACE(' - isall arg', i, 'matches the second arg of nall. morphing nall to nand on the other two args (', indexX, indexZ, ') and returning');
        ml_c2vv(ml, nallOffset, argCountNall, ML_NAND, indexX, indexZ);
        // this only affected the nall and its args so no need to mark the isall vars
        bounty_markVar(bounty, indexX);
        bounty_markVar(bounty, indexY);
        bounty_markVar(bounty, indexZ);
        somethingChanged();
        return true;
      }
      if (argIndex === indexZ) {
        TRACE(' - isall arg', i, 'matches the first arg of nall. morphing nall to nand on the other two args (', indexX, indexY, ') and returning');
        ml_c2vv(ml, nallOffset, argCountNall, ML_NAND, indexX, indexY);
        // this only affected the nall and its args so no need to mark the isall vars
        bounty_markVar(bounty, indexX);
        bounty_markVar(bounty, indexY);
        bounty_markVar(bounty, indexZ);
        somethingChanged();
        return true;
      }
    }

    TRACE(' - no shared args');
    return false;
  }
  function trickIsall2Nall(ml, indexR, isallOffset, counts, meta) {
    // R = all?(A B), nall(R A D)   ->    R = all?(A B), R !& D

    let offset1 = bounty_getOffset(bounty, indexR, 0);
    let offset2 = bounty_getOffset(bounty, indexR, 1);

    TRACE('trickIsall2Nall', indexR, 'at', isallOffset, 'and', offset1, '/', offset2, 'metaFlags:', getMeta(bounty, indexR), '`R = all?(A B), nall(R A D)   ->    R = all?(A B), R !& D`');

    let nallOffset = offset1 === isallOffset ? offset2 : offset1;
    let argCountNall = ml_dec16(ml, nallOffset + 1);

    // this stuff should have been checked by the bounty hunter, so we tuck them in ASSERTs
    ASSERT(meta === (BOUNTY_NALL | BOUNTY_ISALL_RESULT), 'the var should only be part of a nall and the result of an isall', bounty__debugMeta(meta));
    ASSERT(counts === 2, 'R should only appear in two constraints');
    ASSERT(isallOffset === offset1 || isallOffset === offset2, 'expecting current offset to be one of the two offsets found', isallOffset, indexR);
    ASSERT(ml_dec8(ml, isallOffset) === ML_ISALL2, 'isall offset should be an isall2');
    ASSERT(ml_dec8(ml, nallOffset) === ML_NALL, 'other offset should be a nall');
    ASSERT(getAlias(indexR) === indexR, 'should be unaliased');
    ASSERT(readIndex(ml, isallOffset + 5) === indexR, 'var should be R of isall2');

    // this should be `R = all?(A B), nall(R A D)`
    // if R = 1 then A and B are 1, so the nall will have two 1's, meaning D must be 0
    // if R = 0 then the nall is already satisfied. the nall is not entirely redundant
    // because `R !& D` must be maintained, so rewrite it to a nand (or rather, remove B from it)

    TRACE(' - the ops match. now fingerprint them');

    // initially, for this we need a nall of 3 and a isall of 2 (always the case for isall2)
    if (argCountNall !== 3) {
      TRACE(' - fingerprint did not match so bailing');
      return false;
    }

    TRACE(' - nall has 3 and isall 2 args, R must be shared, now check if they share an arg');
    // next; one of the two isall args must occur in the nall
    // R = all?(A B), nall(R A C)
    // R = all?(A B), nall(X Y Z)

    let indexA = ml_dec16(ml, isallOffset + 1);
    let indexB = ml_dec16(ml, isallOffset + 3);

    // R = all?(A B), nall(R A C)
    // R = all?(A B), nall(X Y Z)

    let indexX = ml_dec16(ml, nallOffset + SIZEOF_COUNT);
    let indexY = ml_dec16(ml, nallOffset + SIZEOF_COUNT + 2);
    let indexZ = ml_dec16(ml, nallOffset + SIZEOF_COUNT + 4);

    ASSERT(indexR === indexX || indexR === indexY || indexR === indexZ, 'bounty should assert that R of isall is a nall arg');

    let indexC;
    let indexD;
    if (indexX === indexR) {
      indexC = indexY;
      indexD = indexZ;
    } else if (indexY === indexR) {
      indexC = indexX;
      indexD = indexZ;
    } else {
      ASSERT(indexZ === indexR, 'kinda redundant');
      indexC = indexX;
      indexD = indexY;
    }

    TRACE(' - nall(', indexR, indexC, indexD, ') and ', indexR, ' = all?(', indexA, indexB, ')');

    // check if C or D is in the isall. apply morph by cutting the one that matches from the nall
    let notShared = (indexA === indexC || indexB === indexC) ? indexD : (indexA === indexD || indexB === indexD) ? indexC : -1;
    if (notShared >= 0) {
      TRACE(' - A or B == C or D (', indexA, indexB, indexC, indexD, ') so changing the nall to a nand on', indexR, 'and', notShared);
      ml_c2vv(ml, nallOffset, argCountNall, ML_NAND, indexR, notShared);
      bounty_markVar(bounty, indexA);
      bounty_markVar(bounty, indexB);
      bounty_markVar(bounty, indexC);
      bounty_markVar(bounty, indexD);
      bounty_markVar(bounty, indexR);
      somethingChanged();
      return true;
    }

    return false;
  }

  function trickNandLteLhs(ml, indexA, lteOffset, meta, counts) {
    // A <= B, A !& C   ->   * (A leaf)

    TRACE('trickNandLteLhs bounty__debug(bounty, indexA):', bounty__debug(bounty, indexA));

    let offset1 = bounty_getOffset(bounty, indexA, 0);
    let offset2 = bounty_getOffset(bounty, indexA, 1);

    TRACE('trickNandLteLhs;', indexA, '`A <= B, A !& C   ->   * (A leaf)`');

    let nandOffset = offset1 === lteOffset ? offset2 : offset1;

    // this stuff should have been checked by the bounty hunter, so we tuck them in ASSERTs
    ASSERT(meta === (BOUNTY_NAND | BOUNTY_LTE_LHS), 'the var should only be lhs of lte and part of a nand', meta.toString(2), counts);
    ASSERT(counts === 2, 'A should only appear in two constraints');
    ASSERT(lteOffset === offset1 || lteOffset === offset2, 'expecting current offset to be one of the two offsets found');
    ASSERT(ml_dec8(ml, lteOffset) === ML_LTE, 'isall offset should be an isall');
    ASSERT(ml_dec8(ml, nandOffset) === ML_NAND, 'other offset should be a nall');
    ASSERT(getAlias(indexA) === indexA, 'should be unaliased');
    ASSERT(readIndex(ml, lteOffset + 1) === indexA, 'A should be lhs of lte');
    ASSERT(readIndex(ml, nandOffset + 1) === indexA || readIndex(ml, nandOffset + 3), 'A should be part of the nand');

    // this should be `A <= B, A !& C`. A is a leaf var, eliminate both constraints and defer A.
    // assuming A contains at least 0, it can always satisify both the lte and the nand for any value of B and C
    // A <= B, C !& A

    let indexB = readIndex(ml, lteOffset + 3);
    let indexC = readIndex(ml, nandOffset + 1);
    if (indexC === indexA) indexC = readIndex(ml, nandOffset + 3);

    let A = getDomain(indexA, true);
    if (domain_hasNoZero(A)) {
      // redundant dead code. A is the lte lhs. if C was empty (only case where this now passes) then minimizer would eliminate the nand.
      // without a zero A must have a value lte min(B) and C must be solved to zero or this trick is unsafe
      let B = getDomain(indexB, true);
      let C = getDomain(indexC, true);
      if (domain_min(A) >= domain_min(B) || !domain_isZero(C)) {
        TRACE(' - A can not satisfy both constraints for all values of A and B, bailing trick');
        return false;
      }
    }

    TRACE(' - ok, eliminating constraints, deferring', indexA, domain__debug(getDomain(indexA, true)));
    TRACE(' - eliminating A <= B, A !& C');

    ml_eliminate(ml, nandOffset, SIZEOF_VV);
    ml_eliminate(ml, lteOffset, SIZEOF_VV);

    TRACE(' - A is a leaf constraint, defer it', indexA);

    solveStack.push((_, force, getDomain, setDomain) => {
      let A = getDomain(indexA);
      let B = getDomain(indexB);
      let C = getDomain(indexC);

      TRACE(' - trickNandLteLhs; nand + lte;', indexA, '<=', indexC, '  ->  ', domain__debug(A), '<=', domain__debug(B), 'and', indexA, '!&', indexB, '  ->  ', domain__debug(A), '!=', domain__debug(C));

      // put in the effort not to force B or C if A already satisfies the constraints
      if (domain_min(C) > 0) {
        A = domain_removeGtUnsafe(A, 0);
      } else if (force(indexC) > 0) {
        A = domain_removeGtUnsafe(A, 0);
      } else if (domain_min(A) >= domain_min(B)) {
        A = domain_removeGtUnsafe(A, force(indexB));
      }

      ASSERT(A, 'A should contain result');
      setDomain(indexA, A);
    });

    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexC);
    somethingChanged();
    return true;
  }

  function trickNandIsall1(ml, indexR, isallOffset, counts, meta) {
    // R = all?(A B ...), R !& C  ->  nall(A B ... C)
    // note: this works for any nalls on one isall

    TRACE('trickNandIsall1;', indexR, '`R = all?(A B), R !& C  ->  nall(A B C)` for any nand on one isall, any arg count for either');

    // this stuff should have been checked by the bounty hunter, so we tuck them in ASSERTs
    ASSERT(meta === (BOUNTY_NAND | BOUNTY_ISALL_RESULT), 'the var should only be nand and isall', bounty__debugMeta(meta), counts);
    ASSERT(ml_dec8(ml, isallOffset) === ML_ISALL, 'isall offset should be an isall');
    ASSERT(getAlias(indexR) === indexR, 'should be unaliased');
    ASSERT(readIndex(ml, isallOffset + SIZEOF_COUNT + ml_dec16(ml, isallOffset + 1) * 2) === indexR, 'R should be result of isall');

    if (counts > BOUNTY_MAX_OFFSETS_TO_TRACK) {
      TRACE(' - indexR is part of more constraints than the number of offsets tracked by bounty. this means we cant confirm the 1:* => isall:nand ratio requirement, bailing');
      return false;
    }

    let isallArgCount = ml_dec16(ml, isallOffset + 1);
    let isallSizeof = SIZEOF_COUNT + isallArgCount * 2 + 2;
    let isallArgs = [];
    for (let i = 0; i < isallArgCount; ++i) {
      let index = readIndex(ml, isallOffset + SIZEOF_COUNT + i * 2);
      isallArgs.push(index);
    }

    return trickNandIsallRest(ml, isallOffset, indexR, counts, isallArgCount, isallSizeof, isallArgs);
  }
  function trickNandIsall2(ml, indexR, isallOffset, meta, counts) {
    // R = all?(A B), R !& C  ->  nall(A B C)
    // note: this works for any nalls on one isall

    TRACE('trickNandIsall2;', indexR, '`R = all?(A B), R !& C  ->  nall(A B C)` for all nalls');

    // this stuff should have been checked by the bounty hunter, so we tuck them in ASSERTs
    ASSERT(meta === (BOUNTY_NAND | BOUNTY_ISALL_RESULT), 'the var should only be nand and isall');
    ASSERT(ml_dec8(ml, isallOffset) === ML_ISALL2, 'isall offset should be an isall2');
    ASSERT(getAlias(indexR) === indexR, 'should be unaliased');
    ASSERT(readIndex(ml, isallOffset + 5) === indexR, 'R should be result of isall');

    if (counts > BOUNTY_MAX_OFFSETS_TO_TRACK) {
      TRACE(' - indexR is part of more constraints than the number of offsets tracked by bounty. this means we cant confirm the 1:* => isall:nand ratio requirement, bailing');
      return false;
    }

    // this array may be premature and unused, but it saves a lot of duplicate code that's hard to abstract otherwise...

    let isallArgs = [
      readIndex(ml, isallOffset + 1),
      readIndex(ml, isallOffset + 3),
    ];

    return trickNandIsallRest(ml, isallOffset, indexR, counts, 2, SIZEOF_VVV, isallArgs);
  }
  function trickNandIsallRest(ml, isallOffset, indexR, countsR, isallArgCount, isallSizeof, isallArgs) {
    // this is an abstraction to cover ML_ISALL and ML_ISALL2
    TRACE(' - trickNandIsallRest; first confirming other offsets are nands; isallArgs:', isallArgCount, 'x;', isallArgs);

    // first confirm the other offsets are all nands

    let nands = 0;
    for (let i = 0; i < countsR; ++i) {
      let offset = bounty_getOffset(bounty, indexR, i);
      ASSERT(offset, 'there should be as many offsets as counts unless that exceeds the max and that has been checked already');
      if (offset !== isallOffset) {
        let opcode = ml_dec8(ml, offset);
        if (opcode !== ML_NAND) {
          TRACE(' - found at least one other isall, bailing');
          ASSERT(opcode === ML_ISALL2 || opcode === ML_ISALL, 'bounty should have asserted that the offsets can only be isall and nand');
          return false;
        }
        ++nands;
      }
      ASSERT(offset === isallOffset || readIndex(ml, offset + 1) === indexR || readIndex(ml, offset + 3) === indexR, 'R should be part of the nand');
    }

    // bounty asserted that all these nalls contain R, rewrite each such nall

    TRACE(' - trickNandIsallRest; there are', nands, 'nands; for each nand: X !& B, X = all?(C D)   ->   nall(B C D)');

    // we need to get enough space to write the nalls if there is more than one nand (the first fits in the isall)

    // each nand becomes a nall with the isall args + 1
    let sizeofNall = SIZEOF_COUNT + (isallArgCount + 1) * 2;

    TRACE(' - isall offset=', isallOffset, ', isall sizeof=', isallSizeof, ', size of nall is', sizeofNall, ', there are', nands, 'nands. so we need', nands - (isallSizeof < sizeofNall ? 0 : 1), 'spaces');

    let nallSpacesNeeded = nands - (isallSizeof < sizeofNall ? 0 : 1);
    TRACE(' - need to space to recycle', nallSpacesNeeded, 'nall of size=', sizeofNall);
    let bins;
    if (nallSpacesNeeded) {
      bins = ml_getRecycleOffsets(ml, 0, nallSpacesNeeded, sizeofNall);
      if (!bins) {
        TRACE(' - Was unable to find enough free space to fit', nands, 'nalls, bailing');
        return false;
      }
    }

    // if any of the nand args or any of the isall args is 0, then so is R. so collect all args together to defer R
    let allArgs = isallArgs.slice(0);

    let offsetCounter = 0;
    let rewrittenNands = 0; // only used in ASSERTs, minifier should eliminate this

    // immediately recycle the isall if it was large enough (ML_ISALL can fit a ML_NALL but ML_ISALL2 cannot)
    // TODO: postpone elimination until the end to prevent accidental clobbering of current offset by jumps
    if (isallSizeof >= sizeofNall) {
      TRACE(' - recycling isall immediately');
      let nandOffset = bounty_getOffset(bounty, indexR, offsetCounter++);
      if (nandOffset === isallOffset) nandOffset = bounty_getOffset(bounty, indexR, offsetCounter++);
      _trickNandIsallCreateNallAndRemoveNand(ml, indexR, isallArgs.slice(0), allArgs, nandOffset, isallOffset, isallSizeof);
      ASSERT(++rewrittenNands);
    } else {
      TRACE(' - eliminating isall because it is too small');
      ml_eliminate(ml, isallOffset, isallSizeof);
    }

    // TODO: what if the same arg occurs in multiple nands? deduper should take care of this, but what if it doesnt (like in quick-unsound mode)

    if (nallSpacesNeeded) {
      TRACE(' - now morphing the nands remaining (', nallSpacesNeeded, ')');
      ml_recycles(ml, bins, nands, sizeofNall, (recycledOffset, i, sizeLeft) => {
        TRACE('   - using: recycledOffset:', recycledOffset, ', i:', i, ', sizeLeft:', sizeLeft);

        let offset;
        do {
          if (offsetCounter >= countsR) {
            TRACE(' - (last offset must have been offset)');
            return true;
          }
          offset = bounty_getOffset(bounty, indexR, offsetCounter++);
          TRACE('     - offset', offset, 'is isall?', offset === isallOffset);
        } while (offset === isallOffset);

        TRACE('     - offset', offset, 'is not isall so it should be nand;', ml_dec8(ml, offset) === ML_NAND);
        ASSERT(ml_dec8(ml, offset) === ML_NAND, 'should be nand');
        ASSERT(offset, 'the earlier loop counted the nands so it should still have that number of offsets now');
        ASSERT(sizeLeft === ml_getOpSizeSlow(ml, recycledOffset), 'size left should be sizeof op');
        _trickNandIsallCreateNallAndRemoveNand(ml, indexR, isallArgs.slice(0), allArgs, offset, recycledOffset, sizeLeft);
        ASSERT(++rewrittenNands);

        return false;
      });
      ASSERT(rewrittenNands === nands, 'should have processed all offsets for R', rewrittenNands, '==', nands, '(', offsetCounter, countsR, ')');
      TRACE(' - all nands should be morphed now');
    }

    TRACE('   - deferring', indexR, 'will be R = all?(', allArgs, ')');
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - trickNandIsallRest;', indexR, '= all?(', allArgs, ')  ->  ', domain__debug(getDomain(indexR)), '= all?(', allArgs.map(index => domain__debug(getDomain(index))), ')');

      let R = getDomain(indexR);
      allArgs.some(index => {
        let X = getDomain(index);
        if (!domain_hasNoZero(X)) { // if non-zero, this var wont affect R
          let vX = force(index);
          if (vX === 0) {
            R = domain_removeGtUnsafe(R, 0);
            return true;
          }
        }
      });
      // R should be updated properly now. basically if any arg solved to zero, it will be zero. otherwise unchanged.

      ASSERT(R, 'R should have at least a value to solve left');
      setDomain(indexR, R);
    });

    bounty_markVar(bounty, indexR);

    return true;
  }
  function _trickNandIsallCreateNallAndRemoveNand(ml, indexR, nallArgs, allArgs, nandOffset, recycleOffset, recycleSizeof) {
    TRACE(' - _trickNandIsallCreateNallAndRemoveNand: indexR:', indexR, 'nallArgs:', nallArgs, 'allArgs:', allArgs, 'nandOffset:', nandOffset, 'recycleOffset:', recycleOffset, 'recycleSizeof:', recycleSizeof);

    let indexX = readIndex(ml, nandOffset + 1);
    let indexY = readIndex(ml, nandOffset + 3);
    ASSERT(indexX === indexR || indexY === indexR, 'expecting indexR to be part of the nand');
    let index = indexX === indexR ? indexY : indexX;
    TRACE(' - other nand index is', index, domain__debug(getDomain(index, true)));

    nallArgs.push(index);
    allArgs.push(index);
    bounty_markVar(bounty, index);

    TRACE(' - writing a new nall');
    ml_any2c(ml, recycleOffset, recycleSizeof, ML_NALL, nallArgs);
    if (nandOffset !== recycleOffset) {
      TRACE(' - removing the nand because we didnt recycle it');
      ml_eliminate(ml, nandOffset, SIZEOF_VV);
    }
    ASSERT(ml_validateSkeleton(ml, '_trickNandIsallCreateNallAndRemoveNand'));
  }

  function trickNeqElimination(indexX, countsX) {
    // bascially we "invert" one arg by aliasing it to the other arg and then inverting all ops that relate to it

    // X is used multiple times and only with exactly one neq
    // and multiple lte's, or's, nand's.
    // multiple neq's should be eliminated elsewhere
    // lte's are rewritten to NAND or OR, depending where X is
    // or's are rewritten to LTE's
    // nand's are rewritten to LTE's
    // X is considered a leaf var. rewrites use the other NEQ arg Y

    // A <= X, X != Y    ->    A !& Y
    // X <= A, X != Y    ->    A | Y
    // X | A, X != Y     ->    Y <= A
    // X !& A, X != Y     ->    A <= A
    // (any number of ops work the same on a neq, you just invert them)

    // first we need to validate. we can only have one neq

    TRACE('trickNeqElimination; index:', indexX, ', counts:', countsX);

    ASSERT(countsX < BOUNTY_MAX_OFFSETS_TO_TRACK, 'this was already checked in cutneq');

    if (!domain_isBool(getDomain(indexX))) {
      TRACE(' - X is non-bool, bailing');
      return false;
    }

    // we need the offsets to eliminate them and to get the "other" var index for each
    let indexY;
    let neqOffset;
    let lhsOffsets = [];
    let rhsOffsets = [];
    let orOffsets = [];
    let nandOffsets = [];

    let seenNeq = false;
    for (let i = 0; i < countsX; ++i) {
      let offset = bounty_getOffset(bounty, indexX, i);
      ASSERT(offset, 'the offset should exist...', offset);

      let indexA = readIndex(ml, offset + 1);
      let indexB = readIndex(ml, offset + 3);

      let op = ml_dec8(ml, offset);

      ASSERT(op === ML_LTE || op === ML_NEQ || op === ML_OR || op === ML_NAND, 'should be one of these four ops, bounty said so');

      if (op === ML_LTE) {
        ASSERT(indexA === indexX || indexB === indexX, 'bounty should only track relevant ltes');
        let indexT;
        if (indexA === indexX) {
          lhsOffsets.push(offset);
          indexT = indexB;
        } else {
          ASSERT(indexB === indexX, 'as per previous assert');
          rhsOffsets.push(offset);
          indexT = indexA;
        }

        if (!domain_isBool(getDomain(indexT, true))) {
          TRACE(' - found a non-bool lte arg, bailing');
          return false;
        }
      } else if (op === ML_NEQ) {
        if (seenNeq) {
          TRACE(' - found second neq, bailing');
          return false;
        }

        ASSERT(indexA === indexX || indexB === indexX, 'bounty should only track relevant ltes');
        if (indexA === indexX) {
          indexY = indexB;
        } else {
          ASSERT(indexB === indexX, 'as per previous assert');
          indexY = indexA;
        }

        seenNeq = true;
        neqOffset = offset;
      } else if (op === ML_OR) {
        ASSERT(indexA === indexX || indexB === indexX, 'bounty should only track relevant ltes');
        let indexT;
        if (indexA === indexX) {
          orOffsets.push(offset);
          indexT = indexB;
        } else {
          ASSERT(indexB === indexX, 'as per previous assert');
          orOffsets.push(offset);
          indexT = indexA;
        }

        if (!domain_isBool(getDomain(indexT, true))) {
          TRACE(' - found a non-bool or arg, bailing');
          return false;
        }
      } else {
        ASSERT(op === ML_NAND, 'see assert above');
        ASSERT(indexA === indexX || indexB === indexX, 'bounty should only track relevant ltes');
        let indexT;
        if (indexA === indexX) {
          nandOffsets.push(offset);
          indexT = indexB;
        } else {
          ASSERT(indexB === indexX, 'as per previous assert');
          nandOffsets.push(offset);
          indexT = indexA;
        }

        if (!domain_isBool(getDomain(indexT, true))) {
          TRACE(' - found a non-bool or arg, bailing');
          return false;
        }
      }
    }

    TRACE(' - collection complete; indexY =', indexY, ', neq offset =', neqOffset, ', lhs offsets:', lhsOffsets, ', rhs offsets:', rhsOffsets, ', or offsets:', orOffsets, ', nand offsets:', nandOffsets);

    ASSERT(seenNeq, 'should have seen a neq, bounty said there would be one');

    // okay. pattern matches. do the rewrite

    TRACE(' - pattern confirmed, morphing ltes, removing neq');
    TRACE(' - A <= X, X != Y    ->    A !& Y');
    TRACE(' - X <= A, X != Y    ->    A | Y');
    TRACE(' - X | A, X != Y     ->    Y <= A');

    for (let i = 0, len = lhsOffsets.length; i < len; ++i) {
      // X <= A, X != Y    ->    A | Y
      let offset = lhsOffsets[i];
      let index = readIndex(ml, offset + 1);
      if (index === indexX) index = readIndex(ml, offset + 3);
      bounty_markVar(bounty, index);
      ml_vv2vv(ml, offset, ML_OR, index, indexY);
    }

    ASSERT(ml_validateSkeleton(ml, 'check after lhs offsets'));

    for (let i = 0, len = rhsOffsets.length; i < len; ++i) {
      // X <= A, X != Y    ->    A | Y
      let offset = rhsOffsets[i];
      let index = readIndex(ml, offset + 1);
      if (index === indexX) index = readIndex(ml, offset + 3);
      bounty_markVar(bounty, index);
      ml_vv2vv(ml, offset, ML_NAND, index, indexY);
    }

    ASSERT(ml_validateSkeleton(ml, 'check after rhs offsets'));

    for (let i = 0, len = orOffsets.length; i < len; ++i) {
      // X | A, X != Y    ->    Y <= A
      let offset = orOffsets[i];
      let index = readIndex(ml, offset + 1);
      if (index === indexX) index = readIndex(ml, offset + 3);
      bounty_markVar(bounty, index);
      ml_vv2vv(ml, offset, ML_LTE, indexY, index);
    }

    ASSERT(ml_validateSkeleton(ml, 'check after or offsets'));

    for (let i = 0, len = nandOffsets.length; i < len; ++i) {
      // X !& A, X != Y    ->    A <= Y
      let offset = nandOffsets[i];
      let index = readIndex(ml, offset + 1);
      if (index === indexX) index = readIndex(ml, offset + 3);
      bounty_markVar(bounty, index);
      ml_vv2vv(ml, offset, ML_LTE, index, indexY);
    }

    ASSERT(ml_validateSkeleton(ml, 'check after or offsets'));

    ml_eliminate(ml, neqOffset, SIZEOF_VV);

    ASSERT(ml_validateSkeleton(ml, 'make sure the morphs went okay'));

    TRACE(' - X is a leaf constraint, defer it', indexX);
    solveStack.push((_, force, getDomain, setDomain) => {
      let X = getDomain(indexX);
      TRACE(' - neq + lte + lte...;', indexX, '!=', indexY, '  ->  ', domain__debug(), '!=', domain__debug(getDomain(indexY)));

      X = domain_removeValue(X, force(indexY));
      ASSERT(X, 'X should be able to reflect any solution');
      setDomain(indexX, X);
    });

    bounty_markVar(bounty, indexX);
    bounty_markVar(bounty, indexY);
    somethingChanged();
    return true;
  }

  function trickNandOnly(indexX, countsX) {
    TRACE('trickNandOnly;', indexX, ', counts:', countsX);

    if (countsX >= BOUNTY_MAX_OFFSETS_TO_TRACK) {
      TRACE(' - counts (', countsX, ') is higher than max number of offsets we track so we bail on this trick');
      return false;
    }

    let offsets = []; // to eliminate
    let indexes = []; // to mark and to defer solve
    for (let i = 0; i < countsX; ++i) {
      let offset = bounty_getOffset(bounty, indexX, i);
      ASSERT(offset, 'bounty should assert that there are counts offsets');
      ASSERT(ml_dec8(ml, offset) === ML_NAND, 'bounty should assert that all ops are nands');

      let indexA = readIndex(ml, offset + 1);
      let indexB = readIndex(ml, offset + 3);

      ASSERT(indexA === indexX || indexB === indexX, 'bounty should have asserted that one of nand args is X');

      let indexY = indexX === indexA ? indexB : indexA;

      offsets.push(offset);
      indexes.push(indexY);
    }

    TRACE(' - collected offsets and vars:', offsets, indexes);

    TRACE('   - B is a leaf var');
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - only nands;', indexes);

      let X = getDomain(indexX);
      if (!domain_isZero(X) && !domain_hasNoZero(X)) {
        for (let i = 0; i < indexes.length; ++i) {
          if (force(indexes[i]) > 0) {
            let X = domain_removeGtUnsafe(X, 0);
            ASSERT(X, 'X should be able to reflect a solution');
            setDomain(indexX, X);
            break;
          }
        }
      }
    });

    TRACE(' - now remove the nands', offsets);

    for (let i = 0; i < offsets.length; ++i) {
      let offset = offsets[i];
      let indexY = indexes[i];

      ml_eliminate(ml, offset, SIZEOF_VV);
      bounty_markVar(bounty, indexY);
    }

    ASSERT(ml_validateSkeleton(ml, 'make sure the elimination went okay'));

    bounty_markVar(bounty, indexX);
    somethingChanged();

    return true;
  }

  function trickOrLteLhsNands(indexX, countsX) {
    TRACE('trickOrLteLhsNands', indexX);
    // A !& X, X <= B, X | C    ->     B | C, A <= C

    if (countsX >= BOUNTY_MAX_OFFSETS_TO_TRACK) {
      TRACE(' - counts (', countsX, ') is higher than max number of offsets we track so we bail on this trick');
      return false;
    }

    let lteOffset;
    let orOffset;
    let nandOffsets = [];

    let indexesA = [];
    let indexB;
    let indexC;

    for (let i = 0; i < countsX; ++i) {
      let offset = bounty_getOffset(bounty, indexX, i);
      if (!offset) break;

      let opCode = ml_dec8(ml, offset);
      ASSERT(opCode === ML_NAND || opCode === ML_OR || opCode === ML_LTE, 'bounty should assert it logged one of these three ops');

      let indexL = readIndex(ml, offset + 1);
      let indexR = readIndex(ml, offset + 3);
      ASSERT(indexX === indexL || indexX === indexR, 'bounty should assert that x is part of this op');

      let indexY = indexL;
      if (indexL === indexX) indexY = indexR;

      if (opCode === ML_NAND) {
        nandOffsets.push(offset);
        indexesA.push(indexY);
      } else if (opCode === ML_OR) {
        if (orOffset) {
          TRACE(' - trick only supported with one OR, bailing');
          return false;
        }
        orOffset = offset;
        indexB = indexY;
      } else {
        ASSERT(opCode === ML_LTE, 'if not the others then this');
        ASSERT(indexL === indexX, 'bounty should have asserted X must be lhs of LTE');
        if (lteOffset) {
          TRACE(' - trick only supported with one LTE, bailing');
          return false;
        }
        lteOffset = offset;
        indexC = indexY;
      }
    }

    TRACE(' - collection complete; or offset:', orOffset, ', indexB:', indexB, ', lte offset:', lteOffset, ', indexC:', indexC, ', nand offsets:', nandOffsets, ', indexesA:', indexesA);
    TRACE(' - A !& X, X <= B, X | C    ->     B | C, A <= C');
    TRACE(' - A !& X, D !& X, X <= B, X | C    ->     B | C, A <= C, D <= C');
    // the A <= C for all nand args (all <= C)

    ml_vv2vv(ml, lteOffset, ML_OR, indexB, indexC);
    ml_eliminate(ml, orOffset, SIZEOF_VV);
    for (let i = 0, len = indexesA.length; i < len; ++i) {
      let indexA = indexesA[i];
      ml_vv2vv(ml, nandOffsets[i], ML_LTE, indexA, indexC);
      bounty_markVar(bounty, indexA);
    }

    TRACE('   - X is a leaf var', indexX);
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - or+lte+nands;', indexX);

      let X = getDomain(indexX);
      if (force(indexB) === 0) { // A<=B so if B is 0, A must also be 0
        X = domain_removeGtUnsafe(X, 0);
        ASSERT(X, 'X should be able to reflect the solution');
        setDomain(indexX, X);
      } else if (force(indexC) === 0) { // X|C so if C is 0, X must be non-zero
        X = domain_removeValue(X, 0);
        ASSERT(X, 'X should be able to reflect the solution');
        setDomain(indexX, X);
      } else {
        // if any indexA is set, X must be zero
        for (let i = 0, len = indexesA.length; i < len; ++i) {
          if (force(indexesA[i]) > 0) {
            X = domain_removeGtUnsafe(X, 0);
            ASSERT(X, 'X should be able to reflect the solution');
            setDomain(indexX, X);
            break;
          }
        }
      }
    });

    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexC);
    bounty_markVar(bounty, indexX);
    somethingChanged();
    return true;
  }

  function trickOrNandLteBoth(indexX, countsX) {
    TRACE('trickOrNandLteBoth', indexX);
    // A <= X, B | X, C !& X, X <= D     ->     A !& C, B | D, A <= D, C <= B
    // if we can model `A !& C, A <= D` in one constraint then we should do so but I couldn't find one
    // (when more lte's are added, that's the pattern we add for each)

    // we only want exactly four ops here... and if max is set to something lower then this trick has no chance at all
    if (countsX > Math.min(4, BOUNTY_MAX_OFFSETS_TO_TRACK)) {
      TRACE(' - we need exactly four constraints for this trick so', countsX, 'is incorrect, bailing');
      return false;
    }

    // note: bounty tracks lte_rhs and lte_lhs separate so if we have four constraints
    // here can trust bounty to assert they are all our targets, no more, no less.

    // we should have; lteRhs, lteLhs, nand, or
    let lteLhsOffset;
    let lteRhsOffset;
    let orOffset;
    let nandOffset;

    let indexA;
    let indexB;
    let indexC;
    let indexD;

    for (let i = 0; i < countsX; ++i) {
      let offset = bounty_getOffset(bounty, indexX, i);
      ASSERT(offset, 'bounty should assert to fetch as many offsets as there are counts');

      let opCode = ml_dec8(ml, offset);
      let indexL = readIndex(ml, offset + 1);
      let indexR = readIndex(ml, offset + 3);

      ASSERT(opCode === ML_NAND || opCode === ML_OR || opCode === ML_LTE, 'bounty should assert the op is one of these');
      ASSERT(indexX === indexL || indexX === indexR, 'bounty should assert X is one of the args');

      let indexY = indexL;
      if (indexL === indexX) indexY = indexR;

      if (opCode === ML_NAND) {
        ASSERT(!nandOffset, 'cant have a second nand');
        nandOffset = offset;
        indexC = indexY;
      } else if (opCode === ML_OR) {
        ASSERT(!orOffset, 'cant have a second nand');
        orOffset = offset;
        indexB = indexY;
      } else {
        ASSERT(opCode === ML_LTE, 'asserted by bounty see above');

        if (indexL === indexX) { // lte_lhs
          ASSERT(!lteLhsOffset, 'cant have a second lte_lhs');
          lteLhsOffset = offset;
          indexD = indexY;
        } else { // lte_rhs
          ASSERT(indexR === indexX, 'x already asserted to be one of the op args');
          ASSERT(!lteRhsOffset, 'cant have a second lte_rhs');
          lteRhsOffset = offset;
          indexA = indexY;
        }
      }
    }

    TRACE(' - collection complete; or offsets:', lteLhsOffset, lteRhsOffset, orOffset, nandOffset, ', indexes:', indexA, indexB, indexC, indexD);
    TRACE(' - A <= X, B | X, C !& X, X <= D     ->     A !& C, B | D, A <= D, C <= B');

    ml_vv2vv(ml, lteLhsOffset, ML_NAND, indexA, indexC);
    ml_vv2vv(ml, lteRhsOffset, ML_OR, indexB, indexD);
    ml_vv2vv(ml, orOffset, ML_LTE, indexA, indexD);
    ml_vv2vv(ml, nandOffset, ML_LTE, indexC, indexD);

    TRACE('   - X is a leaf var', indexX);
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - or+nand+lte_lhs+lte_rhs;', indexX);

      let X = getDomain(indexX);
      if (force(indexA) === 1) { // A<=X so if A is 1, X must also be 1
        X = domain_removeValue(X, 0);
        ASSERT(X, 'X should be able to reflect the solution');
        setDomain(indexX, X);
      } else if (force(indexB) === 0) { // X|B so if B is 0, X must be non-zero
        X = domain_removeValue(X, 0);
        ASSERT(X, 'X should be able to reflect the solution');
        setDomain(indexX, X);
      } else if (force(indexC) > 0) { // if indexA is set, X must be zero
        X = domain_removeGtUnsafe(X, 0);
        ASSERT(X, 'X should be able to reflect the solution');
        setDomain(indexX, X);
      } else if (force(indexD) === 0) { // X<=D, if indexD is 0, X must be zero
        X = domain_removeGtUnsafe(X, 0);
        ASSERT(X, 'X should be able to reflect the solution');
        setDomain(indexX, X);
      }
    });

    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexC);
    bounty_markVar(bounty, indexD);
    bounty_markVar(bounty, indexX);
    somethingChanged();
    return true;
  }

  function trickPlusIseq(ml, plusOffset, indexA, indexB, indexR, countsR, metaR) {
    // scan for pattern:
    //   (R = A+B) & (S = R==?2)   ->   S = isAll(A B)
    //   [0022]=[01]+[01] & [01]=[0022]==?2
    //   [00 x+y x+y]=[00xx]+[00yy] & [01] = [00 x+y x+y] ==? (x+y)
    // so there's a plus and then there's an iseq that checks whether the result is the
    // sum of the only two non-zero values. that's just an "are both set" check -> isall

    TRACE('trickPlusIseq', plusOffset, indexA, indexB);
    TRACE(' - from plus:', indexR, '=', indexA, '+', indexB, '->', domain__debug(getDomain(indexR, true)), '=', domain__debug(getDomain(indexA, true)), '+', domain__debug(getDomain(indexB, true)));
    ASSERT(countsR === 2, 'R should be part of two constraints');
    ASSERT(metaR === (BOUNTY_PLUS_RESULT | BOUNTY_ISEQ_ARG), 'R should be part of a sum and an iseq');

    // confirm that the domains are within the expected bounds
    // A and B must be bools
    // Y must be constant 2
    // X should be [0022] in that case

    if (!domain_isBool(getDomain(indexA, true))) {
      TRACE(' - plus-A was not a bool, bailing', domain__debug(getDomain(indexA, true)));
      return false;
    }
    if (!domain_isBool(getDomain(indexB, true))) {
      TRACE(' - plus-B was not a bool, bailing', domain__debug(getDomain(indexB, true)));
      return false;
    }
    ASSERT(getDomain(indexR, true) === domain_createRange(0, 2), 'R must be [0 2] at this point due to the plus args being [01]');

    // so R is used in two constraints. let's first determine the other one
    let offset1 = bounty_getOffset(bounty, indexR, 0);
    let offset2 = bounty_getOffset(bounty, indexR, 1);
    ASSERT(offset1 && offset2 && (offset1 === plusOffset || offset2 === plusOffset), 'if there were two counts Bounty should have collected two offsets for it');
    let iseqOffset = offset1 === plusOffset ? offset2 : offset1;
    ASSERT(ml_dec8(ml, iseqOffset) === ML_ISEQ, 'should have been asserted by the bounty hunter');

    // get iseq operands (let's use X,Y,Z). R should be X. but we must confirm that Y is a constant

    let indexX = readIndex(ml, iseqOffset + 1); // R | ?
    let indexY = readIndex(ml, iseqOffset + 3); // R | ?
    let X = getDomain(indexX, true);
    let Y = getDomain(indexY, true);
    let vY = domain_getValue(Y);
    TRACE(' - checking iseq args;', readIndex(ml, iseqOffset + 5), '=', indexX, '==?', indexY, '->', domain__debug(getDomain(readIndex(ml, iseqOffset + 5), true)), '=', domain__debug(X), '==?', domain__debug(Y));
    if (vY < 0) {
      //ASSERT(!domain_isSolved(X), 'if args are sorted constants always end up in the back, or Y in this case, so if Y is not solved, X should not be solved either', domain__debug(X), domain__debug(Y));
      vY = domain_getValue(X);
      if (vY >= 0) { // note: asserts are stripped from dist. this is a dist check.
        // just in case. but probably dead code
        let t = indexX;
        indexX = indexY;
        indexY = t;
        // swap domains too!
        let tt = X;
        X = Y;
        Y = tt;
      } else {
        TRACE(' - Y was not solved (and neither was X) so pattern match failed, bailing');
        return false;
      }
    }
    // X and Y could have been swapped, but probably arent, shouldnt matter
    ASSERT(indexX === indexR, 'if Y is solved then it cant be R so X must be R. note R cant be solved because then counts would be 0 and they werent', indexX, indexY, indexR);
    ASSERT(domain_isSolved(Y), 'and Y is solved');
    ASSERT(vY === domain_getValue(Y), 'and vY was updated as well');

    let indexZ = readIndex(ml, iseqOffset + 5); // S

    // so now we know that there's a plus, and its args are strict bools, and R is [0 2]
    // then there's an iseq that checks R with a constant
    // we've confirmed all these details so it's time to merge them together and morph depending on the constant

    if (vY === 2) {
      TRACE(' - found isAll pattern, morphing plus to isall and eliminating isEq');

      // rewrite one into `Z = all?(A B)`, drop the other

      solveStack.push((_, force, getDomain, setDomain) => {
        TRACE(' - cut plus -> isAll; plus+iseq->isall');
        let R = getDomain(indexR);
        let vS = force(indexZ);
        setDomain(indexR, vS ? domain_intersectionValue(R, vY) : domain_removeValue(R, vY));
        // or just this? ultimately, perhaps pick the way that forces the least? *shrug*
        //setDomain(indexR, domain_intersection(R, domain_createValue(force(indexA) + force(indexB))));
      });

      // for the record, _this_ is why ML_ISALL2 exists at all. we can use recycle now though, but it's slow here
      ml_vvv2vvv(ml, plusOffset, ML_ISALL2, indexA, indexB, indexZ);
      ml_eliminate(ml, iseqOffset, SIZEOF_VVV);
    } else if (vY === 1) {
      TRACE(' - found isxor pattern, but since we dont have isxor and alternative rewrites are more expensive, we bail for now');
      return false;
    } else {
      ASSERT(vY === 0, 'only option left');
      TRACE(' - found isnone pattern, morphing plus to xor and eliminating isEq');

      // R=[02], A=[01], B=[01], Z=R==?0
      // Z is true if !A and !B
      // Z = isnone(A B)

      let bin = ml_getRecycleOffset(ml, 0, SIZEOF_COUNT + 2 * 2 + 2);
      if (bin === undefined) {
        TRACE(' - unable to recycle a space, bailing');
        return false;
      }

      solveStack.push((_, force, getDomain, setDomain) => {
        TRACE(' - cut plus -> isNone; plus+iseq->isnone');
        let oR = getDomain(indexR);
        let vA = force(indexA);
        let vB = force(indexB);
        let R = domain_intersectionValue(oR, vA + vB);
        ASSERT(R, 'R should contain any A + B');
        if (oR !== R) setDomain(indexR, R);
      });

      let binSize = ml_getOpSizeSlow(ml, bin);
      let isnoneSize = SIZEOF_COUNT + 2 * 2 + 2;
      ASSERT(binSize >= isnoneSize, 'should fit', binSize, isnoneSize);
      ml_enc8(ml, bin, ML_ISNONE);
      ml_enc16(ml, bin + 1, 2);
      ml_enc16(ml, bin + SIZEOF_COUNT + 0, indexA);
      ml_enc16(ml, bin + SIZEOF_COUNT + 2, indexB);
      ml_enc16(ml, bin + SIZEOF_COUNT + 4, indexZ);
      if (isnoneSize !== binSize) ml_jump(ml, bin + isnoneSize, binSize - isnoneSize);

      ml_eliminate(ml, iseqOffset, SIZEOF_VVV);
      ml_eliminate(ml, plusOffset, SIZEOF_VVV); // this one last to ensure the current plus offset doesnt get clobbered, we need that to safely restart from this op
    }

    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    bounty_markVar(bounty, indexR);
    bounty_markVar(bounty, indexZ);
    somethingChanged();

    return true;
  }

  function trickSumIseq(ml, sumOffset, indexR, counts, meta) {
    // scan for pattern (R = sum(A B C) & (S = R==?3) -> S = isAll(A B C) with ABC strict bools. a bit tedious to scan for but worth it.

    let offset1 = bounty_getOffset(bounty, indexR, 0);
    let offset2 = bounty_getOffset(bounty, indexR, 1);
    let iseqOffset = offset1 === sumOffset ? offset2 : offset1;
    TRACE('trickSumIseq; sumOffset:', sumOffset, ', iseqOffset:', iseqOffset, ', indexR:', indexR, ', countsR:', counts, ', metaR:', bounty__debugMeta(meta));

    ASSERT(iseqOffset > 0, 'offset should exist and cant be the first op');
    ASSERT(counts === 2, 'R should only be used in two constraints (sum and iseq)');
    ASSERT(meta === (BOUNTY_ISEQ_ARG | BOUNTY_SUM_RESULT), 'should be sum and iseq arg', counts, bounty__debugMeta(meta));
    ASSERT(ml_dec8(ml, sumOffset) === ML_SUM, 'check sum offset');
    ASSERT(ml_dec8(ml, iseqOffset) === ML_ISEQ, 'check iseq offset');

    let argCount = ml_dec16(ml, sumOffset + 1);

    let indexA = readIndex(ml, iseqOffset + 1); // R or ?
    let indexB = readIndex(ml, iseqOffset + 3); // R or ?
    let indexS = readIndex(ml, iseqOffset + 5); // S

    // indexes should be sorted which puts constants to the back (B)
    // however, if the index is not sorted, this might not be the case so we have to double check
    if (!domain_isSolved(getDomain(indexB, true))) {
      if (domain_isSolved(getDomain(indexA, true))) {
        // this is dead code if the minimizer got to do its job (args should be sorted)
        // swap A and B to normalize
        ASSERT(indexB === indexR, 'if A is solved then B must be R because it must be an iseq arg and it cant be solved yet because counts>0');
        let t = indexB;
        indexB = indexA;
        indexA = t;
      } else {
        TRACE(' - other iseq arg not solved, bailing');
        return false;
      }
    }
    ASSERT(indexA === indexR, '(normalized) the left should be indexR');
    ASSERT(indexB !== indexR, 'would be a weird tautology'); // but it's possible minimizer didnt get to eliminate this...
    ASSERT(domain_isSolved(getDomain(indexB, true)), 'at this point B should be solved');

    let B = getDomain(indexB, true);
    let vB = domain_getValue(B);
    if (vB !== 0 && vB !== argCount) {
      TRACE(' - indexB from iseq arg is a constant that is not 0 nor the number of args, bailing', domain__debug(B), '->', vB, ', args:', argCount);
      return false;
    }

    let R = getDomain(indexR, true);
    if (!domain_containsValue(R, vB)) {
      TRACE(' - R didnt contain B so unsafe for leaf cutting, bailing');
      return false;
    }

    // the iseq looks okay. now confirm all sum args are max 1
    // note that [0 0] should be pruned, [1 1] is okay to occur, most likely [0 1] though
    // numdom([0,5]) = sum( numdom([0,1]) numdom([0,1]) numdom([0,1]) numdom([0,1]) soldom([0,1]) )
    // numdom([1,5]) = sum( numdom([0,1]) numdom([0,1]) numdom([0,1]) numdom([0,1]) soldom([1,1]) )
    // if sum had multiple [1 1] constants they will have been collapsed together and fail this test :(

    let args = [];
    let min = 0;
    let max = 0;
    for (let i = 0; i < argCount; ++i) {
      let index = readIndex(ml, sumOffset + SIZEOF_COUNT + i * 2);
      let domain = getDomain(index, true);
      let minA = domain_min(domain);
      let maxA = domain_max(domain);
      if (domain_max(domain) > 1) {
        TRACE(' - at least one sum arg wasnt bool, bailing', domain__debug(domain));
        return false;
      }
      // since it's very unlikely the args arent bool, collect and mark them right now instead of an extra loop
      args.push(index);
      bounty_markVar(bounty, index);
      min += minA;
      max += maxA;
    }

    TRACE(' - confirming R is bound to [', min, max, ']');
    // note: every arg is max 1. we do take into account that an arg [1 1] would mean R is [1 5] instead of [0 5]
    if (R !== domain_createRange(min, max)) {
      TRACE(' - R isnt counting all results, bailing');
      return false;
    }

    TRACE(' - found isAll/isNone pattern, morphing sum and eliminating isEq');

    // sum will fit isall/isnone. it'll be exactly the same size
    // only need to update the op code and the result index, as the rest remains the same
    let targetOp = vB === argCount ? ML_ISALL : ML_ISNONE;
    ml_enc8(ml, sumOffset, targetOp);
    ml_enc16(ml, sumOffset + SIZEOF_COUNT + argCount * 2, indexS);

    // note: either way, R must reflect the sum of its args. so its the same solve
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - cut sum ->', targetOp === ML_ISALL);
      let oR = getDomain(indexR);
      let vR = 0;
      for (let i = 0; i < argCount; ++i) {
        let vN = force(args[i]);
        ASSERT((vN & 1) >= 0, 'should be bool');
        if (vN) ++vR;
      }
      let R = domain_intersectionValue(oR, vR);
      ASSERT(R, 'R should be able to reflect the solution');
      if (oR !== R) setDomain(indexR, R);
    });

    ml_eliminate(ml, iseqOffset, SIZEOF_VVV);

    bounty_markVar(bounty, indexR);
    somethingChanged();
    return true;
  }

  function trickXnorPseudoEq(ml, offset, indexA, boolyA, indexB, boolyB) {
    // A or B or both are only used as a boolean (in the zero-nonzero sense, not strictly 0,1)
    // the xnor basically says that if one is zero the other one is too, and otherwise neither is zero
    // cominbing that with the knowledge that both vars are only used for zero-nonzero, one can be
    // considered a pseudo-alias for the other. we replace it with the other var and defer solving it.
    // when possible, pick a strictly boolean domain because it's more likely to allow new tricks.

    // note that for a booly, the actual value is irrelevant. whether it's 1 or 5, the ops will normalize
    // this to zero and non-zero anyways. and by assertion the actual value is not used inside the problem

    TRACE(' - trickXnorPseudoEq; found booly-eq in a xnor:', indexA, '!^', indexB, ', A booly?', boolyA, ', B booly?', boolyB);
    ASSERT(boolyA || boolyB, 'at least one of the args should be a real booly (as reported by bounty)');

    // ok, a little tricky, but we're going to consider the bool to be a full alias of the other var.
    // once we create a solution we will override the value and apply the booly constraint and assign
    // it either its zero or nonzero value(s) depending on the other value of this xnor.

    let indexE = indexB; // Eliminate
    let indexK = indexA; // Keep

    // keep the non-bool if possible
    if (!boolyB) {
      TRACE(' - keeping B instead because its not a booly');
      indexE = indexA;
      indexK = indexB;
    }

    let oE = getDomain(indexE, true); // remember what E was because it will be replaced by false to mark it an alias
    TRACE(' - pseudo-alias for booly xnor arg;', indexA, '!^', indexB, '  ->  ', domain__debug(getDomain(indexA)), '!^', domain__debug(getDomain(indexB)), 'replacing', indexE, 'with', indexK);

    let XNOR_EXCEPTION = true;
    solveStack.push((_, force, getDomain, setDomain) => {
      TRACE(' - resolve booly xnor arg;', indexK, '!^', indexE, '  ->  ', domain__debug(getDomain(indexK)), '!^', domain__debug(oE));
      let vK = force(indexK);
      let E;
      if (vK === 0) {
        E = domain_removeGtUnsafe(oE, 0);
      } else {
        E = domain_removeValue(oE, 0);
      }
      TRACE('  -> updating', domain__debug(oE), 'to', domain__debug(E));
      ASSERT(E, 'E should be able to reflect the solution');
      // always set it even if oE==E
      setDomain(indexE, E, true, XNOR_EXCEPTION);
    });

    // note: addAlias will push a defer as well. since the defers are resolved in reverse order,
    // we must call addAlias after adding our own defer, otherwise our change will be lost.
    addAlias(indexE, indexK, 'xnor', true);

    ml_eliminate(ml, offset, SIZEOF_VV);
    bounty_markVar(bounty, indexA);
    bounty_markVar(bounty, indexB);
    somethingChanged();
  }

  function cutLoop() {
    TRACE('\n#### - inner cutLoop');
    pc = 0;
    while (pc < ml.length && !emptyDomain) {
      let pcStart = pc;
      let op = ml[pc];
      TRACE(' -- CU pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, problem));
      switch (op) {
        case ML_EQ:
          return ml_throw(ml, pc, 'eqs should be aliased and eliminated');

        case ML_NEQ:
          cutNeq(ml, pc);
          break;

        case ML_LT:
          cutLt(ml, pc);
          break;

        case ML_LTE:
          cutLte(ml, pc);
          break;

        case ML_NALL:
        case ML_DISTINCT:
          let dlen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_COUNT + dlen * 2;
          break;

        case ML_ISALL:
          cutIsAll(ml, pc);
          break;

        case ML_ISNALL:
          cutIsNall(ml, pc);
          break;

        case ML_ISALL2:
          cutIsAll2(ml, pc);
          break;

        case ML_ISNONE:
          TRACE('(todo) none', pc);
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

        case ML_ISEQ:
          cutIsEq(ml, pc);
          break;
        case ML_ISNEQ:
          cutIsNeq(ml, pc);
          break;
        case ML_ISLT:
          cutIsLt(ml, pc);
          break;
        case ML_ISLTE:
          cutIsLte(ml, pc);
          break;

        case ML_SUM:
          cutSum(ml, pc);
          break;

        case ML_PRODUCT:
          TRACE('(todo) p', pc);
          let plen = ml_dec16(ml, pc + 1);
          pc += SIZEOF_COUNT + plen * 2 + 2;
          break;

        case ML_AND:
          return ml_throw(ml, pc, 'ands should be solved and eliminated');
        case ML_OR:
          cutOr(ml, pc);
          break;
        case ML_XOR:
          cutXor(ml, pc);
          break;
        case ML_NAND:
          cutNand(ml, pc);
          break;
        case ML_XNOR:
          cutXnor(ml, pc);
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
          //console.error('(cut) unknown op', pc,' at', pc,'ctrl+c now or log will fill up');
          //while (true) console.log('beep');
          ml_throw(ml, pc, '(cut) unknown op', pc);
      }
    }
    if (emptyDomain) {
      TRACE('Ended up with an empty domain');
      return;
    }
    TRACE('the implicit end; ml desynced');
    THROW('ML OOB');
  }
}

// BODY_STOP

export {
  cutter,
};
