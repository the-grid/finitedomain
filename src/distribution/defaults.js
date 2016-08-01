import {
  THROW,
} from '../helpers';

// BODY_START

const PRESETS = {
  defaults: {
    varStrategy: 'naive',
    val: 'min',
  },
  // The native distribution strategy simply steps through all
  // undetermined variables.
  naive: {
    varStrategy: 'naive',
    val: 'min',
  },
  // The "fail first" strategy branches on the variable with the
  // smallest domain size.
  fail_first: {
    varStrategy: 'size',
    val: 'min',
  },
  // The "domain splitting" strategy where each domain is roughly
  // halved in each step. The 'varname' argument can be either a
  // single var name or an array of names or an object whose
  // values are var names.
  split: {
    varStrategy: 'size',
    val: 'splitMin',
  },
};

function distribution_getDefaults(name) {
  if (PRESETS[name]) return PRESETS[name];

  THROW(`distribution.get_defaults: Unknown preset: ${name}`);
}

// BODY_STOP

export default distribution_getDefaults;
