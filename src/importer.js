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

/**
 * @param {string} str
 * @param {Solver} [solver]
 * @returns {Solver}
 */
function importer_main(str, solver, _debug) {
  if (!solver) solver = new Solver();

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
    if (read() !== c) THROW('Expected ' + (desc + ' ' || '') + '`' + c + '`, found `' + read() + '`');
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
    if (pointer < len) {
      let c = read();
      if (c === '#') {
        skipComment();
      } else if (isNewline(c)) {
        skip();
      } else {
        THROW('Expected EOL but got `' + read() + '`');
      }
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
    switch (read()) {
      case ':': return parseVar();
      case '#': return skipComment();
      case '@': return parseAtRule();
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

    solver.decl(name, domain, mod, true);
    // TODO: properly map the alts to the same var index...
    if (alts) alts.map(name => solver.decl(name, domain, mod, true));
  }

  function parseIdentifier() {
    if (read() === '\'') return parseQuotedIdentifier();
    else return parseUnquotedIdentifier();
  }

  function parseQuotedIdentifier() {
    is('\'');

    let start = pointer;
    while (!isEof() && read() !== '\'') skip();
    if (isEof()) THROW('Quoted identifier must be closed');
    if (start === pointer) THROW('Expected to parse identifier, found none');
    skip(); // quote
    return str.slice(start, pointer - 1); // return unquoted ident
  }

  function parseUnquotedIdentifier() {
    // anything terminated by whitespace
    let start = pointer;
    if (read() >= '0' && read() <= '9') THROW('Unquoted ident cant start with number');
    while (!isEof() && isValidUnquotedIdentChar(read())) skip();
    if (isEof()) THROW('Quoted identifier must be closed');
    if (start === pointer) THROW('Expected to parse identifier, found none');
    return str.slice(start, pointer);
  }
  function isValidUnquotedIdentChar(c) {
    switch (c) {
      case '(':
      case ')':
      case ',':
      case '[':
      case ']':
      case '\'':
      case '#':
        return false;
    }
    if (isWhite(c)) return false;
    return true;
  }

  function parseAlias() {
    skipWhitespaces();

    let start = pointer;
    while (true) {
      let c = read();
      if (c === ')') break;
      if (isNewline(c)) THROW('Alias must be closed with a `)` but wasnt (eol)');
      if (isEof()) THROW('Alias must be closed with a `)` but wasnt (eof)');
      skip();
    }
    let alias = str.slice(start, pointer);
    if (!alias) THROW('The alias() can not be empty but was');

    skipWhitespaces();
    is(')', '`alias` to be closed by `)`');

    return alias;
  }

  function parseDomain() {
    // []
    // [lo hi]
    // [[lo hi] [lo hi] ..]
    // *
    // 25
    // (comma's optional and ignored)

    let c = read();
    if (c === '=') {
      skip();
      skipWhitespaces();
      c = read();
    }

    let domain;
    switch (c) {
      case '[':

        is('[', 'domain start');
        skipWhitespaces();

        domain = [];

        if (read() === '[') {
          do {
            skip();
            skipWhitespaces();
            let lo = parseNumber();
            skipWhitespaces();
            if (read() === ',') {
              skip();
              skipWhitespaces();
            }
            let hi = parseNumber();
            skipWhitespaces();
            is(']', 'range-end');
            skipWhitespaces();

            domain.push(lo, hi);

            if (read() === ',') {
              skip();
              skipWhitespaces();
            }
          } while (read() === '[');
        } else if (read() !== ']') {
          do {
            skipWhitespaces();
            let lo = parseNumber();
            skipWhitespaces();
            if (read() === ',') {
              skip();
              skipWhitespaces();
            }
            let hi = parseNumber();
            skipWhitespaces();

            domain.push(lo, hi);

            if (read() === ',') {
              skip();
              skipWhitespaces();
            }
          } while (read() !== ']');
        }

        is(']', 'domain-end');
        return domain;

      case '*':
        skip();
        return [SUB, SUP];

      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        let v = parseNumber();
        skipWhitespaces();
        return [v, v];
    }

    THROW('Expecting valid domain start, found `' + c + '`');
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
        THROW('Expecting a strategy name after the `@` modifier (`' + stratName + '`)');
    }

    mod.valtype = stratName;

    return mod;
  }

  function parseList(mod) {
    skipWhitespaces();
    if (str.slice(pointer, pointer + 5) !== 'prio(') THROW('Expecting the priorities to follow the `@list`');
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
        if (pointer === -1) THROW('The matrix must be closed by a `)` but did not find any');
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

      case '&':
        // force A and B to non-zero (artifact)
        // (could easily be done at compile time)
        // for now we mul the args and force the result non-zero, this way neither arg can be zero
        // TODO: this could be made "safer" with more work; `(A/A)+(B/B) > 0` doesnt risk going oob, i think. and otherwise we could sum two ==?0 reifiers to equal 2. just relatively very expensive.
        solver.neq(solver.mul(A, parseVexpr()), solver.num(0));
        break;

      case '|':
        // force at least one of A and B to be non-zero (both is fine too)
        // if we add both args and check the result for non-zero then at least one arg must be non-zero
        solver.neq(solver.plus(A, parseVexpr()), solver.num(0));
        break;

      default:
        if (cop) THROW('Unknown constraint op: [' + cop + ']');
    }

    expectEol();
  }

  function parseAssignment(C) {
    // note: if Solver api changes this may return the wrong value...
    // it should always return the "result var" var name or constant
    // (that would be C, but C may be undefined here and created by Solver)

    if (typeof C === 'string' && !solver.hasVar(C)) C = solver.decl(C);

    let A = parseVexpr(C);
    skipWhitespaces();
    let c = read();
    if (isEof() || isNewline(c) || isComment(c)) return A; // any group without "top-level" op (`A=(B+C)`), or sum() etc
    return parseAssignRest(A, C);
  }

  function parseAssignRest(A, C) {
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
        if (rop !== undefined) THROW('Unknown rop: `' + rop + '`');
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
      case '&':
      case '|':
        skip();
        return c;
      case '#':
        THROW('Expected to parse a cop but found a comment instead');
        break;
      default:
        if (isEof()) THROW('Expected to parse a cop but reached eof instead');
        THROW('Unknown cop char: `' + c + '`');
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
        THROW('Wanted to parse a rop but next char is `' + a + '`');
    }
  }

  function parseUexpr() {
    // it's not very efficient (we could parse an ident before and check that result here) but it'll work for now
    if (str.slice(pointer, pointer + 9) === 'distinct(') parseDistinct();
    else if (str.slice(pointer, pointer + 5) === 'nall(') parseNall();
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
    else if (c === '[') {
      let d = parseDomain();
      if (d[0] === d[1] && d.length === 2) v = d[0];
      else v = solver.decl(undefined, d);
    } else if (c >= '0' && c <= '9') {
      v = parseNumber();
    } else {
      let ident = parseIdentifier();

      if (read() === '(') {
        if (ident === 'sum') v = parseSum(resultVar);
        else if (ident === 'product') v = parseProduct(resultVar);
        else if (ident === 'all?') v = parseIsAll(resultVar);
        else if (ident === 'nall?') v = parseIsNall(resultVar);
        else if (ident === 'none?') v = parseIsNone(resultVar);
        else THROW('Unknown constraint func: ' + ident);
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
      THROW('Expecting to parse a number but did not find any digits [' + start + ',' + pointer + '][' + read() + ']');
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

  function parseIsAll(result) {
    is('(', 'isall call opener');
    skipWhitespaces();
    let refs = parseVexpList();

    // R = all?(A B C ...)   ->   X = A * B * C * ..., R = X !=? 0

    let x = solver.decl(); // anon var [sub,sup]
    solver.product(refs, x);
    let r = solver.isNeq(x, solver.num(0), result);

    skipWhitespaces();
    is(')', 'isall closer');
    return r;
  }

  function parseIsNall(result) {
    is('(', 'isnall call opener');
    skipWhitespaces();
    let refs = parseVexpList();

    // R = nall?(A B C ...)   ->   X = A * B * C * ..., R = X ==? 0

    let x = solver.decl(); // anon var [sub,sup]
    solver.product(refs, x);
    let r = solver.isEq(x, solver.num(0), result);

    skipWhitespaces();
    is(')', 'isnall closer');
    return r;
  }

  function parseIsNone(result) {
    is('(', 'isnone call opener');
    skipWhitespaces();
    let refs = parseVexpList();

    // R = none?(A B C ...)   ->   X = sum(A * B * C * ...), R = X ==? 0

    let x = solver.decl(); // anon var [sub,sup]
    solver.sum(refs, x);
    let r = solver.isEq(x, solver.num(0), result);

    skipWhitespaces();
    is(')', 'isnone closer');
    return r;
  }

  function parseNall() {
    pointer += 5;
    skipWhitespaces();
    let refs = parseVexpList();
    // TODO: could also sum reifiers but i think this is way more efficient. for the time being.
    solver.product(refs, solver.num(0));
    skipWhitespaces();
    is(')', 'nall closer');
    expectEol();
  }

  function parseNumstr() {
    let start = pointer;
    while (read() >= '0' && read() <= '9') skip();
    return str.slice(start, pointer);
  }

  function parseNumList() {
    let nums = [];

    skipWhitespaces();
    let numstr = parseNumstr();
    while (numstr) {
      nums.push(parseInt(numstr, 10));
      skipWhitespaces();
      if (read() === ',') {
        ++pointer;
        skipWhitespaces();
      }
      numstr = parseNumstr();
    }

    if (!nums.length) THROW('Expected to parse a list of at least some numbers but found none');
    return nums;
  }

  function parseIdentList() {
    let idents = [];

    while (true) {
      skipWhitespaces();
      if (read() === ')') break;
      if (read() === ',') {
        skip();
        skipWhitespaces();
      }
      let ident = parseIdentifier();
      idents.push(ident);
    }

    if (!idents.length) THROW('Expected to parse a list of at least some identifiers but found none');
    return idents;
  }

  function readLine() {
    let line = '';
    while (!isEof() && !isNewline(read())) {
      line += read();
      skip();
    }
    return line;
  }

  function parseAtRule() {
    is('@');
    // mostly temporary hacks while the dsl stabilizes...

    if (str.slice(pointer, pointer + 6) === 'custom') {
      pointer += 6;
      skipWhitespaces();
      let ident = parseIdentifier();
      skipWhitespaces();
      if (read() === '=') {
        skip();
        skipWhitespaces();
      }
      switch (ident) {
        case 'var-strat':
          parseVarStrat();
          break;
        case 'val-strat':
          parseValStrat();
          break;
        case 'set-valdist':
          skipWhitespaces();
          let target = parseIdentifier();
          let config = parseRestCustom();
          solver.setValueDistributionFor(target, JSON.parse(config));
          break;
        default:
          THROW('Unsupported custom rule: ' + ident);
      }
    } else if (str.slice(pointer, pointer + 7) === 'targets') {
      pointer += 7;
      parseTargets();
    } else if (str.slice(pointer, pointer + 4) === 'mode') {
      pointer += 4;
      parseMode();
    } else {
      THROW('Unknown atrule');
    }
    expectEol();
  }

  function parseVarStrat() {
    let json = readLine();
    expectEol();
    solver.varStratConfig = JSON.parse(json);
  }

  function parseValStrat() {
    let name = parseIdentifier();
    expectEol();
    solver.valueStratName = name;
  }

  function parseRestCustom() {
    skipWhitespaces();
    if (read() === '=') {
      skip();
      skipWhitespaces();
    }

    return readLine();
  }

  function parseTargets() {
    skipWhitespaces();
    if (read() === '=') {
      skip();
      skipWhitespaces();
    }

    if (str.slice(pointer, pointer + 3) === 'all') {
      pointer += 3;
      solver.config.targetedVars = 'all';
    } else {
      is('(');
      let idents = parseIdentList();
      if (idents.length) solver.config.targetedVars = idents;
      is(')');
    }
    expectEol();
  }

  function parseMode() {
    skipWhitespaces();
    if (read() === '=') {
      skip();
      skipWhitespaces();
    }

    if (str.slice(pointer, pointer + 'constraints'.length) === 'constraints') {
      // input consists of high level constraints. generate low level optimizations.
      pointer += 'constraints'.length;
    } else if (str.slice(pointer, pointer + 'propagators'.length) === 'propagators') {
      // input consists of low level constraints. try not to generate more.
      pointer += 'propagators'.length;
    }
  }

  function THROW(msg) {
    if (_debug) {
      console.log(str.slice(0, pointer) + '##|PARSER_IS_HERE[' + msg + ']|##' + str.slice(pointer));
    }
    msg = 'Importer parser error: ' + msg + ', source at #|#: `' + str.slice(Math.max(0, pointer - 20), pointer) + '#|#' + str.slice(pointer, Math.min(str.length, pointer + 20)) + '`';
    throw new Error(msg);
  }
}

// BODY_STOP

export default importer_main;
