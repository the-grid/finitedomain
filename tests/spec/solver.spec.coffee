if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_ranges
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "FD", ->

  it 'FD?', ->
    expect(FD?).to.be.true

  describe "FD.js API", ->

    it '4 branch 2 level example (binary)', ->
      ###
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
      ###

      S = new FD.space()

      # branch vars
      branchVars = ['A','C','B','D']
      S.decl(branchVars, spec_d_create_bool())

      # constants
      one = S.konst(1)
      zero = S.konst(0)
      booleanDomain = spec_d_create_bool()

      # path vars
      Avars = ['A1','A2','A3']
      Bvars = ['B1','B2','B3']
      Cvars = ['C1','C2','C3']
      Dvars = ['D1','D2','D3']
      pathVars = [].concat(Avars).concat(Bvars).concat(Cvars).concat(Dvars)
      S.decl(pathVars, booleanDomain)

      # path to branch binding
      S.sum Avars, 'A'
      S.sum Bvars, 'B'
      S.sum Cvars, 'C'
      S.sum Dvars, 'D'

      # root branches must be on
      S.eq 'A', one
      S.eq 'C', one

      # child-parent binding
      S.eq 'B', 'A2'
      S.eq 'D', 'C2'

      # D & B counterpoint
      S.decl('BsyncD',booleanDomain)
      S.reified('eq', 'B', 'D','BsyncD')
      S.gte(
        S.reified('eq', 'B1', 'D1'),
        'BsyncD'
      )
      S.gte(
        S.reified('eq', 'B2', 'D2'),
        'BsyncD'
      )
      S.gte(
        S.reified('eq', 'B3', 'D3'),
        'BsyncD'
      )

      FD.distribute.fail_first(S, pathVars)

      search = FD.search.depth_first

      state = {space:S, more:true}

      count = 0
      console.time 'TIME'
      while state.more
        state = search state
        break if state.status is 'end'
        count++
        #console.log "/////////"
        #console.log JSON.stringify(state.space.solution())
        #console.log JSON.stringify(state.more)
      console.timeEnd 'TIME'
      console.log "iterations: #{count}"
      expect(count).to.equal 19

  describe "FD.Solver API", ->

    it 'FD.Solver?', ->
      expect(FD.Solver).to.be.ok

    it '4 branch 2 level example w/ string vars (binary)', ->
      ###
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
      ###

      S = new FD.Solver {defaultDomain:spec_d_create_bool()}

      # branch vars
      branchVars = S.addVars ['A','C','B','D']

      # constants
      one = S.constant 1
      zero = S.constant 0

      # path vars
      Avars = ['A1','A2','A3']
      Bvars = ['B1','B2','B3']
      Cvars = ['C1','C2','C3']
      Dvars = ['D1','D2','D3']
      pathVars = [].concat(Avars).concat(Bvars).concat(Cvars).concat(Dvars)
      S.addVars pathVars

      # path to branch binding
      S['∑'] Avars, 'A'
      S['∑'] Bvars, 'B'
      S['∑'] Cvars, 'C'
      S['∑'] Dvars, 'D'

      # root branches must be on
      S['=='] 'A', one
      S['=='] 'C', one

      # child-parent binding
      S['=='] 'B', 'A2'
      S['=='] 'D', 'C2'

      # D & B counterpoint
      S['==?'] 'B', 'D', S.addVar('BsyncD')

      S['>='](
        S['==?']('B1', 'D1'),
        'BsyncD'
      )
      S['>='](
        S['==?']('B2', 'D2'),
        'BsyncD'
      )
      S['>='](
        S['==?']('B3', 'D3'),
        'BsyncD'
      )

      solutions = S.solve()

      expect(solutions.length).to.equal(19)

  it '4 branch 2 level example w/ var objs (binary)', ->
    ###
    A
      1
      2 - B
      3     1
            2
            3
    C
      1
      2 - D
      3     1
            2
            3
    ###

    S = new FD.Solver {defaultDomain:spec_d_create_bool()}

    branches =
      A:3
      B:3
      C:3
      D:3

    for branchId, pathCount of branches
      branchVar = {id:branchId}
      S.addVar branchVar
      pathVars = []
      for i in [1..pathCount]
        pathVars.push {id:branchId + i}
      S.addVars pathVars
      # path to branch binding
      S['∑'] pathVars, branchVar

    # constants
    one = S.constant 1
    zero = S.constant 0

    # root branches must be on
    S['=='] 'A', one
    S['=='] 'C', one

    # child-parent binding
    S['=='] 'B', 'A2'
    S['=='] 'D', 'C2'

    # D & B counterpoint
    #S['==?'] 'B', 'D', S.addVar('BsyncD')

    S['>='](
      S['==?']('B1', 'D1'),
      S['==?']('B', 'D')
    )
    S['>='](
      S['==?']('B2', 'D2'),
      S['==?']('B', 'D')
    )
    S['>='](
      S['==?']('B3', 'D3'),
      S['==?']('B', 'D')
    )

    solutions = S.solve()

    expect(solutions.length).to.equal(19)

  it '4 branch 2 level example w/ var objs (non-binary)', ->
    ###
    A
      1
      2 - B
      3     1
            2
            3
    C
      1
      2 - D
      3     1
            2
            3
    ###

    S = new FD.Solver {defaultDomain:spec_d_create_bool()}

    S.addVar {id:'A',domain:spec_d_create_range(0,3)}
    S.addVar {id:'B',domain:spec_d_create_range(0,3)}
    S.addVar {id:'C',domain:spec_d_create_range(0,3)}
    S.addVar {id:'D',domain:spec_d_create_range(0,3)}

    # constants
    zero = S.constant 0
    one = S.constant 1
    two = S.constant 2
    three = S.constant 3

    # root branches must be on
    S['>='] 'A', one
    S['>='] 'C', one

    # child-parent binding
    S['=='](
      S['>?'] 'B', zero
      S['==?'] 'A', two
    )
    S['=='](
      S['>?'] 'D', zero
      S['==?'] 'C', two
    )

    # Synchronize D & B if possible
    # if B > 0 and D > 0, then B == D
    S['>='](
      S['==?']('B', 'D'),
      S['==?'](
        S['>?']('B', zero),
        S['>?']('D', zero),
      )
    )

    solutions = S.solve()

    expect(solutions.length).to.equal(19)


  describe "sparse domain test", ->
    it 'works', ->

      S = new FD.Solver {}

      S.decl 'item1', spec_d_create_range(1, 5)
      S.decl 'item2', spec_d_create_ranges([2, 2],[4,5])
      S.decl 'item3', spec_d_create_range(1, 5)
      S.decl 'item4', spec_d_create_range(4, 4)
      S.decl 'item5', spec_d_create_range(1, 5)

      #S['=='] 'item1', S.constant(1)
      #S['=='] 'item2', S.constant(2)
      #S['=='] 'item3', S.constant(3)
      #S['=='] 'item4', S.constant(4)
      #S['=='] 'item5', S.constant(5)

      S['<'] 'item1', 'item2'
      S['<'] 'item2', 'item3'
      S['<'] 'item3', 'item4'
      S['<'] 'item4', 'item5'

      solutions = S.solve()

      expect(solutions.length).to.equal(1)
      expect(solutions[0].item1).to.equal(1)
      expect(solutions[0].item2).to.equal(2)
