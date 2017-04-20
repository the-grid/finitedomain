# finitedomain [![Build Status](https://travis-ci.org/the-grid/finitedomain.svg?branch=master)](https://travis-ci.org/the-grid/finitedomain)

Finite domain [constraint solver](https://en.wikipedia.org/wiki/Constraint_logic_programming), originally based on [FD.js](https://github.com/srikumarks/FD.js/wiki/API).

This is very much a WIP.

API is bound to change, consider yourself warned.

## Installing

```
npm install finitedomain
```

## Usage

Find all numbers between 10 and 20 that are bigger than 14 and smaller than 17 and not 16. Contrived? Nah.

```es6
import Solver from 'finitedomain';

let solver = new Solver();

solver.decl('A', [10, 20]);
solver.gt('A', 14);
solver.lt('A', 17);
solver.neq('A', 16);
solver.solve();

console.log(solver.solutions); // -> [{A: 15}]
```

Or with a DSL:

```es6
import Solver from 'finitedomain';

let solver = new Solver().imp(`
  : A [10 20]
  A > 14
  A < 17
  A != 16
`);

solver.solve();

console.log(solver.solutions); // -> [{A: 15}]
```

For the DSL syntax see [the cfg](./docs/dsl.docs.txt).
For other details see the extensive [test suite](./tests).

## Tasks

There are a few grunt tasks and bash scripts hooked up to npm. This repo also uses git hooks for pre- and post commit hooks.

As a general rule, `./build` is used for any temporary output, including code coverage reports and temporary build files when producing a dist.

Then `./dist` only contains final builds (`./dist/finitedomain.dist.min.js` and for some tasks `./dist/browser.js`).

Note that both `./build` and `./dist` are cleared at the start of almost every (grunt) task.

(These tasks obviously require an `npm install`)

### Grunt tasks:

- `grunt clean`: removes `./dist` and `./build`
- `grunt build`: a direct alias for `dist`
- `grunt dist`: lint, test, build, and minify to produce a real dist build
- `grunt distq`: create a dist but skip linting, testing, and code coverage. Also produces a copy in `./dist/browser.js`
- `grunt distheat`: creates a dist but instead of minification as the last step it beautifies. Used for [HeatFiler](http://localhost/heatfiler/src/#run), a count based heatmap profiler. Copies to `browser.js`.
- `grunt distbug`: creates a build without removing test artifacts or minification. In case you need proper stack traces in other projects.
- `grunt coverage`: runs all tests in the code coverage tool
- `grunt test`: runs linting and all tests
- `grunt testq`: runs tests without linting
- `grunt watch:q`: runs `distq` whenever a file changes
- `grunt watch:h`: runs `distheat` whenever a file changes
- `grunt watch:b`: runs `distbug` whenever a file changes

### Bash / npm scripts:

- `npm run lint`: run eslint with dist config (slightly stricter than dev). Exits non-zero if it fails.
- `npm run lintdev`: run eslint with dev config (allows `console.log`, `debugger`, etc). No non-zero exit for failures.
- `npm run lintfix`: runs eslint in the fix mode
