import Solver from '../../../src/solver';

import case20160611 from './2016-06-11';
import case20160613 from './2016-06-13';

describe('exports/export.cases.spec', function() {

  it('should solve 2016-06-11 twice', function() {
    var solver = new Solver({config: case20160611});

    solver.solve({log: 1, max: 1});
    solver.solve({log: 1, max: 1});
  });

  it('should proceed past prepare for 2016-06-13', function() {
    var solver = new Solver({config: case20160613});

    solver.solve({log: 1, max: 1});
  });
});
