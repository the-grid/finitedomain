# Changelog for Finite Domain Solver (finitedomain)

## Unreleased

- Dropped support for `options.filter` and `options.var_filter_func`; simple truth is we weren't using them and they were causing overhead.
- Cleaned up config (`config` being the argument to `new Solver({..})` or `config_setOptions(config, {...})`)
  - `config.var` 
    - Dropped support for `var` as  a config property, replaced by `varStrategy`
    - Dropped support for `varStrategy` as a string (the name/type) or function (callback). For the name use the property. There is no alternative for the callback, you need to hardcode it.
    - `varStrategy` must always be an object
    - The property `varStrategy.dist_name` is replaced by `varStrategy.type`
    - The property `varStrategy.fallback_config` is replaced by `varStrategy.fallback`. The fallback is internally now recursively the exact same structure as the root `varStratConfig`.
  - `config.val`
    - Dropped support for `val` as a cofnig property, replaced by `valStrategy`
- Dropped the `callback` propagator, to return later. It was all kinds of messed up, anyways. This propagator was the only anomaly in the code and now we can run with more assumptions.
- Dropped support for custom `search` function option. May return later.
- Dropped support for `initial_vars` in the `Solver` constructor options
- Dropped support for `next_choice`. I don't think it was really exposed, but either way internally it doesn't exist anymore. Everything uses the same space factory now, until we need this functionality back.
- Removed the asmjs stuff introduced in v2.3.4 because the introduction of the (internal) soldom representation was causing too much confusion/trouble. It also has minification issues. You never really saw it, anyways. 
- Fixed domain_toList, which was skipping the upper half of bitdoms (`16` was hardcoded rather than using `SMALL_MAX_NUM` so this was an old bug...)
- Dropped api `Solver#setOption` because it was leading to confusing situations. You can set the options through the object for the `solve` call
- Remove `domain_removeNextFromList`, no longer used after value distributors were optimized
- Deprecated the config setting `varStratOverride` in favor of `varValueStrat` (as used with `solver.solve({...})`)
- Removed `addVar`, which was an internal artifact. Use `decl` (or `declRange`) instead and pass on those options as last param
- Added optional `options` param to `decl` to pass on distribution options
- Added `decls` to declare multiple vars with the same domain / options
- Added `declRange` as a minor optimization for preventing temporary arrays; `solver.decl('A', [1, 2], opts)` should be equivalent to `solver.declRange('A', 1, 2, opts)`
- Removed `constant`, deprecated in favor of `num`
- Dropped support for "legacy domains" for `decl` (those were the initial `[[lo, hi], [lo, hi], ...]` domains, arrays of arrays)
- Reverted the api where certain constraints would return a var name, preferring the anonymous var names if constants were passed on. Only constraints with a result var will return this constraint var. The others will return undefined.
- Drop support for `distribute` as a string for configuring value strategies, from now on the distribution strategy must be passed on as a `valtype` property on the `distributeOptions` object. The `distribute` property will throw to prevent legacy bugs.
- Markov matrix row boolean-getter property has been changed from `boolean` to `boolVarName`. It must still be undefined, a string, or a function returning a string. The `boolean` property now throws when set to anything.
- Markov matrix row boolean-getter method (`boolVarName` as a function, used to be `boolean` as a function) now receives no parameters when called. The renaming is partially to catch this change.
- The internal `boolId` property for a markov matrix row is renamed to something more obviously internal. The old property now throws if set to anything.

## v2.3.4:

- This release has internal low-level performance improvements for `domain_plus`, `domain_min`, `domain_minNum`, `domain_removeNextFromListNum`, `domain_createRangeZeroToMax`, `removeGte`, and `removeLte`. It also improves some propagator change detection.

## v2.3.3:

- Internal change only; applied Trie to a hot internal searching bit of code as well. Saves considerably.

## v2.3.2:

- Internal change only; implemented Trie for converting variable names to variable index. Huge savings on large input data sets at the cost of a little more memory.

## v2.3.1:

- Big optimization for large sets. Was doing many unnecessary `indexOf` lookups on the var names array which was bogging down the compilation phase considerably.
- No longer actively guarding for already existing variables if you have more than 20 vars. Otherwise still throws but the `indexOf` can be very expensive with little advantage.

## v2.3.0:

- Drop support for getting the targeted indexes through a callback
- Eliminated something internally that was redundant and causing a big perf regression; in other words the solver should run much faster now on large data
- Internal; eliminated targetedIndexes, merged the whole thing into `space.unsolvedVarIndexes`
- Internal; eliminated duplicate `isSolved` checks

## v2.2.1:

- Implement a compile-time optimization which eliminates constraints if their obsolescence can be determined by constants. This also reduces certain domains right off the bat. This optimization happens before calling `solve()`. Better noticable with large data sets.

## v2.2.0:

- Remove support for adding constraints with unknown variables. It was unused and made certain assumptions hard to enforce.
- (Internal) The `initial_vars` object in config is now an array
- Drop support for dynamically get the list of vars to target
- The `vars` option to target specific vars to be solved, should be an array of names or the string 'all'. Other values are ignored.
- Added `_debug` option to `Solver#solve` options to print out the configuration in a more human readable way. This supports the already existing `_debugConfig` and `_debugSolver`.

## v2.1.2:

- Fixed a bug where supplying an array as left var to the Solver constraint api would not properly translate as a constraint for each of the elements with the other params.
- Fixed a bug that disallowed solving a solved space again

## v2.1.1:

- Solver will now treat the empty list of targeted vars (`solver.solve({vars: []})`) equal to when that target is `"all"` (the default setting). In that case all non-anonymous vars are required to solve.
- Performance improvements (still wip)
- Propagators are now represented as more higher level "constraints" in the config. This allows for better exporting and analyzing of finitedomain search configurations. When a search starts the constraints "compile" to low level propagators, which are pretty much the same as before.

