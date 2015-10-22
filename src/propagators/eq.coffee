module.exports = (FD) ->
  {
    REJECTED
    ZERO_CHANGES

    ASSERT
    ASSERT_DOMAIN
  } = FD.helpers

  {
    domain_equal
    domain_intersection
  } = FD.Domain

  {
    fdvar_set_domain
  } = FD.Var

  RANGE_SIZE = 2
  MIN = Math.min

  # This eq propagator looks a lot different from neq because in
  # eq we can prune early all values that are not covered by both.
  # Any value that is not covered by both can not be a valid solution
  # that holds this constraint. In neq that's different and we can
  # only start pruning once at least one var has a solution.
  # Basically eq is much more efficient compared to neq because we
  # can potentially skip a lot of values early.

  eq_step_bare = (fdvar1, fdvar2) ->
    begin_upid = fdvar1.vupid + fdvar2.vupid

    dom1 = fdvar1.dom
    dom2 = fdvar2.dom
    len1 = dom1.length
    len2 = dom2.length

    index = 0
    len = MIN len1, len2

    # first check whether the two are different at all
    different = false
    while index < len
      lo1 = dom1[index]
      hi1 = dom1[index+1]
      lo2 = dom2[index]
      hi2 = dom2[index+1]
      if lo1 isnt lo2 or hi1 isnt hi2
        different = true
        break
      index += RANGE_SIZE

    if different
      p1 = p2 = index
      # lo1 hi1 lo2 hi2 will be set to the mismatch at i
      while p1 < len1 and p2 < len2
        # either R1<R2, R1>R2, either overlap (O) or complete (C), or one R contains the other R, or they are equal.
        # if O<, drop R1; 0-1, 3-4
        # if C<, update R1 lo to R2 lo; 0-2, 1-3
        # if O>, drop R2; 3-4, 0-1
        # if C>, update R2 lo to R1 lo; 1-3, 0-2
        # else; lo1 = lo2.
        # - copy current range lo-min(hi1,hi2)
        # - either side skip if current range matches copied range (should be at least one side)
        # - otherwise set lo to hi
        # otherwise, throw

        if hi1 < lo2 # R1 < R2 completely; drop R1
          p1 += RANGE_SIZE
          lo1 = dom1[p1]
          hi1 = dom1[p1+1]
        else if hi2 < lo1 # R2 < R1 completely; drop R1
          p2 += RANGE_SIZE
          lo2 = dom2[p2]
          hi2 = dom2[p2+1]
        else
          # hi1 >= lo2 and hi2 >= lo1
          if lo1 < lo2 # R1 < R2 partial; update R1 lo to R2 lo
            lo1 = lo2
          else if lo2 < lo1 # R2 < R1 partial; update R2 lo to R1 lo
            lo2 = lo1
          else
            # lo1 must be == lo2, add a range with MIN hi1, hi2
            # then move lo to that hi and drop a range on at least one side

            ASSERT lo1 is lo2, 'the lows should be equal'
            hi = MIN hi1, hi2
            dom1[index] = dom2[index] = lo1
            dom1[index+1] = dom2[index+1] = hi
            index += RANGE_SIZE

            # if the current range on either side was fully copied, move its pointer
            # otherwise update its lo to the last hi+1 and continue

            if hi is hi1
              p1 += RANGE_SIZE
              lo1 = dom1[p1]
              hi1 = dom1[p1+1]
            else
              lo1 = hi+1

            if hi is hi2
              p2 += RANGE_SIZE
              lo2 = dom2[p2]
              hi2 = dom2[p2+1]
            else
              lo2 = hi+1

      # may be worth investigating whether more a granular update of vupid  is worth it...
      ++fdvar1.vupid
      ++fdvar2.vupid

    # note: a domain may shrink OR grow.
    # and a domain that stays the same len may still have changed.
    if len1 isnt index
      dom1.length = index
      ++fdvar1.vupid
    if len2 isnt index
      dom2.length = index
      ++fdvar2.vupid

    ASSERT_DOMAIN dom1
    ASSERT_DOMAIN dom2

    if index is 0
      return REJECTED

    new_vupid = fdvar1.vupid + fdvar2.vupid
    return new_vupid - begin_upid

  FD.propagators.eq_step_bare = eq_step_bare
