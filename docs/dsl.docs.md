# Finitedomain DSL

This document describes the finitedomain DSL.

See [dsl.cfg.txt](dsl.cfg.txt) for a CFG for a syntactical specification.

The DSL was designed to support finitedomain, a finite domain constraint solver, and serve as input rather than using JS api's to do the same. As such the language is a constraint language, albeit a bit limited to the capabilities of the finitedomain library.

# Comment

A comment starts with `#` and unconditionally runs through the end of the line.

# Values

The most important type of value will be a domain and a literal.

## Literal

A literal is trivial to use; just use the number as is. It cannot start with zero. There are no special prefixes for numbers and there can only be integers.

## Domain

A domain is basically a bracketed list of ranges. Ranges are inclusive, so the low and high value of each range is to be included in the domain.

You can wrap each range in additional brackets though this is optional. You can add comma's between the numbers though this is optional as well.

```
[0 10]           # a domain with {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
[[0 10]]         # same as [0 10]
[0 0]            # domain with only one value: 0
[0 0 2 2]        # domain with two values: {0, 2}
[[0 0] [2 2]]    # same as [0 0 2 2]
[[299, 3000], [4000, 5000]]
```

The maximum value of a domain is a hardcoded number, currently at `100000000` (aliased as `SUP` in `src/helpers.js`).

Internally domains can have three different representations but for the dsl you don't have to worry about that.

## Star

The star is a shorthand for creating a domain with all valid supported values. In other words it represents the domain `[SUB, SUP]` (`[0, 100000000]`).

```
: A, B *
```

# Defining variables

You can declare variables explicitly by opening with a colon, then followed by one or multiple (comma delimited) names, the initial domain, and followed by some optional modifiers.

```
: A [0 10]
: A, B [0 1]
: A [0 1] alias(foo)
: A [0 1] strat(min)
```

Note that certain modifiers like `alias()` only work with on variable at the same time. Declaring `: A, B [0 1]` does NOT alias `A` and `B` but declares two individual vars.

You can use an actual domain, a star, and a literal to initialize the variables.

You can put a `=` between the variable name and the initializer, though this is optional:

```
: A = [0 10]
```

Any var declaration happens on a single line. There is no support for spreading a declaration over multiple lines. There is no support for multiple colon declarations on the same line.

## Modifiers

### Alias

With `alias()`, which takes an arbitrary number of identifiers, you can associate an alias to the variable being declared. These aliases may be used by finitedomain, mainly for debugging purposes.

### Strategies

You can declare several variable strategies by applying their particular modifier. Only the last modifier is used. Modifiers start with an `@`. Some modifiers have additional data to follow in any order.

These are the modifiers that don't have any args and just appear as keywords:

```
: A * @max           # when forcing, pick max(A)
: B * @min           # when forcing, pick min(A)
: C * @mid           # when forcing, pick the middle element of A
: D * @minMaxCycle   # when forcing, alternate between picking min(A) and max(A)
: E * @naive         # defaults to `min`, so min(A)
: F * @splitMax      # a "devide and conquer" approach that first explores the higher half of the domain
: G * @splitMin      # a "devide and conquer" approach that first explores the lower half of the domain
```

There is also `list`, which is an ordered list of values to choose when forcing. When forcing the first value in the list that also still appears in the domain is picked. These values are to be passed on in a `prio` list and should only contain literals. When the list is depleted the system falls back to `naive`.

```
: A [0 10] @list prio(5 8 3 1 2)
```

The last one is `markov`, which is a complex type that is used "as is". Markov strategies allow you to implement certain probabilistic ways of determining the next value when forcing. The actual value is defined elsewhere. The dsl simply supports accepting a JSON which is deserialized and used as is. Additionally there are three more parameter keywords to define other parameters of the markov strat: `matrix`, `legend`, and `expand`.

Note that `matrix` is not thoroughly parsed but rather `eval`ed and its result used as is. This makes the whole thing "unsafe" from untrusted sources. The only way around that is to be more explicit about the payload which was a bit beyond the scope of this dsl.

```
: A [0 100] alias(V1) @markov legend(10,100) matrix([{vector:[1,0],_boolVarIndex:2},{vector:[0,1]}])
: B [0 20] @markov list(16 20)
: C [0 20] @markov list(16 20) legend(
```

An alternative way to declare markovs, especially when exporting from the existing framework, is to declare the var and later set the distributor:

