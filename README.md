# finitedomain [![Build Status](https://travis-ci.org/the-grid/finitedomain.svg?branch=master)](https://travis-ci.org/the-grid/finitedomain)

Finite domain [constraint solver](https://en.wikipedia.org/wiki/Constraint_logic_programming), originally based on [FD.js](https://github.com/srikumarks/FD.js/wiki/API).

This is very much a WIP.

API is bound to change, consider yourself warned.

## Installing

    npm install finitedomain

## Usage

For now, see the extensive [tests](./tests)

## Building

Use `grunt dist` (after `npm install`) to compile everything. Intermediate build files can be found in `/build`. This build is tentatively tested and afterwards a minified final build is put in `/dist/finitedomain.min.js`.

## Version

1.3.1:
- (Internal) removed scale_div and scale_mul as they were unused and will be replaced by something else soon
- Rename `Solver#times` to `Solver#mul` for clarity, renamed `times` to `mul` internally in other relevant places as well
- Fix bug in domain division that could cause valid values to be omitted
- Added `div` propagator, which assigns the result of `A / B` into a result var `C`
- Added `mul` propagator, which assigns the result of `A * B` into a result var `C`
- Renamed the old `mul` propagator artifacts to `ring_mul` where needed, this affects the external api but should not affect deps
- Improved the domain division code. Before when dividing two ranges it would only include integers from the resulting range, meaning `[5,5]/[2,2]=[2.5,2.5]` resulted in an empty domain because there aren't any integers between `2.5` and `2.5`. The new option will floor the `lo` of the range such that this becomes `[2, 2.5]` and so `2` will be picked.
- Internally; removed the propagators for `scale`, `mul_plus`, and `wsum`; they were not used anywhere and we can add them back later if needed
- Added `min` propagator, which assigns the result of `A - B` into a result var `C`
- Allow the domain of `Solver#addVar` to be a plain number, to be expanded into the "solved" domain `[value, value]`
- Make `Solver#decl` return the name of the var being declared

1.3.0:
- The reified methods on Solver can no longer return REJECTED state for using a boolean var without zero or one in its domain, instead it simply throws when this happens.
- Support numbers or strings on some internal propagator creators and make them return more consistent values (`propagator_add_reified`, `propagator_add_eq`, `propagator_add_lt`, `propagator_add_gt`, `_propagator_add_ring`, `propagator_add_scale`).
- Removed the PathSolver subclass and Bvar class and moved it to the right (private) repo

1.2.2:
- Remove debugging statements on large sets introduced in 1.2.1. Oops.

1.2.1:
- Added `inverted` option to the var list distributor which allows you to deprioritize variables (prefer vars not on the list or otherwise the lowest on the list)

1.2.0:
- Removed the silly `Space#inject` function. You probably didn't use it anyways (because, why?).
- Removed already deprecated Space#konst, #const, #decl, and #decls
- Refactored `Space` from a class to a static set of functions (internal change)

1.1.3:
- Make npm use the dist build by default

1.1.2:
- Add npm prepublish script so npm can distribute a dist build rather than from dev
- Internal update to how test target is determined

1.1.1:
- Fixed a bug where solver options were not properly passed on from `PathSolver` to its super, `Solver`

1.1.0:
- Added support for fallback var distributions so you can chain list > markov > size for var distributors
- Dropped browserify in favor of a custom concatenation technique
- Fixed the dist, made it faster and much smaller
- Internal breaking changes: some internal apis were renamed, should not affect external apis.
- Internal refactoring/restructuring
- Internal; proper use of `require` which hopefully helps tooling if nothing else

1.0.2:
- Added support for `expandVectorsWith` in Markov distribution
- Added support for `matrix[].row.boolean` to be the name of a variable, rather than the function to return this name, in Markov distributions
- Deprecating the `Solver.addVar()` option `distribute` in favor of option `distributeOptions.distribution_name`
- Fix Markov distributed variables being able to end up with invalid values (-> Added a Markov propagator, every Markov var gets one now)
- Added support for a `timeout_callback` in `Space`, which allows you to abort a search by returning `true` from a given function
- Add var distributor that prioritizes Markov variables
- Support var names to be passed on as string rather than a function to return that name, for `matrix.row` in variable distribution options
- Added `throw` distributors for variables and values which will unconditionally throw when ran. Used for testing.
- Internal refactoring/restructuring

1.0.1:
- Support legacy style of domains in Solver, will convert them to a flat array of range pairs
- Improve input domain detection for early error reporting

1.0.0: Initial release