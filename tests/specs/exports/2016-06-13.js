// from path_solver spec; "solver w/ rules: vars ~= var"
// regression; breaks while prepare()ing

let config = {
  _class: '$config',
  var_filter_func: 'unsolved',
  next_var_func: 'naive',
  next_value_func: 'min',
  targetedVars: 'all',
  targetedIndexes: 'all',
  var_dist_options: {},
  timeout_callback: undefined,
  all_var_names: ['0', '_ROOT_BRANCH_', '2', 'align', '4', 'text_align', 'size', 'cols', '8', '9', '10', '11'],
  all_constraints: [
    {_class: '$constraint', name: 'eq', varIndexes: [1, 0], param: undefined},
    {_class: '$constraint', name: 'gte', varIndexes: [3, 0], param: undefined},
    {_class: '$constraint', name: 'gte', varIndexes: [5, 0], param: undefined},
    {_class: '$constraint', name: 'gte', varIndexes: [6, 0], param: undefined},
    {_class: '$constraint', name: 'gte', varIndexes: [7, 0], param: undefined},
    {_class: '$constraint', name: 'reifier', varIndexes: [3, 0, 8], param: 'eq'},
    {_class: '$constraint', name: 'reifier', varIndexes: [1, 0, 9], param: 'eq'},
    {_class: '$constraint', name: 'gte', varIndexes: [8, 9], param: undefined},
    {_class: '$constraint', name: 'reifier', varIndexes: [7, 0, 10], param: 'eq'},
    {_class: '$constraint', name: 'reifier', varIndexes: [1, 0, 11], param: 'eq'},
    {_class: '$constraint', name: 'gte', varIndexes: [10, 11], param: undefined},
    {_class: '$constraint', name: 'neq', varIndexes: [5, 6], param: undefined},
    {_class: '$constraint', name: 'neq', varIndexes: [6, 6], param: undefined},
  ],
  constant_cache: {'1': '0', '2': '2', '3': '4'},
  initial_domains: [
    [1, 1],
    [0, 1],
    [2, 2],
    [1, 2],
    [3, 3],
    [1, 3],
    [1, 3],
    [1, 2],
    [0, 1],
    [0, 1],
    [0, 1],
    [0, 1],
  ],
};

export default config;
