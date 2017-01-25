import {
  ASSERT,
  ASSERT_LOG2,
  THROW,
} from './helpers';

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
  ML_ISNONE,
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
  ML_DEBUG,
  ML_JMP,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  SIZEOF_V,
  SIZEOF_VV,
  SIZEOF_8V,
  SIZEOF_V8,
  SIZEOF_88,
  SIZEOF_VVV,
  SIZEOF_8VV,
  SIZEOF_V8V,
  SIZEOF_COUNT,
  SIZEOF_C8,

  ml__debug,
  ml_dec8,
  ml_dec16,
  ml_eliminate,
  ml_throw,
} from './ml';
import {
  domain_getValue,
} from './domain';

// BODY_START

function deduper(ml, vars, domains, getAlias, addAlias) {
  ASSERT_LOG2('\n ## pr_dedupe', ml);
  let pc = 0;
  let constraintHash = {}; // keys are A@B or R=A@B and the vars can be an index (as is) or a literal prefixed with #
  let removed = 0;
  let aliased = 0;
  let emptyDomain = false;
  innerLoop();
  console.log(' - dedupe removed', removed, 'constraints and aliased', aliased, 'result vars');

  return emptyDomain ? -1 : aliased; // if aliases were created the minifier will want another go.

  function getUnaliasedDomain(index, _max = 10) {
    if (_max <= 0) THROW('damnit');
    //ASSERT_LOG2('getDomainOrRestartForAlias: ' + index + ' -> ' + domains[index]);
    let D = domains[index];
    if (D !== false) return D;

    // if the domain is falsy then there was an alias (or a bug)
    // write the alias back to ML and restart the current op
    // caller should ensure to check return value and return on
    // a falsy result as well so the loop can restart.
    let aliasIndex = getAlias(index);
    ASSERT(aliasIndex !== index, 'an alias to itself is an infi loop and a bug');
    //ASSERT_LOG2('->', aliasIndex);
    return getUnaliasedDomain(aliasIndex, _max - 1);
  }

  function part8(delta) {
    return '#' + ml_dec8(ml, pc + delta);
  }

  function partV(delta) {
    let A = ml_dec16(ml, pc + delta);
    let domain = getUnaliasedDomain(A, pc + delta);
    if (!domain && domain !== 0) {
      ml_throw(ml, pc, 'unknown domain...');
    }
    let vA = domain_getValue(domain);
    return (vA >= 0 ? '#' + vA : A);
  }

  function dedupe(key, oplen, value = 1) {
    let knownValue = constraintHash[key];
    if (knownValue === undefined) {
      constraintHash[key] = value;
    } else {
      ++removed;
      ASSERT_LOG2(' - Constraint with key', key, 'already exists (#' + (constraintHash[key] + 1) + ') so eliminating the dupe');
      ++constraintHash[key];
      ml_eliminate(ml, pc, oplen);
    }
    pc += oplen;
    return knownValue;
  }

  function keyVV(op) {
    let key = op + ':' + partV(1) + ',' + partV(3);
    dedupe(key, SIZEOF_VV);
  }

  function key8V(op) {
    let key = op + ':' + part8(1) + ',' + partV(2);
    dedupe(key, SIZEOF_8V);
  }

  function keyV8(op) {
    let key = op + ':' + partV(1) + ',' + partV(3);
    dedupe(key, SIZEOF_V8);
  }

  function key88(op) {
    let key = op + ':' + part8(1) + ',' + part8(2);
    dedupe(key, SIZEOF_88);
  }

  function keyNonValueList(type) {
    let key = [];
    let len = ml_dec16(ml, pc + 1);
    for (let i = 0; i < len; ++i) {
      key.push(partV(3 + i * 2));
    }

    key = type + ':' + key.sort((a, b) => a < b ? -1 : a > b ? 1 : 0).join(',');
    dedupe(key, SIZEOF_COUNT + len * 2);
  }

  function keyVVV(op) {
    // if r1=a@b is a dupe of r2=a@b then r1==r2
    // however, note that a==b is not a dupe of a==?b

    let opkey = op + ':' + partV(1) + ',' + partV(3);
    ASSERT_LOG2('keyVVV', op, [opkey]);
    let R = ml_dec16(ml, pc + 5);
    let alias = dedupe(opkey, SIZEOF_VVV, R);
    if (alias) {
      ASSERT_LOG2(' - deduping vvv constraint, aliasing result;', R, '=', alias, '(', vars[R], '=', vars[alias], ')');
      // this constraint has been removed. the alias of R is returned
      addAlias(R, alias);
      ++aliased;
    }
  }

  function key8VV(op) {
    // if r1=a@b is a dupe of r2=a@b then r1==r2
    // however, note that a==b is not a dupe of a==?b

    let opkey = op + ':' + part8(1) + ',' + partV(2);
    ASSERT_LOG2('key8VV', op, [opkey]);
    let R = ml_dec16(ml, pc + 4);
    let alias = dedupe(opkey, SIZEOF_8VV, R);
    if (alias) {
      ASSERT_LOG2(' - deduping 8vv constraint, aliasing result;', R, '=', alias, '(', vars[R], '=', vars[alias], ')');
      // this constraint has been removed. the alias of R is returned
      addAlias(R, alias);
      ++aliased;
    }
  }

  function keyV8V(op) {
    // if r1=a@b is a dupe of r2=a@b then r1==r2
    // however, note that a==b is not a dupe of a==?b
    let opkey = op + ':' + partV(1) + ',' + part8(3);
    ASSERT_LOG2('keyV8V', op, [opkey]);
    let R = ml_dec16(ml, pc + 4);
    let alias = dedupe(opkey, SIZEOF_V8V, R);
    if (alias) {
      ASSERT_LOG2(' - deduping v8v constraint, aliasing result;', R, '=', alias, '(', vars[R], '=', vars[alias], ')');
      // this constraint has been removed. the alias of R is returned
      addAlias(R, alias);
      ++aliased;
    }
  }

  function sum() {
    let len = ml_dec16(ml, pc + 1);
    let c = ml_dec8(ml, pc + 3);
    let key = [];
    for (let i = 0; i < len; ++i) {
      key.push(partV(4 + i * 2));
    }

    key = 'sum:' + (c ? c + ',' : '') + key.sort((a, b) => a < b ? -1 : a > b ? 1 : 0).join(',');
    ASSERT_LOG2('key sum:', [key]);
    let R = ml_dec16(ml, pc + SIZEOF_C8 + len * 2);
    let alias = dedupe(key, SIZEOF_C8 + len * 2 + 2, R);
    if (alias) {
      ASSERT_LOG2(' - deduping sum constraint, aliasing result;', R, '=', alias, '(', vars[R], '=', vars[alias], ')');
      // this constraint has been removed. the alias of R is returned
      addAlias(R, alias);
      ++aliased;
    }
  }

  function keyValueList(type) {
    let len = ml_dec16(ml, pc + 1);
    let key = [];
    for (let i = 0; i < len; ++i) {
      key.push(partV(SIZEOF_COUNT + i * 2));
    }

    key = type + ':' + key.sort((a, b) => a < b ? -1 : a > b ? 1 : 0).join(',');
    ASSERT_LOG2('key', type, ':', [key]);
    let R = ml_dec16(ml, pc + SIZEOF_COUNT + len * 2);
    let alias = dedupe(key, SIZEOF_COUNT + len * 2 + 2, R);
    if (alias) {
      ASSERT_LOG2(' - deduping', type, 'constraint, aliasing result;', R, '=', alias, '(', vars[R], '=', vars[alias], ')');
      // this constraint has been removed. the alias of R is returned
      addAlias(R, alias);
      ++aliased;
    }
  }

  function innerLoop() {
    while (pc < ml.length && !emptyDomain) {
      let pcStart = pc;
      let op = ml[pc];
      ASSERT_LOG2(' -- DD pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, domains, vars));
      switch (op) {
        case ML_VV_EQ:
          keyVV('==');
          break;
        case ML_V8_EQ:
          keyV8('==');
          break;
        case ML_88_EQ:
          key88('==');
          break;

        case ML_VV_NEQ:
          keyVV('!=');
          break;

        case ML_V8_NEQ:
          keyV8('!=');
          break;

        case ML_88_NEQ:
          key88('!=');
          break;

        case ML_VV_LT:
          keyVV('<');
          break;

        case ML_V8_LT:
          keyV8('<');
          break;

        case ML_8V_LT:
          key8V('<');
          break;

        case ML_88_LT:
          key88('<');
          break;

        case ML_VV_LTE:
          keyVV('<=');
          break;

        case ML_V8_LTE:
          keyV8('<=');
          break;

        case ML_8V_LTE:
          key8V('<=');
          break;

        case ML_88_LTE:
          key88('<=');
          break;

        case ML_NALL:
          keyNonValueList('nall');
          break;

        case ML_ISALL:
          keyValueList('isall');
          break;

        case ML_ISALL2:
          keyVVV('isall');
          break;

        case ML_ISNALL:
          keyValueList('isnall');
          break;

        case ML_ISNONE:
          keyValueList('isnone');
          break;

        case ML_DISTINCT:
          keyNonValueList('distinct');
          break;

        case ML_PLUS:
          keyVVV('+');
          break;

        case ML_MINUS:
          keyVVV('-');
          break;

        case ML_MUL:
          keyVVV('*');
          break;

        case ML_DIV:
          keyVVV('/');
          break;

        case ML_VVV_ISEQ:
          keyVVV('==?');
          break;

        case ML_V8V_ISEQ:
          keyV8V('==?');
          break;

        case ML_VVV_ISNEQ:
          keyVVV('!=?');
          break;

        case ML_V8V_ISNEQ:
          keyV8V('!=?');
          break;

        case ML_VVV_ISLT:
          keyVVV('<?');
          break;

        case ML_8VV_ISLT:
          key8VV('<?');
          break;

        case ML_V8V_ISLT:
          keyV8V('<?');
          break;

        case ML_VVV_ISLTE:
          keyVVV('<=?');
          break;

        case ML_8VV_ISLTE:
          key8VV('<=?');
          break;

        case ML_V8V_ISLTE:
          keyV8V('<=?');
          break;

        case ML_VV8_ISEQ:
        case ML_88V_ISEQ:
        case ML_V88_ISEQ:
        case ML_888_ISEQ:
        case ML_VV8_ISNEQ:
        case ML_88V_ISNEQ:
        case ML_V88_ISNEQ:
        case ML_888_ISNEQ:
        case ML_VV8_ISLT:
        case ML_88V_ISLT:
        case ML_V88_ISLT:
        case ML_8V8_ISLT:
        case ML_888_ISLT:
        case ML_VV8_ISLTE:
        case ML_88V_ISLTE:
        case ML_V88_ISLTE:
        case ML_8V8_ISLTE:
        case ML_888_ISLTE:
          return THROW('if two vars are solved then the constraint is solved and should have been removed');

        case ML_8V_SUM:
          sum();
          break;

        case ML_PRODUCT:
          keyValueList('product');
          break;

        case ML_VV_AND:
          keyVV('&');
          break;
        case ML_VV_OR:
          keyVV('|');
          break;
        case ML_VV_XOR:
          keyVV('^');
          break;
        case ML_VV_NAND:
          keyVV('!&');
          break;
        case ML_VV_XNOR:
          keyVV('!^');
          break;

        case ML_START:
          if (pc !== 0) return THROW(' ! compiler problem @', pcStart);
          ++pc;
          break;

        case ML_STOP:
          return constraintHash;

        case ML_DEBUG:
          pc += SIZEOF_V;
          return;

        case ML_JMP:
          let delta = ml_dec16(ml, pc + 1);
          pc += SIZEOF_V + delta;
          break;

        case ML_NOOP:
          ++pc;
          break;
        case ML_NOOP2:
          pc += 2;
          break;
        case ML_NOOP3:
          pc += 3;
          break;
        case ML_NOOP4:
          pc += 4;
          break;

        default:
          ml_throw('(dd) unknown op', pc);
      }
    }
    THROW('ML OOB');
  }
}

// BODY_STOP

export {
  deduper,
};
