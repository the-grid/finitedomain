# Markov Distribution Helpers
### ======================================================================

  Helpers for Markov-style probabilistic value & var distributions.

###


###

markov =
  legend: ['small','med','large']
  matrix: [
      vector:[.5,1,1], condition: (S,varId) ->
        prev = S.readMatrix(varId, S.cursor() - 1 )
        return S.isEqual prev, 'small'
    ,
      vector:[1,1,1], condition: -> true
  ]


markov =
  legend: ['small','med','large']
  matrix: [
      vector:[.5,1,1], condition: (S,varId) ->
        prev = S.readMatrix(varId, S.cursor() - 1 )
        result =
          value: S.isEqual prev, 'small'
          deps: ...
        return result
    ,
      vector:[1,1,1], condition: -> true
  ]

Inhomogenous Markov chains [see](https://cw.fel.cvut.cz/wiki/_media/courses/a6m33bin/markov-chains-2.pdf)

in an inhomogeneous Markov model, we can have different distributions at different positions in the sequence

https://en.wikipedia.org/wiki/Markov_chain#Music
###


module.exports = (FD) ->

  RANDOM = Math.random #new Multiverse.random "sjf20ru"

  {
    domain_contains_value
  } = FD.Domain

  distribution_markov_sampleNextFromDomain = (domain, prob_vector, val_legend) ->

    # this strategy is optimized for small domains,
    # for large Domains likely better to use the sampleIndexLookupList...

    # val_legend is a list of options to check for some fdvar currently being evaluated.
    # The probability to use each option is 1:1 mapped to prob_vector. Since we don't
    # know which options are still valid in this search space, we have to filter down
    # the valid options first and then stochastically pick one from that result.

    # make vector & legend for available values only
    vector = []
    legend = []
    total = 0
    for prob, index in prob_vector
      if prob > 0
        value = val_legend?[index]
        value ?= index # default legend is the indic
        if value and domain_contains_value domain, value
          total += prob
          vector.push prob
          legend.push value

    # no more values left to search
    if vector.length is 0
      return undefined

    # only one value left
    if vector.length is 1
      return legend[0]

    # stochastically choose next value
    prob_val = RANDOM() * total

    cursor = 0
    closest_index = 0
    prob_val = 0
    for prob, index in vector
      if prob_val >= cursor
        closest_index = index
        cursor += prob
      else
        break

    return legend[closest_index]

  distribution_markov_sampleIndexLookupList = (propabilityRow) ->

    unused = propabilityRow.slice()
    propabilityRowIndices = [0...propabilityRow.length]
    list = []

    sum = 0
    for y in propabilityRow
      sum += y

    i = 0
    while i < propabilityRow.length
      val = RANDOM() * sum
      cursor = 0
      if unused.length is 1
        list.push propabilityRowIndices[0]
      else
        for x, j in unused
          if j is 0
            closest = x
            closesti = j
          else if val >= cursor
            closest = x
            closesti = j
          else
            break
          cursor += x
        # console.log "val: #{val}, sum: #{sum}, closest: #{closest}, propabilityRow: #{propabilityRow}"
        sum -= unused.splice(closesti,1)[0]
        list.push propabilityRowIndices.splice(closesti,1)[0]
      i++

    #console.log "======>", buildValueList([.5,2,.1])
    return list

  FD.distribute.Markov = {
    distribution_markov_sampleNextFromDomain
    distribution_markov_sampleIndexLookupList # unused
  }
