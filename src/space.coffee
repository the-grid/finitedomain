module.exports = do ->

  {
    REJECTED
    SOMETHING_CHANGED
    SUB
    SUP

    ENABLED
    ENABLE_EMPTY_CHECK

    ASSERT
    ASSERT_DOMAIN
    ASSERT_PROPAGATORS
  } = require './helpers'

  {
    config_add_var_value
    config_create
  } = require './config'

  {
    domain_create_value
    domain_is_solved
    domain_min
  } = require './domain'

  {
    fdvar_clone
    fdvar_create
    fdvar_is_solved
    fdvar_set_domain
  } = require './fdvar'

  {
    propagator_step_any
  } = require './propagators/step_any'

  {
    propagator_is_solved
  } = require './propagators/is_solved'

  # BODY_START

  # A monotonically increasing class-global counter for unique temporary variable names.
  _space_uid_counter = 1

  space_create_root = (config) ->
    config ?= config_create()

    return _space_create_new config, [], {}, [], [], 0, 0

  # Create a space node that is a child of given space node

  space_create_clone = (space) ->
    ASSERT space._class is 'space'

    all_names = space.config.all_var_names
    unsolved_names = []
    clone_vars = {}

    vars = space.vars
    unsolved_propagators = []
    for propagator in space._propagators
      unless propagator_is_solved vars, propagator
        unsolved_propagators.push propagator

    _space_pseudo_clone_vars all_names, vars, clone_vars, unsolved_names
    return _space_create_new space.config, unsolved_propagators, clone_vars, all_names, unsolved_names, space._depth + 1, space._child_count++

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

  _space_create_new = (config, _propagators, vars, all_var_names, unsolved_var_names, _depth, _child) ->
    ASSERT _propagators instanceof Array, 'props should be an array', _propagators
    ASSERT vars and typeof vars is 'object', 'vars should be an object', vars
    ASSERT all_var_names instanceof Array, 'all_var_names should be an array', all_var_names
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

      _propagators

      next_distribution_choice: 0
    }

  # Run all the propagators until stability point. Returns the number
  # of changes made or throws a 'fail' if any propagator failed.

  space_propagate = (space) ->
    ASSERT space._class is 'space'
    changed = true # init (do-while)
    propagators = space._propagators
    ASSERT_PROPAGATORS space._propagators
    while changed
      changed = false
      for prop_details in propagators
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

  # create a new var on this space
  # - name is optional, an anonymous var is created if absent
  # - if name is a number or array it is assumed to be `lo`,
  # and then hi becomes lo, lo becomes name, name becomes null
  # - lo can be a number, undefined, or an array.\
  # - hi can be a number or undefined.
  # - if lo is array it is assumed to be the whole domain
  # returns the name of the new var (regardless)
  #
  # Usage:
  # space_add_var space, 'A', 0           # declares var A with domain [0, 0]
  # space_add_var space, 'A', 0, 1        # declares var A with domain [0, 1]
  # space_add_var space, 'A', [0, 1]      # declares var A with given domain
  # space_add_var space, 'A'              # declares var A with [SUB, SUP]
  # space_add_var space, 0                # declares anonymous var with [0, 0]
  # space_add_var space, 0, 1             # declares anonymous var with [0, 1]
  # space_add_var space, [0, 1]           # declares anonymous var with given domain
  # space_add_var space                   # declares anonymous var with [SUB, SUP]

  space_add_var = (space, name, lo, hi, skip_value_check) ->
    ASSERT space._class is 'space'
    if typeof name is 'number' or name instanceof Array
      hi = lo
      lo = name
      name = undefined

    if typeof lo is 'number' and !hi?
      if name
        _space_create_var_domain space, name, domain_create_value lo
        return name

    if !name? and typeof lo is 'number'
      # use special function that caches and dedupes "solved" vars
      if !hi?
        return _space_create_var_value space, lo
      # recursive check. but if a "solved" domain is passed we may want to cache that too
      if !skip_value_check and lo is hi
        return _space_create_var_value space, lo

    if lo? and hi?
      ASSERT typeof lo is 'number', 'if hi is passed lo should be a number', lo, hi
      domain = [lo, hi]
    else if lo?
      ASSERT lo instanceof Array, 'if lo is not a number it must be an array; the domain', lo
      ASSERT !hi?, 'if lo is the domain, hi should not be given', lo, hi
      domain = lo.slice 0
    else
      ASSERT !lo?, 'expecting no lo/hi at this point', lo, hi
      ASSERT !hi?, 'expecting no lo/hi at this point', lo, hi
      domain = [SUB, SUP]

    unless name
      # create anonymous var
      name = String _space_uid_counter++

    _space_create_var_domain space, name, domain
    return name

  # add multiple var names with names in arg list
  # See space_add_var for details

  space_add_vars = (space, arr...) ->
    ASSERT space._class is 'space'
    for a in arr
      space_add_var space, a[0], a[1], a[2]
    return

  # add multiple var names with names in an array
  # See space_add_var for details

  space_add_vars_a = (space, arr) ->
    ASSERT space._class is 'space'
    for a in arr
      space_add_var space, a
    return

  # Add a bunch of vars by different names and same domain
  # See space_add_var for details

  space_add_vars_domain = (space, names, lo, hi) ->
    ASSERT space._class is 'space'
    for name in names
      space_add_var space, name, lo, hi
    return

  # create an anonymous var with specific solved state
  # multiple anonymous vars with same name return the same
  # reference as optimization (should not harm?)

  _space_create_var_value = (space, val) ->
    ASSERT space._class is 'space'
    ASSERT !isNaN(val), '_space_create_var_value: Value is NaN', val
    ASSERT val >= SUB, 'val must be above minimum value', val
    ASSERT val <= SUP, 'val must be below max value', val

    # The idea is that single value domains are already solved so if they
    # change, the state is immediately rejected. As such these vars can
    # be considered constants; use them as is or bust. We do have to take
    # care not to change them inline as they are shared by reference.
    # TOFIX: make this more stable.
    cache = space.config.constant_cache

    fdvar_name = cache[val]
    if fdvar_name
      return fdvar_name

    SKIP_RECURSION = true
    fdvar_name = space_add_var space, undefined, val, val, SKIP_RECURSION
    cache[val] = fdvar_name
    return fdvar_name

  # Register a variable with specific name and specific dom

  _space_create_var_domain = (space, var_name, dom) ->
    ASSERT space._class is 'space'
    ASSERT !!dom
    ASSERT_DOMAIN dom

    vars = space.vars

    fdvar = vars[var_name]
    if fdvar
      # If it already exists, change the domain if necessary.
      # (I think this should issue an error because when would you want to do this?)
      fdvar_set_domain fdvar, dom
    else
      vars[var_name] = fdvar_create var_name, dom
      config_add_var_value space.config, var_name, dom, true
      space.unsolved_var_names.push var_name
      space.config.all_var_names.push var_name

    return

  space_add_propagator = (space, data) ->
    ASSERT space._class is 'space'
    space._propagators.push data
    ASSERT_PROPAGATORS space._propagators
    return

  space_get_unknown_vars = (space) ->
    names = []
    for p in space._propagators
      a = p[1][0]
      if !space.vars[a] and names.indexOf(a) < 0
        names.push a
      b = p[1][1]
      if !space.vars[b] and names.indexOf(b) < 0
        names.push b
    return names

  # __REMOVE_BELOW_FOR_DIST__

  #### Debugging

  # debug stuff (should be stripped from dist)

  __space_to_solver_test_case = (space) ->
    ASSERT space._class is 'space'
    things = ['S = new Solver {}\n']

    for name of space.vars
      things.push 'space_add_var space, \''+name+'\', ['+space.vars[name].dom.join(', ')+']'
    things.push ''

    space._propagators.forEach (c) ->
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

    things.push 'S._propagators = [\n  ' + space._propagators.map(JSON.stringify).join('\n  ').replace(/"/g, '\'') + '\n]'

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

      things.push "Propagators (#{space._propagators.length}x):"

      space._propagators.forEach (p) ->
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
      unless space._propagators.length
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
    space_add_propagator
    space_add_vars_domain
    space_add_var
    space_add_vars
    space_add_vars_a
    space_create_clone
    space_create_root
    space_get_unknown_vars
    space_is_solved
    space_propagate
    space_solution
    space_solution_for

    # testing
    _space_create_var_domain
    _space_create_var_value
    # debugging
    __space_to_solver_test_case
    __space_to_space_test_case
    __space_debug_string
  }