```
: somevar [0 100]
@custom set-valdist somevar {"valtype":"markov","matrix":[{"boolVarName":"__9129__","vector":[0,0,0,0,0,0,0,0,0,0,10,10,10,10,10,1,10,10,10,1,10,1000,200,200,400,800,1600,400,800,1600,400,400,400,400,400,200,400,800,1600,600,600,600,200,200,400,200,200,200,200,200,200,200,400,800,800,1000,1000,200,300,10,200,200,800,1600,3200,200,200,3200,200,200,200,200,200,200,200,200,200,200,2000,1600,2600,2600,2600,3600,3600,3600,4600,4600,4600,4600,0.1,0.1,0.1,0.1],"_boolVarIndex":9129},{"boolVarName":"__7640__","vector":[0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,10000,10000,10000,1,1,1,1,1,1,1,1,1,10000,1,1,10000,1,1,10000,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0.1,0.1,0.1,0.1],"_boolVarIndex":7640},{"vector":[0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,400,400,400,400,400,100,100,400,400,100,400,1000,200,200,400,800,1600,400,800,1600,400,400,400,400,400,200,400,800,1600,600,600,600,200,200,400,200,200,200,200,200,200,200,400,800,800,1000,1000,200,300,200,200,200,800,1600,3200,200,200,3200,200,200,200,200,200,200,200,200,200,200,2000,1600,2600,2600,2600,3600,3600,3600,8600,8600,8600,8600,0.1,0.1,0.1,0.1]}],"legend":[4,6,5,1,3,7,8,2,9,10,11,13,12,14,22,23,15,17,20,16,21,27,28,29,33,34,35,30,31,32,36,37,45,46,47,41,42,43,44,39,38,40,48,55,52,53,54,59,60,56,57,58,18,19,24,25,26,61,62,63,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,49,50,51,90,91,92,93,94,95,96,97]}
```

This is a shorthand way that declares all the markov things at once.

# Defining constraints

A constraint is a condition that must be held between two or more domains once they are reduced to a single value. This is slightly different from regular programming.

```
A <= B            # whatever value A ends up being, it must be lesser than or equal to B and if that's impossible the problem rejects as a whole
```

## Strict and boolean equality

Assignments are in particular confusing for constraints that have a valuation, most notably reifiers, logical constraints, and mathematical constraints:

```
R = A ==? B
S = A + B
nall(A B)
```

In these cases `S` and `R` aren't being "assigned" to, but rather they should be seen as an additional equality constraint; in the solution `R` must reflect the result of whether `A` equals `B`. And `S` must reflect the result of `A + B`, whatever they solve to. The `nall` ("not all") only forces its args such that at least one of them ends up `0`.

There are two distinctions made here; strict equality and boolean equality. The boolean equality means the result is to be either zero or non-zero, where the actual non-zero value is irrelevant (truthy/falsy). All reifiers (constraints with a `?`) have boolean equality as their result. Some constraints, like `nall` and `all?`, also apply this principle to their arguments. For example, `all?` results in truthy when all of its arguments end up non-zero.

This is an important change from before; reifiers don't return absolutely `0` or `1`, although they still exhibit this same behavior for strictly boolean domains (`[0 1]`). It's only when the domain is not strictly boolean, like `[0 100]` that a truthy result ends up as `[1 100]` while a falsy result still ends up being `0`.

Note that for implicit variables, only allowed as assignment left hand side, the default domain is strictly boolean `[0 1]` when the right hand side of the assignment is a reifier and a wide domain `[SUB SUP]` otherwise.

```
: B, C, D, X, Y [0 10]
A = product(B C D)   # A initialized as [SUB SUP]
R = X ==? Y          # R initialized as [0 1]
FAIL = Q ==? P       # error because Q and P are not known and implicit vars can only appear to the left of `=`
```

## Single line

All constraints should be put on a single line. There is currently no support for spreading a constraint over multiple lines. Neither is there support for multiple constraints on the same line.

# Constraints

There are a bunch of constraints available to you. We'll briefly discuss them next.

Note that all constraints can be used with variables, literals, domains, or even the result of value-returning constraints. Do keep in mind that any non-constant creates an additional variable under water.

## eq (`==`)

The result of two values under eq is that they must resolve to the same value.

If both side is a variable then one will be made an alias, the other is updated to the intersection of both variables, and the two will be considered identical for the remaining problem. Afterwards both variables are forced to be equal in the solution.

If at least one side is a literal then the constraint is immediately resolved.

```
A == B
15 == C
```

Note that there is no `===` in this system.

## neq (`!=`)

The opposite of eq, though more involved since the constraint can only be resolved once at least one var is reduced to a single value.

If at least one side is a literal then the constraint is immediately resolved.

```
A != B
C != 15
```

Note that there is no `!==` in this system.

## lt (`<`)

The result of two values under lt is that the left value must end up lower than the right value.

If at least one side is a literal then the constraint is immediately resolved.

```
A < B
15 < C
```

## lte (`<=`)

The result of two values under lte is that the left value must end up lower than or equal to the right value.

If at least one side is a literal then the constraint is immediately resolved.

