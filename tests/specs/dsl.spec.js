import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('specs/dsl.spec', function() {

  it('should parse trivial case', function() {
    expect(_ => solverSolver(`
      A == 5
    `)).not.to.throw();
  });

  it('should work with super small dsl', function() {
    // this should require START+EQ+STOP = 1+4+1 = 6 bytes and input is 4
    expect(_ => solverSolver('nall(A B)')).not.to.throw();
  });

  it('should not try to parse a cop after var EOF', function() {
    // this should require START+EQ+STOP = 1+4+1 = 6 bytes and input is 4
    expect(_ => solverSolver('A==B')).not.to.throw();
  });

  it('should not try to parse a cop after lit EOF', function() {
    // this should require START+EQ+STOP = 1+4+1 = 6 bytes and input is 4
    expect(_ => solverSolver('A==5')).not.to.throw();
  });

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

  describe('isall regression', function() {

    it('should properly compile an isall', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A, B, R [0 1]
        R = all?(A B)
        A = 1
      `);

      expect(solution).to.eql({A: 1, B: 0, R: 0});
    });
  });
});
