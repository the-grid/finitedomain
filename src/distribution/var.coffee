module.exports = (FD) ->

  {
    fdvar_lower_bound
    fdvar_size
    fdvar_upper_bound
  } = FD.Var

  distribution_var_naive = (S, v1, v2) ->
    return true

  distribution_var_size = (S, v1, v2) ->
    return fdvar_size(S.vars[v1]) < fdvar_size(S.vars[v2])

  distribution_var_min = (S, v1, v2) ->
    return fdvar_lower_bound(S.vars[v1]) < fdvar_lower_bound(S.vars[v2])

  distribution_var_max = (S, v1, v2) ->
    return fdvar_upper_bound(S.vars[v1]) > fdvar_upper_bound(S.vars[v2])

  FD.distribute.Var = {
    distribution_var_max
    distribution_var_min
    distribution_var_naive
    distribution_var_size
  }
