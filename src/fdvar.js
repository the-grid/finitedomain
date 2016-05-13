import {
  REJECTED,
  SOMETHING_CHANGED,
  ZERO_CHANGES,

  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_UNUSED_DOMAIN,
  ASSERT_DOMAIN_EMPTY_CHECK,
} from './helpers';

import {
  domain_createAll,
  domain_createBool,
  domain_createRange,
  domain_intersection,
  domain_equal,
  domain_forceEqInline,
  domain_forceEqNumbered,
  domain_isDetermined,
  domain_isRejected,
  domain_isSolved,
  domain_isValue,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_removeGteInline,
  domain_removeGteNumbered,
  domain_removeLteInline,
  domain_removeLteNumbered,
  domain_removeValueInline,
  domain_removeValueNumbered,
  domain_setToOneInline,
  domain_setToZeroInline,
  domain_size,
  domain_toList,
} from './domain';

// BODY_START

function fdvar_create(id, dom) {
  return fdvar_new(id, dom, 0);
}

function fdvar_createBool(id) {
  return fdvar_new(id, domain_createBool(), 0);
}

function fdvar_createRange(id, lo, hi) {
  return fdvar_new(id, domain_createRange(lo, hi), 0);
}

function fdvar_createWide(id) {
  return fdvar_new(id, domain_createAll(), 0);
}

function fdvar_new(id, dom) {
  ASSERT(!!dom, 'should init to a domain', [id, dom]);
  ASSERT_DOMAIN(dom);
  ASSERT_UNUSED_DOMAIN(dom);
  return {
    _class: 'fdvar',
    id,
    dom,
    was_solved: false, // for space_createClone
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
  ASSERT(!fdvar.was_solved, 'should not clone vars that are already solved...');
  return fdvar_new(fdvar.id, fdvar.dom.slice(0));
}

function fdvar_setDomain(fdvar, domain) {
  ASSERT_UNUSED_DOMAIN(domain);
  if (!domain_equal(fdvar.dom, domain)) {
    fdvar.dom = domain;
    return SOMETHING_CHANGED;
  }
  return ZERO_CHANGES;
}

function fdvar_setToZero(fdvar) {
  fdvar.dom = domain_setToZeroInline(fdvar.dom);
}

function fdvar_setToOne(fdvar) {
  fdvar.dom = domain_setToOneInline(fdvar.dom);
}

// TODO: rename to intersect for that's what it is.
function fdvar_constrain(fdvar, domain) {
  domain = domain_intersection(fdvar.dom, domain);
  if (!domain.length) {
    return REJECTED;
  }
  return fdvar_setDomain(fdvar, domain);
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
  var domain = fdvar.dom;
  if (typeof domain === 'number') {
    var result = domain_removeGteNumbered(domain, value);
    if (result !== domain) {
      fdvar.dom = result;
      return SOMETHING_CHANGED;
    }
    return ZERO_CHANGES;
  }

  if (domain_removeGteInline(domain, value)) {
    return SOMETHING_CHANGED;
  }
  return ZERO_CHANGES;
}

function fdvar_removeLteInline(fdvar, value) {
  var domain = fdvar.dom;

  if (typeof domain === 'number') {
    var result = domain_removeLteNumbered(domain, value);
    if (result !== domain) {
      fdvar.dom = result;
      return SOMETHING_CHANGED;
    }
    return ZERO_CHANGES;
  }

  if (domain_removeLteInline(domain, value)) {
    return SOMETHING_CHANGED;
  }
  return ZERO_CHANGES;
}

// for the eq propagator; makes sure all elements in either var
// are also contained in the other. removes all others. operates
// inline on the var domains. returns REJECTED, ZERO_CHANGES, or
// SOMETHING_CHANGED

function fdvar_forceEqInline(fdvar1, fdvar2) {
  let domain1 = fdvar1.dom;
  let domain2 = fdvar2.dom;

  if (typeof domain1 === 'number' && typeof domain2 === 'number') {
    let result = domain_forceEqNumbered(domain1, domain2);
    if (!result) {
      fdvar1.dom = result;
      fdvar2.dom = result;
      return REJECTED;
    }
    if (result !== domain1 || result !== domain2) {
      fdvar1.dom = result;
      fdvar2.dom = result;
      return SOMETHING_CHANGED;
    }
    return ZERO_CHANGES;
  }

  // TODO: for now, just convert them. but this can be optimized a lot.
  if (typeof domain1 === 'number') {
    domain1 = domain_toList(domain1);
    fdvar1.dom = domain1;
  }
  if (typeof domain2 === 'number') {
    domain2 = domain_toList(domain2);
    fdvar2.dom = domain2;
  }

  let changeState = domain_forceEqInline(fdvar1.dom, fdvar2.dom);

  // if this assert fails, update the following checks accordingly!
  ASSERT(changeState >= -1 && changeState <= 1, 'state should be -1 for reject, 0 for no change, 1 for both changed; but was ?', changeState);

  if (changeState === REJECTED) {
    return REJECTED;
  }

  return changeState;
}

function fdvar_forceNeqInline(fdvar1, fdvar2) {
  let r = ZERO_CHANGES;
  let dom1 = fdvar1.dom;
  let dom2 = fdvar2.dom;

  ASSERT_DOMAIN_EMPTY_CHECK(dom1);
  ASSERT_DOMAIN_EMPTY_CHECK(dom2);

  if (fdvar1.was_solved || fdvar_isSolved(fdvar1)) {
    let value = domain_min(dom1);
    if (typeof dom2 === 'number') {
      let result = domain_removeValueNumbered(dom2, value);
      if (!result) {
        fdvar2.dom = result;
        r = REJECTED;
      } else if (result !== dom2) {
        fdvar2.dom = result;
        r = SOMETHING_CHANGED;
      } else {
        r = ZERO_CHANGES;
      }
    } else {
      r = domain_removeValueInline(dom2, value);
    }
  } else if (fdvar2.was_solved || fdvar_isSolved(fdvar2)) {
    let value = domain_min(dom2);
    if (typeof dom1 === 'number') {
      let result = domain_removeValueNumbered(dom1, value);
      if (!result) {
        fdvar1.dom = result;
        r = REJECTED;
      } else if (result !== dom1) {
        fdvar1.dom = result;
        r = SOMETHING_CHANGED;
      } else {
        r = ZERO_CHANGES;
      }
    } else {
      r = domain_removeValueInline(dom1, value);
    }
  }

  ASSERT(r === REJECTED || r === ZERO_CHANGES || r === SOMETHING_CHANGED, 'turning stuff into enum, must be sure about values');
  ASSERT((r === REJECTED) === (domain_isRejected(dom1) || domain_isRejected(dom2)), 'if either domain is rejected, r should reflect this already');

  return r;
}

// BODY_STOP

export {
  fdvar_clone,
  fdvar_constrain,
  fdvar_create,
  fdvar_createBool,
  fdvar_createRange,
  fdvar_createWide,
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
  fdvar_setToOne,
  fdvar_setToZero,
  fdvar_size,
};
