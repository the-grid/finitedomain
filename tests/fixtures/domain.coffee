SUP = 100000

spec_d_create_range = (lo, hi) ->
  return [lo, hi]
spec_d_create_ranges = (ranges...) ->
  arr = []
  ranges.forEach (range) -> arr.push range[0], range[1]
  return arr
spec_d_create_value = (value) ->
  return [value, value]
spec_d_create_list = (list) ->
  arr = []
  list.forEach (value) -> arr.push value, value
  return arr
spec_d_create_zero = ->
  return [0, 0]
spec_d_create_one = ->
  return [1, 1]
spec_d_create_full = ->
  return [0, SUP]
spec_d_create_bool = ->
  return [0, 1]

module.exports = {
  spec_d_create_range
  spec_d_create_ranges
  spec_d_create_value
  spec_d_create_list
  spec_d_create_zero
  spec_d_create_one
  spec_d_create_full
  spec_d_create_bool
}
