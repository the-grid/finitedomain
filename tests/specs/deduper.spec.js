import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('specs/deduper.spec', function() {

  it('should remove duplicate constraints', function() {
    expect(_ => solverSolver(`
      @custom var-strat throw
      : A [0 1]
      : B [0 1]
      A != B
      A != B
    `)).to.throw(/strat=throw;.* 1 constraint/); // and not 2 :)
  });
});
