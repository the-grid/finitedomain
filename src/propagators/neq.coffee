module.exports = (FD) ->
  {
    REJECTED
    ZERO_CHANGES

    ASSERT
  } = FD.helpers

  {
    domain_deep_clone_without_value
  } = FD.Domain

  {
    propagator_create_2x
  } = FD.Propagator

  {
    fdvar_is_solved
    fdvar_lower_bound
    fdvar_set_domain
  } = FD.Var

  neq_stepper = ->
    fdvar1 = @fdvar1
    fdvar2 = @fdvar2

    begin_upid = fdvar1.vupid + fdvar2.vupid
    if begin_upid <= @last_upid # or @solved
      return ZERO_CHANGES

    unless fdvar1.dom.length and fdvar2.dom.length
      return REJECTED

    # Basically you need to ensure that once an fdvar is "solved", its
    # value does not appear in the other fdvar. However, we can't simply
    # remove all elements that appear in both domains from said domains
    # because these value can validly appear in EITHER fdvar, just NOT BOTH.
    # TODO: update the vars inline

    if fdvar_is_solved fdvar1
      new_domain = domain_deep_clone_without_value fdvar2.dom, fdvar_lower_bound fdvar1
      unless new_domain.length
        return REJECTED
      fdvar_set_domain fdvar2, new_domain

    # TODO: add test that fails if this block would be removed or remove this block
    # I _think_ this `else` is fine? TODO: figure out a test that doesnt like the `else` here or remove this comment and keep the elseif
    else if fdvar_is_solved fdvar2
      new_domain = domain_deep_clone_without_value fdvar1.dom, fdvar_lower_bound fdvar2
      unless new_domain.length
        return REJECTED
      fdvar_set_domain fdvar1, new_domain

    #    if fdvar_is_solved(v1) and fdvar_is_solved(v2) and fdvar_lower_bound(v1) is fdvar_lower_bound(v2)
    #      @solved = true

    current_upid = fdvar1.vupid + fdvar2.vupid
    @last_upid = current_upid
    return current_upid - begin_upid

  propagator_create_neq = (space, left_var_name, right_var_name) ->
    propagator_create_2x space, left_var_name, right_var_name, neq_stepper, 'neq'

  FD.propagators.propagator_create_neq = propagator_create_neq
