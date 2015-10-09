module.exports = (FD) ->

  {
    SUP
    REJECTED

    ASSERT
  } = FD.helpers

  INLINE = true
  NOT_INLINE = false
  PREV_CHANGED = true

  # CSIS form = Canonical Sorted Interval Sequeunce form.
  # Basically means the ranges in the domain are ordered
  # ascending and no ranges overlap. We call this "simplified"

  FIRST_RANGE = 0
  LO_BOUND = 0
  HI_BOUND = 1

  # Cache static Math functions
  MIN = Math.min
  MAX = Math.max

  # returns whether domain covers given value

  domain_contains_value = (domain, value) ->
    return (domain_range_index_of domain, value) > -1

  # return the range index in given domain that covers given
  # value, or if the domain does not cover it at all

  domain_range_index_of = (domain, value) ->
    for [lo, hi], index in domain
      if value >= lo and value <= hi
        return index
    return -1

  domain_collapsed_value = (domain) ->
    if domain.length > 0
      [lo, hi] = domain[FIRST_RANGE]
      if hi is lo
        return lo
    return undefined

  # list of possible values to domain

  domain_from_list = (list, clone = true, sort = true) ->
    if clone
      list = list.slice 0 # TBD: this was broken. do we need it?
    if sort # note: the list must be sorted for the algorithm below to work...
      list.sort (a,b) ->
        a - b # this is the default so dont supply sorter?

    domain = []
    len = list.length
    index = 0
    while index < len
      lo = list[index++]
      ASSERT typeof lo is 'number', 'nan?'
      # TODO: replace above assert with 0..SUP below after confirming that range
#      ASSERT lo >= 0, 'input should be positive numbers'
#      ASSERT lo <= SUP, 'input should be below SUP'
      hi = lo
      while index < len and list[index] <= hi+1
        hi = list[index++]
        ASSERT typeof lo is 'number', 'nan?'
      # TODO: replace above assert with 0..SUP below after confirming that range
