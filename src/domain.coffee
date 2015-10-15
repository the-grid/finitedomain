module.exports = (FD) ->

  {
    SUB
    SUP
    NO_SUCH_VALUE
    ZERO_CHANGES

    ASSERT
    ASSERT_DOMAIN
  } = FD.helpers

  INLINE = true
  NOT_INLINE = false
  PREV_CHANGED = true

  # CSIS form = Canonical Sorted Interval Sequeunce form.
  # Basically means the ranges in the domain are ordered
  # ascending and no ranges overlap. We call this "simplified"

  FIRST_RANGE = 0
  FIRST_RANGE_LO = 0
  FIRST_RANGE_HI = 1
  LO_BOUND = 0
  HI_BOUND = 1
  PAIR_SIZE = 2

  NOT_FOUND = -1

  # Cache static Math functions
  MIN = Math.min
  MAX = Math.max
  FLOOR = Math.floor

  # returns whether domain covers given value

  domain_contains_value = (domain, value) ->
    ASSERT_DOMAIN domain
    return (domain_range_index_of domain, value) isnt NOT_FOUND

  # return the range index in given domain that covers given
  # value, or if the domain does not cover it at all

  domain_range_index_of = (domain, value) ->
    ASSERT_DOMAIN domain
    for lo, index in domain by PAIR_SIZE
      if value >= lo and value <= domain[index+1]
        return index
    return NOT_FOUND

  domain_is_value = (domain, value) ->
    ASSERT_DOMAIN domain
    if domain.length isnt PAIR_SIZE
      return false
    return domain[LO_BOUND] is value and domain[HI_BOUND] is value

  domain_get_value = (domain) ->
    ASSERT_DOMAIN domain
    if domain.length isnt PAIR_SIZE
      return NOT_FOUND
    [lo, hi] = domain
    if domain[LO_BOUND] is domain[HI_BOUND]
      return lo
    return NO_SUCH_VALUE

  # list of possible values to domain

  domain_from_list = (list, clone = true, sort = true) ->
    if clone
      list = list.slice 0 # TBD: this was broken. do we need it?
    if sort # note: the list must be sorted for the algorithm below to work...
      list.sort (a, b) ->
        a - b # this is the default so dont supply sorter?

    domain = []
    for value, index in list
      ASSERT value >= SUB, 'fd values range SUB~SUP'
      if index is 0
        lo = value
        hi = value
      else
        ASSERT value >= hi, 'list should be ordered' # imo it should not even contain dupe elements... but that may happen anyways
        if value > hi+1
          domain.push lo, hi
          lo = value
        hi = value
    domain.push lo, hi
    ASSERT_DOMAIN domain
    return domain

  # domain to list of possible values

  domain_to_list = (domain) ->
    ASSERT_DOMAIN domain
    list = []
    for lo, index in domain by PAIR_SIZE
      # note: the translation for `list.push.apply list, [0..domain[index+1]]` would do double the work
      for val in [lo..domain[index+1]]
        list.push val
    return list

  # Given a list and domain, search items in the list in the domain and remove
  # the first element found this way, then return a deep clone of that result
  # Given domain is not harmed in this process.
  # If no items from list can be found, this function returns the empty domain.

  domain_remove_next_from_list = (domain, list) ->
    ASSERT_DOMAIN domain
    for value in list
      index = domain_range_index_of domain, value
      if index >= 0
        return _deep_clone_without_value domain, value, index
    return # return undefined to indicate end of search

  # Search for value in domain. If it exists, remove it and return
  # a deep clone of the result. Otherwise return an empty domain.

  domain_remove_value = (domain, value) ->
    ASSERT_DOMAIN domain
    index = domain_range_index_of domain, value
    if index >= 0
      return _deep_clone_without_value domain, value, index
    return # return undefined to indicate end of search

  # Return a clone of given domain. If value is contained in domain, the clone
  # will not contain it. This is an optimization to basically prevent splicing.

  domain_deep_clone_without_value = (domain, value) ->
    ASSERT_DOMAIN domain
    index = domain_range_index_of domain, value
    if index >= 0
      return _deep_clone_without_value domain, value, index
    # regular slice > *
    return domain.slice 0

  # Same as domain_deep_clone_without_value but requires the first
  # range_index whose lo is bigger than or equal to value

  _deep_clone_without_value = (domain, value, range_index) ->
    # we have the range offset that should contain the value. the clone wont
    # affect ranges before or after. but we want to prevent a splice or shifts, so:
    if range_index
      result = domain.slice 0, range_index
    else
      result = []

    for index in [range_index...domain.length] by PAIR_SIZE
      lo = domain[index]
      hi = domain[index+1]
      if index isnt range_index
        result.push lo, hi
      else # so index is range_index, so split
        if lo isnt value
          result.push lo, value-1
        if hi isnt value
          result.push value+1, hi
    ASSERT_DOMAIN result
    return result

  domain_get_value_of_first_contained_value_in_list = (domain, list) ->
    ASSERT_DOMAIN domain
    for value in list
      if domain_contains_value domain, value
        return value
    return NO_SUCH_VALUE

  domain_without = (value) ->
    return domain_except_bounds value, value

  domain_except_bounds = (lo, hi) ->
    domain = []
    if lo > SUB
      domain.push SUB, lo-1
    if hi < SUP
      domain.push hi+1, SUP
    ASSERT_DOMAIN domain
    return domain

  # The complement of a domain is such that domain U domain' = [SUB, SUP].
  # Assumes domain is in CSIS form
  # Returns a domain that covers any range in (SUB...SUP) that was not covered by given domain

  domain_complement = (domain) ->
    ASSERT_DOMAIN domain
    unless domain.length
      return domain_create_all()

    end = SUB
    result = []
    for lo, index in domain by PAIR_SIZE
      ASSERT !end or end < lo, 'domain is supposed to be csis, so ranges dont overlap nor touch'
      if lo > SUB # prevent [SUB,SUB] if first range starts at SUB; that'd be bad
        result.push end, lo - 1
      end = domain[index+1] + 1

    if end <= SUP # <= so SUP is inclusive...
      result.push end, SUP

    ASSERT_DOMAIN domain
    return result

  # All ranges will be ordered ascending and overlapping ranges are merged
  # This function first checks whether simplification is needed at all
  # If replace_inline is NOT_INLINE the input domain is deeply cloned first, regardless

  domain_simplify = (domain, replace_inline=NOT_INLINE, x) ->
