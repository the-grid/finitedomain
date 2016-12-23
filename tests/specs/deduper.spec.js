import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('specs/deduper.spec', function() {

  it('should remove duplicate constraints', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 1]
      : B [0 1]
      A != B
      A != B
    `);
    // note: deduper will remove one dupe and then cutter will remove the remaining one (but wouldnt otherwise)

    expect(solution).to.eql({A: 1, B: 0});
  });
});