```
A <= B
15 <= C
```

## gt (`>`)

The result of two values under gt is that the left value must end up higher than the right value.

If at least one side is a literal then the constraint is immediately resolved.

```
A < B
15 < C
```

Note that internally the `A>B` is mapped to `B<A`.

## gte (`>=`)

The result of two values under lte is that the left value must end up lower than or equal to the right value.

If at least one side is a literal then the constraint is immediately resolved.

```
A <= B
15 <= C
```

Note that internally the `A>=B` is mapped to `B<=A`.

## plus (`+`)

The result var should resolve to the sum of the left and right side of the `+`.

```
R = A + B
```

Note that this can be a lossy operation. In particular any value `A + B` that exceeds `SUP` is silently dropped. So while there may theoretically be a solution to `A + B`, it may still silently end up in an empty domain when the numbers are too big. There's no real way around this, limits are limits.

When values are OOB they are simply cropped, so if there are still valid values left the problem won't be rejected.

```
R = 100000000 + 5  # R cannot be SUP+5
```

## minus (`-`)

The result var should resolve to the reduction of the right value from the left value.

```
R = A - B
```

Note that this can be a lossy operation. In particular any value `A - B` that drops below `SUB` (`0`) is silently dropped. So while there may theoretically be a solution to `A - B`, it may still silently end up in an empty domain when the numbers are too big. There's no real way around this, limits are limits. The library can't deal with negative numbers.

When values are OOB they are simply cropped, so if there are still valid values left the problem won't be rejected.

```
R = 5 - 6  # empty domain
```

## mul (`*`)

The result var should resolve to the product of the left and right side of the `*`.

```
R = A * B
```

Note that this can be a lossy operation. In particular any value `A * B` that exceeds `SUP` is silently dropped. So while there may theoretically be a solution to `A * B`, it may still silently end up in an empty domain when the numbers are too big. There's no real way around this, limits are limits.

When values are OOB they are simply cropped, so if there are still valid values left the problem won't be rejected.

```
R = 100000000 * 5  # R cannot be SUP*5
```

## div (`\`)

The result var should resolve to the division of the right value by the left value.

```
R = A / B
```

Of the four, this is the most devastating in terms of being lossy. Obviously finitedomain cannot deal with fractions so any integer divisions resulting in fractions are dropped.

```
R = 5 / 4      # empty domain because 5/4=1.25
R = [4 5] / 4  # R=1 because 4/4=1 and 5/4=1.25, but the fraction is dropped so the result is [1 1]
```

Additionally, divisions by zero are suppressed and their result also removed. They should not throw an error or cause rejections.

## sum (`sum(...)`)

A sum is a pyramid of plus constraints.

```
R = sum(A B C D)
```

Internally it will solve `R` to a value that equals `A + B + C + D`. Be aware that this is a heavy operation:

```
R = sum(A B C D)
# internally translates to:
R1 = A + B
R2 = C + D
R = R1 + R2
# more vars means more constraints and temporary variables and a bigger pyramid
```

Note that `sum()` results in `0`.

## product (`product(...)`)

A product is a pyramid of mul constraints.

```
R = product(A B C D)
```

Like sum, internally product solves `R` to a value that equals `A * B * C * D`.

```
R = sum(A B C D)
# internally translates to:
R1 = A * B
R2 = C * D
R = R1 * R2
# more vars means more constraints and temporary variables and a bigger pyramid
```

Note that `product()` results in `1`.

## distinct (`distinct(...)`)

A distinct is a pyramid of neq constraints.

```
distinct(A B C D)
```

This constraints generates an factorial number of constraints (`n!`) because it has to do an neq between every unique argument.

```
distinct(A B C D)
# ->
A != B
A != C
A != D
B != C
B != D
C != D
```

## and (`&`)

An and forces both arguments to be non-zero. It is mostly an artifact for the sake of completeness and to support intermediate generated representation.

This constraint is like saying "I want to use both variables".

```
: A, B [0 10]
A & B           # just forces A and B to [1 10]
```

## or (`|`)

An or forces at least one argument to be non-zero.

This constraint is like saying "I want to use at least one of the two variables".

```
: A, B [0 10]
A | B           # either A or B cannot solve to zero, but they can both be non-zero
```

## xor (`^`)

An exclusive or (xor) forces one argument to be non-zero and the other variable to be zero.

This constraint is like saying "I only want to use exactly one of the two variables".

```
: A, B [0 10]
A ^ B           # A=0 and B>0 or B=0 and A=0
```

## nand (`!&`)

A nand, the opposite of an and, forces at least one argument to be zero.

This constraint is like saying "I don't want both of the variables and maybe neither".

```
: A, B [0 10]
A !& B           # A=0 or B=0 or (A=0 and B=0)
```

