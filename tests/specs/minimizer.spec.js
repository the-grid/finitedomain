import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('specs/minimizer.spec', function() {

  describe('bool iseq', function() {

    it('should rewrite 01=01==?0 to A!=R', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : R [0 1]
        R = A ==? 0
      `);

      expect(solution).to.eql({A: 1, R: 0});
    });

    it('should rewrite 01=01==?1 to A==R', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : R [0 1]
        R = A ==? 1
      `);

      expect(solution).to.eql({A: 0, R: 0});
    });

    it('should rewrite 01=02==?0 to A!=R', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 0 2 2]
        : R [0 1]
        R = A ==? 0
      `);

      // R is leaf, constraint cut away, R's reflection is deferred, A becomes free, so it solves
      expect(solution).to.eql({A: 0, R: 1});
    });
  });
});
