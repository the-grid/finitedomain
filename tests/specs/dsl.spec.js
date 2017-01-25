import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('specs/dsl.spec', function() {

  it('should not allow var decl after using it implicitly', function() {
    expect(_ => solverSolver(`
      A == 5
      : A [0 1]
    `)).to.throw('Dont declare a var after using it');
  });

  describe('isnone', function() {

    it('should exist', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = none?(B C)
      `)).to.throw(/ops: isnone /);
    });
  });

  describe('custom noleaf', function() {

    it('should exist', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = all?(B C)
        @custom noleaf A
      `)).to.throw(/ops: isall /);
    });

    it('should eliminate the isall without the noleaf hint', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = all?(B C)
        #@custom noleaf A
      `);

      expect(solution).to.eql({A: 0, B: 0, C: [0, 1]});
    });

    it('should support multiple vars', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = all?(B C)
        : D,E,F [0 1]
        D = all?(E F)
        @custom noleaf A, D
      `)).to.throw(/ops: isall,isall /);
    });

    it('should eliminate the isalls without the noleaf hint', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = all?(B C)
        : D,E,F [0 1]
        D = all?(E F)
        #@custom noleaf A D
      `);

      expect(solution).to.eql({A: 0, B: 0, C: [0, 1], D: 0, E: 0, F: [0, 1]});
    });
  });
});
