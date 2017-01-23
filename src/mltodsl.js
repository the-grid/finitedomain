// this is an import function for config
// it converts a DSL string to a $config
// see /docs/dsl.txt for syntax
// see exporter.js to convert a config to this DSL
import {
  ASSERT,
  ASSERT_LOG2,
  THROW,
} from './helpers';
import {
  domain__debug,
  domain_getValue,
  domain_toArr,
} from './domain';
import {
  ML_START,
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
  ML_NALL,
  ML_ISALL,
  ML_ISALL2,
  ML_ISNALL,
  ML_8V_SUM,
  ML_PRODUCT,
  ML_DISTINCT,
  ML_PLUS,
  ML_MINUS,
  ML_MUL,
  ML_DIV,
  ML_VV_AND,
  ML_VV_OR,
  ML_VV_XOR,
  ML_VV_NAND,
  ML_VV_XNOR,
  ML_JMP,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  ml_throw,
} from './ml';

// BODY_START

function mlToDsl(ml, names, domains, getAlias, solveStack, counts) {
  ASSERT_LOG2('\n## mlToDsl');
  const DEBUG = true;
  const HASH_NAMES = true;
  let pc = 0;
  let dsl = '';

  function toName(index) {
    if (HASH_NAMES) return '_' + index.toString(36) + '_';
    return names[index];
  }

  //if (counts) console.error(counts.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).slice(0, 40).map(a => [a[0], '$' + a[1].toString(36)]));

  let allParts = [];
  let partsPerVar = [];
  m2d_innerLoop();

  if (DEBUG) {
    let arr = [];
    let varsLeft = 0;
    let aliases = 0;
    let solved = 0;
    let unsolved = 0;
    domains.forEach((domain, index) => {
      let str = '';
      if (domain === false) {
        ++aliases;
      } else {
        ++varsLeft;
        let domain = domains[index];
        let v = domain_getValue(domain);
        if (v >= 0) {
          ++solved;
          str = ': ' + toName(index) + ' ' + v;
        } else {
          ++unsolved;
          str = ': ' + toName(index) + ' [' + domain_toArr(domain) + ']';
        }
      }
      arr[index] = str;
    });
    domains.forEach((domain, index) => {
      if (domain === false) {
        let alias = getAlias(index);
        if (arr[alias][arr[alias].length - 1] === ')') {
          arr[alias] = arr[alias].slice(0, -1) + ' ' + toName(index) + ')';
        } else {
          arr[alias] += ' alias(' + toName(index) + ')';
        }
      }
    });
    if (counts) {
      domains.forEach((domain, index) => {
        if (domain !== false) {
          arr[index] += ' # counts = ' + counts[index];
        }
      });
    }

    dsl = `
# Vars: ${domains.length} x
#   Aliases: ${aliases} x
#   Domained: ${varsLeft} x
#    - Solved: ${solved} x
#    - Unsolved: ${unsolved} x
#      - Solve stack: ${solveStack.length} x (or ${solveStack.length - aliases} x without aliases)
#      - To solve: ${unsolved - (solveStack.length - aliases)} x
# Var decls:
${
  arr
    .map((s, varIndex) =>
      s && (
        s +
        '\n ## ' +
        (partsPerVar[varIndex] && (partsPerVar[varIndex].map(partIndex => allParts[partIndex]).join(' ## ')))
      )
    )
    .filter((a, i) => domains[i] !== false && (!counts || counts[i] > 0))
    .join('\n')
}

`;
  } else {
    dsl += '# vars:\n';
    dsl += domains.map((d, i) => [d, i]).filter(a => a[0] !== false).filter(a => !counts || counts[a[1]] > 0).map(a => ': $' + a[1].toString(36) + ' [' + domain_toArr(a[0]) + ']').join('\n');
    dsl += '\n\n';
  }

  dsl += '# Constraints:\n' + allParts.join('');
  return dsl;

  function m2d_dec8() {
    ASSERT(pc < ml.length, 'OOB');
    ASSERT_LOG2(' . dec8 decoding', ml[pc], 'from', pc);
    return ml[pc++];
  }

  function m2d_dec16() {
    ASSERT(pc < ml.length - 1, 'OOB');
    ASSERT_LOG2(' . dec16 decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1, '=>', (ml[pc] << 8) | ml[pc + 1]);
    return (ml[pc++] << 8) | ml[pc++];
  }

  function m2d_decAb(lena, lenb, op) {
    let a = (lena === 1 ? m2d_dec8() : m2d_dec16());
    let b = (lenb === 1 ? m2d_dec8() : m2d_dec16());

    if (lena === 2 && domains[a] === false) a = getAlias(a);
    if (lenb === 2 && domains[b] === false) b = getAlias(b);

    if (DEBUG) {
      if (lena === 2) {
        if (!partsPerVar[a]) partsPerVar[a] = [];
        partsPerVar[a].push(allParts.length);
      }
      if (lenb === 2) {
        if (!partsPerVar[b]) partsPerVar[b] = [];
        partsPerVar[b].push(allParts.length);
      }

      let s = (lena === 1 ? a : toName(a)) + ' ' + op + ' ' + (lenb === 1 ? b : toName(b));
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# ' + (lena === 1 ? 'lit(' + a + ')' : domain__debug(domains[a])) + ' ' + op + ' ' + (lenb === 1 ? 'lit(' + b + ')' : domain__debug(domains[b]));
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# args: ' + a + ', ' + b;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      s += (counts ? '# counts: ' + (lena === 1 ? '-' : counts[a]) + ' ' + op + ' ' + (lenb === 1 ? '-' : counts[b]) : '');
      s += ' \n';

      return s;
    } else {
      return (lena === 1 ? a : '$' + a.toString(36) + '$') + ' ' + op + ' ' + (lenb === 1 ? b : '$' + b.toString(36) + '$') + '\n';
    }
  }

  function m2d_decAbc(lena, lenb, lenc, op) {
    let a = (lena === 1 ? m2d_dec8() : m2d_dec16());
    let b = (lenb === 1 ? m2d_dec8() : m2d_dec16());
    let c = (lenc === 1 ? m2d_dec8() : m2d_dec16());

    if (lena === 2 && domains[a] === false) a = getAlias(a);
    if (lenb === 2 && domains[b] === false) b = getAlias(b);
    if (lenc === 2 && domains[c] === false) c = getAlias(c);

    let s = '';
    if (DEBUG) {
      if (lena === 2) {
        if (!partsPerVar[a]) partsPerVar[a] = [];
        partsPerVar[a].push(allParts.length);
      }
      if (lenb === 2) {
        if (!partsPerVar[b]) partsPerVar[b] = [];
        partsPerVar[b].push(allParts.length);
      }
      if (lenc === 2) {
        if (!partsPerVar[c]) partsPerVar[c] = [];
        partsPerVar[c].push(allParts.length);
      }

      s = (lena === 1 ? a : toName(a)) + ' ' + op + ' ' + (lenb === 1 ? b : toName(b));
      s = (lenc === 1 ? c : toName(c)) + ' = ' + s;
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# ' + (lenc === 1 ? 'lit(' + c + ')' : domain__debug(domains[c])) + ' = ' + (lena === 1 ? 'lit(' + a + ')' : domain__debug(domains[a])) + ' ' + op + ' ' + (lenb === 1 ? 'lit(' + b + ')' : domain__debug(domains[b]));
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# args: ' + c + ' = ' + a + ' @ ' + b;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      s += counts ? '# counts: ' + (lenc === 1 ? '-' : counts[c]) + ' = ' + (lena === 1 ? '-' : counts[a]) + ' ' + op + ' ' + (lenb === 1 ? '-' : counts[b]) + ' ' : '';
      s += '\n';

      return s;
    } else {
      return (lenc === 1 ? c : '$' + c.toString(36) + '$') + ' = ' + (lena === 1 ? a : '$' + a.toString(36) + '$') + ' ' + op + ' ' + (lenb === 1 ? b : '$' + b.toString(36) + '$') + '\n';
    }
  }

  function m2d_listVoid(callName) {
    let argCount = m2d_dec16();
    let indexes = '';
    let counters = '';
    let argNames = '';
    let debugs = '';
    for (let i = 0; i < argCount; ++i) {
      let index = m2d_dec16();


      let domain = domains[index];
      if (domain === false) {
        index = getAlias(index);
        domain = domains[index];
      }
      if (DEBUG) {
        if (!partsPerVar[index]) partsPerVar[index] = [];
        partsPerVar[index].push(allParts.length);

        indexes += index + ' ';
        if (counts) counters += counts[index] + ' ';
        argNames += toName(index) + ' ';
        debugs += domain__debug(domain) + ' ';
      } else {
        argNames += toName(index) + ' ';
      }
    }
    if (DEBUG) {
      let s = callName + '( ' + argNames + ')';
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# ' + callName + '( ' + debugs + ') ';
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# indexes: ' + indexes;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      s += (counts ? '# counts: ' + callName + '( ' + counters + ')' : '');
      s += '\n';

      return s;
    } else {
      return callName + '( ' + argNames + ')\n';
    }
  }

  function m2d_listResult(callName) {
    let args = m2d_dec16();
    return m2d_listResultBody(callName, args);
  }

  function m2d_listResultBody(callName, argCount) {
    let indexes = '';
    let counters = '';
    let argNames = '';
    let debugs = '';
    for (let i = 0; i < argCount; ++i) {
      let index = m2d_dec16();
      let domain = domains[index];
      if (domain === false) {
        index = getAlias(index);
        domain = domains[index];
      }
      if (DEBUG) {
        if (!partsPerVar[index]) partsPerVar[index] = [];
        partsPerVar[index].push(allParts.length);

        indexes += index + ' ';
        if (counts) counters += counts[index] + ' ';
        argNames += toName(index) + ' ';
        debugs += domain__debug(domain) + ' ';
      } else {
        argNames += toName(index) + ' ';
      }
    }
    let indexR = m2d_dec16();
    if (DEBUG) {
      if (!partsPerVar[indexR]) partsPerVar[indexR] = [];
      partsPerVar[indexR].push(allParts.length);
      let s = toName(indexR) + ' = ' + callName + '( ' + argNames + ')';
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# ' + domain__debug(domains[indexR]) + ' = ' + callName + '( ' + debugs + ') ';
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# indexes: ' + indexes;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      s += (counts ? '# counts: ' + counts[indexR] + ' = ' + callName + '( ' + counters + ')' : '');
      s += '\n';

      return s;
    } else {
      return '$' + indexR.toString(36) + ' = ' + callName + '( ' + argNames + ')\n';
    }
  }

  function m2d_sum() {
    let indexes = '';
    let scounts = '';
    let bug = '';
    let sumCount = m2d_dec16();
    let sumConstant = m2d_dec8();
    let sums = sumConstant ? sumConstant + ' ' : '';
    for (let i = 0; i < sumCount; ++i) {
      let index = m2d_dec16();
      let domain = domains[index];
      if (domain === false) {
        index = getAlias(index);
        domain = domains[index];
      }
      if (DEBUG) {
        if (!partsPerVar[index]) partsPerVar[index] = [];
        partsPerVar[index].push(allParts.length);
        indexes += index + ' ';
        if (counts) scounts += counts[index] + ' ';
        sums += toName(index) + ' ';
        bug += domain__debug(domain) + ' ';
      } else {
        sums += '$' + index.toString(36) + ' ';
      }
    }
    let sumIndex = m2d_dec16();
    if (DEBUG) {
      if (!partsPerVar[sumIndex]) partsPerVar[sumIndex] = [];
      partsPerVar[sumIndex].push(allParts.length);
      let s = toName(sumIndex) + ' = sum( ' + sums + ')';
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# constant=' + sumConstant + ', ' + domain__debug(domains[sumIndex]) + ' = sum( ' + bug + ') ';
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# indexes: ' + indexes;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      s += (counts ? '# counts: ' + counts[sumIndex] + ' = sum( ' + scounts + ')' : '');
      s += '\n';

      return s;
    } else {
      return '$' + sumIndex.toString(36) + ' = sum(' + sums + ')\n';
    }
  }

  function m2d_innerLoop() {
    while (pc < ml.length) {
      let pcStart = pc;
      let op = ml[pc++];
      let part = '';
      switch (op) {
        case ML_START:
          if (pc !== 1) { // pc is already incremented...
            return THROW(' ! compiler problem @', pcStart);
          }
          break;

        case ML_STOP:
          ASSERT_LOG2(' ! good end @', pcStart);
          return;

        case ML_JMP:
          let delta = m2d_dec16();
          ASSERT_LOG2(' ! jmp', delta);
          pc += delta;
          break;

        case ML_VV_EQ:
          ASSERT_LOG2(' ! eq vv');
          part = m2d_decAb(2, 2, '==');
          break;

        case ML_V8_EQ:
          ASSERT_LOG2(' ! eq v8');
          part = m2d_decAb(2, 1, '==');
          break;

        case ML_88_EQ:
          ASSERT_LOG2(' ! eq 88');
          part = m2d_decAb(1, 1, '==');
          break;

        case ML_VV_NEQ:
          ASSERT_LOG2(' ! neq vv');
          part = m2d_decAb(2, 2, '!=');
          break;

        case ML_V8_NEQ:
          ASSERT_LOG2(' ! neq v8');
          part = m2d_decAb(2, 1, '!=');
          break;

        case ML_88_NEQ:
          ASSERT_LOG2(' ! neq 88');
          part = m2d_decAb(1, 1, '!=');
          break;

        case ML_VV_LT:
          ASSERT_LOG2(' ! lt vv');
          part = m2d_decAb(2, 2, '<');
          break;

        case ML_V8_LT:
          ASSERT_LOG2(' ! lt v8');
          part = m2d_decAb(2, 1, '<');
          break;

        case ML_8V_LT:
          ASSERT_LOG2(' ! lt 8v');
          part = m2d_decAb(1, 2, '<');
          break;

        case ML_88_LT:
          ASSERT_LOG2(' ! lt 88');
          part = m2d_decAb(1, 1, '<');
          break;

        case ML_VV_LTE:
          ASSERT_LOG2(' ! lte vv');
          part = m2d_decAb(2, 2, '<=');
          break;

        case ML_V8_LTE:
          ASSERT_LOG2(' ! lte v8');
          part = m2d_decAb(2, 1, '<=');
          break;

        case ML_8V_LTE:
          ASSERT_LOG2(' ! lte 8v');
          part = m2d_decAb(1, 2, '<=');
          break;

        case ML_88_LTE:
          ASSERT_LOG2(' ! lte 88');
          part = m2d_decAb(1, 1, '<=');
          break;

        case ML_NALL:
          ASSERT_LOG2(' ! nall');
          part = m2d_listVoid('nall');
          break;

        case ML_ISALL:
          ASSERT_LOG2(' ! isall');
          part = m2d_listResult('isall');
          break;

        case ML_ISALL2:
          ASSERT_LOG2(' ! isall2');
          part = m2d_listResultBody('isall', 2); // body of a VVV is same as the body of an arg counted
          break;

        case ML_ISNALL:
          ASSERT_LOG2(' ! isnall');
          part = m2d_listResult('isnall');
          break;

        case ML_DISTINCT:
          ASSERT_LOG2(' ! distinct');
          part = m2d_listVoid('distinct');
          break;

        case ML_PLUS:
          ASSERT_LOG2(' ! plus');
          part = m2d_decAbc(2, 2, 2, '+');
          break;

        case ML_MINUS:
          ASSERT_LOG2(' ! minus');
          part = m2d_decAbc(2, 2, 2, '-');
          break;

        case ML_MUL:
          ASSERT_LOG2(' ! mul');
          part = m2d_decAbc(2, 2, 2, '*');
          break;

        case ML_DIV:
          ASSERT_LOG2(' ! div');
          part = m2d_decAbc(2, 2, 2, '/');
          break;

        case ML_VVV_ISEQ:
          ASSERT_LOG2(' ! iseq vvv');
          part = m2d_decAbc(2, 2, 2, '==?');
          break;

        case ML_V8V_ISEQ:
          ASSERT_LOG2(' ! iseq v8v');
          part = m2d_decAbc(2, 1, 2, '==?');
          break;

        case ML_VV8_ISEQ:
          ASSERT_LOG2(' ! iseq vv8');
          part = m2d_decAbc(2, 2, 1, '==?');
          break;

        case ML_88V_ISEQ:
          ASSERT_LOG2(' ! iseq 88v');
          part = m2d_decAbc(1, 1, 2, '==?');
          break;

        case ML_V88_ISEQ:
          ASSERT_LOG2(' ! iseq v88');
          part = m2d_decAbc(2, 1, 1, '==?');
          break;

        case ML_888_ISEQ:
          ASSERT_LOG2(' ! iseq 888');
          part = m2d_decAbc(1, 1, 1, '==?');
          break;

        case ML_VVV_ISNEQ:
          ASSERT_LOG2(' ! isneq vvv');
          part = m2d_decAbc(2, 2, 2, '!=?');
          break;

        case ML_V8V_ISNEQ:
          ASSERT_LOG2(' ! isneq v8v');
          part = m2d_decAbc(2, 1, 2, '!=?');
          break;

        case ML_VV8_ISNEQ:
          ASSERT_LOG2(' ! isneq vv8');
          part = m2d_decAbc(2, 2, 1, '!=?');
          break;

        case ML_88V_ISNEQ:
          ASSERT_LOG2(' ! isneq 88v');
          part = m2d_decAbc(1, 1, 2, '!=?');
          break;

        case ML_V88_ISNEQ:
          ASSERT_LOG2(' ! isneq v88');
          part = m2d_decAbc(2, 1, 1, '!=?');
          break;

        case ML_888_ISNEQ:
          ASSERT_LOG2(' ! isneq 888');
          part = m2d_decAbc(1, 1, 1, '!=?');
          break;

        case ML_VVV_ISLT:
          ASSERT_LOG2(' ! islt vvv');
          part = m2d_decAbc(2, 2, 2, '<?');
          break;

        case ML_8VV_ISLT:
          ASSERT_LOG2(' ! islt 8vv');
          part = m2d_decAbc(1, 2, 2, '<?');
          break;

        case ML_V8V_ISLT:
          ASSERT_LOG2(' ! islt v8v');
          part = m2d_decAbc(2, 1, 2, '<?');
          break;

        case ML_VV8_ISLT:
          ASSERT_LOG2(' ! islt vv8');
          part = m2d_decAbc(2, 2, 1, '<?');
          break;

        case ML_88V_ISLT:
          ASSERT_LOG2(' ! islt 88v');
          part = m2d_decAbc(1, 1, 2, '<?');
          break;

        case ML_V88_ISLT:
          ASSERT_LOG2(' ! islt v88');
          part = m2d_decAbc(2, 1, 1, '<?');
          break;

        case ML_8V8_ISLT:
          ASSERT_LOG2(' ! islt 8v8');
          part = m2d_decAbc(1, 2, 1, '<?');
          break;

        case ML_888_ISLT:
          ASSERT_LOG2(' ! islt 888');
          part = m2d_decAbc(1, 1, 1, '<?');
          break;

        case ML_VVV_ISLTE:
          ASSERT_LOG2(' ! islte vvv');
          part = m2d_decAbc(2, 2, 2, '<=?');
          break;

        case ML_8VV_ISLTE:
          ASSERT_LOG2(' ! islte 8vv');
          part = m2d_decAbc(1, 2, 2, '<=?');
          break;

        case ML_V8V_ISLTE:
          ASSERT_LOG2(' ! islte v8v');
          part = m2d_decAbc(2, 1, 2, '<=?');
          break;

        case ML_VV8_ISLTE:
          ASSERT_LOG2(' ! islte vv8');
          part = m2d_decAbc(2, 2, 1, '<=?');
          break;

        case ML_88V_ISLTE:
          ASSERT_LOG2(' ! islte 88v');
          part = m2d_decAbc(1, 1, 2, '<=?');
          break;

        case ML_V88_ISLTE:
          ASSERT_LOG2(' ! islte v88');
          part = m2d_decAbc(2, 1, 1, '<=?');
          break;

        case ML_8V8_ISLTE:
          ASSERT_LOG2(' ! islte 8v8');
          part = m2d_decAbc(1, 2, 1, '<=?');
          break;

        case ML_888_ISLTE:
          ASSERT_LOG2(' ! islte 888');
          part = m2d_decAbc(1, 1, 1, '<=?');
          break;

        case ML_8V_SUM:
          ASSERT_LOG2(' ! sum');
          part = m2d_sum();
          break;

        case ML_PRODUCT:
          ASSERT_LOG2(' ! product');
          part = m2d_listResult('product');
          break;

        case ML_VV_AND:
          ASSERT_LOG2(' ! and vv');
          part = m2d_decAb(2, 2, '&');
          break;
        case ML_VV_OR:
          ASSERT_LOG2(' ! or vv');
          part = m2d_decAb(2, 2, '|');
          break;
        case ML_VV_XOR:
          ASSERT_LOG2(' ! xor vv');
          part = m2d_decAb(2, 2, '^');
          break;
        case ML_VV_NAND:
          ASSERT_LOG2(' ! nand vv');
          part = m2d_decAb(2, 2, '!&');
          break;
        case ML_VV_XNOR:
          ASSERT_LOG2(' ! xnor vv');
          part = m2d_decAb(2, 2, '!^');
          break;

        case ML_NOOP:
          ASSERT_LOG2(' ! noop');
          pc = pcStart + 1;
          break;
        case ML_NOOP2:
          ASSERT_LOG2(' ! noop 2');
          pc = pcStart + 2;
          break;
        case ML_NOOP3:
          ASSERT_LOG2(' ! noop 3');
          pc = pcStart + 3;
          break;
        case ML_NOOP4:
          ASSERT_LOG2(' ! noop 4');
          pc = pcStart + 4;
          break;

        default:
          ml_throw('(m2d) unknown op', pc, ' at', pc);
      }
      allParts.push(part);
    }
  }
}

// BODY_STOP

export {
  mlToDsl,
};
