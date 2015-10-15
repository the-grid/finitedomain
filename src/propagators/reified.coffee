module.exports = (FD) ->
  {
    REJECTED
  } = FD.helpers

  {
    domain_create_value
  } = FD.Domain

  {
    propagator_create
    propagator_create_3x
    propagator_is_solved
  } = FD.Propagator

  {
    fdvar_constrain
  } = FD.Var

  FIRST_RANGE = 0

  prop_stepper_or_constrain = (bool_var, pos_or_neg_propagator, c) ->
    # Check if given propagator holds. If not, update the bool domain
    # to reflect it must now hold for that propagator and reject when
    # that's no longer the case. `c` is either 0 or 1 to reflect this.

    # The reified fdvar doesn't decide the condition, so
    # we now need to check whether the conditions constrain
    # the reified fdvar.
    push_vars pos_or_neg_propagator

    if pos_or_neg_propagator.stepper() is REJECTED
      # this search must now pass the other operator until the
      # search goes back up the current step in search tree
      change = fdvar_constrain bool_var, domain_create_value(c)

      # TODO: change this to an ASSERT?
      _throw_if_true bool_var.length is 0

    pop_vars pos_or_neg_propagator
    return

  # throw is abstracted to prevent deopt

  _throw_if_true = (v) ->
    # note: it may (only) fail here if the var was passed on
    # externally and updated to values without 0 or 1
    if v
      throw new Error 'did not expect constrain to fail here'

  # Represent a comparison operator over two given variables.
  # Each step call checks whether the constraint still holds or updates
  # the boolean domain to reflect the change. The boolean can be
  # given explicitly to use as part of a different constraint.

  # The `positive_propagator` applies the comparison operator a@b
  # that we want to check. The `negative_propagator` is its opposite.
  #

  propagator_create_reified = (space, left_var_name, right_var_name, bool_name, positive_propagator, negative_propagator, _opname) ->
    create_reified_prop = ->
      [S, v1, v2, bool_var] = @propdata
      current_upid = v1.vupid + v2.vupid + bool_var.vupid
      last_upid = @last_upid
      if current_upid <= last_upid
        return 0

      unless @pos_propagator
        # S is only needed to get the S.vars... which I think are static throughout a Space, so perhaps we can just re-use the deps instead?
        @pos_propagator = propagator_create S, positive_propagator.target_var_names, positive_propagator.stepper, 'reipos'
        @neg_propagator = propagator_create S, negative_propagator.target_var_names, negative_propagator.stepper, 'reineg'
      pos_propagator = @pos_propagator
      neg_propagator = @neg_propagator

      [lo, hi] = bool_var.dom
      while lo < hi and current_upid > last_upid
        # The boolean represents the relation of the two vars to an op
        # For example; v1 < v2. At first the bool starts with [0,1], meaning
        # that it could be either way. While searching this state may change
        # to reflect the relation does or doesn't hold. It's not a condition
        # itself so much, except that once a choice has been made it cannot
        # switch without rejecting that search.

        # The boolean var can be inspected and could be given. It can be used
        # as conditions to other constraints. It's range is always forced to
        # bool v [0,1], regardless of what it may be set to externally.

        # Boolean domains need at most one range; [0,0] or [0,1] or [1,1]
        # if [1,1], the requested op must hold (-> step pos prop without change)
        # if [0,0], the opposite op must hold (-> step neg prop without change)
        # else try either until one rejects, then update domain accordingly
        # but if neither rejects (when domain is [0,1]) then that's fine too.

        # Keep looping while something changed in the vars and the domain has
        # two values (0, 1). After loop check the single value conditions.

        if lo < hi
          delta = prop_stepper_or_constrain bool_var, pos_propagator, 0
          if delta is REJECTED
            return REJECTED
          [lo, hi] = bool_var.dom # updated with new ref. should fix that.

        if lo < hi
          delta = prop_stepper_or_constrain bool_var, neg_propagator, 1
          if delta is REJECTED
            return REJECTED
          [lo, hi] = bool_var.dom # updated with new ref. should fix that.

        last_upid = current_upid
        current_upid = v1.vupid + v2.vupid + bool_var.vupid

      # if lo=1 then hi must be 1 as well. confirm pos_propagator holds. else reject
      if lo is 1
        # step calls should return with `0`. The domain has a single value so step
        # calls should not be able to return `1`. If it would want to, it will
        # return REJECTED to signify an illegal state.
        if pos_propagator.stepper() is REJECTED
          return REJECTED
        @solved = propagator_is_solved pos_propagator # will not throw

      # if lo=0 then hi must be 0 as well. confirm neg_propagator holds. else reject
      else if hi is 0
        # The reified fdvar generates the negative condition.
        if neg_propagator.stepper() is REJECTED
          return REJECTED
        @solved = propagator_is_solved neg_propagator # will not throw

      # We need to make sure the `last_upid` related changes
      # are unique to this space, since pos_propagator and neg_propagator won't be
      # borrowed into cloned spaces, since they aren't in
      # the `S._propagators` array.
      @last_upid = v1.vupid + v2.vupid + bool_var.vupid

      # Reflect whether we decided one way or the other.
      # That's the case if the last two checks changed anything
      # (Changes in the loop are irrelevant here)
      return @last_upid - current_upid
    return propagator_create_3x space, left_var_name, right_var_name, bool_name, create_reified_prop, 'reified:'+_opname

  push_vars = (propagator) ->
    domains = []
    vupids = []

    for {dom, vupid}, i in propagator.propdata
      if i > 0 # propagator.propdata[0] is a Space, we only want Var here
        domains.push dom # P.propdata[i].dom | fdvar.dom
        vupids.push vupid # P.propdata[i].vupid | fdvar.vupid

    var_state_stack = propagator.var_state_stack
    unless var_state_stack
      var_state_stack = propagator.var_state_stack = []
    var_state_stack.push [
      domains
      vupids
      propagator.last_upid
    ]

    propagator.old_stepper = propagator.stepper
    return

  pop_vars = (propagator) ->
    # P.propdata[i].dom .vupid .last_upid
    [domains, vupids, last_upid] = propagator.var_state_stack.pop()

    for fdvar, i in propagator.propdata
      if i > 0 # propagator.propdata[0] is a Space, we only want Var here
        fdvar.dom = domains[i - 1] # dont unshift. useless memory operation
        fdvar.vupid = vupids[i - 1]

    propagator.stepper = propagator.old_stepper
    propagator.last_upid = last_upid
    return

  FD.propagators.propagator_create_reified = propagator_create_reified
