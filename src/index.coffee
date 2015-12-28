FD = {
  distribution: {}
  propagators: {}
}

# FD = require './fd'

# helpers
require('./helpers')(FD)
require('./domain')(FD)
# core API
require('./var')(FD)
require('./propagators/eq')(FD)
require('./propagators/neq')(FD)
require('./propagators/lt')(FD)
require('./propagators/lte')(FD)
require('./propagators/stepper_comparison')(FD) # must come before reified! but after eq neq lt lte
require('./propagators/reified')(FD)
require('./propagators/callback')(FD)
require('./propagators/scale_div')(FD)
require('./propagators/scale_mul')(FD)
require('./propagators/ring')(FD)
require('./propagators/stepper_any')(FD) # should be last of the props
require('./propagators/prop_is_solved')(FD) # should be last of the props
require('./distribution/markov')(FD)
require('./distribution/presets')(FD)
require('./distribution/value')(FD)
require('./distribution/var')(FD)
require('./distribution/distribute')(FD)
require('./snode')(FD)
require('./space')(FD)
require('./search')(FD)
# high level API
require('./solver')(FD)
require('./path_solver')(FD)
require('./path_binary_solver')(FD)

module.exports = FD
