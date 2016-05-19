import {
  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_UNUSED_DOMAIN,
} from './helpers';

import {
  domain_numarr,
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

// BODY_STOP

export {
  fdvar_create,
};
