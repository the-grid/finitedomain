// TODO: need to update this code to use getDomain and aliases and such
//
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
  ML_EQ,
  ML_NEQ,
  ML_LT,
  ML_LTE,
  ML_ISEQ,
  ML_ISNEQ,
  ML_ISLT,
  ML_ISLTE,
  ML_NALL,
  ML_ISALL,
  ML_ISALL2,
  ML_ISNALL,
  ML_ISNONE,
  ML_SUM,
  ML_PRODUCT,
  ML_DISTINCT,
  ML_PLUS,
  ML_MINUS,
  ML_MUL,
  ML_DIV,
  ML_AND,
  ML_OR,
  ML_XOR,
  ML_NAND,
  ML_XNOR,
  ML_DEBUG,
  ML_JMP,
  ML_JMP32,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  ml_throw,
} from './ml';

// BODY_START

/**
 * Generate a dsl for given ml
 * Includes a full debugging output stack to investigate a problem more thoroughly
 *
 * @param {Buffer} ml
 * @param {Object} problem
 * @param {number[]} [counts] Maps to var varNames, holds the sum of the number of times each var occurs in a constraint
 * @param {Object} [options]
 * @property {boolean} options.debug Enable debug output (adds lots of comments about vars)
 * @property {boolean} options.hashNames Replace original varNames with `$<base36(index)>$` of their index in the output
 * @property {boolean} options.indexNames Replace original varNames with `_<index>_` in the output
 * @property {boolean} options.groupedConstraints When debugging only, add all constraints below a var decl where that var is used
 * @returns {string}
 */
