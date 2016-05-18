import {
  EMPTY,
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,
  SUB,
  SUP,

  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_UNUSED_DOMAIN,
  ASSERT_DOMAIN_EMPTY_CHECK,
} from './helpers';

import {
  domain_clone,
  domain_createRange,
  domain_intersection,
  domain_equal,
  domain_fromFlags,
  domain_forceEqInline,
  domain_forceEqNumbered,
  domain_getValue,
  domain_isDetermined,
  domain_isRejected,
  domain_isSolved,
  domain_isValue,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_numarr,
  domain_removeGteInline,
  domain_removeGteNumbered,
  domain_removeLteInline,
  domain_removeLteNumbered,
  domain_removeValueInline,
  domain_removeValueNumbered,
  domain_size,
} from './domain';

// BODY_START

function fdvar_create(id, dom) {
  return fdvar_new(id, dom);
}

function fdvar_createRange(id, lo, hi) {
  ASSERT(typeof id === 'string', 'ID_SHOULD_BE_STRING');
  ASSERT(typeof lo === 'number', 'LO_SHOULD_BE_NUMBER');
  ASSERT(typeof hi === 'number', 'HI_SHOULD_BE_NUMBER');
  ASSERT(lo >= SUB && hi <= SUP && lo <= hi, 'RANGE_SHOULD_BE_PROPERLY_BOUND_AND_ORDERED');

  return fdvar_new(id, domain_createRange(lo, hi));
}

function fdvar_new(id, dom) {
  if (typeof dom !== 'number') {
    ASSERT(!!dom, 'should init to a domain', [id, dom]);
    ASSERT_DOMAIN(dom);
    ASSERT_UNUSED_DOMAIN(dom);

    dom = domain_numarr(dom);
  }
  return {
    _class: 'fdvar',
    id,
    dom,
  };
}

// A var is undetermined when it is neither rejected nor solved.
// Basically that means that the domain contains more than one range
// or that the only range spans at least two elements.

function fdvar_isUndetermined(fdvar) {
  return !domain_isDetermined(fdvar.dom);
}

// A var is solved if it has only one range that spans only one value.

function fdvar_isSolved(fdvar) {
  return domain_isSolved(fdvar.dom);
}

// Is given var [value, value] ?
function fdvar_isValue(fdvar, value) {
  return domain_isValue(fdvar.dom, value);
}

// A var is rejected if its domain is empty. This means none of the
// possible values for this var could satisfy all the constraints.

function fdvar_isRejected(fdvar) {
  return domain_isRejected(fdvar.dom);
}

function fdvar_clone(fdvar) {
  return fdvar_new(fdvar.id, domain_clone(fdvar.dom));
}

function fdvar_setDomain(fdvar, domain) {
  let fdvarDom = fdvar.dom;
  if (typeof domain === 'number' && typeof fdvarDom === 'number') {
    if (fdvarDom !== domain) {
      fdvar.dom = domain;
      return SOME_CHANGES;
    }
    return NO_CHANGES;
  }

  ASSERT_UNUSED_DOMAIN(domain);
  if (!domain_equal(fdvarDom, domain)) {
    fdvar.dom = domain_numarr(domain);
    return SOME_CHANGES;
  }
  return NO_CHANGES;
}

// TODO: rename to intersect for that's what it is.
function fdvar_constrain(fdvar, domain) {
  domain = domain_intersection(fdvar.dom, domain);
  if (domain_isRejected(domain)) return REJECTED;
  return fdvar_setDomain(fdvar, domain_numarr(domain));
}

function fdvar_size(fdvar) {
  return domain_size(fdvar.dom);
}

function fdvar_lowerBound(fdvar) {
  return domain_min(fdvar.dom);
}

function fdvar_upperBound(fdvar) {
  return domain_max(fdvar.dom);
}

// Get the exact middle value from all values covered by var
// Middle here means the middle index, not hi-lo/2

function fdvar_middleElement(fdvar) {
  return domain_middleElement(fdvar.dom);
}

function fdvar_removeGteInline(fdvar, value) {
  ASSERT(typeof value === 'number', 'VALUE_SHOULD_BE_NUMBER');

  var domain = fdvar.dom;
  if (typeof domain === 'number') {
    var result = domain_removeGteNumbered(domain, value);
    if (result !== domain) {
      fdvar.dom = result;
      return SOME_CHANGES;
    }
    return NO_CHANGES;
  }

  if (domain_removeGteInline(domain, value)) {
    fdvar.dom = domain_numarr(fdvar.dom);
    return SOME_CHANGES;
  }
  return NO_CHANGES;
}

