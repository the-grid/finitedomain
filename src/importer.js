// this is an import function for config
// it converts a DSL string to a $config
// see /docs/dsl.txt for syntax
// see exporter.js to convert a config to this DSL

// BODY_START

function importer_main(str) {
  let solver = new Solver();

  let pointer = 0;
  let len = str.length;

  while (pointer < len) parseStatement();

  function skipWhitespace() {
    while (pointer < len && isWhitespace(str[pointer])) {
       ++pointer;
    }
  }
  function skipAnyWhitespace() {
    while (pointer < len && (isWhitespace(str[pointer]) || isAnyWhitespace(str[pointer]))) {
       ++pointer;
    }
  }

  function isWhitespace(s) {
    return s === ' ' || s === '\t';
  }
  function isAnyWhitespace(s) {
    return s === ' ' || s === '\t' || s === '\n' || s === '\r';
  }

  function parseStatement() {
    // either:
    // - start with colon: var decl
    // - start with hash: line comment
    // - empty: empty
    // - otherwise: constraint

    skipAnyWhitespace();
    switch (str[pointer]) {
      case ':': return parseVar();
      case '#': return skipComment();
      default: return parseConstraint();
    }
  }

  function parseVar() {
    ++pointer;
    skipWhitespace();
    let name = parseIdentifier();
    skipWhitespace();
    if (str[pointer] !== '=') throw new Error('expecting var initializer');
    ++pointer;
    skipWhitespace();
    let domain = parseDomain();
    skipWhitespace();
    let alts = [];
    while (str.slice(pointer, 5) === 'alias') {
      alts.push(parseAlias(pointer += 5));
      skipWhitespace();
    }
    let mod = parseModifier();

    solver.decl(name, domain, mod);
    // TODO: declare the alts somehow and map them to the same var
  }

  function skipComment() {
    if (str[pointer++] !== '#') throw new Error('expecting comment hash');
    while (pointer < len && str[pointer] !== '\n' && str[pointer] !== '\r') ++pointer;
    if (pointer < len) ++pointer; // skip past the newline
  }

  function parseConstraint() {
    skipWhitespace();
    let A = parseValue();
    skipWhitespace();

    switch (str[pointer]) {
      case '?':
        if (str[pointer + 1] === '=') {
          ++pointer;
          // reifier
          // A ?= B @ C
          let B = parseValue();
          skipWhitespace();
          let op = parseComparisonOp();
          skipWhitespace();
          let C = parseValue();
          skipWhitespace();

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

  function parseIdentifier() {
    // anything terminated by whitespace
    let start = pointer;
    while (!isAnyWhitespace(str[pointer])) ++pointer;
    if (start === pointer) throw new Error('Expected to parse identifier, found none');
    return str.slice(start, pointer);
  }

  function parseDomain() {
    // [lo hi]
    // [[lo hi] [lo hi] ..]

    if (str[pointer] !== '[') throw new Error('Expecting domain start `[` found `' + str[pointer] + '`');
    ++pointer;
    skipWhitespace();

    let domain = [];

    if (str[pointer] === '[') {
      while (str[pointer] === '[') {
        ++pointer;
        skipWhitespace();
        let lo = parseNumber();
        skipWhitespace();
        let hi = parseNumber();
        skipWhitespace();
        if (str[pointer] !== ']') throw new Error('Expecting range-end `]` found `' + str[pointer] + '`');

        domain.push(lo, hi);
      }
    } else {
      ++pointer;
      skipWhitespace();
      let lo = parseNumber();
      skipWhitespace();
      let hi = parseNumber();
      skipWhitespace();

      domain.push(lo, hi);
    }

    if (str[pointer] !== ']') throw new Error('Expecting domain-end `]` found `' + str[pointer] + '`');

    if (domain.length === 0) throw new Error('Not expecting empty domain');

    return domain;
  }

  function parseAlias() {
    if (str[pointer] !== '(') throw new Error('`alias` should be followed by `(` was `' + str[pointer] + '`');
    skipWhitespace();

    let start = pointer;
    while (str[pointer] !== ')' && !isAnyWhitespace(str[pointer])) ++pointer;
    let alias = str.slice(start, pointer);
    if (!alias) throw new Error('The alias() can not be empty but was');

    skipWhitespace();
    if (str[pointer] !== ')') throw new Error('`alias` should be closed by `)` was `' + str[pointer] + '`');

    return alias;
  }

  function parseModifier() {
    if (str[pointer] !== '@') return;

    let mod = {};

    let start = pointer;
    while (str[pointer] >= 'a' && str[pointer] <= 'z') ++pointer;
    let stratName = str.slice(start, pointer);
    if (!stratName) throw new Error('Expecting a strategy name after the `@` modifier');

    mod.valtype = stratName;

    switch (stratName) {
      case 'list':
        skipWhitespace();
        if (str.slice(0, 5) !== 'prio(') throw new Error('Expecting the priorities to follow the `@list`');
        pointer += 5;
        mod.list = parseNumList();
        if (str[pointer] !== ')') throw new Error('Expecting list end `)` but found `' + str[pointer] + '`');
        break;

      case 'markov':
        while (true) {
          skipWhitespace();
          if (str.slice(0, 7) === 'matrix(') {
            // TOFIX: there is no validation here. apply stricter and safe matrix parsing
            mod.matrix = Function('return ' + str.slice(pointer + 7, pointer += str.indexOf(')', pointer)))();
            if (pointer === -1) throw new Error('The matrix must be closed by a `)` but did not find any');
            ++pointer;
          } else if (str.slice(0, 7) === 'legend(') {
            mod.legend = parseNumList();
            if (pointer !== ')') throw new Error('The legend must be closed by a `)` but did not find any');
            ++pointer;
          } else if (str.slice(0, 7) === 'expand(') {
            mod.expandVectorsWith = parseNumber();
            if (pointer !== ')') throw new Error('The expand must be closed by a `)` but did not find any');
            ++pointer;
          } else {
            break;
          }
        }
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
        throw new Error('Unknown value strategy override: ' + stratName);
    }

    return mod;
  }

  function parseNumber() {
    let start = pointer;
    while (str[pointer] >= '0' && str[pointer] <= '9') ++pointer;
    if (start === pointer) throw new Error('Expecting to parse a number but did not find any digits');
    return parseInt(str.slice(start, pointer), 10);
  }

  function parseNumstr() {
    let start = pointer;
    while (str[pointer] >= '0' && str[pointer] <= '9') ++pointer;
    return parseInt(str.slice(start, pointer), 10);
  }

  function parseNumList() {
    let nums = [];

    skipWhitespace();
    let numstr = parseNumstr();
    while (numstr) {
      nums.push(parseInt(numstr, 10));
      skipWhitespace();
      if (str[pointer] === ',') {
        ++pointer;
        skipWhitespace();
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
