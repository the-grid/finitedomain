# Snode represents a node in the search space (Space Node)
# Previously this was part of Space but we'll use that
# exclusively as an external API endpoint object now.


module.exports = (FD) ->

  {
    REJECTED
    SUB
    SUP

    ASSERT
    ASSERT_DOMAIN
    ASSERT_PROPAGATORS
  } = FD.helpers

  snode_create_root = (space) ->
    snode_create [], {}, 0, null, space

  snode_new = (vars, space) ->
    snode_create Object.keys(vars), vars, 0, null, space

  snode_clone = (snode) ->
    # clone the vars for now. later we'll change this to deltas only
    names = snode.changed_var_names
    parent_vars = snode.changed_vars
    child_vars = {}
    for var_name in names
      child_vars[var_name] = fdvar_clone parent_vars[var_name]

    return snode_create names.slice(0), child_vars, snode.distribution_choice, snode.root_space, snode

  snode_create = (changed_var_names, changed_vars, distribution_choice, root_space, parent_snode) ->
    return {
      _class: 'snode'

      changed_var_names # array of names
      changed_vars # by name

      distribution_choice # tbd

      parent_snode # parent snode
      root_space # we need this?
    }

  FD.Snode = {
    snode_clone
    snode_create_root
    snode_new
  }
