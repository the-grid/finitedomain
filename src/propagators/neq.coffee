module.exports = (FD) ->
  {
    REJECTED

    ASSERT
    ASSERT_DOMAIN
  } = FD.helpers

  {
    domain_deep_clone_without_value
  } = FD.Domain

  {
    fdvar_is_solved
    fdvar_lower_bound
    fdvar_set_domain
  } = FD.Var

  PAIR_SIZE = 2

  remove = (value, fdvar) ->
    domain = fdvar.dom
    r = remove_from_domain value, domain
    if r > 0
      ++fdvar.vupid
    return r

  remove_from_domain = (value, domain) ->
    for lo, index in domain by PAIR_SIZE
      hi = domain[index+1]
      if value >= lo and value <= hi
        # this fdvar will be updated for better or worse
        #++fdvar.vupid

        # four options:
        # range is exactly value; remove it, stream rest, update len, return
        # range starts or ends with value; update it, return
        # value is inside range; split it, inject carefully, stream, return

        if lo is value
          if hi is value
            # remove range by moving _all_ following values back two positions
            # update length too! then return
            for i in [index...domain.length] by PAIR_SIZE
              domain[i] = domain[i+2]
              domain[i+1] = domain[i+3]
            domain.length = i-2
            if i is 2
              return REJECTED
            return 1
          domain[index] = value+1
          return 1
        if hi is value
          domain[index+1] = value-1
          return 1

        # must be last case now: value is inside range
        # split range. update current range with new hi
        domain[index+1] = value - 1

        # create a new range of value+1 to old hi
        p_lo = value+1
        p_hi = hi
        ASSERT p_lo <= p_hi, 'value shouldve been below hi'

        # from here on out we must first stash the cur range, then pop the prev range
        for i in [index+2...domain.length] by PAIR_SIZE
          lo = domain[i]
          hi = domain[i+1]
          domain[i] = p_lo
          domain[i+1] = p_hi
          p_lo = lo
          p_hi = hi
        # and one more time now at the end
        domain[i] = p_lo
        domain[i+1] = p_hi
        domain.length = i+2
        return 1
    return 0

  neq_step_bare = (fdvar1, fdvar2) ->
    r = 0
    dom1 = fdvar1.dom
    dom2 = fdvar2.dom
    if fdvar_is_solved fdvar1
      r = remove dom1[0], fdvar2
      ASSERT_DOMAIN dom2
    else if fdvar_is_solved fdvar2
      r = remove dom2[0], fdvar1
      ASSERT_DOMAIN dom1
    if dom1.length is 0 or dom2.length is 0
      fdvar1.dom.length = 0
      fdvar2.dom.length = 0
      return REJECTED
    return r

  FD.propagators.neq_step_bare = neq_step_bare
