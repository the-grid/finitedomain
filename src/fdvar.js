import {
  NO_CHANGES,
  SOME_CHANGES,

  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_UNUSED_DOMAIN,
} from './helpers';

import {
  domain_numarr,
  domain_removeGteInline,
  domain_removeGteNumbered,
  domain_removeLteInline,
  domain_removeLteNumbered,
} from './domain';

// BODY_START

function fdvar_create(id, dom) {
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


// BODY_STOP

export {
  fdvar_create,
  fdvar_removeGteInline,
  fdvar_removeLteInline,
};
