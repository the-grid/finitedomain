# Value Distributions
# ======================================================================

module.exports = do ->

  {
    ASSERT
    THROW
  } = require '../helpers'

  {
    domain_contains_value
    domain_create_value
    domain_create_range
    domain_intersection
    domain_max
    domain_min
    domain_remove_next_from_list
    domain_get_value_of_first_contained_value_in_list
  } = require '../domain'

  {
    distribution_markov_sampleNextFromDomain
  } = require './markov'

  {
    markov_create_legend
    markov_create_prob_vector
  } = require '../markov'

  {
    fdvar_is_rejected
    fdvar_is_solved
    fdvar_is_undetermined
    fdvar_lower_bound
    fdvar_middle_element
    fdvar_upper_bound
  } = require '../fdvar'

  # BODY_START

  FIRST_CHOICE = 0
  SECOND_CHOICE = 1

  MATH_RANDOM = Math.random

  # The functions in this file are supposed to determine the next
  # value while solving a Space. The functions are supposed to
  # return the new domain for some given fdvar. If there's no new
  # choice left it should return undefined to signify the end.

  distribute_get_next_domain_for_var = (root_space, space, fdvar) ->
    if fdvar_is_solved fdvar
      # TOFIX: prevent this case at call sites (var picker)... there is no need for it here
      return # this var is solved but apparently that did not suffice. continue with next var

    choice_index = space.next_distribution_choice++
    config_next_value_func = root_space.config_next_value_func
    var_name = fdvar.id

    ASSERT !fdvar_is_rejected(fdvar), 'fdvar should not be rejected', var_name, fdvar.dom, fdvar

    # each var can override the value distributor
    config_var_dist_options = root_space.config_var_dist_options
    value_distributor_name = config_var_dist_options[var_name]?.distributor_name
    if value_distributor_name
      config_next_value_func = value_distributor_name

    if typeof config_next_value_func is 'function'
      return config_next_value_func

    return _distribute_get_next_domain_for_var config_next_value_func, space, root_space, fdvar, choice_index

  _distribute_get_next_domain_for_var = (value_func_name, space, root_space, fdvar, choice_index) ->
    switch value_func_name
      when 'max'
        return distribution_value_by_max fdvar, choice_index
      when 'markov'
        return distribution_value_by_markov space, fdvar, choice_index
      when 'mid'
        return distribution_value_by_mid fdvar, choice_index
      when 'min'
        return distribution_value_by_min fdvar, choice_index
      when 'minMaxCycle'
        return distribution_value_by_min_max_cycle space, fdvar, choice_index
      when 'list'
        return distribution_value_by_list root_space, space, fdvar, choice_index
      when 'naive'
        return domain_create_value fdvar_min fdvar
      when 'splitMax'
        return distribution_value_by_split_max fdvar, choice_index
      when 'splitMin'
        return distribution_value_by_split_min fdvar, choice_index
      when 'throw'
        ASSERT false, 'not expecting to pick this distributor'

    THROW 'unknown next var func', config_next_value_func
    return

  # Attempt to solve by setting fdvar to values in the order
  # given as a list. This may also be a function which should
  # return a new domain given the space, fdvar, and choice index.
  #
  # @param {Space} root_space
  # @param {Space} space
  # @param {Fdvar} fdvar
  # @param {number} choice_index
  # @returns {number[]} The new domain for this fdvar in the next space

  distribution_value_by_list = (root_space, space, fdvar, choice_index) ->
    ASSERT typeof choice_index is 'number', 'choice_index should be a number'
    ASSERT fdvar_is_undetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar

    config_var_dist_options = root_space.config_var_dist_options
    ASSERT config_var_dist_options, 'space should have config_var_dist_options'
    ASSERT config_var_dist_options[fdvar.id], 'there should be distribution options available for every var', fdvar
    ASSERT config_var_dist_options[fdvar.id].list, 'there should be a distribution list available for every var', fdvar
    list_source = config_var_dist_options[fdvar.id].list

    if typeof list_source is 'function'
      # Note: callback should return the actual list
      list = list_source space, fdvar.id, choice_index
    else
      list = list_source

    switch choice_index

      when FIRST_CHOICE
        return domain_create_value domain_get_value_of_first_contained_value_in_list fdvar.dom, list

      when SECOND_CHOICE
        return domain_remove_next_from_list fdvar.dom, list

    ASSERT typeof choice_index is 'number', 'should be a number'
    ASSERT choice_index is 2, 'should not keep calling this func after the last choice'
    return undefined # no choice

  # Searches through a var's values from min to max.
  # For each value in the domain it first attempts just
  # that value, then attempts the domain without this value.
  #
  # @param {Fdvar} fdvar
  # @param {number} choice_index
  # @returns {number[]} The new domain this fdvar should get in the next space

  distribution_value_by_min = (fdvar, choice_index) ->
    ASSERT typeof choice_index is 'number', 'choice_index should be a number'
    ASSERT fdvar_is_undetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar

    switch choice_index

      when FIRST_CHOICE
        return domain_create_value fdvar_lower_bound fdvar

      when SECOND_CHOICE
        # Cannot lead to empty domain because lo can only be SUP if
        # domain was solved and we assert it wasn't.
        # note: must use some kind of intersect here (there's a test if you mess this up :)
        # TOFIX: improve performance, this can be done more efficiently directly
        return domain_intersection fdvar.dom, domain_create_range fdvar_lower_bound(fdvar) + 1, fdvar_upper_bound(fdvar)

    ASSERT typeof choice_index is 'number', 'should be a number'
    ASSERT choice_index is 2, 'should not keep calling this func after the last choice'
    return undefined # no choice

  # Searches through a var's values from max to min.
  # For each value in the domain it first attempts just
  # that value, then attempts the domain without this value.
  #
  # @param {Fdvar} fdvar
  # @param {number} choice_index
  # @returns {number[]} The new domain this fdvar should get in the next space

  distribution_value_by_max = (fdvar, choice_index) ->
    ASSERT typeof choice_index is 'number', 'choice_index should be a number'
    ASSERT fdvar_is_undetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar

    switch choice_index

      when FIRST_CHOICE
        return domain_create_value fdvar_upper_bound fdvar

      when SECOND_CHOICE
        # Cannot lead to empty domain because hi can only be SUB if
        # domain was solved and we assert it wasn't.
        # note: must use some kind of intersect here (there's a test if you mess this up :)
        # TOFIX: improve performance, this can be done more efficiently directly
        return domain_intersection fdvar.dom, domain_create_range fdvar_lower_bound(fdvar), fdvar_upper_bound(fdvar) - 1,

    ASSERT typeof choice_index is 'number', 'should be a number'
    ASSERT choice_index is 2, 'should not keep calling this func after the last choice'
    return undefined # no choice

  # Searches through a var's values by taking the middle value.
  # This version targets the value closest to `(max-min)/2`
  # For each value in the domain it first attempts just
  # that value, then attempts the domain without this value.
  #
  # @param {Fdvar} fdvar
  # @param {number} choice_index
  # @returns {number[]} The new domain this fdvar should get in the next space

  distribution_value_by_mid = (fdvar, choice_index) ->
    ASSERT typeof choice_index is 'number', 'choice_index should be a number'
    ASSERT fdvar_is_undetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar

    middle = fdvar_middle_element fdvar

    switch choice_index

      when FIRST_CHOICE
        return domain_create_value middle

      when SECOND_CHOICE
        lo = fdvar_lower_bound fdvar
        hi = fdvar_upper_bound fdvar
        arr = []
        if middle > lo
          arr.push lo, middle - 1
        if middle < hi
          arr.push middle + 1, hi

        # Note: fdvar is not determined so the operation cannot fail
        # note: must use some kind of intersect here (there's a test if you mess this up :)
        # TOFIX: improve performance, this cant fail so constrain is not needed (but you must intersect!)
        return domain_intersection fdvar.dom, arr

    ASSERT typeof choice_index is 'number', 'should be a number'
    ASSERT choice_index is 2, 'should not keep calling this func after the last choice'
    return undefined # no choice

  # Search a domain by splitting it up through the (max-min)/2 middle.
  # First simply tries the lower half, then tries the upper half.
  #
  # @param {Fdvar} fdvar
  # @param {number} choice_index
  # @returns {number[]} The new domain this fdvar should get in the next space

  distribution_value_by_split_min = (fdvar, choice_index) ->
    ASSERT typeof choice_index is 'number', 'choice_index should be a number'
    ASSERT fdvar_is_undetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar

    domain = fdvar.dom
    min = domain_min domain
    max = domain_max domain
    mmhalf = min + max >> 1

    switch choice_index

      when FIRST_CHOICE
        # Note: fdvar is not determined so the operation cannot fail
        # Note: this must do some form of intersect, though maybe not constrain
        # TOFIX: can do this more optimal if coding it out explicitly
        return domain_intersection fdvar.dom, domain_create_range min, mmhalf

      when SECOND_CHOICE
        # Note: fdvar is not determined so the operation cannot fail
        # Note: this must do some form of intersect, though maybe not constrain
        # TOFIX: can do this more optimal if coding it out explicitly
        return domain_intersection fdvar.dom, domain_create_range mmhalf + 1, max

    ASSERT typeof choice_index is 'number', 'should be a number'
    ASSERT choice_index is 2, 'should not keep calling this func after the last choice', choice_index, fdvar
    return undefined # no choice

  # Search a domain by splitting it up through the (max-min)/2 middle.
  # First simply tries the upper half, then tries the lower half.
  #
  # @param {Fdvar} fdvar
  # @param {number} choice_index
  # @returns {number[]} The new domain this fdvar should get in the next space

  distribution_value_by_split_max = (fdvar, choice_index) ->
    ASSERT typeof choice_index is 'number', 'choice_index should be a number'
    ASSERT fdvar_is_undetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar

    domain = fdvar.dom
    min = domain_min domain
    max = domain_max domain
    mmhalf = min + max >> 1

    switch choice_index

      when FIRST_CHOICE
      # Note: fdvar is not determined so the operation cannot fail
      # Note: this must do some form of intersect, though maybe not constrain
      # TOFIX: can do this more optimal if coding it out explicitly
        return domain_intersection fdvar.dom, domain_create_range mmhalf + 1, max

      when SECOND_CHOICE
      # Note: fdvar is not determined so the operation cannot fail
      # Note: this must do some form of intersect, though maybe not constrain
      # TOFIX: can do this more optimal if coding it out explicitly
        return domain_intersection fdvar.dom, domain_create_range min, mmhalf

    ASSERT typeof choice_index is 'number', 'should be a number'
    ASSERT choice_index is 2, 'should not keep calling this func after the last choice'
    return undefined # no choice

  # Applies distribution_value_by_min and distribution_value_by_max alternatingly
  # depending on the position of the given var in the list of vars.
  #
  # @param {Space} space
  # @param {Fdvar} fdvar
  # @param {number} choice_index
  # @returns {number[]} The new domain this fdvar should get in the next space

  distribution_value_by_min_max_cycle = (space, fdvar, choice_index) ->
    root_space = space.get_root()
    if _is_even root_space.all_var_names.indexOf fdvar.id
      return distribution_value_by_min fdvar, choice_index
    else
      return distribution_value_by_max fdvar, choice_index

  _is_even = (n) ->
    return n % 2 is 0

  # Search a domain by applying a markov chain to determine an optimal value
  # checking path.
  #
  # @param {Space} space
  # @param {Fdvar} fdvar
  # @param {number} choice_index
  # @returns {number[]} The new domain this fdvar should get in the next space

  distribution_value_by_markov = (space, fdvar, choice_index) ->
    ASSERT typeof choice_index is 'number', 'choice_index should be a number'
    ASSERT fdvar_is_undetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar

    switch choice_index

      when FIRST_CHOICE
        # THIS IS AN EXPENSIVE STEP!

        root_space = space.get_root()
        domain = fdvar.dom
        var_name = fdvar.id

        config_var_dist_options = root_space.config_var_dist_options
        ASSERT config_var_dist_options, 'space should have config_var_dist_options'
        distribution_options = config_var_dist_options[var_name]
        ASSERT distribution_options, 'markov vars should have  distribution options', JSON.stringify fdvar
        expand_vectors_with = distribution_options.expandVectorsWith
        ASSERT distribution_options.matrix, 'there should be a matrix available for every var', distribution_options.matrix or JSON.stringify(fdvar), distribution_options.matrix or JSON.stringify config_var_dist_options[var_name]
        ASSERT distribution_options.legend or expand_vectors_with?, 'every var should have a legend or expand_vectors_with set', distribution_options.legend or expand_vectors_with? or JSON.stringify(fdvar), distribution_options.legend or expand_vectors_with? or JSON.stringify distribution_options

        random = distribution_options.random or MATH_RANDOM

        # note: expand_vectors_with can be 0, so check with ?
        values = markov_create_legend expand_vectors_with?, distribution_options.legend, domain
        value_count = values.length
        unless value_count
          return # no choice left

        probabilities = markov_create_prob_vector space, distribution_options.matrix, expand_vectors_with, value_count
        value = distribution_markov_sampleNextFromDomain domain, probabilities, values, random
        unless value?
          return # signifies end of search

        ASSERT domain_contains_value(domain, value), 'markov picks a value from the existing domain so no need for a constrain below'
        space._markov_last_value = value

        return domain_create_value value

      when SECOND_CHOICE
        ASSERT space._markov_last_value?, 'should have cached previous value'
        last_value = space._markov_last_value
        lo = fdvar_lower_bound fdvar
        hi = fdvar_upper_bound fdvar
        arr = []
        if last_value > lo
          arr.push lo, last_value - 1
        if last_value < hi
          arr.push last_value + 1, hi

        # Note: fdvar is not determined so the operation cannot fail
        # note: must use some kind of intersect here (there's a test if you mess this up :)
        # TOFIX: improve performance, needs domain_remove but _not_ the inline version because that's sub-optimal
        domain = domain_intersection fdvar.dom, arr
        if domain.length
          return domain

    ASSERT typeof choice_index is 'number', 'should be a number'
    ASSERT choice_index is 1 or choice_index is 2, 'should not keep calling this func after the last choice'
    return undefined # no choice

  # BODY_STOP

  return {
    FIRST_CHOICE
    SECOND_CHOICE

    distribute_get_next_domain_for_var

    # __REMOVE_BELOW_FOR_DIST__
    # for testing:
    _distribution_value_by_list: distribution_value_by_list
    _distribution_value_by_markov: distribution_value_by_markov
    _distribution_value_by_max: distribution_value_by_max
    _distribution_value_by_mid: distribution_value_by_mid
    _distribution_value_by_min: distribution_value_by_min
    _distribution_value_by_min_max_cycle: distribution_value_by_min_max_cycle
    _distribution_value_by_split_max: distribution_value_by_split_max
    _distribution_value_by_split_min: distribution_value_by_split_min
    _distribute_get_next_domain_for_var
    # __REMOVE_ABOVE_FOR_DIST__
  }