## xnor (`!^`)

A xnor, the opposite of a xor, forces both arguments to be zero or both arguments to be non-zero.

This constraint is like saying "I either want both args to be on or off", or so called "bi-implication"; "if one arg is on, so is the other but if one arg is off so is the other".

```
: A, B [0 10]
A !^ B           # (A=0 and B=0) or (A>0 and B>0)
```

## nall (`nall(...)`)

A nall is basically a nand on more than two args simultaneously.

This is like saying "I want at least one of these args off".

```
: A, B, C, D [0 10]
nall(A B C D)    # A=0 or B=0 or C=0 or D=0
```

## reifiers

A reifier is a constraint that reflects the state of a constraint between two or more variables, rather than enforcing the actual constraint.

Keep in mind that the reifier does act as a constraint once the result is resolved. So if an `==?` reifier has a result that solves to `0`, the reifier will enforce the opposite of `==?` to the arguments.

The reifiers all end with a question mark, even the ones that take a list.

The result var for each reifier is a booly, this used to be a strict boolean. The main difference is that the result is only forced to "zero or non-zero", but the actual value for "non-zero" is irrelevant. This is similar to truthy and falsy. Of course if you still want stict booleans that still works too since `1` is also "any non-zero value".

### iseq (`==?`)

Reflect whether the eq constraint holds between two vars.

```
R = A ==? B
```

### isneq (`!=?`)

Reflect whether the neq constraint holds between two vars.

```
R = A !=? B
```

### islt (`<`)

Reflect whether the lt constraint holds between two vars.

```
R = A <? B
```

### islte (`<=`)

Reflect whether the lte constraint holds between two vars.

```
R = A <=? B
```

### isgt (`>`)

Reflect whether the gt constraint holds between two vars.

```
R = A >? B
```

Note that internally this is immediately mapped to an islt.

### isgte (`>=`)

Reflect whether the gte constraint holds between two vars.

```
R = A >=? B
```

Note that internally this is immediately mapped to an islte.

### isall (`all?(..)`)

Reflect whether all the args are non-zero. If any arg is zero then the result is zero. Otherwise the result is non-zero.

```
R = all?(A B C D)
```

### isnall (`nall?(..)`)

Reflect whether at least one arg is zero. If any arg is zero then the result is non-zero. Otherwise the result is zero.

```
R = nall?(A B C D)
```

### isnone (`none?(..)`)

Reflect whether all the args are zero. If any arg is non-zero then the result is zero. Otherwise the result is non-zero.

```
R = none?(A B C D)
```

# Grouped value constraints

You can fold constraints together if you want to. 

It is important to note that when necessary this will still create temporary variables for each group behind the scenes.

```
(A ==? B) <= C
```

For parser ambiguity reasons you must wrap constraints in parenthesis if you want to use their result immediately inside another constraint, even for lists.

```
R >= sum(A B C)     # error
R >= (sum(A B C))   # ok
```

# Custom directives

For special cases the dsl supports a `@custom` directive, whose args are to be interpreted specifically by the library using it. This allows to support things that should not be codified in the language itself.

Now follow some examples used in this particular library.

## var-strat

Allows setting up all the var strategies collectively as exported by finitedomain (the arg will be a json)

```
@custom var-strat {...}
```

## val-strat

Allows setting a general default value strategy for vars that don't have an explicit strategy. This strategy is applied when forcing a variable to a certain solution, not while deducing.
 
```
@custom val-strat min
@custom val-strat max
```

Note that for testing there is a special strategy called `throw`. This will throw a debug message if the problem is not solved after deductions but before calling finitedomain. It is used for testing the deduction system.

```
@custom val-strat throw
```

## set-valdist

Allows overriding the value distribution strategy for one variable specifically.

```
@custom set-valdist A min
```

The value can also be a json which should match the expected struct as used by finitedomain.

## noleaf

This is a debugging symbol used to test the deduction system. Specifically it compiles a bogus noop debug constraint tied to each variable passed on. Currently the only purpose of this constraint is to prevent a subsystem from aggressively pruning the variable when it would otherwise do so. This is required to test certain tricks.

```
@custom noleaf A B C
```

## free

This is a debugging symbol that ensures there is exactly this many bytes free in the ML. Used for certain tests to check whether they deal with OOM cases properly.

```
@custom free 100      # compiles 100 unused bytes into the ML
@custom free 0        # ensures there is (initially) no free space in the ML
```

## targets

This is ignored at the moment but soon will be used to determine which variables are actually targeted. If there are a million vars and the caller needs only a valuation for 100 of them then the system can probably find a solution faster.

```
@custom targets all
@custom targets(A B C D)
```

Note: if there are actually vars they must be wrapped in parens, even one. This is to distinguish "all" from an actual var name.


