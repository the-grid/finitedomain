# finitedomain [![Build Status](https://travis-ci.org/the-grid/finitedomain.svg?branch=master)](https://travis-ci.org/the-grid/finitedomain)

Finite domain [constraint solver](https://en.wikipedia.org/wiki/Constraint_logic_programming), originally based on [FD.js](https://github.com/srikumarks/FD.js/wiki/API).

This is very much a WIP.

API is bound to change, consider yourself warned.

## Installing

    npm install finitedomain

## Usage

For now, see the extensive [tests](./tests)

## Version

1.0.1:
- Support legacy style of domains in Solver, will convert them to a flat array of range pairs
- Improve input domain detection for early error reporting

1.0.0: Initial release