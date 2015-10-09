mergeAccumulatedValue = (val1, val2) ->
  if typeof val1 is 'number'
    return val1 + val2
  else if val1 instanceof Array
    results = []
    for v in val1
      results.push v
    for v in val2
      results.push v if v not in results
    return results
  else
    throw new Error "merge??? #{val1}, #{val2}"

mergeObject = (a, b) ->
  for key, bValue of b
    aValue = a[key]
    if (typeof bValue == 'object' and bValue not instanceof Array) && (typeof aValue == 'object' and aValue not instanceof Array)
      mergeObject(aValue, bValue)
    else
      a[key] = bValue

mergePathMeta = (data1, data2) ->
  merged = {}

  for key,val of data1
    merged[key] = val

  for key,val of data2
    if merged[key]?
      merged[key] = mergeAccumulatedValue merged[key], val
    else
      merged[key] = val

  merged

module.exports =

  mergeAccumulatedValue: mergeAccumulatedValue

  mergeObject: mergeObject

  mergePathMeta: mergePathMeta