function mlToDsl(ml, problem, counts, options) {
  ASSERT_LOG2('\n## mlToDsl');
  const DEBUG = options ? options.debug : true; // add debugging help in comments (domains, related constraints, occurrences, etc)
  const HASH_NAMES = options ? options.hashNames : true; // replace all var varNames with $index$ with index in base36
  const INDEX_NAMES = options ? options.indexNames : false; // replace all var varNames with _index_ (ignored if HASH_NAMES is true)
  const ADD_GROUPED_CONSTRAINTS = options ? options.groupedConstraints : true; // only used when debugging

  let {
    varNames,
    domains,
    getDomain,
    getAlias,
    solveStack,
  } = problem;


  let pc = 0;
  let dsl = '';
  const LEN = ml.length;

  function toName(index) {
    if (HASH_NAMES) return '$' + index.toString(36) + '$';
    if (INDEX_NAMES) return '_' + index + '_';
    return varNames[index];
  }

  //if (counts) console.error(counts.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).slice(0, 40).map(a => [a[0], toName(a[1])]));

  let allParts = [];
  let partsPerVar = [];
  let varOps = [];
  let constraintCount = 0;
  m2d_innerLoop();

  if (DEBUG) {
    let varDecls = [];
    let varsLeft = 0;
    let aliases = 0;
    let solved = 0;
    let unsolved = 0;
    // first generate var decls for unsolved, unaliased vars
    domains.forEach((domain, index) => {
      let str = '';
      if (domain === false) {
        ++aliases;
      } else {
        ++varsLeft;
        ASSERT(domain === getDomain(index), 'if not aliased then it should return this', index, domain);
        let v = domain_getValue(domain);
        if (v >= 0 || (counts && !counts[index])) {
          ++solved;
        } else {
          ++unsolved;
          str = ': ' + toName(index) + ' [' + domain_toArr(domain) + ']';
        }
      }
      varDecls[index] = str;
    });

    let varDeclsString = domains
      .map((_, varIndex) => {
        // ignore constants and aliased vars
        let decl = varDecls[varIndex];
        if (!decl) return '';

        let ops = (varOps[varIndex] || '').split(/ /g).sort().join(' ');

        return (
          decl +
          (counts ? ' # counts: ' + counts[varIndex] : '') +
          ((HASH_NAMES || !INDEX_NAMES) ? '  # index = ' + varIndex : '') +
          '  # ops (' + (ops.replace(/[^ ]/g, '').length + 1) + '): ' + ops + ' $' +
          (ADD_GROUPED_CONSTRAINTS
            ? '\n ## ' + (partsPerVar[varIndex] && (partsPerVar[varIndex].map(partIndex => allParts[partIndex]).join(' ## ')))
            : ''
          )
        );
      })
      .filter(s => !!s)
      .join('\n');

    dsl = `
# Constraints: ${constraintCount} x
# Vars: ${domains.length} x
#   Aliases: ${aliases} x
#   Domained: ${varsLeft} x
#    - Solved: ${solved} x
#    - Unsolved: ${unsolved} x
#    - Solve stack: ${solveStack.length} x (or ${solveStack.length - aliases} x without aliases)
`;
    if (DEBUG) console.error(dsl);

    dsl += `
# Var decls:
${varDeclsString}

`;
  } else {
    dsl += '# vars:\n';
    dsl += domains.map((d, i) => [d, i]).filter(a => a[0] !== false).filter(a => !counts || counts[a[1]] > 0).map(a => ': ' + toName(a[1]) + ' [' + domain_toArr(a[0]) + ']').join('\n');
    dsl += '\n\n';
  }

  dsl += '# Constraints:\n' + allParts.join('');
  return dsl;

  // ###########################################

  function m2d_dec16() {
    ASSERT(pc < LEN - 1, 'OOB');
    ASSERT_LOG2(' . dec16 decoding', ml[pc] << 8, 'from', pc, 'and', ml[pc + 1], 'from', pc + 1, '=>', (ml[pc] << 8) | ml[pc + 1]);
    let s = (ml[pc++] << 8) | ml[pc++];
    return s;
  }

  function m2d_dec32() {
    ASSERT(pc < LEN - 1, 'OOB');
    ASSERT_LOG2(' . dec32 decoding', ml[pc], ml[pc + 1], ml[pc + 2], ml[pc + 3], 'from', pc, '=>', (ml[pc] << 8) | ml[pc + 1]);
    return (ml[pc++] << 24) | (ml[pc++] << 16) | (ml[pc++] << 8) | ml[pc++];
  }

  function m2d_decA() {
    let a = getAlias(m2d_dec16());
    let A = getDomain(a);
    let vA = domain_getValue(A);

    if (DEBUG) {
      if (vA < 0) {
        if (!partsPerVar[a]) partsPerVar[a] = [];
        partsPerVar[a].push(allParts.length);
      }

      let s = vA >= 0 ? vA : toName(a);
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# ' + (vA >= 0 ? 'lit(' + vA + ')' : domain__debug(getDomain(a)));
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# args: ' + a;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      s += counts ? '# counts: ' + (counts[a] === undefined ? '-' : counts[a]) : '';
      s += ' \n';

      return s;
    } else {
      return (vA >= 0 ? vA : toName(a));
    }
  }

  function m2d_decAb(op) {
    let a = getAlias(m2d_dec16());
    let A = getDomain(a);
    let vA = domain_getValue(A);

    let b = getAlias(m2d_dec16());
    let B = getDomain(b);
    let vB = domain_getValue(B);

    if (DEBUG) {
      if (vA < 0) {
        if (!partsPerVar[a]) partsPerVar[a] = [];
        partsPerVar[a].push(allParts.length);
        varOps[a] = (varOps[a] ? varOps[a] + ' ' : '') + op;
      }

      if (vB < 0) {
        if (!partsPerVar[b]) partsPerVar[b] = [];
        partsPerVar[b].push(allParts.length);
        varOps[b] = (varOps[b] ? varOps[b] + ' ' : '') + op;
      }

      let s = (vA >= 0 ? vA : toName(a)) + ' ' + op + ' ' + (vB >= 0 ? vB : toName(b));
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# ' + (vA >= 0 ? 'lit(' + vA + ')' : domain__debug(A)) + ' ' + op + ' ' + (vB >= 0 ? 'lit(' + vB + ')' : domain__debug(B));
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# args: ' + a + ', ' + b;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      s += (counts ? '# counts: ' + (counts[a] === undefined ? '-' : counts[a]) + ' ' + op + ' ' + (counts[b] === undefined ? '-' : counts[b]) : '');
      s += ' \n';

      return s;
    } else {
      return (vA >= 0 ? vA : toName(a)) + ' ' + op + ' ' + (vB >= 0 ? vB : toName(b)) + '\n';
    }
  }

  function m2d_decAbc(op) {
    let a = getAlias(m2d_dec16());
    let A = getDomain(a);
    let vA = domain_getValue(A);

    let b = getAlias(m2d_dec16());
    let B = getDomain(b);
    let vB = domain_getValue(B);

    let c = getAlias(m2d_dec16());
    let C = getDomain(c);
    let vC = domain_getValue(C);

    if (DEBUG) {
      if (vA < 0) {
        if (!partsPerVar[a]) partsPerVar[a] = [];
        partsPerVar[a].push(allParts.length);
        varOps[a] = (varOps[a] ? varOps[a] + ' ' : '') + op;
      }

      if (vB < 0) {
        if (!partsPerVar[b]) partsPerVar[b] = [];
        partsPerVar[b].push(allParts.length);
        varOps[b] = (varOps[b] ? varOps[b] + ' ' : '') + op;
      }

      if (vC < 0) {
        if (!partsPerVar[c]) partsPerVar[c] = [];
        partsPerVar[c].push(allParts.length);
        varOps[c] = (varOps[c] ? varOps[c] + ' ' : '') + op;
      }

      let s = (vC >= 0 ? vC : toName(c)) + ' = ' + (vA >= 0 ? vA : toName(a)) + ' ' + op + ' ' + (vB >= 0 ? vB : toName(b));
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# ' + (vC >= 0 ? 'lit(' + vC + ')' : domain__debug(C)) + ' = ' + (vA >= 0 ? 'lit(' + vA + ')' : domain__debug(A)) + ' ' + op + ' ' + (vB >= 0 ? 'lit(' + vB + ')' : domain__debug(B));
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# indexes: ' + c + ' = ' + a + ' ' + op + ' ' + b;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      if (counts) s += '# counts: ' + (counts[c] === undefined ? '-' : counts[c]) + ' = ' + (counts[a] === undefined ? '-' : counts[a]) + ' ' + op + ' ' + (counts[b] === undefined ? '-' : counts[b]) + ' ';
      s += '\n';

      return s;
    } else {
      return (vC >= 0 ? vC : toName(c)) + ' = ' + (vA >= 0 ? vA : toName(a)) + ' ' + op + ' ' + (vB >= 0 ? vB : toName(b)) + '\n';
    }
  }

  function m2d_listVoid(callName) {
    let argCount = m2d_dec16();
    let indexes = '';
    let counters = '';
    let argNames = '';
    let debugs = '';
    //let prevIndex = -1;
    for (let i = 0; i < argCount; ++i) {
      let d = getAlias(m2d_dec16());
      let D = getDomain(d);
      let vD = domain_getValue(D);

      argNames += vD >= 0 ? vD : toName(d) + ' ';
      if (DEBUG) {
        if (vD < 0) {
          if (!partsPerVar[d]) partsPerVar[d] = [];
          partsPerVar[d].push(allParts.length);
          varOps[d] = (varOps[d] ? varOps[d] + ' ' : '') + callName;
        }

        indexes += d + ' ';
        if (counts) counters += (counts[d] === undefined ? '-' : counts[d]) + ' ';
        debugs += domain__debug(D) + ' ';
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
    let argCount = m2d_dec16();
    return m2d_listResultBody(callName, argCount);
  }

  function m2d_listResultBody(callName, argCount) {
    let indexes = '';
    let counters = '';
    let argNames = '';
    let debugs = '';
    //let prevIndex = -1;
    for (let i = 0; i < argCount; ++i) {
      let d = getAlias(m2d_dec16());
      let D = getDomain(d);
      let vD = domain_getValue(D);

      argNames += vD >= 0 ? vD : toName(d) + ' ';
      if (DEBUG) {
        if (vD < 0) {
          if (!partsPerVar[d]) partsPerVar[d] = [];
          partsPerVar[d].push(allParts.length);
          varOps[d] = (varOps[d] ? varOps[d] + ' ' : '') + callName;
        }

        indexes += d + ' ';
        if (counts) counters += (counts[d] === undefined ? '-' : counts[d]) + ' ';
        debugs += domain__debug(D) + ' ';
      }
    }

    let r = getAlias(m2d_dec16());
    let R = getDomain(r);
    let vR = domain_getValue(R);

    if (DEBUG) {
      varOps[r] = (varOps[r] ? varOps[r] + ' ' : '') + callName;
      if (vR < 0) {
        if (!partsPerVar[r]) partsPerVar[r] = [];
        partsPerVar[r].push(allParts.length);
        varOps[r] = (varOps[r] ? varOps[r] + ' ' : '') + callName;
      }

      let s = (vR >= 0 ? vR : toName(r)) + ' = ' + callName + '( ' + argNames + ')';
      s += ' '.repeat(Math.max(45 - s.length, 3));
      s += '# ' + domain__debug(R) + ' = ' + callName + '( ' + debugs + ') ';
      s += ' '.repeat(Math.max(110 - s.length, 3));
      s += '# indexes: ' + r + ' = ' + indexes;
      s += ' '.repeat(Math.max(150 - s.length, 3));
      s += (counts ? '# counts: ' + (counts[r] === undefined ? '-' : counts[r]) + ' = ' + callName + '( ' + counters + ')' : '');
      s += '\n';

      return s;
    } else {
      return (vR >= 0 ? vR : toName(r)) + ' = ' + callName + '( ' + argNames + ')\n';
    }
  }

  function m2d_innerLoop() {
    while (pc < LEN) {
      let pcStart = pc;

      let op = ml[pc++];
      let part = '';

      //console.log('->', pc, op);

      switch (op) {
        case ML_START:
        case ML_STOP:
        case ML_DEBUG:
        case ML_NOOP:
        case ML_NOOP2:
        case ML_NOOP3:
        case ML_NOOP4:
        case ML_JMP:
        case ML_JMP32:
          break;
        default:
          ++constraintCount;
      }

      switch (op) {
        case ML_START:
          if (pc !== 1) { // pc is already incremented...
            return THROW(' ! ml2dsl compiler problem @', pcStart);
          }
          break;

        case ML_STOP:
          ASSERT_LOG2(' ! good end @', pcStart);
          return;

        case ML_JMP:
          let delta = m2d_dec16();
          ASSERT_LOG2(' ! jmp', delta);
          if (delta <= 0) THROW('Must jump some bytes');
          pc += delta;
          break;
        case ML_JMP32:
          let delta32 = m2d_dec32();
          ASSERT_LOG2(' ! jmp32', delta32);
          if (delta32 <= 0) THROW('Must jump some bytes');
          pc += delta32;
          break;

        case ML_EQ:
          ASSERT_LOG2(' ! eq vv');
          part = m2d_decAb('==');
          break;

        case ML_NEQ:
          ASSERT_LOG2(' ! neq vv');
          part = m2d_decAb('!=');
          break;

        case ML_LT:
          ASSERT_LOG2(' ! lt vv');
          part = m2d_decAb('<');
          break;

        case ML_LTE:
          ASSERT_LOG2(' ! lte vv');
          part = m2d_decAb('<=');
          break;

        case ML_NALL:
          ASSERT_LOG2(' ! nall');
          part = m2d_listVoid('nall');
          break;

        case ML_ISALL:
          ASSERT_LOG2(' ! isall');
          part = m2d_listResult('all?');
          break;

        case ML_ISALL2:
          ASSERT_LOG2(' ! isall2');
          part = m2d_listResultBody('all?', 2); // body of a VVV is same as the body of an arg counted
          break;

        case ML_ISNALL:
          ASSERT_LOG2(' ! isnall');
          part = m2d_listResult('nall?');
          break;

        case ML_ISNONE:
          ASSERT_LOG2(' ! isnone');
          part = m2d_listResult('none?');
          break;

        case ML_DISTINCT:
          ASSERT_LOG2(' ! distinct');
          part = m2d_listVoid('distinct');
          break;

        case ML_PLUS:
          ASSERT_LOG2(' ! plus');
          part = m2d_decAbc('+');
          break;

        case ML_MINUS:
          ASSERT_LOG2(' ! minus');
          part = m2d_decAbc('-');
          break;

        case ML_MUL:
          ASSERT_LOG2(' ! mul');
          part = m2d_decAbc('*');
          break;

        case ML_DIV:
          ASSERT_LOG2(' ! div');
          part = m2d_decAbc('/');
          break;

        case ML_ISEQ:
          ASSERT_LOG2(' ! iseq vvv');
          part = m2d_decAbc('==?');
          break;

        case ML_ISNEQ:
          ASSERT_LOG2(' ! isneq vvv');
          part = m2d_decAbc('!=?');
          break;

        case ML_ISLT:
          ASSERT_LOG2(' ! islt vvv');
          part = m2d_decAbc('<?');
          break;

        case ML_ISLTE:
          ASSERT_LOG2(' ! islte vvv');
          part = m2d_decAbc('<=?');
          break;

        case ML_SUM:
          ASSERT_LOG2(' ! sum');
          part = m2d_listResult('product');
          break;

        case ML_PRODUCT:
          ASSERT_LOG2(' ! product');
          part = m2d_listResult('product');
          break;

        case ML_AND:
          ASSERT_LOG2(' ! and vv');
          part = m2d_decAb('&');
          break;
        case ML_OR:
          ASSERT_LOG2(' ! or vv');
          part = m2d_decAb('|');
          break;
        case ML_XOR:
          ASSERT_LOG2(' ! xor vv');
          part = m2d_decAb('^');
          break;
        case ML_NAND:
          ASSERT_LOG2(' ! nand vv');
          part = m2d_decAb('!&');
          break;
        case ML_XNOR:
          ASSERT_LOG2(' ! xnor vv');
          part = m2d_decAb('!^');
          break;

        case ML_DEBUG:
          ASSERT_LOG2(' ! debug');
          // dont send this to finitedomain; it wont know what to do with it
          if (DEBUG) part = '@custom noleaf ' + m2d_decA(2) + '\n';
          else m2d_decA(); // skip
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
