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

  return solver;

  function read() {
    return str[pointer];
  }
  function skip() {
    ++pointer;
  }
  function is(c, desc) {
    if (read() !== c) throw new Error('Expected ' + (desc + ' ' || '') + '`' + c + '`, found `' + read() + '`');
    skip();
  }

  function skipWhitespaces() {
    while (pointer < len && isWhitespace(read())) skip();
  }
  function skipWhites() {
    while (!isEof()) {
      let c = read();
      if (isWhite(c)) {
        skip();
      } else if (isComment(c)) {
        skipComment();
      } else {
        break;
      }
    }
  }
  function isWhitespace(s) {
    return s === ' ' || s === '\t';
  }
  function isNewline(s) {
    // no, I don't feel bad for also flaggin a comment as eol :)
    return s === '\n' || s === '\r';
  }
  function isComment(s) {
    return s === '#';
  }
  function isWhite(s) {
    return isWhitespace(s) || isNewline(s);
  }
  function expectEol() {
    skipWhitespaces();
    if (pointer >= len) return true;
    let c = read();
    if (c === '#') {
      skipComment();
    } else if (isNewline(c)) {
      skip();
    } else {
      throw new Error('Expected EOL but got `' + read() + '`');
    }
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
        if (!isEof()) return parseUndefConstraint();
    }
  }

  function parseVar() {
    skip(); // is(':')
    skipWhitespaces();
    let name = parseIdentifier();
    skipWhitespaces();
    let domain = parseDomain();
    skipWhitespaces();
    let alts;
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
    while (!isEof() && !isWhite(read()) && read() !== '(' && read() !== ')' && read() !== ',') skip();
    if (start === pointer) throw new Error('Expected to parse identifier, found none');
    return str.slice(start, pointer);
  }

  function parseDomain() {
    // [lo hi]
    // [[lo hi] [lo hi] ..]

    is('[', 'domain start');
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
    while (true) {
      let c = read();
      if (c === ')') break;
      if (isNewline(c)) throw new Error('Alias must be closed with a `)` but wasnt (eol)');
      if (isEof()) throw new Error('Alias must be closed with a `)` but wasnt (eof)');
      skip();
    }
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
    if (str.slice(pointer, pointer + 5) !== 'prio(') throw new Error('Expecting the priorities to follow the `@list`');
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
        let func = Function(code); /* eslint no-new-func: "off" */
        mod.matrix = func();
        if (pointer === -1) throw new Error('The matrix must be closed by a `)` but did not find any');
      } else if (str.slice(pointer, pointer + 7) === 'legend(') {
        pointer += 7;
        mod.legend = parseNumList();
        skipWhitespaces();
        is(')', 'legend closer');
      } else if (str.slice(pointer, pointer + 7) === 'expand(') {
        pointer += 7;
        mod.expandVectorsWith = parseNumber();
        skipWhitespaces();
        is(')', 'expand closer');
      } else {
        break;
      }
      skip();
    }
  }

  function skipComment() {
    is('#', 'comment start'); //is('#', 'comment hash');
    while (!isEof() && !isNewline(read())) skip();
    if (!isEof()) skip();
  }

  function parseUndefConstraint() {
    // parse a constraint that does not return a value itself

    // first try to parse single value constraints without value like markov() and distinct()
    if (parseUexpr()) return;

    // so the first value must be a value returning expr
    let A = parseVexpr(); // returns a var name or a constant value

    skipWhitespaces();
    let cop = parseCop();
    skipWhitespaces();
    switch (cop) {
      case '=':
        parseAssignment(A);
        break;

      case '==':
        solver.eq(A, parseVexpr());
        break;

      case '!=':
        solver.neq(A, parseVexpr());
        break;

      case '<':
        solver.lt(A, parseVexpr());
        break;

      case '<=':
        solver.lte(A, parseVexpr());
        break;

      case '>':
        solver.gt(A, parseVexpr());
        break;

      case '>=':
        solver.gte(A, parseVexpr());
        break;

      default:
        if (cop) throw new Error('Unknown constraint op: [' + cop + ']');
    }

    expectEol();
  }

  function parseAssignment(C) {
    let A = parseVexpr(C);
    skipWhitespaces();
    let c = read();
    if (isEof() || isNewline(c) || isComment(c)) return A; // any group without "top-level" op (`A=(B+C)`), or sum() etc
    return parseAssignRest(A, C);
  }

  function parseAssignRest(A, C) {
    // note: if Solver api changes this may return the wrong value...
    // it should always return the "result var" var name or constant
    // (that would be C, but C may be undefined here and created by Solver)

    let rop = parseRop();
    skipWhitespaces();
    switch (rop) {
      case '==?':
        return solver.isEq(A, parseVexpr(), C);
      case '!=?':
        return solver.isNeq(A, parseVexpr(), C);
      case '<?':
        return solver.isLt(A, parseVexpr(), C);
      case '<=?':
        return solver.isLte(A, parseVexpr(), C);
      case '>?':
        return solver.isGt(A, parseVexpr(), C);
      case '>=?':
        return solver.isGte(A, parseVexpr(), C);
      case '+':
        return solver.plus(A, parseVexpr(), C);
      case '-':
        return solver.minus(A, parseVexpr(), C);
      case '*':
        return solver.times(A, parseVexpr(), C);
      case '/':
        return solver.div(A, parseVexpr(), C);
      default:
        if (rop !== undefined) throw new Error('Unknown rop: `' + rop + '`');
        return A;
    }
  }

  function parseCop() {
    let c = read();
    switch (c) {
      case '=':
        skip();
        if (read() === '=') {
          skip();
          return '==';
        }
        return '=';
      case '!':
        skip();
        if (read() === '=') {
          skip();
          return '!=';
        }
        return '!';
      case '<':
        skip();
        if (read() === '=') {
          skip();
          return '<=';
        }
        return '<';
      case '>':
        skip();
        if (read() === '=') {
          skip();
          return '>=';
        }
        return '>';
      case '#':
        throw new Error('Expected to parse a cop but found a comment instead');
      default:
        if (isEof()) throw new Error('Expected to parse a cop but reached eof instead');
        throw new Error('Unknown cop char: `' + c + '`');
    }
  }

  function parseRop() {
    let a = read();
    switch (a) {
      case '=':
        skip();
        let b = read();
        if (b === '=') {
          skip();
          is('?', 'reifier suffix');
          return '==?';
        } else {
          return '=';
        }

      case '!':
        skip();
        is('=', 'middle part of !=? op');
        is('?', 'reifier suffix');
        return '!=?';

      case '<':
        skip();
        if (read() === '=') {
          skip();
          is('?', 'reifier suffix');
          return '<=?';
        } else {
          is('?', 'reifier suffix');
          return '<?';
        }

      case '>':
        skip();
        if (read() === '=') {
          skip();
          is('?', 'reifier suffix');
          return '>=?';
        } else {
          is('?', 'reifier suffix');
          return '>?';
        }

      case '+':
      case '-':
      case '*':
      case '/':
        skip();
        return a;

      default:
        throw new Error('Wanted to parse a rop but next char is `' + a + '`');
    }
  }

  function parseUexpr() {
    // it's not very efficient (we could parse an ident before and check that result here) but it'll work for now
    if (str.slice(pointer, pointer + 9) === 'distinct(') parseDistinct();
    else return false;

    return true;
  }

  function parseDistinct() {
    pointer += 9;
    skipWhitespaces();
    let vals = parseVexpList();
    solver.distinct(vals);
    skipWhitespaces();
    is(')', 'distinct call closer');
    expectEol();
  }

  function parseVexpList() {
    let list = [];
    skipWhitespaces();
    while (!isEof() && read() !== ')') {
      let v = parseVexpr();
      list.push(v);

      skipWhitespaces();
      if (read() === ',') {
        skip();
        skipWhitespaces();
      }
    }
    return list;
  }

  function parseVexpr(resultVar) {
    // valcall, ident, number, group

    let c = read();
    let v;
    if (c === '(') v = parseGrouping();
    else if (c >= '0' && c <= '9') v = parseNumber();
    else {
      let ident = parseIdentifier();

      if (read() === '(') {
        if (ident === 'sum') v = parseSum(resultVar);
        else if (ident === 'product') v = parseProduct(resultVar);
        else throw new Error('Unknown constraint func: ' + ident);
      } else {
        v = ident;
      }
    }

    return v;
  }

  function parseGrouping() {
    is('(', 'group open');
    skipWhitespaces();
    let A = parseVexpr();
    skipWhitespaces();

    if (read() === '=') {
      if (read() !== '=') {
        parseAssignment(A);
        skipWhitespaces();
        is(')', 'group closer');
        return A;
      }
    }

    if (read() === ')') {
      // just wrapping a vexpr is okay
      skip();
      return A;
    }

    let C = parseAssignRest(A);
    skipWhitespaces();
    is(')', 'group closer');
    return C;
  }

  function parseNumber() {
    let start = pointer;
    while (read() >= '0' && read() <= '9') skip();
    if (start === pointer) {
      throw new Error('Expecting to parse a number but did not find any digits [' + start + ',' + pointer + '][' + read() + ']');
    }
    return parseInt(str.slice(start, pointer), 10);
  }

  function parseSum(result) {
    is('(', 'sum call opener');
    skipWhitespaces();
    let refs = parseVexpList();
    let r = solver.sum(refs, result);
    skipWhitespaces();
    is(')', 'sum closer');
    return r;
  }

  function parseProduct(result) {
    is('(', 'product call opener');
    skipWhitespaces();
    let refs = parseVexpList();
    let r = solver.product(refs, result);
    skipWhitespaces();
    is(')', 'product closer');
    return r;
  }

  function parseNumstr() {
    let start = pointer;
    while (str[pointer] >= '0' && str[pointer] <= '9') skip();
    return str.slice(start, pointer);
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
}

// BODY_STOP

export default importer_main;
