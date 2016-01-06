# Finite-Domain Helpers

# Note: this file is post processed to remove the ASSERTs
# A grunt cli (`grunt string-replace:perf`, which is also triggered
# in `grunt perf`) will replace all lines that start with `ASSERT`
# with a `1`, which acts as a noop to prevent syntax errors for
# sub-statements (like condiditions). Additionally, there is a
# macro `REMOVE_ASSERTS_START` and `REMOVE_ASSERTS_STOP` which act
# like barriers. Anything in between is removed and replaced with
# an `x` so the result is `x=1` (just easier than the clean version).
# We need to wipe these lines because we won't use them and when we
# strip the ASSERT lines, syntax errors would happen in this file.
# The export is preserved so the constants are still exported but
# the method exports are stripped with the ASSERT replacement...

module.exports = (FD) ->
  SUB = 0 # WARNING: adjusting SUB to something negative means adjusting all tests. probably required for any change actually.
  SUP = 100000000
  ZERO_CHANGES = 0
  SOMETHING_CHANGED = 1
  REJECTED = -1
  NOT_FOUND = -1
  # different from NOT_FOUND in that NOT_FOUND must be -1 because of the indexOf api
  # while NO_SUCH_VALUE must be a value that cannot be a legal domain value (<SUB or >SUP)
  NO_SUCH_VALUE = SUB - 1 # make sure NO_SUCH_VALUE is not a value that may be valid in a domain
  ENABLED = false # override for most tests (but not regular ASSERTs) like full domains and space validations
  ENABLE_DOMAIN_CHECK = false # also causes unrelated errors because mocha sees the expandos
  ENABLE_EMPTY_CHECK = false #  also causes unrelated errors because mocha sees the expandos
  PAIR_SIZE = 2

  # keep the next line. it's used by a post processor
  REMOVE_ASSERTS_START = 1

  # For unit tests
  # Should be removed in production. Obviously.

  ASSERT = (bool, msg = '', args...) ->
    if bool
      return

    console.error 'Assertion fail: ' + msg
    if args
      console.log 'Error args:', args
    #      console.trace()
    #      process.exit() # uncomment for quick error access :)
    THROW "Assertion fail: #{msg}#{((args.length and (" Args (#{args.length}x): [#{_stringify(args).join ', '}]")) or '')}"
    return

  _stringify = (o) ->
    if o instanceof Array
      return o.map (e) ->
        return "[#{_stringify e}]"
    return o + ''

  # Simple function to completely validate a domain
  # Should be removed in production. Obviously.

  ASSERT_DOMAIN = (domain) ->
    unless ENABLED and ENABLE_DOMAIN_CHECK
      return

    ASSERT !!domain, 'domains should be an array', domain
    ASSERT domain.length % PAIR_SIZE is 0, 'domains should contain pairs so len should be even', domain, domain.length, domain.length % PAIR_SIZE
    phi = SUB - 2 # this means that the lowest `lo` can be, is SUB, csis requires at least one value gap
    for lo, index in domain by PAIR_SIZE
      hi = domain[index + 1]
      ASSERT typeof lo is 'number', 'domains should just be numbers', domain
      ASSERT typeof hi is 'number', 'domains should just be numbers', domain
      ASSERT lo >= SUB, 'lo should be gte to SUB ' + ' [' + lo + ']', domain
      ASSERT hi >= SUB, 'hi should be gte to SUB ' + ' [' + hi + ']', domain
      ASSERT hi <= SUP, 'hi should be lte to SUP' + ' [' + hi + ']', domain
      ASSERT lo <= hi, 'pairs should be lo<=hi' + ' ' + lo + ' <= ' + hi, domain
      ASSERT lo > phi + 1, 'domains should be in csis form internally, end point apis should normalize input to this: ' + domain, domain
      ASSERT (lo%1) is 0, 'domain should only contain integers', domain
      ASSERT (hi%1) is 0, 'domain should only contain integers', domain
      phi = hi
    return

  # use this to verify that all domains set to an fdvar
  # are "fresh", and at least not in use by any fdvar yet

  ASSERT_UNUSED_DOMAIN = (domain) ->
    unless ENABLED and ENABLE_DOMAIN_CHECK
      return

    # Note: if this expando is blowing up your test, make sure to include fixtures/helpers.spec.coffee in your test file!
    ASSERT !domain._fdvar_in_use, 'domains should be unique and not shared'
    domain._fdvar_in_use = true # asserted just so automatic removal strips this line as well
    return

  ASSERT_VARS = (vars) ->
    unless ENABLED
      return

    for name, fdvar of vars
      ASSERT_DOMAIN fdvar.dom
    return

  ASSERT_SPACE = (space) ->
    unless ENABLED
      return

    # TBD: expand with other assertions...
    ASSERT_VARS space.vars
    return

  ASSERT_PROPAGATORS = (propagators) ->
    unless ENABLED
      return

    ASSERT !!propagators, 'propagators should exist', propagators
    for p in propagators
      ASSERT_PROPAGATOR p
    return

  ASSERT_PROPAGATOR = (propagator) ->
    unless ENABLED
      return

    ASSERT !!propagator, 'propagators should not be sparse', propagator
    if propagator instanceof Array
      ASSERT propagator.length >= 2, 'should at least have a name and vars', propagator
      ASSERT typeof propagator[0] is 'string', 'name should be a string', propagator
      ASSERT propagator[1] instanceof Array, 'second value should be a list of fdvar names', propagator
      ASSERT propagator[1].filter((x) -> typeof x isnt 'string').length is 0, 'should all be strings', propagator
    else
      ASSERT false, 'propagator should be either a Propagator instance or an Array', propagator

    return

  ASSERT_DOMAIN_EMPTY_SET = (domain) ->
    unless ENABLED and ENABLE_EMPTY_CHECK
      return

    if domain._trace
      throw new Error 'Domain already marked as set to empty...: ' + domain._trace
    # Note: if this expando is blowing up your test, make sure to include fixtures/helpers.spec.coffee in your test file!
    domain._trace = new Error().stack
    return

  ASSERT_DOMAIN_EMPTY_CHECK = (domain) ->
    unless ENABLED
      return

    unless domain.length
      if ENABLE_EMPTY_CHECK
        if domain._trace
          throw new Error 'Domain should not be empty but was set empty at: ' + domain._trace
        throw new Error 'Domain should not be empty but was set empty at an untrapped point (investigate!)'
      throw new Error 'Domain should not be empty but was set empty (ASSERT_DOMAIN_EMPTY_CHECK is disabled so no trace)'
    ASSERT_DOMAIN domain
    return

  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK = (domain) ->
    unless ENABLED
      return

    if domain.length
      ASSERT_DOMAIN domain
    else
      ASSERT_DOMAIN_EMPTY_SET domain
    return

  # keep the next line. it's used by a post processor
  REMOVE_ASSERTS_STOP = 1

  # Abstraction for throwing because throw statements cause deoptimizations
  # All explicit throws should use this function. Also helps with tooling
  # later, catching and reporting explicits throws and what not.

  THROW = (msg) ->
    throw new Error msg

  FD.helpers = {
    ENABLED
    ENABLE_DOMAIN_CHECK
    ENABLE_EMPTY_CHECK

    REJECTED
    SUB
    SUP
    NOT_FOUND
    NO_SUCH_VALUE
    SOMETHING_CHANGED
    ZERO_CHANGES

    ASSERT
    ASSERT_DOMAIN
    ASSERT_DOMAIN_EMPTY_CHECK
    ASSERT_DOMAIN_EMPTY_SET
    ASSERT_DOMAIN_EMPTY_SET_OR_CHECK
    ASSERT_PROPAGATOR
    ASSERT_PROPAGATORS
    ASSERT_SPACE
    ASSERT_UNUSED_DOMAIN
    ASSERT_VARS
    THROW
  }
