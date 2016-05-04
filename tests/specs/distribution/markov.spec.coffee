if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_value
    strip_anon_vars
  } = require '../../fixtures/domain.spec.coffee'

{expect, assert} = chai
FD = finitedomain

describe 'distribution/markov.spec', ->

  unless FD.__DEV_BUILD
    return

  RNG_UNNORMALIZED = false
  RNG_NORMALIZED = true

  {distribution_markov_sampleNextFromDomain} = FD.distribution.markov

  it 'should return a number', ->

    domain = spec_d_create_range 0, 10
    value_legend = [5]
    prob_vector = [1]
    rng_func = -> 1 - 1e-5 # always pick last in legend
    expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func).to.equal 5

  it 'should return first value in legend if rng is 0', ->

    domain = spec_d_create_range 0, 10
    value_legend = [2, 5]
    prob_vector = [1, 1] # equal odds (irrelevant for this test)
    rng_func = -> 0 # always pick last in legend
    expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func).to.equal 2

  it 'should return first value in legend if rng is 1', ->

    domain = spec_d_create_range 0, 10
    value_legend = [2, 8]
    prob_vector = [1, 1] # equal odds (irrelevant for this test)
    rng_func = -> 0.9999 # always pick last in legend
    expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func, RNG_NORMALIZED).to.equal 8

  it 'should throw if normalized rng returns 1', ->

    domain = spec_d_create_range 0, 10
    value_legend = [2, 8]
    prob_vector = [1, 1] # equal odds (irrelevant for this test)
    rng_func = -> 1 # not a valid normalized value
    expect(-> distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func, RNG_NORMALIZED).to.throw()

  it 'should throw if normalized rng returns 1.1', ->

    domain = spec_d_create_range 0, 10
    value_legend = [2, 8]
    prob_vector = [1, 1] # equal odds (irrelevant for this test)
    rng_func = -> 1.1 # not a valid normalized value
    expect(-> distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func, RNG_NORMALIZED).to.throw()

  it 'should throw if normalized rng returns -1', ->

    domain = spec_d_create_range 0, 10
    value_legend = [2, 8]
    prob_vector = [1, 1] # equal odds (irrelevant for this test)
    rng_func = -> -1 # not a valid normalized value
    expect(-> distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func, RNG_NORMALIZED).to.throw()

  it 'should return middle value in legend if rng is .5 with equal probs', ->

    domain = spec_d_create_range 0, 10
    value_legend = [1, 2, 3]
    prob_vector = [1, 1, 1] # equal odds (irrelevant for this test)
    rng_func = -> .5 # always pick last in legend
    expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func).to.equal 2

  it 'should not consider values with zero probability', ->

    domain = spec_d_create_range 0, 10
    value_legend = [1, 2, 3, 4, 5, 6]
    prob_vector = [0, 0, 0, 0, 1, 0] # only `5` has non-zero chance
    rng_func = -> .5 # irrelevant, there is only one choice
    expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func).to.equal 5

  it 'should ignore values not in current domain', ->

    domain = spec_d_create_range 3, 10 # note: 1 and 2 are not part of domain!
    value_legend = [1, 2, 3, 4, 5, 6]
    prob_vector = [1, 1, 0, 0, 1, 0] # 1, 2, and 5 have non-zero probability
    rng_func = -> 0 # picks first "considered" value
    expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func).to.equal 5

  describe 'distribute according to probability weight', ->

    it 'should solve an explicit case', ->

      # tricky to explain. rng works on the total of probabilities and "consumes" left-to-right
      # so since `2` has probability of `5/total` and the only value before it has a prob of
      # `1/total`, the `2` will be chosen if rng outcome is one of [1, 6]. We'll fix it to `4`
      # in this test so we'll know this must be the case.
      domain = spec_d_create_range 0, 10
      value_legend = [1, 2, 3, 4, 5, 6]
      prob_vector = [1, 5, 1, 1, 1, 1] # total probability is 10
      rng_func = -> 4 # whole number to prevent precision errors (-> RNG_UNNORMALIZED)
      expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func, RNG_UNNORMALIZED).to.equal 2

    describe 'more cases, unnormalized', ->

      # Make sure that: rng_roll < sum(prob_vector).
      # The roll must be less! Not lte.
      case_it = (prob_vector, rng_roll, outcome, desc) ->

        if rng_roll >= prob_vector.reduce((a,b) -> a + b)
          throw new Error "test fail, roll must be < prob sum (#{rng_roll} >= #{prob_vector.reduce((a,b) -> a + b)})"

        it "should solve case probs: #{prob_vector} roll: #{rng_roll} out: #{outcome} #{desc and ('desc: ' + desc) or ''}", ->
          domain = spec_d_create_range 0, 10
          value_legend = [1, 2, 3, 4, 5, 6]
          rng_func = -> rng_roll
          expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func, RNG_UNNORMALIZED).to.equal outcome

      case_it [1, 1, 1, 1, 1, 1], 0, 1
      case_it [1, 1, 1, 1, 1, 1], 1, 2
      case_it [1, 1, 1, 1, 1, 1], 4, 5
      case_it [1, 5, 1, 1, 1, 1], 1, 2
      case_it [1, 5, 1, 1, 1, 1], 4, 2, 'the 5 "adds" the second index 5x to the pool so 4 ends up picking the second index'
      case_it [1, 5, 1, 1, 1, 1], 6, 3, 'the 6 roll skips over index 1 and 5x index 2 so it picks index 3'
      case_it [1, 5, 1, 1, 1, 1], 9, 6
      case_it [1, 8, 1, 12, 1, 1], 22, 5, 'roll 23, skips 1x 1, 8x 2, 1x 3, 12x 4 (=22 indices) to get index 5 (not 6 because it offsets at 0)'

    describe 'more cases, normalized', ->

      # Make sure that: rng_roll < sum(prob_vector).
      # The roll must be less! Not lte.
      case_it = (prob_vector, rng_roll, outcome, desc) ->

        if rng_roll >= 1
          throw new Error "test fail, roll must be < 1 (#{rng_roll} >= 1"
        if Math.abs(prob_vector.reduce((a,b) -> a + b) - 1) > 1e-4
          throw new Error "test fail, prob total should be 1 (1-#{prob_vector.reduce((a,b) -> a + b)} > #{1e-4})"

        it "should solve case probs: #{prob_vector} roll: #{rng_roll} out: #{outcome} #{desc and ('desc: ' + desc) or ''}", ->
          domain = spec_d_create_range 0, 10
          value_legend = [1, 2, 3, 4, 5, 6]
          rng_func = -> rng_roll
          expect(distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng_func, RNG_NORMALIZED).to.equal outcome

      case_it [1/6, 1/6, 1/6, 1/6, 1/6, 1/6], 0, 1
      case_it [1/6, 1/6, 1/6, 1/6, 1/6, 1/6], 1 - 1e-6, 6
      #case_it [1/6, 1/6, 1/6, 1/6, 1/6, 1/6], 1/6, 2 # rounding makes this test difficult
      #case_it [1/6, 0, 2/6, 1/6, 1/6, 1/6], 1/6, 3, 'Second index has zero prob so it becomes 3' # rounding makes this test difficult
      case_it [1/6, 0, 2/6, 1/6, 1/6, 1/6], 2/6, 3, 'Second index has zero prob so it becomes 3'

  it 'should always return a value from legend (100x)', ->

    generate_normalized_probs = (r, n) ->
      # returns an array of 2^n random values, which should sum up to 1
      x = r * Math.random()
      y = r - x
      if --n
        return [].concat generate_normalized_probs(x, n), generate_normalized_probs(y, n)
      return [x, y]

    for [0...100]
      domain = spec_d_create_value 100
      value_legend = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] # 16x 100
      prob_vector = generate_normalized_probs(1, 4) # 16 values
      r = Math.random()
      rng = -> r

      out = distribution_markov_sampleNextFromDomain domain, prob_vector, value_legend, rng, RNG_NORMALIZED

      expect(out, "domain: #{domain} value_legend: #{value_legend} prob_vector: #{prob_vector} r: #{r} out: #{out}").to.equal 100 # should end up picking a valid index
