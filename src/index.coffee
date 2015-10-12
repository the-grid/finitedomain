FD = {
  distribute: {}
  propagators: {}
}

# FD = require './fd'

# helpers
require('./helpers')(FD)
require('./domain')(FD)
# core API
require('./var')(FD)
require('./propagator')(FD)
require('./propagators/reified')(FD)
require('./propagators/callback')(FD)
require('./propagators/eq')(FD)
require('./propagators/neq')(FD)
require('./propagators/lt')(FD)
require('./propagators/lte')(FD)
require('./propagators/scale_div')(FD)
require('./propagators/scale_mul')(FD)
require('./space')(FD)
require('./distribute/markov')(FD)
require('./distribute/presets')(FD)
require('./distribute/value')(FD)
require('./distribute/var')(FD)
require('./distribute')(FD)
require('./search')(FD)
# high level API
require('./solver')(FD)
require('./path_solver')(FD)
require('./path_binary_solver')(FD)

module.exports = FD
