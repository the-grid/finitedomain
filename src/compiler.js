// this is an import function for config
// it converts a DSL string to a $config
// see /docs/dsl.txt for syntax
// see exporter.js to convert a config to this DSL
import {
  SUB,
  SUP,
  ASSERT,
  ASSERT_LOG2,
  THROW,
} from './helpers';

// BODY_START

let ml_opcodeCounter = 0;

// note: all ops accept vars and literals
// - a var is signified by a V
// - an 8bit literal signified by 8
// - a 16bit literal signified by F

const ML_UNUSED = ml_opcodeCounter++;

const ML_VV_EQ = ml_opcodeCounter++;
const ML_V8_EQ = ml_opcodeCounter++;
const ML_88_EQ = ml_opcodeCounter++;

const ML_VV_NEQ = ml_opcodeCounter++;
const ML_V8_NEQ = ml_opcodeCounter++;
const ML_88_NEQ = ml_opcodeCounter++;

const ML_VV_LT = ml_opcodeCounter++;
const ML_V8_LT = ml_opcodeCounter++;
const ML_8V_LT = ml_opcodeCounter++;
const ML_88_LT = ml_opcodeCounter++;

const ML_VV_LTE = ml_opcodeCounter++;
const ML_V8_LTE = ml_opcodeCounter++;
const ML_8V_LTE = ml_opcodeCounter++;
const ML_88_LTE = ml_opcodeCounter++;

const ML_VVV_ISEQ = ml_opcodeCounter++;
const ML_V8V_ISEQ = ml_opcodeCounter++;
const ML_VV8_ISEQ = ml_opcodeCounter++;
const ML_88V_ISEQ = ml_opcodeCounter++;
const ML_V88_ISEQ = ml_opcodeCounter++;
const ML_888_ISEQ = ml_opcodeCounter++;

const ML_VVV_ISNEQ = ml_opcodeCounter++;
const ML_V8V_ISNEQ = ml_opcodeCounter++;
const ML_VV8_ISNEQ = ml_opcodeCounter++;
const ML_88V_ISNEQ = ml_opcodeCounter++;
const ML_V88_ISNEQ = ml_opcodeCounter++;
const ML_888_ISNEQ = ml_opcodeCounter++;

const ML_VVV_ISLT = ml_opcodeCounter++;
const ML_8VV_ISLT = ml_opcodeCounter++;
const ML_V8V_ISLT = ml_opcodeCounter++;
const ML_VV8_ISLT = ml_opcodeCounter++;
const ML_88V_ISLT = ml_opcodeCounter++;
const ML_V88_ISLT = ml_opcodeCounter++;
const ML_8V8_ISLT = ml_opcodeCounter++;
const ML_888_ISLT = ml_opcodeCounter++;

const ML_VVV_ISLTE = ml_opcodeCounter++;
const ML_8VV_ISLTE = ml_opcodeCounter++;
const ML_V8V_ISLTE = ml_opcodeCounter++;
const ML_VV8_ISLTE = ml_opcodeCounter++;
const ML_88V_ISLTE = ml_opcodeCounter++;
const ML_V88_ISLTE = ml_opcodeCounter++;
const ML_8V8_ISLTE = ml_opcodeCounter++;
const ML_888_ISLTE = ml_opcodeCounter++;

const ML_SUM = ml_opcodeCounter++;
const ML_PRODUCT = ml_opcodeCounter++;
const ML_DISTINCT = ml_opcodeCounter++;
const ML_PLUS = ml_opcodeCounter++;
const ML_MINUS = ml_opcodeCounter++;
const ML_MUL = ml_opcodeCounter++;
const ML_DIV = ml_opcodeCounter++;
const ML_JMP = ml_opcodeCounter++;
const ML_NOOP = ml_opcodeCounter++;
const ML_NOOP2 = ml_opcodeCounter++;
const ML_NOOP3 = ml_opcodeCounter++;
const ML_NOOP4 = ml_opcodeCounter++;
const ML_STOP = ml_opcodeCounter++;

ASSERT(ml_opcodeCounter <= 256, 'All opcodes are 8bit');

/**
 * Compile the constraint dsl to a bytecode
 *
 * @param {string} str
 * @param {Function} addVar
 * @param {Function} nameToIndex
 * @param {boolean} [_debug]
 * @returns {string}
 */
