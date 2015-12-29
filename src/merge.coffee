module.exports = (FD) ->

  {
    ASSERT
  } = FD.helpers

  merge_accumulated_value = (val1, val2) ->
    if typeof val1 is 'number'
      ASSERT typeof val2 is 'number'
      return val1 + val2

    if val1 instanceof Array
      results = []
      for v in val1
        results.push v

      for v in val2
        if results.indexOf(v) < 0
          results.push v

      return results

    throw new Error "mergeAccumulatedValue unknown args: #{val1}, #{val2}"

  merge_path_meta = (data1, data2) ->
    merged = {}

    for key,val of data1
      merged[key] = val

    for key,val of data2
      if merged[key]?
        merged[key] = merge_accumulated_value merged[key], val
      else
        merged[key] = val

    return merged

  FD.merge_path_meta = merge_path_meta