#        ASSERT hi >= 0, 'input should be positive numbers'
#        ASSERT hi <= SUP, 'input should be below SUP'
      domain.push [lo, hi]
    return domain

  # domain to list of possible values

  domain_to_list = (domain) ->
    list = []
    for [lo, hi] in domain
      for val in [lo..hi]
        list.push val
    return list

  # Given a list and domain, search items in the list in the domain and remove
  # the first element found this way, then return a deep clone of that result
  # Given domain is not harmed in this process.
  # If no items from list can be found, this function returns the empty domain.

  domain_remove_next_from_list = (domain, list) ->
    for value in list
      index = domain_range_index_of domain, value
      if index > -1
        return deep_clone_without_value domain, value, index
    return [] # kinda weird to return an empty domain if value cant be found. should we trigger an explicit error?

  # Search for value in domain. If it exists, remove it and return
  # a deep clone of the result. Otherwise return an empty domain.

  domain_remove_value = (domain, value) ->
    index = domain_range_index_of domain, value
    if index > -1
      return deep_clone_without_value domain, value, index
    return [] # kinda weird to return an empty domain if value cant be found

  # Remove given value from given domain and return result as a deep cloned domain
  # Doing both at once because it is simply more efficient this way

  deep_clone_without_value = (domain, value, range_index) ->
    d = []
    for [lo, hi], i in domain
      if i isnt range_index
        d.push [lo, hi]
      else
        if lo isnt value
          d.push [lo, value-1]
        if hi isnt value
          d.push [value+1, hi]
    return d

  domain_equal_next_from_list = (domain, list) ->
    for value in list
      if domain_contains_value domain, value
        return [[value, value]]
    return []

  # Add all values covered by domain to `list` that aren't already in `list`

  domain_complete_list = (domain, list) ->
    for [lo, hi] in domain
      for i in [lo..hi]
        if (list.indexOf i) is -1
          list.push i
    return list

  # The complement of a domain is such that domain U domain' = [[0, SUP]].
  # Assumes domain is in CSIS form
  # Returns a domain that covers any range in (0...SUP) that was not covered by given domain

  domain_complement = (domain) ->
    unless domain.length
      return [[0, SUP]]

    end = 0
    result = []
    for [lo, hi] in domain # lo = d[i][LO_BOUND], hi = d[i][HI_BOUND]
      ASSERT !end or end < lo, 'domain is supposed to be csis, so ranges dont overlap nor touch'
      if lo > 0 # prevent [0,0] if first range starts at 0; that'd be bad
        result.push [end, lo - 1]
      end = hi + 1

    if end <= SUP # <= so SUP is inclusive...
      result.push [end, SUP]

    return result

  # All ranges will be ordered ascending and overlapping ranges are merged
  # This function first checks whether simplification is needed at all
  # If replace_inline is NOT_INLINE the input domain is deeply cloned first, regardless

  domain_simplify = (domain, replace_inline=NOT_INLINE, x) ->
    ASSERT domain?, 'domain is mandatory'

    # deep clone if not inline because ranges are adjusted inline when merging
    # we could interweave this step with merge_overlapping_inline, not sure if it changes much
    if replace_inline is NOT_INLINE
      domain = domain_deep_clone domain

    if domain.length == 0
      return domain

    # TODO: perf check; before there was a large memory overhead but i think that's taken care of now. the extra check-loop may not be worth it
    if is_simplified domain
      return domain

    return domain_simplify_inline domain

  # Given a set of ranges (domain) turns them into CSIS form
  # This function sorts and loops unconditionally

  domain_simplify_inline = (domain) ->
    # order ranges by lower bound, ascending (inline regardless)
    domain.sort range_sorter_asc

    return merge_overlapping_inline domain

  domain_deep_clone = (domain) ->
    # could just be `for r in domain\n  r.slice 0` but this is better
    d = Array domain.length
    for i in [0...domain.length]
      d[i] = domain[i].slice 0
    return d

  range_sorter_asc = (range1, range2) ->
    return range1[LO_BOUND] - range2[LO_BOUND]

  # Check if given domain is in simplified, CSIS form

  is_simplified = (domain) ->
    if domain.length <= 1
      if domain.length is 1
        ASSERT !!domain[FIRST_RANGE], 'domains should not be sparse'
        ASSERT domain[FIRST_RANGE].length is 2, 'ranges should have len=2, this had len='+domain[FIRST_RANGE].length
      return true
    first_range = domain[FIRST_RANGE]
    ASSERT !!first_range, 'domains should not be sparse'
    ASSERT first_range.length is 2, 'ranges should have len=2, this had len='+first_range.length
    prevHi = first_range[HI_BOUND]
    ASSERT first_range[LO_BOUND] <= prevHi, 'domain should have properly ordered ranges, this range is inverted ['+first_range+'], '+first_range[LO_BOUND]+' <= '+prevHi+' '+JSON.stringify(domain)
    for i in [1...domain.length]
      ASSERT !!domain[i], 'domains should not be sparse, i='+i+', len='+domain.length
      ASSERT domain[i].length is 2, 'ranges should have len=2, this had len='+domain[i].length
      [currLo, currHi] = domain[i]
      ASSERT currLo <= currHi, 'Assertion fail: domain should have properly ordered ranges, this range is inverted ['+currLo+', '+currHi+']'
      # if the current range is below/inside the previous range we'll need to process the domains
      # TODO: i think it used or intended to optimize this by continueing to process this from the current domain, rather than the start.
      #       this function could return the offset to continue at... or -1 to signal "true"
      if currLo <= prevHi
        return false
      prevHi = currHi
    return true

  merge_overlapping_inline = (domain) ->
    # assumes domain is sorted
    # assumes all ranges are "sound" (lo<=hi)
    prev_range = undefined
    index = 0
    for curr_range in domain
      ASSERT !!curr_range, 'domain should not be sparse'
      ASSERT curr_range[LO_BOUND] <= curr_range[HI_BOUND], 'range should be sound'
      # in an ordered domain two consecutive ranges touch or overlap if the left-hi+1 is higher or equal to the right-lo
      if prev_range and prev_range[HI_BOUND]+1 >= curr_range[LO_BOUND]
        # touching or overlapping.
        # note: prev and curr may completely enclose one another
        # Update the prev hi so prev covers both ranges, in any case
        if curr_range[HI_BOUND] > prev_range[HI_BOUND]
          prev_range[HI_BOUND] = curr_range[HI_BOUND]
          # Drop the current range array (by not adding it back to the result)
      else
        domain[index++] = curr_range
        prev_range = curr_range
    domain.length = index # if `domain` was a larger at the start this ensures extra elements are dropped from it
    for test in domain
      ASSERT !!test, 'merge should not result in sparse array'
    return domain

  # CSIS form = Canonical Sorted Interval Sequeunce form.
  #
  # Intersection of two domains given in CSIS form.
  # r is optional and if given it should be an array and
  # the domain pieces will be inserted into it, in which case
  # the result domain will be returned unsimplified.

  domain_intersection = (dom1, dom2, r) ->
    i = undefined
    j = undefined
    len1 = undefined
    len2 = undefined
    b1 = undefined
    b2 = undefined
    d1 = undefined
    d2 = undefined
    d3 = undefined
    d4 = undefined
    d = undefined
    mx = undefined
    mn = undefined
    if dom1.length == 0 or dom2.length == 0
      return r or []
    if dom1.length == 1
      if dom2.length == 1
        b1 = dom1[0]
        b2 = dom2[0]
        mn = if b1[0] > b2[0] then b1[0] else b2[0]
        mx = if b1[1] < b2[1] then b1[1] else b2[1]
        r = r or []
        if mx >= mn
          r.push [
            mn
            mx
          ]
        r
      else
        domain_intersection dom2, dom1, r
    else
      if dom2.length == 1
        mn = dom2[0][0]
        mx = dom2[0][1]
        r = r or []
        i = 0
        len1 = dom1.length
        while i < len1
          d = dom1[i]
          if d[0] <= mx and d[1] >= mn
            r.push [
              if mn > d[0] then mn else d[0]
              if mx < d[1] then mx else d[1]
            ]
          ++i
        r
      else
        # Worst case. Both lengths are > 1. Divide and conquer.
        i = dom1.length >> 1
        j = dom2.length >> 1
        d1 = dom1.slice(0, i)
        d2 = dom1.slice(i)
        d3 = dom2.slice(0, j)
        d4 = dom2.slice(j)
        d = domain_intersection(d1, d3, r)
        d = domain_intersection(d1, d4, d)
        d = domain_intersection(d2, d3, d)
        d = domain_intersection(d2, d4, d)
        if r then d else domain_simplify d

  # Intersection of two domains given in CSIS form.
  # Returns a new domain that covers only those elements covered by both input domains
  # Assumes input domains are in CSIS form
  # TODO: work this to something usable. the csis input assumption does not hold yet so we cant use this yet.

  domain_intersection_csis = (dom1, dom2) ->
    left_len = dom1.length
    right_len = dom2.length
    if left_len is 0 or right_len is 0
      return []
    output = []
    ASSERT !!dom1[FIRST_RANGE], 'no holes A'
    ASSERT !!dom2[FIRST_RANGE], 'no holes B'
    [left_lo, left_hi] = dom1[FIRST_RANGE]
    [right_lo, right_hi] = dom2[FIRST_RANGE]
    # basically progress left or right, whichever has lowest LO bound, then intersect them
    # this way we progress through both domains side by side in linear time
    left_index = 1
    right_index = 1
    while true
      ASSERT left_lo >=0 and left_hi >=0 and right_lo >=0 and right_hi >=0, 'ranges should be sound (loop, '+left_index+' '+right_index+') '+JSON.stringify(dom1)+' '+JSON.stringify(dom2)
      intersect_one output, left_lo, left_hi, right_lo, right_hi

      # note: there could be a problem with multiple consecutive ranges with same offsets
      # on both sides, but input domains are supposed to be csis so this cant be an issue
      if left_hi < right_hi
        if left_index >= left_len
          break
        ASSERT dom1[left_index][LO_BOUND] > left_hi+1, 'should be csis so consecutive ranges should not overlap or even touch'
        [left_lo, left_hi] = dom1[left_index++]
        ASSERT left_lo >=0 and left_hi >=0, 'ranges should be sound (Aloop)'
      else
        if right_index >= right_len
          break
        ASSERT dom2[right_index][LO_BOUND] > right_hi+1, 'should be csis so consecutive ranges should not overlap or even touch'
        [right_lo, right_hi] = dom2[right_index++]
        ASSERT right_lo >=0 and right_hi >=0, 'ranges should be sound (Bloop)'
    return output

  # Normalize input. Makes sure range 1 starts before or at range 2

  intersect_one = (output, lo1, hi1, lo2, hi2) ->
    #    if lo1 > hi1 # swap dom1 lo hi
    #      return intersect_one output, hi1, lo1, lo2, hi2
    #    if lo2 > hi2 # swap dom2 lo hi
    #      return intersect_one output, lo1, hi1, hi2, lo2
    if lo2 < lo1 # swap dom1 dom2
      return intersect_one_ordered output, lo2, hi2, lo1, hi1

    intersect_one_ordered output, lo1, hi1, lo2, hi2
    return output

  # Intersection of two sets is a set containing any element that was part of both input sets
  # If the two given ranges touch or overlap, push a range with a (partial) range that's covered by both
  # Assumes both ranges are sound (lo<=hi) and range 1 to start before or on range 2

  intersect_one_ordered = (output, lo1, hi1, lo2, hi2) ->
    ASSERT lo1 <= hi1, 'expecting all ranges to be sound A ['+lo1+','+hi1+']'
    ASSERT lo2 <= hi2, 'expecting all ranges to be sound B ['+lo2+','+hi2+']'
    ASSERT lo1 <= lo2, 'expecting range 2 to start before range 1' # at this point, see intersect_one

    # +1 because touching ranges should also be merged
    if hi1+1 > lo2
      ASSERT (MAX lo1, lo2) <= (MIN hi1, hi2), 'should result in sound range ['+[lo1,hi1,lo2,hi2]+']'
      output.push [
        MAX lo1, lo2
        MIN hi1, hi2
      ]

  # deep comparison of two domains

  domain_equal = (d1, d2) ->
    len1 = d1.length

    if len1 != d2.length
      return false

    if d1 is d2 # does this ever happen?
      return true

    for i in [0...len1]
      if d1[i][LO_BOUND] != d2[i][LO_BOUND] or d1[i][HI_BOUND] != d2[i][HI_BOUND]
        return false

    return true

  # Closes all the gaps between the intervals according to
  # the given gap value. All gaps less than this gap are closed.

  domain_close_gaps_fresh = (d, gap) ->
    if d.length == 0
      return d
    result = []
    i = undefined
    len = undefined
    prev = undefined
    next = undefined
    result.push prev = [
      d[0][0]
      d[0][1]
    ]
    i = 1
    len = d.length
    while i < len
      next = [
        d[i][0]
        d[i][1]
      ]
      if next[0] - (prev[1]) < gap
        prev[1] = next[1]
      else
        result.push prev = next
      ++i
    result

  dom_smallest_interval_width = (d) ->
    Math.min.apply null, d.map((i) ->
      i[1] - (i[0]) + 1
    )

  dom_largest_interval_width = (d) ->
    Math.max.apply null, d.map((i) ->
      i[1] - (i[0]) + 1
    )

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

  dom_close_gaps2 = (d1, d2) ->
    d = undefined
    change = undefined
    loop
      change = 0
      d = domain_close_gaps_fresh(d1, dom_smallest_interval_width(d2))
      change += d1.length - (d.length)
      d1 = d
      d = domain_close_gaps_fresh(d2, dom_smallest_interval_width(d1))
      change += d2.length - (d.length)
      d2 = d
      unless change > 0
        break
    [
      d1
      d2
    ]

  domain_plus = (domain1, domain2) ->
    # Simplify the domains by closing gaps since when we add
    # the domains, the gaps will close according to the
    # smallest interval width in the other domain.
    [domain1, domain2] = dom_close_gaps2 domain1, domain2

    p = []
    for [loi, hii] in domain1
      for [loj, hij] in domain2
        p.push [
          MIN SUP, loi + loj
          MIN SUP, hii + hij
        ]
    return domain_simplify p, INLINE

  # Note that this one isn't domain consistent.

  domain_times = (domain1, domain2) ->
    p = []
    for [loi, hii] in domain1
      for [loj, hij] in domain2
        p.push [
          MIN SUP, loi * loj
          MIN SUP, hii * hij
        ]
    return domain_simplify p, INLINE

  domain_minus = (domain1, domain2) ->
    # Simplify the domains by closing gaps since when we add
    # the domains, the gaps will close according to the
    # smallest interval width in the other domain.
    [domain1, domain2] = dom_close_gaps2 domain1, domain2

    p = []
    for [loi, hii] in domain1
      for [loj, hij] in domain2
        lo = loi - hij
        hi = hii - loj
        if hi >= 0
          p.push [
            MAX 0, lo
            hi
          ]
    return domain_simplify p, INLINE

  # Note that this isn't domain consistent.

  domain_divby = (domain1, domain2) ->
    p = []
    for [loi, hii] in domain1
      for [loj, hij] in domain2
        ASSERT hij > 0, 'expecting no empty or inverted ranges'
        lo = loi / hij
        hi = if loj > 0 then hii / loj else SUP
        if hi >= 0
          p.push [
            MAX 0, lo
            hi
          ]
    return domain_simplify p, INLINE

  # This is an optimization for adding and subtracting domains from one another.
  # When adding one domain to another, the result is the the result of the
  # addition of every element in one domain to every element in the other domain.
  # In effect, this means every range one domain covers will cover least as
  # much more as the smallest domain in the other. To prevent a combinatorial
  # explosion we'll pre-emptively try to merge those ranges that will overlap
  # after the addition, anyways. This way we're left with fewer ranges and the
  # addition or subtraction step should be smaller.
  # TODO: originally it was doing this for addition AND subtraction, but does the case even hold for subtraction?

  domain_close_gaps_inline = (domain1, domain2) ->
    if domain1.length is 0 or domain2.length is 0
      return

    domain_close_gaps_r domain1, domain2, (domain_min_range_len domain2), PREV_CHANGED

    domain_prune_holes_inline domain1
    ASSERT (is_simplified domain1), 'should leave domain1 in csis form: '+JSON.stringify(domain1)
    domain_prune_holes_inline domain2
    ASSERT (is_simplified domain2), 'should leave domain2 in csis form: '+JSON.stringify(domain2)

    return undefined

  # This is the actual recursive function
  # Changes domains inline!
  # Requires domains with at least one range (domain_close_gaps_inline should filter empty domains)
  # Given a range, closes all gaps in domain_now that are equal or smaller than range.
  # At the same time collects the minimal size of the resulting domain and recurses to
  # the other domain to do the same thing. Stops when min size no longer changes for both.
  # (Closing the gap and getting the new gap size is an optimization, split is slower)
  # @see domain_close_gaps_inline
  # @private

  domain_close_gaps_r = (curr_domain, prev_domain, prev_min_range, prev_changed) ->
    ASSERT prev_min_range >= 0, 'negative gaps dont make sense'
    ASSERT curr_domain.length > 0, 'this function should only remove a range because another takes its place'
    curr_min_range = SUP
    curr_changed = false
    prev_range = undefined
    for curr_range, index in curr_domain
      # note: curr_range may be null. ignore holes, we clean them up at the end
      if !prev_range and curr_range # initially; search for the first non-zero range
        prev_range = curr_range
      else if curr_range
        # keep comparing the last range to the current range

        if curr_range[LO_BOUND] - prev_range[HI_BOUND] <= prev_min_range
          prev_range[HI_BOUND] = curr_range[HI_BOUND]
          curr_domain[index] = undefined # delete index later
          curr_changed = true

        else
          ASSERT curr_range[LO_BOUND] - prev_range[HI_BOUND] > 1, 'since input domains are CSIS and min_range is always >=1, we should not leave back-to-back ranges: '+prev_range[HI_BOUND]+' -> '+curr_range[LO_BOUND]

          # get len of new range so we can feed it recursively for the other domain
          n = range_len prev_range
          if n < curr_min_range
            curr_min_range = n

          prev_range = curr_range

    # also consider last range for new min range
    ASSERT !!prev_range, 'should always have at least one range left in either domain'
    n = range_len prev_range
    ASSERT n > 1, 'no reason this could be negative'
    if n < curr_min_range
      curr_min_range = n

    # TODO: i'm not sure whether we actually need to call it recursively. what's a case where the result is not final?
    if curr_changed or prev_changed
      # as long as we closed a gap now, or in the call before; continue closing gaps
      # note that we're swapping dx and dy now because minRangeX is for dx, and we must close those gaps in dy now
      # let's hope this doesnt crash the call stack... :) (shouldnt with tail calls optim)
      return domain_close_gaps_r prev_domain, curr_domain, curr_min_range, curr_changed

  # How many elements does this range span. Assumes lo<=hi. Each range covers at least 1 element.

  range_len = (range) ->
    return 1 + range[HI_BOUND] - range[LO_BOUND]

  # Assumes domain is in CSIS

  domain_min_range_len = (domain) ->
    minlen = SUP
    for range in domain
      len = range_len range
      if len < minlen
        minlen = len
    return minlen

  # Return the number of elements this domain covers

  domain_size = (domain) ->
    count = 0
    for [lo, hi] in domain
      count += hi - lo + 1
    return count

  # Assumes domain is in CSIS except it may have empty places (since that's precisely what's being eliminated)
  # After removing the holes the arrays should be CSIS without further processing
  # Adjusts domain inline

  domain_prune_holes_inline = (domain) ->
    index = 0
    for range in domain
      if range
        domain[index++] = range
    domain.length = index
    return undefined

  # Get the middle element of all elements in domain. Not hi-lo/2.

  domain_middle_element = (domain) ->
    size = domain_size domain
    target_value = Math.floor size / 2
    index = 0
    [lo, hi] = domain[index]
    # TODO: By right, we should do a binary search here
    # instead of a linear search. Yes, I'm lazy :P (Kumar)
    while target_value > hi - lo
      target_value -= hi - lo + 1
      index++
      [lo, hi] = domain[index]
    return lo + target_value


  FD.Domain = {
    INLINE
    NOT_INLINE
    PREV_CHANGED

    domain_collapsed_value
    domain_complete_list
    domain_contains_value
    domain_equal_next_from_list
    domain_from_list
    domain_middle_element
    domain_range_index_of
    domain_remove_value
    domain_remove_next_from_list
    domain_to_list
    domain_size

    domain_simplify
    domain_complement
    domain_intersection
    domain_intersection_csis
    domain_equal
    domain_plus
    domain_times
    domain_minus
    domain_divby

    # testing only:
    _domain_close_gaps_inline: domain_close_gaps_fresh
    _intersect_one: intersect_one
    _is_simplified: is_simplified
    _merge_overlapping_inline: merge_overlapping_inline
    _range_sorter_asc: range_sorter_asc
  }
