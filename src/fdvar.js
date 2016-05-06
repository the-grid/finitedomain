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
  domain_create_all,
  domain_create_bool,
  domain_create_range,
  domain_create_value,
  domain_intersection,
  domain_equal,
  domain_force_eq_inline,
  domain_is_determined,
  domain_is_rejected,
  domain_is_solved,
  domain_is_value,
  domain_max,
  domain_middle_element,
  domain_min,
  domain_remove_gte_inline,
  domain_remove_lte_inline,
  domain_remove_value_inline,
  domain_set_to_range_inline,
  domain_size,
} from './domain';

// BODY_START

function fdvar_create(id, dom) {
  return fdvar_new(id, dom, 0);
}

function fdvar_createBool(id) {
  return fdvar_new(id, domain_create_bool(), 0);
}

function fdvar_createRange(id, lo, hi) {
  return fdvar_new(id, domain_create_range(lo, hi), 0);
}

function fdvar_createValue(id, val) {
  return fdvar_new(id, domain_create_value(val), 0);
}

function fdvar_createWide(id) {
  return fdvar_new(id, domain_create_all(), 0);
}

function fdvar_new(id, dom) {
  ASSERT(!!dom, 'should init to a domain', [id, dom]);
  ASSERT_DOMAIN(dom, 'new domain should be CSIS', [id, dom]);
  ASSERT_UNUSED_DOMAIN(dom);
  return {
    _class: 'fdvar',
    id,
    dom,
    was_solved: false // for space_create_clone
  };
}

// A var is undetermined when it is neither rejected nor solved.
// Basically that means that the domain contains more than one range
// or that the only range spans at least two elements.

function fdvar_isUndetermined(fdvar) {
  return !domain_is_determined(fdvar.dom);
}

// A var is solved if it has only one range that spans only one value.

function fdvar_isSolved(fdvar) {
  return domain_is_solved(fdvar.dom);
}

// Is given var [value, value] ?
function fdvar_isValue(fdvar, value) {
  return domain_is_value(fdvar.dom, value);
}

// A var is rejected if its domain is empty. This means none of the
// possible values for this var could satisfy all the constraints.

function fdvar_isRejected(fdvar) {
  return domain_is_rejected(fdvar.dom);
}

function fdvar_clone(fdvar) {
  ASSERT(!fdvar.was_solved, 'should not clone vars that are already solved...');
  return fdvar_new(fdvar.id, fdvar.dom.slice(0));
}

let fdvar_isEqual = (fdvar1, fdvar2) => domain_equal(fdvar1.dom, fdvar2.dom);

function fdvar_setDomain(fdvar, domain) {
  ASSERT_UNUSED_DOMAIN(domain);
  if (!domain_equal(fdvar.dom, domain)) {
    fdvar.dom = domain;
    return SOMETHING_CHANGED;
  }
  return ZERO_CHANGES;
}

function fdvar_setValueInline(fdvar, value) {
  domain_set_to_range_inline(fdvar.dom, value, value);
}

function fdvar_setRangeInline(fdvar, lo, hi) {
  domain_set_to_range_inline(fdvar.dom, lo, hi);
}

// TODO: rename to intersect for that's what it is.
function fdvar_constrain(fdvar, domain) {
  domain = domain_intersection(fdvar.dom, domain);
  if (!domain.length) {
    return REJECTED;
  }
  return fdvar_setDomain(fdvar, domain);
}

function fdvar_constrainToRange(fdvar, lo, hi) {
  return fdvar_constrain(fdvar, domain_create_range(lo, hi));
}

function fdvar_constrainToValue(fdvar, value) {
  return fdvar_constrain(fdvar, domain_create_value(value));
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
  return domain_middle_element(fdvar.dom);
}

function fdvar_removeGteInline(fdvar, value) {
  if (domain_remove_gte_inline(fdvar.dom, value)) {
    return SOMETHING_CHANGED;
  }
  return ZERO_CHANGES;
}

function fdvar_removeLteInline(fdvar, value) {
  if (domain_remove_lte_inline(fdvar.dom, value)) {
    return SOMETHING_CHANGED;
  }
  return ZERO_CHANGES;
}

// for the eq propagator; makes sure all elements in either var
// are also contained in the other. removes all others. operates
// inline on the var domains. returns REJECTED, ZERO_CHANGES, or
// SOMETHING_CHANGED

function fdvar_forceEqInline(fdvar1, fdvar2) {
  let changeState = domain_force_eq_inline(fdvar1.dom, fdvar2.dom);

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
    r = domain_remove_value_inline(dom2, domain_min(dom1));
    ASSERT(r < 2, 'should return SOMETHING_CHANGED and not the actual number of changes... test here just in case!');
  } else if (fdvar2.was_solved || fdvar_isSolved(fdvar2)) {
    r = domain_remove_value_inline(dom1, domain_min(dom2));
    ASSERT(r < 2, 'should return SOMETHING_CHANGED and not the actual number of changes... test here just in case!');
  }

  ASSERT(r === REJECTED || r === ZERO_CHANGES || r === SOMETHING_CHANGED, 'turning stuff into enum, must be sure about values');
  ASSERT((r === REJECTED) === (domain_is_rejected(dom1) || domain_is_rejected(dom2)), 'if either domain is rejected, r should reflect this already');

  return r;
}

// BODY_STOP

export {
  fdvar_clone,
  fdvar_constrain,
  fdvar_constrainToRange,
  fdvar_constrainToValue,
  fdvar_create,
  fdvar_createBool,
  fdvar_createRange,
  fdvar_createValue,
  fdvar_createWide,
  fdvar_forceEqInline,
  fdvar_forceNeqInline,
  fdvar_isEqual,
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
  fdvar_setValueInline,
  fdvar_setRangeInline,
  fdvar_size,
};