## v2.1.0:
 
- Major internal changes
  - Small domains, those whose max is 15 or below, are now represented as bitwise flags
  - Eliminated the fdvars as a class and instead internally only work with var indexes rather than their actual names. This allows the cloning process to be a simple slice rather than a shallow object copy.
- (Re-) Enable cutting away the header/footer of each file and concat everything to a single file for the dist build. Allows for much much better minification.
- Many internal refactorings and renaming which should not affect the outside world
- Major performance improvements

## v2.0.1:

- Fix `solver.isEq(A, B, 0)` which was ignoring the `0` and using a bool var, anyways
- Throw if the bool var as a number for any reifier is not zero or one
- Fix package.json not pointing to the right dist file name

## v2.0.0:

- Converted from CoffeeScript (back) to mainly ES5 and some ES6 module stuff
- Scaffold v0.0.5 (and some new stuff but not the react stuff)
- Fixed a few small bugs along the way, hopefully no regressions
- Added many tests and increased code coverage from 89% to 98%

## v1.3.2:

- (Internal) consolidate shared root space data into a new Config class, should hold static data which is shared between all nodes of a search tree
- Dropped support for the `search_defaults` option of `Solver#solve`, you can set the string to the `distribute` option of that call if you need it
- Disallow vars from being redeclared to prevent possible bugs. Before a var would be clobbered if you declared the same var name twice.
- Added `Solver#callback` which is used to read the current state and reject a search branch at an arbitrary point
- Fixed a bug in the value list distributor where `-1` would be picked if no value in the list occurs in the domain. It should notice the negative number as an error and reject but instead it did not scrub the value at all.
- Added a fallback distributor option, `fallback_dist_name`, for value list distributors. To be used when none of the values in the list occur in the current domain. This way you can use the list as a priority list instead of just a mask. This option is opt-in.

## v1.3.1:

- (Internal) removed scale_div and scale_mul as they were unused and will be replaced by something else soon
- Rename `Solver#times` to `Solver#ring_mul` for clarity, renamed `times` to `ring_mul` internally in other relevant places as well, this affects the external api but should not affect deps with the new prop
- Fix bug in domain division that could cause valid values to be omitted
- Added new `div` propagator, which assigns the result of `A / B` into a result var `C`
- Added new `mul` propagator, which assigns the result of `A * B` into a result var `C`
- Improved the domain division code. Before when dividing two ranges it would only include integers from the resulting range, meaning `[5,5]/[2,2]=[2.5,2.5]` resulted in an empty domain because there aren't any integers between `2.5` and `2.5`. The new option will floor the `lo` of the range such that this becomes `[2, 2.5]` and so `2` will be picked.
- Internally; removed the propagators for `scale`, `mul_plus`, and `wsum`; they were not used anywhere and we can add them back later if needed
- Added `min` propagator, which assigns the result of `A - B` into a result var `C`
- Allow the domain of `Solver#addVar` to be a plain number, to be expanded into the "solved" domain `[value, value]`
- Make `Solver#decl` return the name of the var being declared

## v1.3.0:

- The reified methods on Solver can no longer return REJECTED state for using a boolean var without zero or one in its domain, instead it simply throws when this happens.
- Support numbers or strings on some internal propagator creators and make them return more consistent values (`propagator_addReified`, `propagator_addEq`, `propagator_addLt`, `propagator_addGt`, `_propagator_addRing`, `propagator_add_scale`).
- Removed the PathSolver subclass and Bvar class and moved it to the right (private) repo

## v1.2.2:

- Remove debugging statements on large sets introduced in 1.2.1. Oops.

## v1.2.1:

- Added `inverted` option to the var list distributor which allows you to deprioritize variables (prefer vars not on the list or otherwise the lowest on the list)

## v1.2.0:

- Removed the silly `Space#inject` function. You probably didn't use it anyways (because, why?).
- Removed already deprecated Space#konst, #const, #decl, and #decls
- Refactored `Space` from a class to a static set of functions (internal change)

## v1.1.3:

- Make npm use the dist build by default

## v1.1.2:

- Add npm prepublish script so npm can distribute a dist build rather than from dev
- Internal update to how test target is determined

## v1.1.1:

- Fixed a bug where solver options were not properly passed on from `PathSolver` to its super, `Solver`

## v1.1.0:

- Added support for fallback var distributions so you can chain list > markov > size for var distributors
- Dropped browserify in favor of a custom concatenation technique
- Fixed the dist, made it faster and much smaller
- Internal breaking changes: some internal apis were renamed, should not affect external apis.
- Internal refactoring/restructuring
- Internal; proper use of `require` which hopefully helps tooling if nothing else

## v1.0.2:

- Added support for `expandVectorsWith` in Markov distribution
- Added support for `matrix[].row.boolean` to be the name of a variable, rather than the function to return this name, in Markov distributions
- Deprecating the `Solver.addVar()` option `distribute` in favor of option `distributeOptions.distribution_name`
- Fix Markov distributed variables being able to end up with invalid values (-> Added a Markov propagator, every Markov var gets one now)
- Added support for a `timeout_callback` in `Space`, which allows you to abort a search by returning `true` from a given function
- Add var distributor that prioritizes Markov variables
- Support var names to be passed on as string rather than a function to return that name, for `matrix.row` in variable distribution options
- Added `throw` distributors for variables and values which will unconditionally throw when ran. Used for testing.
- Internal refactoring/restructuring

## v1.0.1:

- Support legacy style of domains in Solver, will convert them to a flat array of range pairs
- Improve input domain detection for early error reporting

## v1.0.0:

Initial release