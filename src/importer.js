// this is an import function for config
// it converts a DSL string to a $config
// see /docs/dsl.txt for syntax
// see exporter.js to convert a config to this DSL
import {
  SUB,
  SUP,
} from './helpers';
import Solver from './solver';

// BODY_START

function importer_main(str) {
  let solver = new Solver();

  let pointer = 0;
  let len = str.length;

  while (!isEof()) parseStatement();


  function read() {
    return str[pointer];
  }
  function skip() {
    ++pointer;
  }
  function consume() {
    return str[pointer++];
  }
  function is(c, desc) {
    if (read() !== c) throw new Error('Expected ' + (desc + ' ' || '') + '`' + c + '`, found `' + read() + '`');
    skip();
  }

  function skipWhitespaces() {
    while (pointer < len && isWhitespace(read())) skip();
  }
  function skipWhites() {
    while (pointer < len && isWhite(read())) skip();
  }
  function isWhitespace(s) {
    return s === ' ' || s === '\t';
  }
  function isNewline(s) {
    return s === ' ' || s === '\t' || s === '\n' || s === '\r';
  }
  function isWhite(s) {
    return isWhitespace(s) || isNewline(s);
  }
  function expectEol() {
    if (pointer >= len) return true;
    skipWhitespaces();
    if (!isNewline()) throw new Error('Expected EOL but got `' + read() + '`');
  }
  function isEof() {
    return pointer >= len;
  }

  function parseStatement() {
    // either:
    // - start with colon: var decl
    // - start with hash: line comment
    // - empty: empty
    // - otherwise: constraint

    skipWhites();
    switch (str[pointer]) {
      case ':': return parseVar();
      case '#': return skipComment();
      default:
        if (!isEof()) throw 'fixme'; // return parseConstraint();
    }
  }

  function parseVar() {
    skip(); // is(':')
    skipWhitespaces();
    let name = parseIdentifier();
    skipWhitespaces();
    let domain = parseDomain();
    skipWhitespaces();
    let alts = undefined;
    while (str.slice(pointer, pointer + 6) === 'alias(') {
      if (!alts) alts = [];
      alts.push(parseAlias(pointer += 6));
      skipWhitespaces();
    }
    let mod = parseModifier();
    expectEol();

    solver.decl(name, domain, mod);
    // TODO: declare the alts somehow and map them to the same var
  }

  function parseIdentifier() {
    // anything terminated by whitespace
    let start = pointer;
    while (!isWhite(read())) skip();
    if (start === pointer) throw new Error('Expected to parse identifier, found none');
    return str.slice(start, pointer);
  }

  function parseDomain() {
    // [lo hi]
    // [[lo hi] [lo hi] ..]

    is('[', 'domain start')
    skipWhitespaces();

    let domain = [];

    if (read() === '[') {
      do {
        skip();
        skipWhitespaces();
        let lo = parseNumber();
        skipWhitespaces();
        let hi = parseNumber();
        skipWhitespaces();
        is(']', 'range-end');
        skipWhitespaces();

        domain.push(lo, hi);
      } while (read() === '[');
    } else {
      skipWhitespaces();
      let lo;
      let hi;
      if (read() === '*') {
        lo = SUB;
        hi = SUP;
        skip();
      } else {
        lo = parseNumber();
        skipWhitespaces();
        hi = parseNumber();
      }
      skipWhitespaces();

      domain.push(lo, hi);
    }

    is(']', 'domain-end');

    if (domain.length === 0) throw new Error('Not expecting empty domain');

    return domain;
  }

  function parseAlias() {
    skipWhitespaces();

    let start = pointer;
    while (read() !== ')' && !isWhite(read())) skip();
    let alias = str.slice(start, pointer);
    if (!alias) throw new Error('The alias() can not be empty but was');

    skipWhitespaces();
    is(')', '`alias` to be closed by `)`');

    return alias;
  }

  function parseModifier() {
    if (read() !== '@') return;
    skip();

    let mod = {};

    let start = pointer;
    while (read() >= 'a' && read() <= 'z') skip();
    let stratName = str.slice(start, pointer);

    switch (stratName) {
      case 'list':
        parseList(mod);
        break;

      case 'markov':
        parseMarkov(mod);
        break;

        case 'max':
        case 'mid':
        case 'min':
        case 'minMaxCycle':
        case 'naive':
        case 'splitMax':
        case 'splitMin':
          break;

      default:
        throw new Error('Expecting a strategy name after the `@` modifier (`' + stratName + '`)');
    }

    mod.valtype = stratName;

    return mod;
  }

  function parseList(mod) {
    skipWhitespaces();
    if (str.slice(pointer, pointer+5) !== 'prio(') throw new Error('Expecting the priorities to follow the `@list`');
    pointer += 5;
    mod.list = parseNumList();
    is(')', 'list end');
  }

  function parseMarkov(mod) {
    while (true) {
      skipWhitespaces();
      if (str.slice(pointer, pointer + 7) === 'matrix(') {
        // TOFIX: there is no validation here. apply stricter and safe matrix parsing
        let matrix = str.slice(pointer + 7, pointer = str.indexOf(')', pointer));
        let code = 'return ' + matrix;
        let func = Function(code);
        mod.matrix = func();
        if (pointer === -1) throw new Error('The matrix must be closed by a `)` but did not find any');
      } else if (str.slice(pointer, pointer + 7) === 'legend(') {
        pointer += 7;
        mod.legend = parseNumList();
        is(')', 'legend closer');
      } else if (str.slice(pointer, pointer+7) === 'expand(') {
        pointer += 7;
        mod.expandVectorsWith = parseNumber();
        is(')', 'expand closer');
      } else {
        break;
      }
      skip();
    }
  }

  function skipComment() {
    skip(); //is('#', 'comment hash');
    while (!isEof() && !isNewline(read())) skip();
    if (!isEof()) skip();
  }

  function parseConstraint() {
    skipWhitespaces();
    let A = parseValue();
    skipWhitespaces();

    switch (str[pointer]) {
      case '?':
        if (str[pointer + 1] === '=') {
          ++pointer;
          // reifier
          // A ?= B @ C
          let B = parseValue();
          skipWhitespaces();
          let op = parseComparisonOp();
          skipWhitespaces();
          let C = parseValue();
          skipWhitespaces();

          switch (op) {
            case '==':
              return solver.isEq(B, C, A);
            case '!=':
              return solver.isNeq(B, C, A);
            case '<':
              return solver.isLt(B, C, A);
            case '<=':
              return solver.isLte(B, C, A);
            case '>':
              return solver.isGt(B, C, A);
            case '>=':
              return solver.isGte(B, C, A);
            default:
              throw new Error('Unknown reifier op: ' + op);
          }
        } else {
          throw new Error('Expecting reifier assignment `?=` found `?' + str[pointer] + '`');
        }
        break;

      case '=':
        if (str[pointer + 1] === '=') {
          ++pointer;
          let B = parseValue();
          solver.eq(A, B);
        } else {
          // A is a result of the B constraint (something that merely collects a result like addition, sum, etc)
          return parseInactiveConstraint(A);
        }
        break;

      case '!':
        if (str[pointer + 1] === '=') {
          ++pointer;
          let B = parseValue();
          solver.neq(A, B);
        } else {
          throw new Error('Expecting neq op `!=` found `!' + str[pointer] + '`');
        }
        break;

      case '<':
        if (str[pointer + 1] === '=') {
          ++pointer;
          let B = parseValue();
          solver.lte(A, B);
        } else {
          ++pointer;
          let B = parseValue();
          solver.lt(A, B);
        }
        break;

      case '>':
        if (str[pointer + 1] === '=') {
          ++pointer;
          let B = parseValue();
          solver.gte(A, B);
        } else {
          ++pointer;
          let B = parseValue();
          solver.gt(A, B);
        }
        break;

      case '#':
        skipComment();
        break;

      case '\n':
      case '\r':
        // `A` is an active constraint without result like distinct() or markov()
        // it should not have a result and so we can ignore it
        return;


      default:
        throw new Error('Expecting =, ?=, #, a constraint op, or EOL after the first constraint value, found: `' + str[pointer] + '`');
    }
  }

  function parseComparisonOp() {
    switch (str[pointer]) {
      case '=':
        if (str[pointer + 1] === '=') return '==';
        break;
      case '!':
        if (str[pointer + 1] === '=') return '!=';
        break;
      case '<':
        if (str[pointer + 1] === '=') return '<=';
        return '<';
      case '>':
        if (str[pointer + 1] === '=') return '>=';
        return '>';
      default:
    }
    throw new Error('Invalid binary op start: `' + str[pointer] + str[pointer + 1] + '`');
  }

  function parseNumber() {
    let start = pointer;
    while (read() >= '0' && read() <= '9') skip();
    if (start === pointer) {
      throw new Error('Expecting to parse a number but did not find any digits [' + start + ',' + pointer + ']['+read()+']');
    }
    return parseInt(str.slice(start, pointer), 10);
  }

  function parseNumstr() {
    let start = pointer;
    while (str[pointer] >= '0' && str[pointer] <= '9') ++pointer;
    return parseInt(str.slice(start, pointer), 10);
  }

  function parseNumList() {
    let nums = [];

    skipWhitespaces();
    let numstr = parseNumstr();
    while (numstr) {
      nums.push(parseInt(numstr, 10));
      skipWhitespaces();
      if (str[pointer] === ',') {
        ++pointer;
        skipWhitespaces();
      }
      numstr = parseNumstr();
    }

    if (!nums.length) throw new Error('Expected to parse a list of at least some numbers but found none');
    return nums;
  }

  function parseValue() {
    // variable name (maybe with parens)
    // number
    // group

    if (str[pointer] === '(') {
      let result = parseConstraint();
      if (!result) throw new Error('A group should wrap a constraint that has a result var (implicit or explicit)');
      return result;
    }

    if (str[pointer] >= '0' && str[pointer] <= '9') {
      return parseNumber();
    }

    let ident = parseIdentifier();
    if (str[pointer] === '(') {
      return parseCall(ident);
    }
    return ident;
  }

  function parseInactiveConstraint(C) {
    // this is the rhs of `C = ...` like:
    // - `C = A + B`
    // - `C = sum(...)`
    // - `C = (X + Y) < Z`
    // - `5 = A + B`
    // - `C = 10 <? A
    // the rhs is supposed to be "inactive" insofar that it's not a constraint by itself



    return parseCall(result);
  }

  function parseCall(ident) {
    switch (ident) {
      case 'sum':
      case 'product':

      case 'distinct':
      case 'markov':

    }
  }

}

// BODY_STOP

export default importer_main;
