// Finite-Domain Helpers

// Note: this file is post processed to remove the ASSERTs
// A grunt cli (`grunt string-replace:perf`, which is also triggered
// in `grunt perf`) will replace all lines that start with `ASSERT`
// with a `1`, which acts as a noop to prevent syntax errors for
// sub-statements (like condiditions). Additionally, there is a macro
// `__REMOVE_BELOW_FOR_DIST__` and `__REMOVE_ABOVE_FOR_DIST__` which
// act like barriers. Anything in between is removed and replaced with
// an `x` so the result is `x=1` (just easier than the clean version).
// We need to wipe these lines because we won't use them and when we
// strip the ASSERT lines, syntax errors would happen in this file.
// The export is preserved so the constants are still exported but
// the method exports are stripped with the ASSERT replacement...

// BODY_START

let SUB = 0; // WARNING: adjusting SUB to something negative means adjusting all tests. probably required for any change actually.
let SUP = 100000000;
let SOLVED = 1;
let UNDETERMINED = 0;
let NOT_FOUND = -1;
let EMPTY = 0;
let EMPTY_STR = '';

let LOG_NONE = 0;
let LOG_STATS = 1;
let LOG_SOLVES = 2;
let LOG_MIN = LOG_NONE;
let LOG_MAX = LOG_SOLVES;
// different from NOT_FOUND in that NOT_FOUND must be -1 because of the indexOf api
// while NO_SUCH_VALUE must be a value that cannot be a legal domain value (<SUB or >SUP)
let NO_SUCH_VALUE = Math.min(0, SUB) - 1; // make sure NO_SUCH_VALUE is a value that may be neither valid in a domain nor >=0
let ENABLED = true; // override for most tests (but not regular ASSERTs) like full domains and space validations
let ENABLE_DOMAIN_CHECK = false; // also causes unrelated errors because mocha sees the expandos
let ENABLE_EMPTY_CHECK = false; //  also causes unrelated errors because mocha sees the expandos
let ARR_RANGE_SIZE = 2;

const SMALL_MAX_NUM = 30;
// there are SMALL_MAX_NUM flags. if they are all on, this is the number value
// (oh and; 1<<31 is negative. >>>0 makes it unsigned. this is why 30 is max.)
const SMALL_MAX_FLAG = (1 << (SMALL_MAX_NUM + 1) >>> 0) - 1;
const SOLVED_FLAG = 1 << 31 >>> 0; // the >>> makes it unsigned, we dont really need it but it may help perf a little (unsigned vs signed)

// __REMOVE_BELOW_FOR_ASSERTS__

ASSERT(SMALL_MAX_NUM <= 30, 'cant be larger because then shifting fails above and elsewhere');
ASSERT(NOT_FOUND === NO_SUCH_VALUE, 'keep not found constants equal to prevent confusion bugs');

// For unit tests
// Should be removed in production. Obviously.

function ASSERT(bool, msg = '', ...args) {
  if (bool) {
    return;
  }

  if (!msg) msg = new Error('trace').stack;

  console.error(`Assertion fail: ${msg}`);
  if (args) {
    console.log('Error args:', args);
  }
  //      console.trace()
  //      process.exit() # uncomment for quick error access :)

  let suffix = '';
  if (args && args.length) {
    suffix = `Args (${args.length}x): \`${_stringify(args)}\``;
  }

  THROW(`Assertion fail: ${msg} ${suffix}`);
}

function _stringify(o) {
  if (o instanceof Array) {
    return `[ ${o.map(e => _stringify(e)).join(', ')} ]`;
  }
  return `${o}`;
}

// Simple function to completely validate a domain
// Should be removed in production. Obviously.

function ASSERT_STRDOM(domain) {
  ASSERT(typeof domain === 'string', 'ONLY_STRDOM');
  ASSERT((domain.length % 4) === 0, 'SHOULD_CONTAIN_RANGES');
}
function ASSERT_NUMDOM(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_NUMDOM');
  ASSERT(domain >= 0, 'ALL_NUMDOMS_SHOULD_BE_UNSIGNED');
  // TODO: verify that any solved domain is encoded as a solved numdom...
  if (domain & SOLVED_FLAG) {
    ASSERT((domain ^ SOLVED_FLAG) >= SUB, 'SOLVED_NUMDOM_SHOULD_BE_MIN_SUB');
    ASSERT((domain ^ SOLVED_FLAG) <= SUP, 'SOLVED_NUMDOM_SHOULD_BE_MAX_SUP');
  } else {
    ASSERT(domain >= 0 && domain <= SMALL_MAX_FLAG, 'NUMDOM_SHOULD_BE_VALID_RANGE');
  }
}
function ASSERT_ARRDOM(domain) {
  ASSERT(domain instanceof Array, 'ONLY_ARRDOM');
  ASSERT(domain.length % 2 === 0, 'SHOULD_CONTAIN_RANGES');
}
function ASSERT_NUMSTRDOM(domain) {
  ASSERT(typeof domain === 'string' || typeof domain === 'number', 'ONLY_NUMDOM_OR_STRDOM');
}
function ASSERT_ANYDOM(domain) {
  ASSERT(typeof domain === 'string' || typeof domain === 'number' || domain instanceof Array, 'ONLY_VALID_DOM_TYPE');
}

//__REMOVE_ABOVE_FOR_ASSERTS__

// given a value return value.id or value
// intended to return the name of a variable where the
// value can be either that variable, or just its name
// @returns {string}

function GET_NAME(e) {
  // e can be the empty string (TOFIX: let's not allow this...)
  if (e.id !== undefined && e.id !== null) {
    return e.id;
  }
  return e;
}

// @see GET_NAME
// @returns {string[]}

function GET_NAMES(es) {
  if (typeof es === 'string') return es;

  let varNames = [];
  for (let i = 0; i < es.length; i++) {
    let varName = es[i];
    varNames.push(GET_NAME(varName));
  }

  return varNames;
}

// Abstraction for throwing because throw statements cause deoptimizations
// All explicit throws should use this function. Also helps with tooling
// later, catching and reporting explicits throws and what not.

function THROW(msg) {
  throw new Error(msg);
}

// BODY_STOP

export {
  // __REMOVE_BELOW_FOR_DIST__
  ENABLED,
  ENABLE_DOMAIN_CHECK,
  ENABLE_EMPTY_CHECK,
  // __REMOVE_ABOVE_FOR_DIST__

  EMPTY,
  EMPTY_STR,
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
  NOT_FOUND,
  NO_SUCH_VALUE,
  ARR_RANGE_SIZE,
  SMALL_MAX_FLAG,
  SMALL_MAX_NUM,
  SOLVED,
  SOLVED_FLAG,
  SUB,
  SUP,
  UNDETERMINED,

  ASSERT,
  ASSERT_ANYDOM,
  ASSERT_ARRDOM,
  ASSERT_NUMDOM,
  ASSERT_NUMSTRDOM,
  ASSERT_STRDOM,
  GET_NAME,
  GET_NAMES,
  THROW,
};
