import {
  ASSERT,
  ASSERT_LOG2,
  THROW,
} from './helpers';

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
  ML_JMP,
  ML_NOOP,
  ML_NOOP2,
  ML_NOOP3,
  ML_NOOP4,
  ML_STOP,

  SIZEOF_VV,
  SIZEOF_8V,
  SIZEOF_V8,
  SIZEOF_88,
  SIZEOF_VVV,
  SIZEOF_8VV,
  SIZEOF_V8V,
  SIZEOF_VV8,
  SIZEOF_88V,
  SIZEOF_V88,
  SIZEOF_8V8,
  SIZEOF_888,
  SIZEOF_COUNT,
  SIZEOF_C8_COUNT,

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

function deduper(ml, vars, domains, getAlias) {
  ASSERT_LOG2(' ## pr_dedupe', ml);
  let pc = 0;
  let constraintHash = {}; // keys are A@B or R=A@B and the vars can be an index (as is) or a literal prefixed with #
  let removed = 0;
  innerLoop();
  ASSERT_LOG2(' - dedupe removed', removed, 'constraints');
  return constraintHash;

  function getDomainOrRestartForAlias(index, _max = 10) {
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
    return getDomainOrRestartForAlias(aliasIndex, _max - 1);
  }

  function part8(delta) {
    return '#' + ml_dec8(ml, pc + delta);
  }

  function partV(delta) {
    let A = ml_dec16(ml, pc + delta);
    let domain = getDomainOrRestartForAlias(A, pc + delta);
    if (!domain && domain !== 0) {
      ml_throw(ml, pc, 'unknown domain...');
    }
    let vA = domain_getValue(domain);
    return (vA >= 0 ? '#' + vA : A);
  }

  function dedupe(key, oplen) {
    let kept = true;
    if (!constraintHash[key]) constraintHash[key] = 1;
    else {
      ++removed;
      kept = false;
      ASSERT_LOG2(' - Constraint with key', key, 'already exists (#' + (constraintHash[key] + 1) + ') so eliminating the dupe');
      ++constraintHash[key];
      ml_eliminate(ml, pc, oplen);
    }
    pc += oplen;
    return kept;
  }

  function keyVV(op) {
    let key = partV(1) + op + partV(3);
    dedupe(key, SIZEOF_VV);
  }

  function key8V(op) {
    let key = part8(1) + op + partV(2);
    dedupe(key, SIZEOF_8V);
  }

  function keyV8(op) {
    let key = partV(1) + op + partV(3);
    dedupe(key, SIZEOF_V8);
  }

  function key88(op) {
    let key = part8(1) + op + part8(2);
    dedupe(key, SIZEOF_88);
  }

  function distinct() {
    // i think it's unlikely that this is worth checking
    // let's do it anyways for the sake of consistency

    let key = [];
    let len = ml_dec16(ml, pc + 1);
    for (let i = 0; i < len; ++i) {
      key.push(partV(3 + i * 2));
    }

    key = 'distinct|' + key.sort((a, b) => a < b ? -1 : a > b ? 1 : 0).join(',');
    dedupe(key, SIZEOF_COUNT + len * 2);
  }

  function keyVVV(op) {
    let key = partV(1) + op + partV(3) + '=' + partV(5);
    dedupe(key, SIZEOF_VVV);
  }

  function key8VV(op) {
    let key = part8(1) + op + partV(2) + '=' + partV(4);
    dedupe(key, SIZEOF_8VV);
  }

  function keyV8V(op) {
    let key = partV(1) + op + part8(3) + '=' + partV(4);
    dedupe(key, SIZEOF_V8V);
  }

  function keyVV8(op) {
    let key = partV(1) + op + partV(3) + '=' + part8(5);
    dedupe(key, SIZEOF_VV8);
  }

  function key88V(op) {
    let key = part8(1) + op + part8(2) + '=' + partV(3);
    dedupe(key, SIZEOF_88V);
  }

  function key8V8(op) {
    let key = part8(1) + op + partV(2) + '=' + part8(4);
    dedupe(key, SIZEOF_8V8);
  }

  function keyV88(op) {
    let key = partV(1) + op + part8(3) + '=' + part8(4);
    dedupe(key, SIZEOF_V88);
  }

  function key888(op) {
    let key = part8(1) + op + part8(2) + '=' + part8(3);
    dedupe(key, SIZEOF_888);
  }

  function sum() {
    let len = ml_dec16(ml, pc + 1);
    let c = ml_dec8(ml, pc + 3);
    let key = [];
    for (let i = 0; i < len; ++i) {
      key.push(partV(4 + i * 2));
    }

    key = 'sum|' + c + '|' + key.sort((a, b) => a < b ? -1 : a > b ? 1 : 0).join(',') + '=' + partV(4 + len * 2);
    dedupe(key, SIZEOF_C8_COUNT + len * 2 + 2);
  }

  function product() {
    let len = ml_dec16(ml, pc + 1);
    let key = [];
    for (let i = 0; i < len; ++i) {
      key.push(partV(3 + i * 2));
    }

    key = 'product|' + key.sort((a, b) => a < b ? -1 : a > b ? 1 : 0).join(',') + '=' + partV(3 + len * 2);
    dedupe(key, SIZEOF_COUNT + len * 2 + 2);
  }

  function innerLoop() {
    while (pc < ml.length) {
      let pcStart = pc;
      let op = ml[pc];
      ASSERT_LOG2(' -- pc=' + pc + ', op: ' + ml__debug(ml, pc, 1, domains, vars));
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

        case ML_DISTINCT:
          distinct();
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

        case ML_VV8_ISEQ:
          keyVV8('==?');
          break;

        case ML_88V_ISEQ:
          key88V('==?');
          break;

        case ML_V88_ISEQ:
          keyV88('==?');
          break;

        case ML_888_ISEQ:
          key888('==?');
          break;

        case ML_VVV_ISNEQ:
          keyVVV('!=?');
          break;

        case ML_V8V_ISNEQ:
          keyV8V('!=?');
          break;

        case ML_VV8_ISNEQ:
          keyVV8('!=?');
          break;

        case ML_88V_ISNEQ:
          key88V('!=?');
          break;

        case ML_V88_ISNEQ:
          keyV88('!=?');
          break;

        case ML_888_ISNEQ:
          key888('!=?');
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

        case ML_VV8_ISLT:
          keyVV8('<?');
          break;

        case ML_88V_ISLT:
          key88V('<?');
          break;

        case ML_V88_ISLT:
          keyV88('<?');
          break;

        case ML_8V8_ISLT:
          key8V8('<?');
          break;

        case ML_888_ISLT:
          key888('<?');
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

        case ML_VV8_ISLTE:
          keyVV8('<=?');
          break;

        case ML_88V_ISLTE:
          key88V('<=?');
          break;

        case ML_V88_ISLTE:
          keyV88('<=?');
          break;

        case ML_8V8_ISLTE:
          key8V8('<=?');
          break;

        case ML_888_ISLTE:
          key888('<=?');
          break;

        case ML_8V_SUM:
          sum();
          break;

        case ML_PRODUCT:
          product();
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

        case ML_UNUSED:
          return THROW(' ! compiler problem @', pcStart);

        case ML_STOP:
          return constraintHash;

        case ML_JMP:
          let delta = ml_dec16(ml, pc + 1);
          pc += 3 + delta;
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
          ml_throw('unknown op', pc);
      }
    }
    THROW('ML OOB');
  }
}

// BODY_STOP

export {
  deduper,
};