#    ASSERT_DOMAIN domain # the whole point of this func is to simplify so this assert wont hold

    # deep clone if not inline because ranges are adjusted inline when merging
    # we could interweave this step with merge_overlapping_inline, not sure if it changes much
    if replace_inline is NOT_INLINE
      domain = domain.slice 0

    if domain.length == 0
      return domain

    # TODO: perf check; before there was a large memory overhead but i think that's taken care of now. the extra check-loop may not be worth it
    unless is_simplified domain
      domain_simplify_inline domain

    ASSERT_DOMAIN domain
    return domain


  # Given a set of ranges (domain) turns them into CSIS form
  # This function sorts and loops unconditionally

  domain_simplify_inline = (domain) ->
    # order ranges by lower bound, ascending (inline regardless)
    domain_sort_by_range domain

    return merge_overlapping_inline domain

  domain_sort_by_range = (domain) ->
    len = domain.length
    if len >= 4
      quick_sort_inline domain, 0, domain.length-PAIR_SIZE
    return

  quick_sort_inline = (domain, first, last) ->
    if first < last
      pivot = partition domain, first, last
      quick_sort_inline domain, first, pivot-PAIR_SIZE
      quick_sort_inline domain, pivot+PAIR_SIZE, last
    return

  partition = (domain, first, last) ->
    pivot_index = last
    pivot = domain[pivot_index] # TODO: i think we'd be better off with a different pivot? middle probably performs better
    pivot_r = domain[pivot_index+1]

    index = first
    for i in [first...last] by PAIR_SIZE
      L = domain[i]
      if L < pivot or (L is pivot and domain[i+1] < pivot_r)
        swap_range_inline domain, index, i
        index += PAIR_SIZE
    swap_range_inline domain, index, last
    return index

  swap_range_inline = (domain, A, B) ->
    if A isnt B
      x = domain[A]
      y = domain[A+1]
      domain[A] = domain[B]
      domain[A+1] = domain[B+1]
      domain[B] = x
      domain[B+1] = y
    return

  # Check if given domain is in simplified, CSIS form

  is_simplified = (domain) ->
    if domain.length <= PAIR_SIZE
      if domain.length is PAIR_SIZE
        ASSERT domain[FIRST_RANGE_LO] >= SUB, 'domains should not be sparse [0]'
        ASSERT domain[FIRST_RANGE_HI] >= SUB, 'domains should not be sparse [1]'
      return true
    phi = SUB
    for lo, index in domain by PAIR_SIZE
      hi = domain[index+1]
      ASSERT lo >= SUB, 'domains should not be sparse [lo]'
      ASSERT hi >= SUB, 'domains should not be sparse [hi]'
      ASSERT lo <= hi, 'ranges should be ascending'
      # we need to simplify if the lo of the next range goes before or touches the hi of the previous range
      # TODO: i think it used or intended to optimize this by continueing to process this from the current domain, rather than the start.
      #       this function could return the offset to continue at... or -1 to signal "true"
      if lo <= phi+1
        return false
      phi = hi
    return true

  merge_overlapping_inline = (domain) ->
    # assumes domain is sorted
    # assumes all ranges are "sound" (lo<=hi)
    prev_hi = SUB
    write_index = 0
    for lo, read_index in domain by PAIR_SIZE
      hi = domain[read_index+1]
      ASSERT lo <= hi, 'ranges should be ascending'

      # in an ordered domain two consecutive ranges touch or overlap if the left-hi+1 is higher or equal to the right-lo
      if prev_hi+1 >= lo and read_index isnt 0
        # touching or overlapping.
        # note: prev and curr may completely enclose one another
        # Update the prev hi so prev covers both ranges, in any case
        if hi > prev_hi
          domain[prev_hi_index] = hi
          prev_hi = hi
      else
        domain[write_index] = lo
        domain[write_index+1] = hi
        prev_hi_index = write_index + 1
        write_index += PAIR_SIZE
        prev_hi = hi
    domain.length = write_index # if `domain` was a larger at the start this ensures extra elements are dropped from it
    for test in domain
      ASSERT test >= SUB, 'merge should not result in sparse array'
    return domain

  # CSIS form = Canonical Sorted Interval Sequeunce form.
  #
  # Intersection of two domains given in CSIS form.
  # r is optional and if given it should be an array and
  # the domain pieces will be inserted into it, in which case
  # the result domain will be returned unsimplified.

  domain_intersection = (dom1, dom2) ->
    ASSERT_DOMAIN dom1
    ASSERT_DOMAIN dom2
    result = []
    _domain_intersection dom1, dom2, result
    domain_simplify result # TODO: make inline
    ASSERT_DOMAIN result
    return result


  _domain_intersection = (dom1, dom2, result) ->
    ASSERT_DOMAIN dom1
    ASSERT_DOMAIN dom2
    len1 = dom1.length
    len2 = dom2.length

    ASSERT len1 % PAIR_SIZE is 0, 'domains should have an even len'
    ASSERT len2 % PAIR_SIZE is 0, 'domains should have an even len'

    if len1 is 0 or len2 is 0
      return

    if len1 is PAIR_SIZE
      if len2 is PAIR_SIZE
        intersect_range_bound dom1[LO_BOUND], dom1[HI_BOUND], dom2[LO_BOUND], dom2[HI_BOUND], result
      else
        _domain_intersection dom2, dom1, result
    else if len2 == PAIR_SIZE
      domain_intersect_bounds_into dom1, dom2[LO_BOUND], dom2[HI_BOUND], result
    else
      # Worst case. Both lengths are > 1. Divide and conquer.
      # Note: since the array contains pairs, make sure i and j are even.
      # but since they can only contain pairs, they must be even
      i = ((len1/PAIR_SIZE) >> 1) *PAIR_SIZE
      j = ((len2/PAIR_SIZE) >> 1) *PAIR_SIZE
      ASSERT i%PAIR_SIZE is 0, 'i should be even '+i
      ASSERT j%PAIR_SIZE is 0, 'j should be even '+j
      # TODO: get rid of this slicing, use index ranges instead
      d1 = dom1.slice(0, i)
      d2 = dom1.slice(i)
      d3 = dom2.slice(0, j)
      d4 = dom2.slice(j)
      _domain_intersection d1, d3, result
      _domain_intersection d1, d4, result
      _domain_intersection d2, d3, result
      _domain_intersection d2, d4, result
    return

  intersect_range_bound = (lo_1, hi_1, lo_2, hi_2, result) ->
    min = MAX lo_1, lo_2
    max = MIN hi_1, hi_2
    if max >= min
      result.push min, max
    return result

  domain_intersect_bounds_into = (domain, lo, hi, result) ->
    for lo2, index in domain by PAIR_SIZE
      hi2 = domain[index+1]
      if lo2 <= hi and hi2 >= lo
        result.push MAX(lo, lo2), MIN(hi, hi2)
    return

  # deep comparison of two domains

  domain_equal = (dom1, dom2) ->
    ASSERT_DOMAIN dom1
    ASSERT_DOMAIN dom2
    len = dom1.length

    if len != dom2.length
      return false

    if dom1 is dom2 # does this ever happen?
      return true

    return _domain_equal dom1, dom2, len

  _domain_equal = (d1, d2, len) ->
    for i in [0...len]
      if d1[i] isnt d2[i]
        return false
    return true

  # Closes all the gaps between the intervals according to
  # the given gap value. All gaps less than this gap are closed.

  domain_close_gaps_fresh = (domain, gap) ->
    ASSERT_DOMAIN domain
    if domain.length is 0
      return domain

    result = []
    for lo, index in domain by PAIR_SIZE
      hi = domain[index+1]
      if index is 0
        result.push lo, hi
        plo = lo
      else
        if hi - plo < gap
          result[result.length-1] = hi
        else
          result.push lo, hi
          plo = lo
    ASSERT_DOMAIN result
    return result

  dom_smallest_interval_width = (domain) ->
    min_width = SUP
    for lo, index in domain by PAIR_SIZE
      hi = domain[index+1]
      width = 1 + hi - lo
      if width < min_width
        min_width = width
    return min_width

  dom_largest_interval_width = (domain) ->
    max_width = SUP
    for lo, index in domain by PAIR_SIZE
      hi = domain[index+1]
      width = 1 + hi - lo
      if width > max_width
        max_width = width
    return max_width

  # The idea behind this function - which is primarily
  # intended for domain_plus and domain_minus and porbably applies
  # to nothing else - is that when adding two intervals,
  # both intervals expand by the other's amount. This means
  # that when given two segmented domains, each continuous
  # subdomain expands by at least the interval of the smallest
  # subdomain of the other segmented domain. When such an expansion
  # occurs, any gaps between subdomains that are <= the smallest
  # subdomain's interval width get filled up, which we can exploit
  # to reduce the number of segments in a domain. Reducing the
  # number of domain segments helps reduce the N^2 complexity of
  # the subsequent domain consistent interval addition method.

  dom_close_gaps2 = (dom1, dom2) ->
    ASSERT_DOMAIN dom1
    ASSERT_DOMAIN dom2
    loop
      change = ZERO_CHANGES

      domain = domain_close_gaps_fresh dom1, dom_smallest_interval_width dom2
      change += dom1.length - domain.length
      dom1 = domain

      domain = domain_close_gaps_fresh dom2, dom_smallest_interval_width dom1
      change += dom2.length - domain.length
      dom2 = domain

      if change is ZERO_CHANGES
        break

    return [
      dom1
      dom2
    ]

  domain_plus = (domain1, domain2) ->
    ASSERT_DOMAIN domain1
    ASSERT_DOMAIN domain2

    # Simplify the domains by closing gaps since when we add
    # the domains, the gaps will close according to the
    # smallest interval width in the other domain.
    [domain1, domain2] = dom_close_gaps2 domain1, domain2

    result = []
    for loi, index in domain1 by PAIR_SIZE
      hii = domain1[index+1]

      for loj, index2 in domain2 by PAIR_SIZE
        hij = domain2[index2 + 1]

        result.push MIN(SUP, loi + loj), MIN(SUP, hii + hij)

    return domain_simplify result, INLINE

  # Note that this one isn't domain consistent.

  domain_times = (domain1, domain2) ->
    ASSERT_DOMAIN domain1
    ASSERT_DOMAIN domain2

    result = []
    for loi, index in domain1 by PAIR_SIZE
      hii = domain1[index+1]

      for loj, index2 in domain2 by PAIR_SIZE
        hij = domain2[index2 + 1]

        result.push MIN(SUP, loi * loj), MIN(SUP, hii * hij)

    return domain_simplify result, INLINE

  domain_minus = (domain1, domain2) ->
    ASSERT_DOMAIN domain1
    ASSERT_DOMAIN domain2

    # Simplify the domains by closing gaps since when we add
    # the domains, the gaps will close according to the
    # smallest interval width in the other domain.
    [domain1, domain2] = dom_close_gaps2 domain1, domain2

    result = []
    for loi, index in domain1 by PAIR_SIZE
      hii = domain1[index+1]

      for loj, index2 in domain2 by PAIR_SIZE
        hij = domain2[index2 + 1]

        lo = loi - hij
        hi = hii - loj
        if hi >= SUB
          result.push MAX(SUB, lo), hi

    return domain_simplify result, INLINE

  # Note that this isn't domain consistent.

  domain_divby = (domain1, domain2) ->
    ASSERT_DOMAIN domain1
    ASSERT_DOMAIN domain2

    result = []
    for loi, index in domain1 by PAIR_SIZE
      hii = domain1[index+1]

      for loj, index2 in domain2 by PAIR_SIZE
        hij = domain2[index2 + 1]

        ASSERT hij > SUB, 'expecting no empty or inverted ranges'
        lo = loi / hij
        hi = if loj > SUB then hii / loj else SUP
        if hi >= SUB
          result.push MAX(SUB, lo), hi

    return domain_simplify result, INLINE

  # Return the number of elements this domain covers

  domain_size = (domain) ->
    ASSERT_DOMAIN domain
    count = 0
    for lo, index in domain by PAIR_SIZE
      count += 1 + domain[index+1] - lo # TODO: add test to confirm this still works fine if SUB is negative
    return count

  # Get the middle element of all elements in domain. Not hi-lo/2.

  domain_middle_element = (domain) ->
    ASSERT_DOMAIN domain
    size = domain_size domain
    target_value = FLOOR size / 2

    for lo, index in domain by PAIR_SIZE
      hi = domain[index+1]

      count =  1 + hi - lo
      if target_value < count
        break

      target_value -= count

    # `target_value` should be the `nth` element in the current range (`lo-hi`)
    # so we can use `lo` and add the remainder of `target_value` to get the mid value
    return lo + target_value

  # Only use if callsite doesn't use first range again

  domain_min = (domain) ->
    ASSERT_DOMAIN domain
    return domain[LO_BOUND]

  # Only use if callsite doesn't use last range again

  domain_max = (domain) ->
    ASSERT_DOMAIN domain
    return domain[domain.length - 1]

  domain_set_to_range_inline = (domain, lo, hi) ->
    ASSERT_DOMAIN domain, 'should be sound domain'
    domain[LO_BOUND] = lo
    domain[HI_BOUND] = hi
    domain.length = PAIR_SIZE
    return

  # A domain is "solved" if it covers exactly one value. It is not solved if it is empty.

  domain_is_solved = (domain) ->
    ASSERT_DOMAIN domain
    return domain.length is PAIR_SIZE and domain_first_range_is_determined domain

  # A domain is "determined" if it's either one value (solved) or none at all (rejected)

  domain_is_determined = (domain) ->
    ASSERT_DOMAIN domain
    len = domain.length
    if len is 0
      return true
    return len is PAIR_SIZE and domain_first_range_is_determined domain

  # A domain is "rejected" if it covers no values. This means every given
  # value would break at least one constraint so none could be used.

  domain_is_rejected = (domain) ->
    return domain.length is 0

  domain_first_range_is_determined = (domain) ->
    ASSERT_DOMAIN domain
    return domain[LO_BOUND] is domain[HI_BOUND]

  # Remove any value from domain that is bigger than or equal to given value.
  # Since domains are assumed to be in CSIS form, we can start from the back and
  # search for the first range that is smaller or contains given value. Prune
  # any range that follows it and trim the found range if it contains the value.
  # Returns whether the domain was changed somehow

  domain_remove_gte_inline = (domain, value) ->
    ASSERT_DOMAIN domain, 'needs to be csis for this trick to work'

    len = domain.length
    i = len - PAIR_SIZE
    while i >= 0 and domain[i] >= value
      i -= PAIR_SIZE

    if i < 0
      domain.length = 0
      return len isnt 0

    domain.length = i+PAIR_SIZE
    if domain[i+1] >= value
      domain[i+1] = value-1 # we already know domain[i] < value so value-1 >= SUB
      return true

    return len isnt i+PAIR_SIZE

  # Remove any value from domain that is lesser than or equal to given value.
  # Since domains are assumed to be in CSIS form, we can start from the front and
  # search for the first range that is smaller or contains given value. Prune
  # any range that preceeds it and trim the found range if it contains the value.
  # Returns whether the domain was changed somehow

  domain_remove_lte_inline = (domain, value) ->
    ASSERT_DOMAIN domain, 'needs to be csis for this trick to work'

    len = domain.length
    i = 0
    while i < len and domain[i+1] <= value
      i += PAIR_SIZE

    if i >= len
      domain.length = 0
      return len isnt 0

    # move all elements to the front
    n = 0
    for index in [i...len]
      domain[n++] = domain[index]
    # trim excess space. we just moved them
    domain.length = n

    # note: first range should be lt or lte to value now since we moved everything
    if domain[FIRST_RANGE_LO] <= value
      domain[FIRST_RANGE_LO] = value+1
      return true

    return len isnt n

  domain_create_zero = ->
    return [0, 0]

  domain_create_one = ->
    return [1, 1]

  domain_create_bool = ->
    return [0, 1]

  domain_create_all = ->
    return [SUB, SUP]

  domain_create_sub = ->
    return [SUB, SUB]

  domain_create_sup = ->
    return [SUP, SUP]

  domain_create_value = (value) ->
    return [value, value]

  domain_create_range = (lo, hi) ->
    return [lo, hi]

  FD.Domain = {
    INLINE
    NOT_INLINE
    PREV_CHANGED

    domain_complement
    domain_contains_value
    domain_create_all
    domain_create_bool
    domain_create_one
    domain_create_sub
    domain_create_sup
    domain_create_range
    domain_create_value
    domain_create_zero
    domain_deep_clone_without_value
    domain_divby
    domain_equal
    domain_except_bounds
    domain_from_list
    domain_get_value_of_first_contained_value_in_list
    domain_intersect_bounds_into
    domain_intersection
    domain_is_determined
    domain_is_rejected
    domain_is_solved
    domain_is_value
    domain_max
    domain_middle_element
    domain_min
    domain_minus
    domain_plus
    domain_remove_gte_inline
    domain_remove_lte_inline
    domain_remove_next_from_list
    domain_remove_value
    domain_set_to_range_inline
    domain_simplify
    domain_size
    domain_times
    domain_to_list
    domain_without

    # testing only:
    _domain_get_value: domain_get_value
    _domain_range_index_of: domain_range_index_of
    _is_simplified: is_simplified
    _merge_overlapping_inline: merge_overlapping_inline
    _domain_sort_by_range: domain_sort_by_range
  }
