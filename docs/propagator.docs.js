/**
 * @typedef {Object} $propagator
 * @property {string} name
 * @property {number} index1
 * @property {number} [index2=-1]
 * @property {number} [index3=-1]
 * @property {string} [arg1='']
 * @property {string} [arg2='']
 *
 * A propagator is a runtime artifact that represents, implements, and
 * enforces constraints. Most clearly resemble their original constraint
 * but some don't. Some constraints may result in multiple propagators
 * in an attempt to optimize the search or simply to break a large problem
 * down into smaller pieces. For example; a "distinct" constraint results
 * in multiple, chained, "neq" propagators. Addition ends up in three
 * propagators (one for addition, two for subtraction) for optimization.
 *
 * The propagator has a specific structure that we can't define in JSDoc
 * syntax. It is a regular array in the form;
 *
 * [propagatorName, [varIndexes], ...args]
 *
 * The var names are the arguments to the propagator. Most have two. Those
 * whose operation is reflected in a result var will have three. There are
 * some exceptions.
 *
 * Some vars have more parameters, like reified specifying the name of the
 * operation and inverted operation they reflect.
 */