function parseDsl(str, addVar, nameToIndex, _debug) {
  let ret = {
    ml: '',
    varstrat: 'default',
    valstrat: 'default',
  };
  let ml = '';

  let pointer = 0;
  let len = str.length;

  while (!isEof()) parseStatement();

  ret.ml = ml + encode8bit(ML_STOP);
  return ret;

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
      case ':':
        return parseVar();
      case '#':
        return skipComment();
      case '@':
        return parseAtRule();
      default:
        if (!isEof()) return parseVoidConstraint();
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

    addVar(name, domain, mod);
    if (alts) THROW('implement me (var alias)'); // alts.map(name => addVar(name, domain, mod));
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
        let func = Function(code);
        /* eslint no-new-func: "off" */
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

  function encode8bit(num) {
    return String.fromCharCode(num);
  }

  function encodeName(name) {
    if (typeof name !== 'string') THROW('Expecting name to be a string:' + name);
    ASSERT_LOG2('encoding name:', name);
    ASSERT_LOG2('to index', nameToIndex(name));
    return encode16bit(nameToIndex(name));
  }

  function encode16bit(index) {
    ASSERT_LOG2('encode16bit:', index, '->', index >> 8, index & 0xff);
    ASSERT(typeof index === 'number', 'Encoding 16bit num', index);
    ASSERT(index <= 0xffff, 'implement 32bit index support if this breaks', index);
    let s = String.fromCharCode(index >> 8, index & 0xff);
    if (s.length === 1) return '\0' + s;
    return s;
  }

  function parseVoidConstraint() {
    // parse a constraint that does not return a value itself

    // first try to parse single value constraints without value like markov() and distinct()
    if (parseUexpr()) return;

    // so the first value must be a value returning expr
    let A = parseVexpr(); // returns a var name or a constant value

    skipWhitespaces();
    let cop = parseCop();
    skipWhitespaces();

    if (cop === '=') {
      parseAssignment(A);
    } else if (cop) {
      let B = parseVexpr();
      let codeA = typeof A === 'number' ? '8' : 'V';
      let codeB = typeof B === 'number' ? '8' : 'V';
      switch (codeA + cop + codeB) {
        case 'V==V':
          ml += encode8bit(ML_VV_EQ) + encodeName(A) + encodeName(B);
          break;
        case 'V==8':
          ml += encode8bit(ML_V8_EQ) + encodeName(A) + encode8bit(B);
          break;
        case '8==V':
          ml += encode8bit(ML_V8_EQ) + encodeName(B) + encode8bit(A);
          break;
        case '8==8':
          ml += encode8bit(ML_88_EQ) + encode8bit(A) + encode8bit(B);
          break;

        case 'V!=V':
          ml += encode8bit(ML_VV_NEQ) + encodeName(A) + encodeName(B);
          break;
        case 'V!=8':
          ml += encode8bit(ML_V8_NEQ) + encodeName(A) + encode8bit(B);
          break;
        case '8!=V':
          ml += encode8bit(ML_V8_NEQ) + encodeName(B) + encode8bit(A);
          break;
        case '8!=8':
          ml += encode8bit(ML_88_NEQ) + encode8bit(A) + encode8bit(B);
          break;

        case 'V<V':
          ml += encode8bit(ML_VV_LT) + encodeName(A) + encodeName(B);
          break;
        case 'V<8':
          ml += encode8bit(ML_V8_LT) + encodeName(A) + encode8bit(B);
          break;
        case '8<V':
          ml += encode8bit(ML_8V_LT) + encode8bit(A) + encodeName(B);
          break;
        case '8<8':
          ml += encode8bit(ML_88_LT) + encode8bit(A) + encode8bit(B);
          break;

        case 'V<=V':
          ml += encode8bit(ML_VV_LTE) + encodeName(A) + encodeName(B);
          break;
        case 'V<=8':
          ml += encode8bit(ML_V8_LTE) + encodeName(A) + encode8bit(B);
          break;
        case '8<=V':
          ml += encode8bit(ML_8V_LTE) + encode8bit(A) + encodeName(B);
          break;
        case '8<=8':
          ml += encode8bit(ML_88_LTE) + encode8bit(A) + encode8bit(B);
          break;

        case 'V>V':
          ml += encode8bit(ML_VV_LT) + encodeName(B) + encodeName(A);
          break;
        case 'V>8':
          ml += encode8bit(ML_8V_LT) + encode8bit(B) + encodeName(A);
          break;
        case '8>V':
          ml += encode8bit(ML_V8_LT) + encodeName(B) + encode8bit(A);
          break;
        case '8>8':
          ml += encode8bit(ML_88_LT) + encode8bit(B) + encode8bit(A);
          break;

        case 'V>=V':
          ml += encode8bit(ML_VV_LTE) + encodeName(B) + encodeName(A);
          break;
        case 'V>=8':
          ml += encode8bit(ML_8V_LTE) + encode8bit(B) + encodeName(A);
          break;
        case '8>=V':
          ml += encode8bit(ML_V8_LTE) + encodeName(B) + encode8bit(A);
          break;
        case '8>=8':
          ml += encode8bit(ML_88_LTE) + encode8bit(B) + encode8bit(A);
          break;

        default:
          THROW('Unknown constraint op: [' + cop + ']');
      }
    }

    expectEol();
  }

  function parseAssignment(C) {
    if (typeof C === 'string' && nameToIndex(C) < 0) addVar(C);
    ASSERT(typeof C === 'number' || nameToIndex(C) >= 0, 'C should be resolvable now');

    let A = parseVexpr(C);
    skipWhitespaces();
    let c = read();
    if (isEof() || isNewline(c) || isComment(c)) return A; // any group without "top-level" op (`A=(B+C)`), or sum() etc
    return parseAssignRest(A, C);
  }

  function parseAssignRest(A, C) {
    let rop = parseRop();
    skipWhitespaces();
    let B = parseVexpr();
    switch ((typeof A === 'number' ? '8' : 'V') + rop + (typeof B === 'number' ? '8' : 'V') + (typeof C === 'number' ? '8' : 'V')) {
      case 'V==?VV':
        ml += encode8bit(ML_VVV_ISEQ) + encodeName(A) + encodeName(B) + encodeName(C);
        break;
      case '8==?VV':
        ml += encode8bit(ML_V8V_ISEQ) + encodeName(B) + encode8bit(A) + encodeName(C);
        break;
      case 'V==?8V':
        ml += encode8bit(ML_V8V_ISEQ) + encodeName(A) + encode8bit(B) + encodeName(C);
        break;
      case 'V==?V8':
        ml += encode8bit(ML_VV8_ISEQ) + encodeName(A) + encodeName(B) + encode8bit(C);
        break;
      case '8==?8V':
        ml += encode8bit(ML_88V_ISEQ) + encode8bit(A) + encode8bit(B) + encodeName(C);
        break;
      case 'V==?88':
        ml += encode8bit(ML_V88_ISEQ) + encodeName(A) + encode8bit(B) + encode8bit(C);
        break;
      case '8==?V8':
        ml += encode8bit(ML_V88_ISEQ) + encodeName(B) + encode8bit(A) + encode8bit(C);
        break;
      case '8==?88':
        ml += encode8bit(ML_888_ISEQ) + encode8bit(A) + encode8bit(B) + encode8bit(C);
        break;

      case 'V!=?VV':
        ml += encode8bit(ML_VVV_ISNEQ) + encodeName(A) + encodeName(B) + encodeName(C);
        break;
      case '8!=?VV':
        ml += encode8bit(ML_V8V_ISNEQ) + encodeName(B) + encode8bit(A) + encodeName(C);
        break;
      case 'V!=?8V':
        ml += encode8bit(ML_V8V_ISNEQ) + encodeName(A) + encode8bit(B) + encodeName(C);
        break;
      case 'V!=?V8':
        ml += encode8bit(ML_VV8_ISNEQ) + encodeName(A) + encodeName(B) + encode8bit(C);
        break;
      case '8!=?8V':
        ml += encode8bit(ML_88V_ISNEQ) + encode8bit(A) + encode8bit(B) + encodeName(C);
        break;
      case 'V!=?88':
        ml += encode8bit(ML_V88_ISNEQ) + encodeName(A) + encode8bit(B) + encode8bit(C);
        break;
      case '8!=?V8':
        ml += encode8bit(ML_V88_ISNEQ) + encodeName(B) + encode8bit(A) + encode8bit(C);
        break;
      case '8!=?88':
        ml += encode8bit(ML_888_ISNEQ) + encode8bit(A) + encode8bit(B) + encode8bit(C);
        break;

      case 'V<?VV':
        ml += encode8bit(ML_VVV_ISLT) + encodeName(A) + encodeName(B) + encodeName(C);
        break;
      case '8<?VV':
        ml += encode8bit(ML_8VV_ISLT) + encode8bit(A) + encodeName(B) + encodeName(C);
        break;
      case 'V<?8V':
        ml += encode8bit(ML_V8V_ISLT) + encodeName(A) + encode8bit(B) + encodeName(C);
        break;
      case 'V<?V8':
        ml += encode8bit(ML_VV8_ISLT) + encodeName(A) + encodeName(B) + encode8bit(C);
        break;
      case '8<?8V':
        ml += encode8bit(ML_88V_ISLT) + encode8bit(A) + encode8bit(B) + encodeName(C);
        break;
      case 'V<?88':
        ml += encode8bit(ML_V88_ISLT) + encodeName(A) + encode8bit(B) + encode8bit(C);
        break;
      case '8<?V8':
        ml += encode8bit(ML_8V8_ISLT) + encode8bit(A) + encodeName(B) + encode8bit(C);
        break;
      case '8<?88':
        ml += encode8bit(ML_888_ISLT) + encode8bit(A) + encode8bit(B) + encode8bit(C);
        break;

      case 'V<=?VV':
        ml += encode8bit(ML_VVV_ISLTE) + encodeName(A) + encodeName(B) + encodeName(C);
        break;
      case '8<=?VV':
        ml += encode8bit(ML_8VV_ISLTE) + encode8bit(A) + encodeName(B) + encodeName(C);
        break;
      case 'V<=?8V':
        ml += encode8bit(ML_V8V_ISLTE) + encodeName(A) + encode8bit(B) + encodeName(C);
        break;
      case 'V<=?V8':
        ml += encode8bit(ML_VV8_ISLTE) + encodeName(A) + encodeName(B) + encode8bit(C);
        break;
      case '8<=?8V':
        ml += encode8bit(ML_88V_ISLTE) + encode8bit(A) + encode8bit(B) + encodeName(C);
        break;
      case 'V<=?88':
        ml += encode8bit(ML_V88_ISLTE) + encodeName(A) + encode8bit(B) + encode8bit(C);
        break;
      case '8<=?V8':
        ml += encode8bit(ML_8V8_ISLTE) + encode8bit(A) + encodeName(B) + encode8bit(C);
        break;
      case '8<=?88':
        ml += encode8bit(ML_888_ISLTE) + encode8bit(A) + encode8bit(B) + encode8bit(C);
        break;

      default:
        let mlab = encodeName(A) + encodeName(B) + encodeName(C);
        switch (rop) {
          case '>?':
            ml += encode8bit(ML_VVV_ISLT) + encodeName(B) + encodeName(A) + encodeName(C);
            break;
          case '>=?':
            ml += encode8bit(ML_VVV_ISLTE) + encodeName(B) + encodeName(A) + encodeName(C);
            break;
          case '+':
            ml += encode8bit(ML_PLUS) + mlab;
            break;
          case '-':
            ml += encode8bit(ML_MINUS) + mlab;
            break;
          case '*':
            ml += encode8bit(ML_MUL) + mlab;
            break;
          case '/':
            ml += encode8bit(ML_DIV) + mlab;
            break;
          default:
            if (rop !== undefined) THROW('Unknown rop: `' + rop + '`');
            return A;
        }
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
    else return false;

    return true;
  }

  function parseDistinct() {
    pointer += 9;
    skipWhitespaces();
    let vals = parseVexpList();
    ASSERT(vals.length <= 255, 'dont do distincts with more than 255 vars :('); // sum(0..255)=32385
    ml += encode8bit(ML_DISTINCT) + encode16bit(vals.length) + vals.map(encodeName).join('');
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
      else v = addVar(undefined, d);
    } else if (c >= '0' && c <= '9') {
      v = parseNumber();
    } else {
      let ident = parseIdentifier();

      if (read() === '(') {
        if (ident === 'sum') v = parseSum(resultVar);
        else if (ident === 'product') v = parseProduct(resultVar);
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
    // TOFIX: result can be undefined (used to be anon var magically but will have to do this manually now)
    ASSERT_LOG2('refS:', refs);
    ml += encode8bit(ML_SUM) + encode16bit(refs.length) + refs.map(encodeName).join('') + encodeName(result);
    skipWhitespaces();
    is(')', 'sum closer');
    return result;
  }

  function parseProduct(result) {
    // TOFIX: result can be undefined (used to be anon var magically but will have to do this manually now)
    is('(', 'product call opener');
    skipWhitespaces();
    let refs = parseVexpList();
    ml += encode8bit(ML_PRODUCT) + encode16bit(refs.length) + refs.map(encodeName).join('') + encodeName(result);
    skipWhitespaces();
    is(')', 'product closer');
    return result;
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
    let offset = pointer;
    while (!isEof() && !isNewline(read())) skip();
    return str.slice(offset, pointer);
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
          THROW('implement me (valdist)');
          this.solver.setValueDistributionFor(target, JSON.parse(config));
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
    if (/\w+/.test(json)) ret.varstrat = json;
    else ret.varstrat = JSON.parse(json);
  }

  function parseValStrat() {
    ret.varstrat = parseIdentifier();
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

    THROW('implement me (targeted vars)');
    if (str.slice(pointer, pointer + 3) === 'all') {
      pointer += 3;
      this.solver.config.targetedVars = 'all';
    } else {
      is('(');
      let idents = parseIdentList();
      if (idents.length) this.solver.config.targetedVars = idents;
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
      ASSERT_LOG2(str.slice(0, pointer) + '##|PARSER_IS_HERE[' + msg + ']|##' + str.slice(pointer));
    }
    msg += ', source at #|#: `' + str.slice(Math.max(0, pointer - 20), pointer) + '#|#' + str.slice(pointer, Math.min(str.length, pointer + 20)) + '`';
    throw new Error(msg);
  }
}

/**
 * Generate propagators from a list of
 */
function compilePropagators(ml) {
  let out = Buffer.from(ml, 'binary');
  let oc = 0;

  let pc = 0;
  while (pc < ml.length) {
    let pcStart = pc;
    let op = ml[pc];
    ASSERT_LOG2('CRp[' + pc + ']:', op);
    switch (op) {
      case ML_UNUSED:
        return THROW('problem');

      case ML_STOP:
        ASSERT_LOG2(' - stop');
        out[oc++] = ML_STOP >>> 0;
        ++pc;
        break;

      case ML_JMP:
        ASSERT_LOG2(' - jump');
        ++pc;
        let delta = cr_dec16();
        if (delta <= 0) THROW('Empty jump'); // infinite loop
        ASSERT_LOG2('jumping by', delta, 'from', pc, 'to', pc + delta);
        pc = pcStart + delta;
        break;

      case ML_VV_EQ:
      case ML_V8_EQ:
      case ML_88_EQ:
      case ML_VV_NEQ:
      case ML_V8_NEQ:
      case ML_88_NEQ:
      case ML_VV_LT:
      case ML_V8_LT:
      case ML_8V_LT:
      case ML_88_LT:
      case ML_VV_LTE:
      case ML_V8_LTE:
      case ML_8V_LTE:
      case ML_88_LTE:
        ASSERT_LOG2(' - eq neq lt lte');
        out[oc++] = ml[pc++]; // OP
        out[oc++] = ml[pc++]; // A
        out[oc++] = ml[pc++];
        out[oc++] = ml[pc++]; // B
        out[oc++] = ml[pc++];
        break;

      case ML_NOOP:
        pc = pcStart + 1;
        ASSERT_LOG2('- noop @', pcStart, '->', pc);
        break;
      case ML_NOOP2:
        pc = pcStart + 2;
        ASSERT_LOG2('- noop2 @', pcStart, '->', pc);
        break;
      case ML_NOOP3:
        pc = pcStart + 3;
        ASSERT_LOG2('- noop2 @', pcStart, '->', pc);
        break;
      case ML_NOOP4:
        pc = pcStart + 4;
        ASSERT_LOG2('- noop4 @', pcStart, '->', pc);
        break;

      case ML_VVV_ISEQ:
      case ML_VVV_ISNEQ:
      case ML_VVV_ISLT:
      case ML_VVV_ISLTE:
      case ML_SUM:
      case ML_PRODUCT:
      case ML_DISTINCT:
      case ML_PLUS:
      case ML_MINUS:
      case ML_MUL:
      case ML_DIV:
        return THROW('implement me (op)');

      default:
        THROW('unknown op: 0x' + op.toString(16));
    }
  }
  // a STOP will be compiled in as well unless the check below throws
  if (pc !== ml.length) THROW('Derailed, pc=' + pc + ', len=' + ml.length);

  return out;

  function cr_dec16() {
    ASSERT(pc < ml.length - 1, 'OOB');
    ASSERT_LOG2(' . decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1);
    return (ml[pc++] << 8) | ml[pc++];
  }

  //function cr_enc8(pc, num) {
  //  ASSERT(typeof num === 'number', 'Encoding numbers');
  //  ASSERT((num >> 0) <= 0xff, 'Only encode 8bit values');
  //  ASSERT(pc < ml.length, 'OOB');
  //  ml[pc] = num;
  //}
  //
  //function cr_enc88(pc, a, b) {
  //  ASSERT(typeof a === 'number', 'Encoding numbers');
  //  ASSERT(typeof b === 'number', 'Encoding numbers');
  //  ASSERT((a >> 0) <= 0xff, 'Only encode 8bit values');
  //  ASSERT((b >> 0) <= 0xff, 'Only encode 8bit values');
  //  ASSERT(pc < ml.length - 1, 'OOB');
  //  LOG(' - encoding', a, 'at', pc, 'and', b, 'at', pc + 1);
  //  ml[pc++] = a;
  //  ml[pc] = b;
  //}
  //
  //function cr_enc16(pc, num) {
  //  ASSERT(typeof num === 'number', 'Encoding numbers');
  //  ASSERT(num <= 0xffff, 'implement 32bit index support if this breaks', num);
  //  ASSERT(pc < ml.length - 1, 'OOB');
  //  LOG(' - encoding', (num >> 8) & 0xff, 'at', pc, 'and', num & 0xff, 'at', pc + 1);
  //  ml[pc++] = (num >> 8) & 0xff;
  //  ml[pc] = num & 0xff;
  //}
}

// BODY_STOP

export {
  ML_UNUSED,
  ML_VV_EQ,
  ML_V8_EQ,
  ML_88_EQ,
  ML_VV_NEQ,
  ML_V8_NEQ,
  ML_88_NEQ,
  ML_VV_LT,
  ML_V8_LT,
  ML_8V_LT,
  ML_88_LT,
  ML_VV_LTE,
  ML_V8_LTE,
  ML_8V_LTE,
  ML_88_LTE,
  ML_VVV_ISEQ,
  ML_V8V_ISEQ,
  ML_VV8_ISEQ,
  ML_88V_ISEQ,
  ML_V88_ISEQ,
  ML_888_ISEQ,
  ML_VVV_ISNEQ,
  ML_V8V_ISNEQ,
  ML_VV8_ISNEQ,
  ML_88V_ISNEQ,
  ML_V88_ISNEQ,
  ML_888_ISNEQ,
  ML_VVV_ISLT,
  ML_8VV_ISLT,
  ML_V8V_ISLT,
  ML_VV8_ISLT,
  ML_88V_ISLT,
  ML_V88_ISLT,
  ML_8V8_ISLT,
  ML_888_ISLT,
  ML_VVV_ISLTE,
  ML_8VV_ISLTE,
  ML_V8V_ISLTE,
  ML_VV8_ISLTE,
  ML_88V_ISLTE,
  ML_V88_ISLTE,
  ML_8V8_ISLTE,
  ML_888_ISLTE,
  ML_SUM,
  ML_PRODUCT,
  ML_DISTINCT,
  ML_PLUS,
  ML_MINUS,
  ML_MUL,
  ML_DIV,
  ML_JMP,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  parseDsl,
  compilePropagators,
};
