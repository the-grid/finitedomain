// this is an export function for config
// it converts a $config to a DSL string
// see /docs/dsl.txt for syntax
// see importer.js to parse this DSL

import {
  // __REMOVE_BELOW_FOR_DIST__
  DEOPT,
  // __REMOVE_ABOVE_FOR_DIST__

  THROW,
} from './helpers';
import {
  domain_getValue,
  domain_toArr,
} from './domain';
import {
  trie_get,
} from './trie';

// BODY_START

/**
 * Export a given config with optional target domains
 * (initial domains otherwise) to special DSL string.
 * The resulting string should be usable with the
 * importer to create a new solver with same state.
 * This function only omits constraints when they only
 * consist of constants. Optimization should occur elsewhere.
 *
 * @param {$config} config
 * @param {$domain[]} [vardoms] If not given then config.initialDomains are used
 * @param {boolean} [usePropagators] Output the low-level propagators instead of the higher level constraints
 * @param {boolean} [minimal] Omit comments, use short var names, reduce whitespace where possible. etc
 * @param {boolean} [withDomainComments] Put the input domains behind each constraint even if minimal=true
 * @param {boolean} [realName] Use the original var names?
 * @returns {string}
 */
function exporter_main(config, vardoms, usePropagators, minimal, withDomainComments, realName) {
  // TODO: dont export contants that are not bound to constraints and not targeted explicitly
  // TODO: deal export->import better wrt anonymous vars
  let var_dist_options = config.varDistOptions;
  let domains = vardoms || config.initialDomains;
  let varNames = config.allVarNames;

  let indexToString = realName ? index => exporter_encodeVarName(varNames[index]) : minimal ? exporter_varstrShort : exporter_varstrNum;

  let vars = config.allVarNames.map((varName, varIndex) => {
    let domain = exporter_domstr(domains[varIndex]);
    let s = ': ' + indexToString(varIndex) + ' = ' + domain;
    if (!realName && varName !== String(varIndex)) s += ' alias(' + exporter_encodeVarName(varName) + ')';
    let overrides = var_dist_options[varName];
    if (overrides && (overrides.valtype !== 'list' || (overrides.list && overrides.list.length))) {
      s += ' @' + overrides.valtype;
      switch (overrides.valtype) {
        case 'markov':
          if ('expandVectorsWith' in overrides) s += 'expand(' + (overrides.expandVectorsWith || 0) + ')';
          if ('legend' in overrides) s += ' legend(' + overrides.legend.join(' ') + ')';
          if ('matrix' in overrides) s += ' matrix(' + JSON.stringify(overrides.matrix).replace(/"/g, '') + ')';
          break;

        case 'list':
          if (typeof overrides.list === 'function') s += ' prio(???func???)';
          else s += ' prio(' + overrides.list.join(' ') + ')';
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
          console.warn('Unknown value strategy override: ' + overrides.valtype);
          s += ' @? ' + JSON.stringify(overrides);
      }
    }
    return s;
  });

  let constraints = usePropagators ? [] : config.allConstraints.map(constraint => {
    let indexes = constraint.varIndexes;

    // create var names for each index, unless solved, in that case use solved value as literal
    let aliases = indexes.map(indexToString);
    indexes.forEach((varIndex, i) => {
      let v = domain_getValue(domains[varIndex]);
      if (v >= 0) aliases[i] = v;
    });

    // __REMOVE_BELOW_FOR_DIST__
    if (DEOPT) {
      // dont inline solved vars
      aliases = indexes.map(indexToString);
    }
    // __REMOVE_ABOVE_FOR_DIST__

    // do same for param if it's an index
    let paramName = '';
    if (typeof constraint.param === 'number') {
      let paramV = domain_getValue(domains[constraint.param]);
      if (paramV >= 0) paramName = paramV;
      else paramName = indexToString(constraint.param);
    }

    let s = '';
    let comment = '';
    switch (constraint.name) {
      case 'reifier':
        let op;
        switch (constraint.param) {
          case 'eq': op = '=='; break;
          case 'neq': op = '!='; break;
          case 'lt': op = '<'; break;
          case 'lte': op = '<='; break;
          case 'gt': op = '>'; break;
          case 'gte': op = '>='; break;
          default: THROW('what dis param: ' + op);
        }
        s += aliases[2] + ' = ' + aliases[0] + ' ' + op + '? ' + aliases[1];
        break;
      case 'plus':
        s += aliases[2] + ' = ' + aliases[0] + ' + ' + aliases[1];
        break;
      case 'min':
        s += aliases[2] + ' = ' + aliases[0] + ' - ' + aliases[1];
        break;
      case 'ring-mul':
        s += aliases[2] + ' = ' + aliases[0] + ' * ' + aliases[1];
        break;
      case 'ring-div':
        s += aliases[2] + ' = ' + aliases[0] + ' / ' + aliases[1];
        break;
      case 'mul':
        s += aliases[2] + ' = ' + aliases[0] + ' * ' + aliases[1];
        break;
      case 'sum':
        s += paramName + ' = sum(' + aliases.join(' ') + ')';
        break;
      case 'product':
        s += paramName + ' = product(' + aliases.join(' ') + ')';
        break;
      case 'markov':
        s += '# markov(' + aliases + ')';
        break;
      case 'distinct':
        s += 'distinct(' + aliases + ')';
        break;
      case 'eq':
        s += aliases[0] + ' == ' + aliases[1];
        break;
      case 'neq':
        s += aliases[0] + ' != ' + aliases[1];
        break;
      case 'lt':
        s += aliases[0] + ' < ' + aliases[1];
        break;
      case 'lte':
        s += aliases[0] + ' <= ' + aliases[1];
        break;
      case 'gt':
        s += aliases[0] + ' > ' + aliases[1];
        break;
      case 'gte':
        s += aliases[0] + ' >= ' + aliases[1];
        break;

      default:
        console.warn('unknown constraint: ' + constraint.name);
        s += 'unknown = ' + JSON.stringify(constraint);
    }

    let t = s;
    // if a constraint has no vars, ignore it.
    // note: this assumes those constraints are not contradictions
    if (s.indexOf(realName ? '\'' : '$') < 0 || (constraint.name === 'distinct' && aliases.length <= 1) || (((constraint.name === 'product' || constraint.name === 'sum') && aliases.length === 0))) {
      if (!minimal) {
        comment += (comment ? ', ' : ' # ') + 'dropped; constraint already solved (' + s + ') (' + indexes.map(indexToString) + ', ' + indexToString(constraint.param) + ')';
      }
      s = '';
    }

    if (!minimal || withDomainComments) {
      // this is more for easier debugging...
      aliases.forEach((alias, i) => { if (typeof alias === 'string') t = t.replace(alias, exporter_domstr(domains[indexes[i]])); });
      if (typeof constraint.param === 'number' && typeof paramName === 'string') t = t.replace(paramName, exporter_domstr(domains[constraint.param]));

      if (s || !minimal) {
        // s += ' '.repeat(Math.max(0, 30 - s.length))
        for (let i = Math.max(0, 30 - s.length); i >= 0; --i) s += ' ';
        s += '      # ' + t;
      }
      s += comment;
    }

    return s;
  }).filter(s => !!s);

  let propagators = !usePropagators ? [] : config._propagators.map(propagator => {
    let varIndex1 = propagator.index1;
    let varIndex2 = propagator.index2;
    let varIndex3 = propagator.index3;

    let v1 = varIndex1 >= 0 ? domain_getValue(domains[varIndex1]) : -1;
    let name1 = v1 >= 0 ? v1 : varIndex1 < 0 ? undefined : indexToString(varIndex1);
    let v2 = varIndex2 >= 0 ? domain_getValue(domains[varIndex2]) : -1;
    let name2 = v2 >= 0 ? v2 : varIndex2 < 0 ? undefined : indexToString(varIndex2);
    let v3 = varIndex3 >= 0 ? domain_getValue(domains[varIndex3]) : -1;
    let name3 = v3 >= 0 ? v3 : varIndex3 < 0 ? undefined : indexToString(varIndex3);

    // __REMOVE_BELOW_FOR_DIST__
    if (DEOPT) {
      // dont inline solved vars
      name1 = indexToString(varIndex1);
      name2 = indexToString(varIndex2);
      name3 = indexToString(varIndex3);
    }
    // __REMOVE_ABOVE_FOR_DIST__

    let s = '';
    let comment = '';
    switch (propagator.name) {
      case 'reified':
        let op;
        switch (propagator.arg3) {
          case 'eq': op = '=='; break;
          case 'neq': op = '!='; break;
          case 'lt': op = '<'; break;
          case 'lte': op = '<='; break;
          case 'gt': op = '>'; break;
          case 'gte': op = '>='; break;
          default: THROW('what dis param: ' + op);
        }
        s += name3 + ' = ' + name1 + ' ' + op + '? ' + name2;
        break;
      case 'eq':
        s += name1 + ' == ' + name2;
        break;
      case 'lt':
        s += name1 + ' < ' + name2;
        break;
      case 'lte':
        s += name1 + ' <= ' + name2;
        break;
      case 'mul':
        s += name3 + ' = ' + name1 + ' * ' + name2;
        break;
      case 'div':
        s += name3 + ' = ' + name1 + ' / ' + name2;
        break;
      case 'neq':
        s += name1 + ' != ' + name2;
        break;
      case 'min':
        s += name3 + ' = ' + name1 + ' - ' + name2;
        break;

      case 'ring':
        switch (propagator.arg1) {
          case 'plus':
            s += name3 + ' = ' + name1 + ' + ' + name2;
            break;
          case 'min':
            s += name3 + ' = ' + name1 + ' - ' + name2;
            break;
          case 'ring-mul':
            s += name3 + ' = ' + name1 + ' * ' + name2;
            break;
          case 'ring-div':
            s += name3 + ' = ' + name1 + ' / ' + name2;
            break;
          default:
            throw new Error('Unexpected ring op:' + propagator.arg1);
        }
        break;

      case 'markov':
        // ignore. the var @markov modifier should cause this. it's not a real constraint.
        return '';

      default:
        console.warn('unknown propagator: ' + propagator.name);
        s += 'unknown = ' + JSON.stringify(propagator);
    }

    let t = s;

    // if a propagator has no vars, ignore it.
    // note: this assumes those constraints are not contradictions
    if (s.indexOf('$') < 0) {
      if (!minimal) comment += (comment ? ', ' : ' # ') + 'dropped; constraint already solved (' + s + ')';
      s = '';
    }

    if (!minimal) {
      // this is more for easier debugging...

      if (typeof name1 === 'string') t = t.replace(name1, exporter_domstr(domains[varIndex1]));
      if (typeof name2 === 'string') t = t.replace(name2, exporter_domstr(domains[varIndex2]));
      if (typeof name3 === 'string') t = t.replace(name3, exporter_domstr(domains[varIndex3]));

      s += ' '.repeat(Math.max(0, 30 - s.length)) + '      # initial: ' + t;
      s += comment;
    }

    return s;
  }).filter(s => !!s);

  return [
    '## constraint problem export',
    '@custom var-strat = ' + JSON.stringify(config.varStratConfig), // TODO
    '@custom val-strat = ' + config.valueStratName,
    vars.join('\n') || '# no vars',
    constraints.join('\n') || propagators.join('\n') || '# no constraints',
    '@custom targets ' + (config.targetedVars === 'all' ? ' = all' : '(' + config.targetedVars.map(varName => indexToString(trie_get(config._varNamesTrie, varName))).join(' ') + ')'),
    '## end of export',
  ].join('\n\n');
}

function exporter_encodeVarName(varName) {
  if (typeof varName === 'number') return varName; // constant
  return '\'' + varName + '\''; // "quoted var names" can contain any char.
}

function exporter_varstrNum(varIndex) {
  // note: we put a `$` behind it so that we can search-n-replace for `$1` without matching `$100`
  return '$' + varIndex + '$';
}

function exporter_varstrShort(varIndex) {
  // take care not to start the name with a number
  // note: .toString(36) uses a special (standard) base 36 encoding; 0-9a-z to represent 0-35
  let name = varIndex.toString(36);
  if (name[0] < 'a') name = '$' + name; // this is a little lazy but whatever
  return name;
}

function exporter_domstr(domain) {
  // represent domains as pairs, a single pair as [lo hi] and multiple as [[lo hi] [lo hi]]
  let arrdom = domain_toArr(domain);
  if (arrdom.length === 2 && arrdom[0] === arrdom[1]) return String(arrdom[0]);
  if (arrdom.length > 2) {
    let dom = [];
    for (let i = 0, n = arrdom.length; i < n; i += 2) {
      dom.push('[' + arrdom[i] + ' ' + arrdom[i + 1] + ']');
    }
    arrdom = dom;
  }
  return '[' + arrdom.join(' ') + ']';
}

// BODY_STOP

export default exporter_main;
export {
  exporter_encodeVarName,
};
