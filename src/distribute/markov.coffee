# Markov Distribution Helpers
### ======================================================================

  Helpers for Markov-style probabilistic value & var distributions.

###

random = Math.random #new Multiverse.random "sjf20ru"

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

  {
    domain_contains_value
  } = FD.Domain

  FD.distribute.Markov =
    sampleNextFromDomain: (domain, probVector, valLegend) ->

      # this strategy is optimized for small domains,
      # for large Domains likely better to use the sampleIndexLookupList...

      # make vector & legend for available values only
      vector = []
      legend = []
      for prob, index in probVector
        value = valLegend?[index]
        value ?= index # default legend is the indic
        continue if prob is 0
        continue unless domain_contains_value domain, value
        vector.push prob
        legend.push value


      # no more values left to search
      if vector.length is 0
        return undefined


      # only one value left
      else if vector.length is 1
        return legend[0]

      # stochastically choose next value
      else

        sum = 0
        for prob in vector
          sum += prob

        probVal = random() * sum
        cursor = 0

        for prob, probIndex in vector
          if probIndex is 0
            closest = prob
            closest_index = probIndex
          else if probVal >= cursor
            closest = prob
            closest_index = probIndex
          else
            break
          cursor += prob

        return legend[closest_index]



    sampleIndexLookupList: (propabilityRow) ->

      unused = propabilityRow.slice()
      propabilityRowIndices = [0...propabilityRow.length]
      list = []

      sum = 0
      for y in propabilityRow
        sum += y

      i = 0
      while i < propabilityRow.length
        val = random() * sum
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
