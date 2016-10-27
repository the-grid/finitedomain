// this is an export function for config
// it converts a $config to a DSL string
// see /docs/dsl.txt for syntax
// see importer.js to parse this DSL

import {
  THROW,
} from './helpers';
import {
  domain_toArr,
} from './domain';
import {
  trie_get,
} from './trie';
import Solver from './solver';

// BODY_START

function exporter_main(config) {
  let var_dist_options = config.var_dist_options;
  let initialDomains = config.initial_domains;
  let vars = config.all_var_names.map((varName, varIndex) => {
    let domain = exporter_domstr(initialDomains[varIndex]);
    let s = ': v'+varIndex+' = ' +domain;
    if (varName !== String(varIndex)) s += ' alias('+varName.replace(/[\(\) ]/g,'_')+')';
    let overrides = var_dist_options[varName];
    if (overrides
      && (overrides.valtype !== 'list' || (overrides.list && overrides.list.length))) {
      s += ' @' + overrides.valtype;
      switch (overrides.valtype) {
        case 'markov':
          if ('expandVectorsWith' in overrides) s += 'expand(' + (overrides.expandVectorsWith || 0)+')';
          if ('legend' in overrides) s += ' legend('+overrides.legend+')';
          if ('matrix' in overrides) s += ' matrix('+JSON.stringify(overrides.matrix).replace(/"/g, '')+')';
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
  let constraints = config.all_constraints.map(constraint => {
    let indexes = constraint.varIndexes;
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
        s += 'v' + indexes[2] + ' = v' + indexes[0] + ' ' + op + '? v' + indexes[1];
        break;
      case 'plus':
        s += 'v' + indexes[2] + ' = v' + indexes[0] + ' + v' + indexes[1];
        break;
      case 'min':
        s += 'v' + indexes[2] + ' = v' + indexes[0] + ' - v' + indexes[1];
        break;
      case 'ring-mul':
        s += 'v' + indexes[2] + ' = v' + indexes[0] + ' * v' + indexes[1];
        break;
      case 'ring-div':
        s += 'v' + indexes[2] + ' = v' + indexes[0] + ' / v' + indexes[1];
        break;
      case 'mul':
        s += 'v' + indexes[2] + ' = v' + indexes[0] + ' * v' + indexes[1];
        break;
      case 'sum':
        if (indexes.length === 1) s += 'v' + constraint.param + ' == v' + indexes;
        else if (indexes.length === 2) s += 'v' + constraint.param + ' = v' + indexes[0] + ' + v' + indexes[1];
        else s += 'v' + constraint.param + ' = sum(v' + indexes.join(' v') + ')';
        if (indexes.length <= 2) comment += ' # was sum';
        break;
      case 'product':
        if (indexes.length === 1) s += 'v' + constraint.param + ' == v' + indexes;
        else if (indexes.length === 2) s += 'v' + constraint.param + ' = v' + indexes[0] + ' * v' + indexes[1];
        else s += 'v' + constraint.param + ' = product(v' + indexes.join(' v') + ')';
        if (indexes.length <= 2) comment += ' # was product';
        break;
      case 'markov':
        s += 'markov(v' + indexes.join(' v') + ')';
        break;
      case 'distinct':
        if (indexes.length === 1) {
          comment += '# eliminated distinct(v'+indexes[0]+')';
        } else if (indexes.length === 2) {
          s += 'v' + indexes[0] + ' != v' + indexes[1];
          comment += ' # was distinct';
        } else {
          s += 'distinct(v' + indexes.join(' v') + ')';
        }
        break;
      case 'eq':
        s += 'v' + indexes[0] + ' == v' + indexes[1];
        break;
      case 'neq':
        s += 'v' + indexes[0] + ' != v' + indexes[1];
        break;
      case 'lt':
        s += 'v' + indexes[0] + ' < v' + indexes[1];
        break;
      case 'lte':
        s += 'v' + indexes[0] + ' <= v' + indexes[1];
        break;
      case 'gt':
        s += 'v' + indexes[0] + ' > v' + indexes[1];
        break;
      case 'gte':
        s += 'v' + indexes[0] + ' >= v' + indexes[1];
        break;

      default:
        console.warn('unknown constraint: ' + constraint.name);
        s += 'unknown = ' + JSON.stringify(constraint);
    }

    // this is more for easier debugging...
    let t = s;
    indexes.forEach(varIndex => t = t.replace('v' + varIndex, exporter_domstr(initialDomains[varIndex])));
    if (typeof constraint.param === 'number') t = t.replace('v' + constraint.param, exporter_domstr(initialDomains[constraint.param]))

    s = s.padEnd(25, ' ') + '      # initial: ' + t;
    s += comment;

    return s;
  });

  return [
    '## constraint problem export',
    '@var strat = ' + JSON.stringify(config.varStratConfig), // TODO
    '@val strat = ' + config.valueStratName,
    vars.join('\n') || '# no vars',
    constraints.join('\n') || '# no constraints',
    '@targets = ' + (config.targetedVars === 'all' ? 'all' : '[v' + config.targetedVars.map(varName => trie_get(config._var_names_trie, varName)).join(' v')+']'),
    '## end of export',
  ].join('\n\n');
}

function exporter_domstr(domain) {
  // represent domains as pairs, a single pair as [lo hi] and multiple as [[lo hi] [lo hi]]
  let arrdom = domain_toArr(domain);
  if (arrdom.length > 2) {
    let dom = [];
    for (let i = 0, n = arrdom.length; i < n; i += 2) {
      dom.push('[' + arrdom[i] + ' ' + arrdom[i+1] + ']');
    }
    arrdom = dom;
  }
  return '[' + arrdom.join(' ') + ']';
}

// BODY_STOP

export default exporter_main;
