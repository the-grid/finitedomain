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
  let pc = 0;
  let dsl = '';

  if (counts) console.error(counts.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).slice(0, 40).map(a => [a[0], '$' + a[1].toString(36)]));

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
        //let alias = getAlias(index);
        //str = '# var index ' + index + ' (' + names[index] + ') is aliased to index ' + alias + ' (' + names[alias] + ')';
      } else {
        ++varsLeft;
        let domain = domains[index];
        let v = domain_getValue(domain);
        if (v >= 0) {
          ++solved;
          str = ': ' + names[index] + ' ' + v;
        } else {
          ++unsolved;
          str = ': ' + names[index] + ' [' + domain_toArr(domain) + ']';
        }
      }
      arr[index] = str;
    });
    domains.forEach((domain, index) => {
      if (domain === false) {
        let alias = getAlias(index);
        if (arr[alias][arr[alias].length - 1] === ')') {
          arr[alias] = arr[alias].slice(0, -1) + ' ' + names[index] + ')';
        } else {
          arr[alias] += ' alias(' + names[index] + ')';
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
${arr.join('\n')}

`;
  } else {
    dsl += '# vars:\n';
    dsl += domains.map((d, i) => [d, i]).filter(a => a[0] !== false).filter(a => !counts || counts[a[1]] > 0).map(a => ': $' + a[1].toString(36) + ' [' + domain_toArr(a[0]) + ']').join('\n');
    dsl += '\n\n';
  }

  dsl += '# Constraints:\n';
  cr_innerLoop();
  return dsl;

  function cr_dec8() {
    ASSERT(pc < ml.length, 'OOB');
    ASSERT_LOG2(' . dec8 decoding', ml[pc], 'from', pc);
    return ml[pc++];
  }

  function cr_dec16() {
    ASSERT(pc < ml.length - 1, 'OOB');
    ASSERT_LOG2(' . dec16 decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1, '=>', (ml[pc] << 8) | ml[pc + 1]);
    return (ml[pc++] << 8) | ml[pc++];
  }

  function cr_decAb(lena, lenb, op) {
    let a = (lena === 1 ? cr_dec8() : cr_dec16());
    let b = (lenb === 1 ? cr_dec8() : cr_dec16());

    if (lena === 2 && domains[a] === false) a = getAlias(a);
    if (lenb === 2 && domains[b] === false) b = getAlias(b);

    let s;
    if (DEBUG) {
      s = (lena === 1 ? a : names[a]) + ' ' + op + ' ' + (lenb === 1 ? b : names[b]);
      s += ' '.repeat(Math.max(45 - s.length, 0));
      s +=
        '   # ' + (lena === 1 ? 'lit(' + a + ')' : domain__debug(domains[a])) + ' ' + op + ' ' + (lenb === 1 ? 'lit(' + b + ')' : domain__debug(domains[b]));
      s += ' '.repeat(Math.max(110 - s.length, 0));
      s += '    # args: ' + a + ', ' + b + (counts ? ', counts: ' + (lena === 1 ? '-' : counts[a]) + ' ' + op + ' ' + (lenb === 1 ? '-' : counts[b]) : '');
    } else {
      s = (lena === 1 ? a : '$' + a.toString(36)) + ' ' + op + ' ' + (lenb === 1 ? b : '$' + b.toString(36));
    }
    return s + '\n';
  }

  function cr_decAbc(lena, lenb, lenc, op) {
    let a = (lena === 1 ? cr_dec8() : cr_dec16());
    let b = (lenb === 1 ? cr_dec8() : cr_dec16());
    let c = (lenc === 1 ? cr_dec8() : cr_dec16());

    if (lena === 2 && domains[a] === false) a = getAlias(a);
    if (lenb === 2 && domains[b] === false) b = getAlias(b);
    if (lenc === 2 && domains[c] === false) c = getAlias(c);

    let s = '';
    if (DEBUG) {
      s = (lena === 1 ? a : names[a]) + ' ' + op + ' ' + (lenb === 1 ? b : names[b]);
      s = (lenc === 1 ? c : names[c]) + ' = ' + s;
      s += ' '.repeat(Math.max(45 - s.length, 0));
      let ss = '';
      if (counts) {
        ss += ', counts: ' + (lenc === 1 ? '-' : counts[c]) + ' = ' + (lena === 1 ? '-' : counts[a]) + ' ' + op + ' ' + (lenb === 1 ? '-' : counts[b]);
      }
      s += '   # ' + (lenc === 1 ? 'lit(' + c + ')' : domain__debug(domains[c])) + ' = ' + (lena === 1 ? 'lit(' + a + ')' : domain__debug(domains[a])) + ' ' + op + ' ' + (lenb === 1 ? 'lit(' + b + ')' : domain__debug(domains[b]));
      s += ' '.repeat(Math.max(110 - s.length, 0));
      s +=
        '    # args: ' + c + ' = ' + a + ' @ ' + b + ss;
    } else {
      s = (lenc === 1 ? c : '$' + c.toString(36)) + ' = ' + (lena === 1 ? a : '$' + a.toString(36)) + ' ' + op + ' ' + (lenb === 1 ? b : '$' + b.toString(36));
    }
    return s + '\n';
  }

  function cr_innerLoop() {
    while (pc < ml.length) {
      let pcStart = pc;
      let op = ml[pc++];
      switch (op) {
        case ML_UNUSED:
          return THROW(' ! compiler problem @', pcStart);

        case ML_STOP:
          ASSERT_LOG2(' ! good end @', pcStart);
          //dsl += '# STOP\n';
          return;

        case ML_JMP:
          let delta = cr_dec16();
          ASSERT_LOG2(' ! jmp', delta);
          //dsl += '# JMP ' + delta + '\n';
          pc += delta;
          break;

        case ML_VV_EQ:
          ASSERT_LOG2(' ! eq vv');
          dsl += cr_decAb(2, 2, '==');
          break;

        case ML_V8_EQ:
          ASSERT_LOG2(' ! eq v8');
          dsl += cr_decAb(2, 1, '==');
          break;

        case ML_88_EQ:
          ASSERT_LOG2(' ! eq 88');
          dsl += cr_decAb(1, 1, '==');
          break;

        case ML_VV_NEQ:
          ASSERT_LOG2(' ! neq vv');
          dsl += cr_decAb(2, 2, '!=');
          break;

        case ML_V8_NEQ:
          ASSERT_LOG2(' ! neq v8');
          dsl += cr_decAb(2, 1, '!=');
          break;

        case ML_88_NEQ:
          ASSERT_LOG2(' ! neq 88');
          dsl += cr_decAb(1, 1, '!=');
          break;

        case ML_VV_LT:
          ASSERT_LOG2(' ! lt vv');
          dsl += cr_decAb(2, 2, '<');
          break;

        case ML_V8_LT:
          ASSERT_LOG2(' ! lt v8');
          dsl += cr_decAb(2, 1, '<');
          break;

        case ML_8V_LT:
          ASSERT_LOG2(' ! lt 8v');
          dsl += cr_decAb(1, 2, '<');
          break;

        case ML_88_LT:
          ASSERT_LOG2(' ! lt 88');
          dsl += cr_decAb(1, 1, '<');
          break;

        case ML_VV_LTE:
          ASSERT_LOG2(' ! lte vv');
          dsl += cr_decAb(2, 2, '<=');
          break;

        case ML_V8_LTE:
          ASSERT_LOG2(' ! lte v8');
          dsl += cr_decAb(2, 1, '<=');
          break;

        case ML_8V_LTE:
          ASSERT_LOG2(' ! lte 8v');
          dsl += cr_decAb(1, 2, '<=');
          break;

        case ML_88_LTE:
          ASSERT_LOG2(' ! lte 88');
          dsl += cr_decAb(1, 1, '<=');
          break;

        case ML_DISTINCT:
          ASSERT_LOG2(' ! distinct');
          dsl += 'distinct(';
          for (let i = 0, count = cr_dec16(); i < count; ++i) {
            dsl += cr_dec16() + ' ';
          }
          dsl += ')\n';
          break;

        case ML_PLUS:
          ASSERT_LOG2(' ! plus');
          dsl += cr_decAbc(2, 2, 2, '+');
          break;

        case ML_MINUS:
          ASSERT_LOG2(' ! minus');
          dsl += cr_decAbc(2, 2, 2, '-');
          break;

        case ML_MUL:
          ASSERT_LOG2(' ! mul');
          dsl += cr_decAbc(2, 2, 2, '*');
          break;

        case ML_DIV:
          ASSERT_LOG2(' ! div');
          dsl += cr_decAbc(2, 2, 2, '/');
          break;

        case ML_VVV_ISEQ:
          ASSERT_LOG2(' ! iseq vvv');
          dsl += cr_decAbc(2, 2, 2, '==?');
          break;

        case ML_V8V_ISEQ:
          ASSERT_LOG2(' ! iseq v8v');
          dsl += cr_decAbc(2, 1, 2, '==?');
          break;

        case ML_VV8_ISEQ:
          ASSERT_LOG2(' ! iseq vv8');
          dsl += cr_decAbc(2, 2, 1, '==?');
          break;

        case ML_88V_ISEQ:
          ASSERT_LOG2(' ! iseq 88v');
          dsl += cr_decAbc(1, 1, 2, '==?');
          break;

        case ML_V88_ISEQ:
          ASSERT_LOG2(' ! iseq v88');
          dsl += cr_decAbc(2, 1, 1, '==?');
          break;

        case ML_888_ISEQ:
          ASSERT_LOG2(' ! iseq 888');
          dsl += cr_decAbc(1, 1, 1, '==?');
          break;

        case ML_VVV_ISNEQ:
          ASSERT_LOG2(' ! isneq vvv');
          dsl += cr_decAbc(2, 2, 2, '!=?');
          break;

        case ML_V8V_ISNEQ:
          ASSERT_LOG2(' ! isneq v8v');
          dsl += cr_decAbc(2, 1, 2, '!=?');
          break;

        case ML_VV8_ISNEQ:
          ASSERT_LOG2(' ! isneq vv8');
          dsl += cr_decAbc(2, 2, 1, '!=?');
          break;

        case ML_88V_ISNEQ:
          ASSERT_LOG2(' ! isneq 88v');
          dsl += cr_decAbc(1, 1, 2, '!=?');
          break;

        case ML_V88_ISNEQ:
          ASSERT_LOG2(' ! isneq v88');
          dsl += cr_decAbc(2, 1, 1, '!=?');
          break;

        case ML_888_ISNEQ:
          ASSERT_LOG2(' ! isneq 888');
          dsl += cr_decAbc(1, 1, 1, '!=?');
          break;

        case ML_VVV_ISLT:
          ASSERT_LOG2(' ! islt vvv');
          dsl += cr_decAbc(2, 2, 2, '<?');
          break;

        case ML_8VV_ISLT:
          ASSERT_LOG2(' ! islt 8vv');
          dsl += cr_decAbc(1, 2, 2, '<?');
          break;

        case ML_V8V_ISLT:
          ASSERT_LOG2(' ! islt v8v');
          dsl += cr_decAbc(2, 1, 2, '<?');
          break;

        case ML_VV8_ISLT:
          ASSERT_LOG2(' ! islt vv8');
          dsl += cr_decAbc(2, 2, 1, '<?');
          break;

        case ML_88V_ISLT:
          ASSERT_LOG2(' ! islt 88v');
          dsl += cr_decAbc(1, 1, 2, '<?');
          break;

        case ML_V88_ISLT:
          ASSERT_LOG2(' ! islt v88');
          dsl += cr_decAbc(2, 1, 1, '<?');
          break;

        case ML_8V8_ISLT:
          ASSERT_LOG2(' ! islt 8v8');
          dsl += cr_decAbc(1, 2, 1, '<?');
          break;

        case ML_888_ISLT:
          ASSERT_LOG2(' ! islt 888');
          dsl += cr_decAbc(1, 1, 1, '<?');
          break;

        case ML_VVV_ISLTE:
          ASSERT_LOG2(' ! islte vvv');
          dsl += cr_decAbc(2, 2, 2, '<=?');
          break;

        case ML_8VV_ISLTE:
          ASSERT_LOG2(' ! islte 8vv');
          dsl += cr_decAbc(1, 2, 2, '<=?');
          break;

        case ML_V8V_ISLTE:
          ASSERT_LOG2(' ! islte v8v');
          dsl += cr_decAbc(2, 1, 2, '<=?');
          break;

        case ML_VV8_ISLTE:
          ASSERT_LOG2(' ! islte vv8');
          dsl += cr_decAbc(2, 2, 1, '<=?');
          break;

        case ML_88V_ISLTE:
          ASSERT_LOG2(' ! islte 88v');
          dsl += cr_decAbc(1, 1, 2, '<=?');
          break;

        case ML_V88_ISLTE:
          ASSERT_LOG2(' ! islte v88');
          dsl += cr_decAbc(2, 1, 1, '<=?');
          break;

        case ML_8V8_ISLTE:
          ASSERT_LOG2(' ! islte 8v8');
          dsl += cr_decAbc(1, 2, 1, '<=?');
          break;

        case ML_888_ISLTE:
          ASSERT_LOG2(' ! islte 888');
          dsl += cr_decAbc(1, 1, 1, '<=?');
          break;

        case ML_8V_SUM:
          ASSERT_LOG2(' ! sum');
          let indexes = '';
          let scounts = '';
          let sums = '';
          let bug = '';
          let sumCount = cr_dec16();
          let sumConstant = cr_dec8();
          for (let i = 0; i < sumCount; ++i) {
            let index = cr_dec16();
            let domain = domains[index];
            if (domain === false) {
              index = getAlias(index);
              domain = domains[index];
            }
            if (DEBUG) {
              indexes += index + ' ';
              if (counts) scounts += counts[index] + ' ';
              sums += names[index] + ' ';
              bug += domain__debug(domain) + ' ';
            } else {
              sums += '$' + index.toString(36) + ' ';
            }
          }
          let sumIndex = cr_dec16();
          if (DEBUG) {
            dsl += names[sumIndex] + ' = sum(' + sums + ') # constant=' + sumConstant + ', ' + domain__debug(domains[sumIndex]) + ' = sum(' + sumConstant + ', ' + bug + ') # indexes: ' + indexes + (scounts ? ', counts: ' + counts[sumIndex] + ' = sum(' + scounts + ')' : '') + '\n';
          } else {
            dsl += '$' + sumIndex.toString(36) + ' = sum(' + sums + ')\n';
          }
          break;

        case ML_PRODUCT:
          ASSERT_LOG2(' ! product');
          let pindexes = '';
          let pcounts = '';
          let products = '';
          let pbug = '';
          let productCount = cr_dec16();
          for (let i = 0; i < productCount; ++i) {
            let index = cr_dec16();
            let domain = domains[index];
            if (domain === false) {
              index = getAlias(index);
              domain = domains[index];
            }
            if (DEBUG) {
              pindexes += index + ' ';
              if (counts) pcounts += counts[index] + ' ';
              products += names[index] + ' ';
              pbug += domain__debug(domain) + ' ';
            } else {
              products += '$' + index.toString(36) + ' ';
            }
          }
          let productIndex = cr_dec16();
          if (DEBUG) {
            dsl += names[productIndex] + ' = product(' + products + ') # ' + domain__debug(domains[productIndex]) + ' = product(' + pbug + ') # indexes: ' + pindexes + (pcounts ? ', counts: ' + counts[productIndex] + ' = product(' + pcounts + ')' : '') + '\n';
          } else {
            dsl += '$' + productIndex.toString(36) + ' = product(' + products + ')\n';
          }
          break;

        case ML_VV_AND:
          ASSERT_LOG2(' ! and vv');
          dsl += cr_decAb(2, 2, '&');
          break;
        case ML_VV_OR:
          ASSERT_LOG2(' ! or vv');
          dsl += cr_decAb(2, 2, '|');
          break;
        case ML_VV_XOR:
          ASSERT_LOG2(' ! xor vv');
          dsl += cr_decAb(2, 2, '^');
          break;
        case ML_VV_NAND:
          ASSERT_LOG2(' ! nand vv');
          dsl += cr_decAb(2, 2, '!&');
          break;
        case ML_VV_XNOR:
          ASSERT_LOG2(' ! xnor vv');
          dsl += cr_decAb(2, 2, '!^');
          break;

        case ML_NOOP:
          ASSERT_LOG2(' ! noop');
          //dsl += '# NOOP \n';
          pc = pcStart + 1;
          break;
        case ML_NOOP2:
          ASSERT_LOG2(' ! noop 2');
          //dsl += '# NOOP 2\n';
          pc = pcStart + 2;
          break;
        case ML_NOOP3:
          ASSERT_LOG2(' ! noop 3');
          //dsl += '# NOOP 3\n';
          pc = pcStart + 3;
          break;
        case ML_NOOP4:
          //dsl += '# NOOP 4\n';
          ASSERT_LOG2(' ! noop 4');
          pc = pcStart + 4;
          break;

        default:
          ml_throw('unknown op', pc);
      }
    }
  }
}

// BODY_STOP

export {
  mlToDsl,
};
