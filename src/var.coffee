module.exports = (FD) ->

  {
    REJECTED
    SUP
  } = FD.helpers

  {
    domain_intersection
    domain_equal
    domain_middle_element
    domain_size
  } = FD.Domain

  FIRST_RANGE = 0
  LO_BOUND = 0
  HI_BOUND = 1

  fdvar_create = (id, dom) ->
    return fdvar_new id, dom, 0

  fdvar_create_wide = (id) ->
    return fdvar_new id, [[0, SUP]], 0

  fdvar_new = (id, dom, vupid) ->
    return {
      _class: 'fdvar'
      id
      dom
      vupid # "var update id", caching mechanism, used to be called `step`
    }

  fdvar_is_undetermined = (fdvar) ->
    domain = fdvar.dom
    return domain.length > 1 or domain[FIRST_RANGE][LO_BOUND] < domain[FIRST_RANGE][HI_BOUND]

  fdvar_clone = (fdvar) ->
    return fdvar_new fdvar.id, fdvar.dom, fdvar.vupid

  fdvar_set_domain = (fdvar, domain) ->
    unless domain_equal fdvar.dom, domain
      fdvar.dom = domain
      fdvar.vupid++
    return

  fdvar_constrain = (fdvar, domain) ->
    domain = domain_intersection fdvar.dom, domain
    unless domain.length
      return REJECTED
    before = fdvar.vupid
    fdvar_set_domain fdvar, domain
    return fdvar.vupid - before

  fdvar_size = (fdvar) ->
    # TODO: Can be cached using the 'vupid' member which
    # keeps track of the number of times the domain was
    # changed.
    return domain_size fdvar.dom

  fdvar_lower_bound = (fdvar) ->
    return fdvar.dom[FIRST_RANGE][LO_BOUND]

  fdvar_upper_bound = (fdvar) ->
    return fdvar.dom[fdvar.dom.length - 1][HI_BOUND]

#  fdvar_rough_mid: ->
#    midDomIx = Math.floor(@dom.length / 2)
#    midDom = @dom[midDomIx]
#    Math.round (midDom[0] + midDom[1]) / 2

  # Get the exact middle value from all values covered by var
  # Middle here means the middle index, not hi-lo/2

  fdvar_middle_element = (fdvar) ->
    return domain_middle_element fdvar.dom

  FD.Var = {
    fdvar_clone
    fdvar_constrain
    fdvar_create
    fdvar_create_wide
    fdvar_is_undetermined
    fdvar_upper_bound
    fdvar_middle_element
    fdvar_lower_bound
    fdvar_set_domain
    fdvar_size
  }