function fdvar_removeLteInline(fdvar, value) {
  ASSERT(typeof value === 'number', 'VALUE_SHOULD_BE_NUMBER');

  var domain = fdvar.dom;
  if (typeof domain === 'number') {
    var result = domain_removeLteNumbered(domain, value);
    if (result !== domain) {
      fdvar.dom = result;
      return SOME_CHANGES;
    }
    return NO_CHANGES;
  }

  if (domain_removeLteInline(domain, value)) {
    fdvar.dom = domain_numarr(fdvar.dom);
    return SOME_CHANGES;
  }
  return NO_CHANGES;
}

/**
 * for the eq propagator; makes sure all elements in either var
 * are also contained in the other. removes all others. operates
 * inline on array domains. Returns domain of fdvar1 afterwards.
 * (Returns the domain because it may be
 *
 * @param {$fdvar} fdvar1
 * @param {$fdvar} fdvar2
 * @returns {$domain}
 */
function fdvar_forceEqInline(fdvar1, fdvar2) {
  let domain1 = fdvar1.dom;
  let domain2 = fdvar2.dom;

  if (typeof domain1 === 'number' && typeof domain2 === 'number') {
    let result = domain_forceEqNumbered(domain1, domain2);
    if (result === EMPTY) {
      fdvar1.dom = result;
      fdvar2.dom = result;
      return REJECTED;
    }
    if (result !== domain1 || result !== domain2) {
      fdvar1.dom = result;
      fdvar2.dom = result;
      return SOME_CHANGES;
    }
    return NO_CHANGES;
  }

  // TODO: for now, just convert them. but this can be optimized a lot.
  if (typeof domain1 === 'number') domain1 = domain_fromFlags(domain1);
  if (typeof domain2 === 'number') domain2 = domain_fromFlags(domain2);
  let changeState = domain_forceEqInline(domain1, domain2);

  if (changeState === SOME_CHANGES) {
    fdvar1.dom = domain_numarr(domain1);
    fdvar2.dom = domain_numarr(domain2);
  }

  // if this assert fails, update the following checks accordingly!
  ASSERT(changeState >= -1 && changeState <= 1, 'state should be -1 for reject, 0 for no change, 1 for both changed; but was ?', changeState);

  if (changeState === REJECTED) {
    return REJECTED;
  }

  return changeState;
}

function fdvar_forceNeqInline(fdvar1, fdvar2) {
  let r = NO_CHANGES;
  let dom1 = fdvar1.dom;
  let dom2 = fdvar2.dom;

  ASSERT_DOMAIN_EMPTY_CHECK(dom1);
  ASSERT_DOMAIN_EMPTY_CHECK(dom2);

  if (domain_isSolved(dom1)) {
    let value = domain_getValue(dom1);
    if (typeof dom2 === 'number') {
      let result = domain_removeValueNumbered(dom2, value);
      if (result === EMPTY) {
        fdvar2.dom = result;
        r = REJECTED;
      } else if (result !== dom2) {
        fdvar2.dom = result;
        r = SOME_CHANGES;
      } else {
        r = NO_CHANGES;
      }
    } else {
      r = domain_removeValueInline(dom2, value);
      if (r !== NO_CHANGES) {
        fdvar2.dom = domain_numarr(dom2);
      }
    }
  } else if (domain_isSolved(dom2)) {
    let value = domain_getValue(dom2);
    if (typeof dom1 === 'number') {
      let result = domain_removeValueNumbered(dom1, value);
      if (result === EMPTY) {
        fdvar1.dom = result;
        r = REJECTED;
      } else if (result !== dom1) {
        fdvar1.dom = result;
        r = SOME_CHANGES;
      } else {
        r = NO_CHANGES;
      }
    } else {
      r = domain_removeValueInline(dom1, value);
      if (r !== NO_CHANGES) {
        fdvar1.dom = domain_numarr(dom1);
      }
    }
  }

  ASSERT(r === REJECTED || r === NO_CHANGES || r === SOME_CHANGES, 'turning stuff into enum, must be sure about values');
  ASSERT((r === REJECTED) === (domain_isRejected(fdvar1.dom) || domain_isRejected(fdvar2.dom)), 'if either domain is rejected, r should reflect this already');

  return r;
}

// BODY_STOP

export {
  fdvar_clone,
  fdvar_constrain,
  fdvar_create,
  fdvar_createRange,
  fdvar_forceEqInline,
  fdvar_forceNeqInline,
  fdvar_isRejected,
  fdvar_isSolved,
  fdvar_isUndetermined,
  fdvar_isValue,
  fdvar_upperBound,
  fdvar_middleElement,
  fdvar_lowerBound,
  fdvar_removeGteInline,
  fdvar_removeLteInline,
  fdvar_setDomain,
  fdvar_size,
};
