module.exports = (FD) ->
  {
    fdvar_force_neq_inline
  } = FD.Var

  neq_step_bare = (fdvar1, fdvar2) ->
    return fdvar_force_neq_inline fdvar1, fdvar2

  FD.propagators.neq_step_bare = neq_step_bare
