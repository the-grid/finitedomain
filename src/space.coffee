module.exports = do ->

  {
    REJECTED
    SOMETHING_CHANGED

    ENABLED
    ENABLE_EMPTY_CHECK

    ASSERT
    ASSERT_DOMAIN
    ASSERT_PROPAGATORS
  } = require './helpers'

  {
    config_create
    config_generate_vars
  } = require './config'

  {
    domain_is_solved
    domain_min
  } = require './domain'

  {
    fdvar_clone
    fdvar_is_solved
  } = require './fdvar'

  {
    propagator_step_any
  } = require './propagators/step_any'

  {
    propagator_is_solved
  } = require './propagators/is_solved'

  # BODY_START

  space_create_root = (config) ->
    config ?= config_create()

    return _space_create_new config, [], {}, [], 0, 0

  space_create_from_config = (config) ->
    ASSERT config._class is 'config'

    space = space_create_root config
    space_init_from_config space
    return space

  # Create a space node that is a child of given space node

  space_create_clone = (space) ->
    ASSERT space._class is 'space'

    unsolved_names = []
    clone_vars = {}

    vars = space.vars
    unsolved_propagators = []
    for propagator in space.unsolved_propagators
      unless propagator_is_solved vars, propagator
        unsolved_propagators.push propagator

    _space_pseudo_clone_vars space.config.all_var_names, vars, clone_vars, unsolved_names
    return _space_create_new space.config, unsolved_propagators, clone_vars, unsolved_names, space._depth + 1, space._child_count++

  # Note: it's pseudo because solved vars are not cloned but copied...

  _space_pseudo_clone_vars = (all_names, parent_vars, clone_vars, clone_unsolved_var_names) ->
    for var_name in all_names
      fdvar = parent_vars[var_name]
      if fdvar.was_solved
        clone_vars[var_name] = fdvar
      else # copy by reference
        clone_vars[var_name] = fdvar_clone fdvar
        clone_unsolved_var_names.push var_name
    return

  # Concept of a space that holds config, some fdvars, and some propagators

  _space_create_new = (config, unsolved_propagators, vars, unsolved_var_names, _depth, _child) ->
    ASSERT unsolved_propagators instanceof Array, 'props should be an array', unsolved_propagators
    ASSERT vars and typeof vars is 'object', 'vars should be an object', vars
    ASSERT unsolved_var_names instanceof Array, 'unsolved_var_names should be an array', unsolved_var_names

    return {
      _class: 'space'
      # search graph metrics
      _depth
      _child
      _child_count: 0

      config

      vars
      unsolved_var_names
      unsolved_propagators # by references from space.config.propagators

      next_distribution_choice: 0
    }

  space_init_from_config = (space) ->
    config = space.config
    ASSERT config, 'should have a config'

    config_generate_vars config, space.vars, space.unsolved_var_names

    # propagators are immutable so share by reference
    for propagator in config.propagators
      space.unsolved_propagators.push propagator

    return

  # Run all the propagators until stability point. Returns the number
  # of changes made or throws a 'fail' if any propagator failed.

  space_propagate = (space) ->
    ASSERT space._class is 'space'
    changed = true # init (do-while)
    unsolved_propagators = space.unsolved_propagators
    ASSERT_PROPAGATORS unsolved_propagators
    while changed
      changed = false
      for prop_details in unsolved_propagators
        n = propagator_step_any prop_details, space # TODO: if we can get a "solved" state here we can prevent an "is_solved" check later...

        # the domain of either var of a propagator can only be empty if the prop REJECTED
        ASSERT n is REJECTED or space.vars[prop_details[1][0]].dom.length, 'prop var empty but it didnt REJECT'
        ASSERT n is REJECTED or !prop_details[1][1] or space.vars[prop_details[1][1]].dom.length, 'prop var empty but it didnt REJECT'
        # if a domain was set empty and the flag is on the property should be set or
        # the unit test setup is unsound and it should be fixed (ASSERT_DOMAIN_EMPTY_SET)
        ASSERT !ENABLED or !ENABLE_EMPTY_CHECK or space.vars[prop_details[1][0]].dom.length or space.vars[prop_details[1][0]].dom._trace, 'domain empty but not marked'
        ASSERT !ENABLED or !ENABLE_EMPTY_CHECK or !prop_details[1][1] or space.vars[prop_details[1][1]].dom.length or space.vars[prop_details[1][1]].dom._trace, 'domain empty but not marked'

        if n is SOMETHING_CHANGED
          changed = true
        else if n is REJECTED
          return false # solution impossible

      if _space_abort_search space
        return false

    return true

  _space_abort_search = (space) ->
    ASSERT space._class is 'space'
    c = space.config.timeout_callback
    if c
      return c space
    return false

  # Returns true if this space is solved - i.e. when
  # all the fdvars in the space have a singleton domain.
  #
  # This is a *very* strong condition that might not need
  # to be satisfied for a space to be considered to be
  # solved. For example, the propagators may determine
  # ranges for all variables under which all conditions
  # are met and there would be no further need to enumerate
  # those solutions.
  #
  # For weaker tests, use the solve_for_variables function
  # to create an appropriate "is_solved" tester and
  # set the "state.is_solved" field at search time to
  # that function.

  space_is_solved = (space) ->
    ASSERT space._class is 'space'
    vars = space.vars
    unsolved_names = space.unsolved_var_names

    j = 0
    for name, i in unsolved_names
      fdvar = vars[name]
      ASSERT !fdvar.was_solved, 'should not be set yet at this stage' # we may change this though...
      ASSERT_DOMAIN fdvar.dom, 'is_solved extra domain validation check'

      if fdvar_is_solved fdvar
        fdvar.was_solved = true # makes space_create_clone faster
      else
        unsolved_names[j++] = name
    unsolved_names.length = j

    return j is 0

  # Returns an object whose field names are the fdvar names
  # and whose values are the solved values. The space *must*
  # be already in a solved state for this to work.

  space_solution = (space) ->
    ASSERT space._class is 'space'
    result = {}
    vars = space.vars
    for var_name in space.config.all_var_names
      _space_getset_var_solve_state var_name, vars, result
    return result

  # @param {string[]} var_names List of var names to query the solution for
  # @param {boolean} [complete=false] Return false if at least one var could not be solved?

  space_solution_for = (space, var_names, complete = false) -> # todo implement memorize flag
    ASSERT space._class is 'space'
    vars = space.vars
    result = {}
    for var_name in var_names
      value = false
      if vars[var_name]
        value = _space_getset_var_solve_state var_name, vars, result

      if complete and value is false
        return false

      result[var_name] = value

    return result

  _space_getset_var_solve_state = (var_name, vars, result) ->
    # Don't include the temporary variables in the "solution".
    # Temporary variables take the form of a numeric property
    # of the object, so we test for the var_name to be a number and
    # don't include those variables in the result.
    domain = vars[var_name].dom
    value = domain
    if domain.length is 0
      value = false
    else if domain_is_solved domain
      value = domain_min domain
    result[var_name] = value

    return value

  # __REMOVE_BELOW_FOR_DIST__

  #### Debugging

  # debug stuff (should be stripped from dist)

  __space_to_solver_test_case = (space) ->
    ASSERT space._class is 'space'
    things = ['S = new Solver {}\n']

    for name of space.vars
      things.push 'space_add_var space, \''+name+'\', ['+space.vars[name].dom.join(', ')+']'
    things.push ''

    space.unsolved_propagators.forEach (c) ->
      if c[0] is 'reified'
        things.push 'S._cacheReified \''+c[2]+'\', \''+c[1].join('\', \'')+'\''
      else if c[0] is 'ring'
        switch c[2]
          when 'plus'
            # doesnt really exist. merely artifact of ring
            things.push 'propagator_add_plus S, \''+c[1].join('\', \'')+'\''
          when 'min'
            # doesnt really exist. merely artifact of plus
            things.push '# S.minus \''+c[1].join('\', \'')+'\' # (artifact from .plus)'
          when 'mul'
            # doesnt really exist. merely artifact of ring
            things.push 'propagator_add_mul S, \''+c[1].join('\', \'')+'\''
          when 'div'
            # doesnt really exist. merely artifact of ring
            things.push '# S.divby \''+c[1].join('\', \'')+'\' # (artifact from .mul)'
          else
            ASSERT false, 'unknown ring op name', c[2]
      else
        things.push 'S.'+c[0]+' \''+c[1].join('\', \'')+'\''

    things.push '\nexpect(S.solve({max:10000}).length).to.eql 666'

    return things.join '\n'

  __space_to_space_test_case = (space) ->
    ASSERT space._class is 'space'
    things = ['S = space_create_root()\n']

    for name of space.vars
      things.push 'space_add_var S, \''+name+'\', ['+space.vars[name].dom.join(', ')+']'
    things.push ''

    things.push 'S.unsolved_propagators = [\n  ' + space.unsolved_propagators.map(JSON.stringify).join('\n  ').replace(/"/g, '\'') + '\n]'

    things.push '\nexpect(space_propagate S).to.eql true'

    return things.join '\n'


  __space_debug_string = (space) ->
    ASSERT space._class is 'space'
    try
      things = ['#########']

      things.push 'Config:'
      things.push '- config.var_filter_func: ' + space.config.var_filter_func
      things.push '- config.next_var_func: ' + space.config.next_var_func
      things.push '- config.next_value_func: ' + space.config.next_value_func
      things.push '- config.targeted_vars: ' + space.config.targeted_vars

      things.push "Vars (#{space.config.all_var_names.length}x):"

      vars = space.vars
      for name, fdvar of vars
        options = space.config.var_dist_options[name]
        things.push "  #{name}: [#{fdvar.dom.join(', ')}] #{options and ('Options: '+JSON.stringify(options)) or ''}"

      things.push 'config.var_dist_options:'
      for key, val of space.config.var_dist_options
        things.push "  #{key}: #{JSON.stringify val}"

      things.push "Var (#{space.config.all_var_names.length}x):"
      things.push '  ' + space.config.all_var_names
      things.push "Unsolved vars (#{space.unsolved_var_names.length}x):"
      things.push '  ' + space.unsolved_var_names

      things.push "Propagators (#{space.unsolved_propagators.length}x):"

      space.unsolved_propagators.forEach (p) ->
        try
          solved = propagator_is_solved vars, p
        catch e
          solved = '(unknown; crashes when checked)'

        a = p[1]?[0]
        b = p[1]?[1]
        c = p[1]?[2]
        if p[0] is 'reified'
          things.push "  #{p[0]}: '#{p[2]}', '#{p[1].join '\', \''}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[2]} [#{vars[b]?.dom or 'FAIL'}] -> [#{vars[c]?.dom or 'FAIL'}] | solved: #{solved}"
        else if p[0] is 'ring'
          things.push "  #{p[0]}: '#{p[2]}', '#{p[1].join '\', \''}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[2]} [#{vars[b]?.dom or 'FAIL'}] -> [#{vars[c]?.dom or 'FAIL'}] | solved: #{solved}"
        else
          things.push "  #{p[0]} '#{p[1].join ', '}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[0]} [#{vars[b]?.dom or 'FAIL'}] | solved: #{solved}"
      unless space.unsolved_propagators.length
        things.push '  - none'

      things.push '#########'
    catch e
      things.push '(Crashed inside __space_debug_string!)('+e.toString()+')'
      throw new Error things.join '\n'

    return things.join '\n'

  __space_debug_var_domains = (space) ->
    things = []
    for name of space.vars
      things.push name+': ['+space.vars[name].dom+']'
    return things

  __space_get_unsolved = (space) ->
    vars = space.vars
    unsolved_names = []
    for name of vars
      fdvar = vars[name]
      unless fdvar_is_solved fdvar
        unsolved_names.push name
    return unsolved_names

  # __REMOVE_ABOVE_FOR_DIST__

  # BODY_STOP

  return {
    space_create_clone
    space_create_from_config
    space_create_root
    space_init_from_config
    space_is_solved
    space_propagate
    space_solution
    space_solution_for

    # debugging
    __space_to_solver_test_case
    __space_to_space_test_case
    __space_debug_string
  }
