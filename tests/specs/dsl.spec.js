import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('specs/dsl.spec', function() {

  it('should not allow var decl after using it implicitly', function() {
    expect(_ => solverSolver(`
      A == 5
      : A [0 1]
    `)).to.throw('Dont declare a var after using it');
  });
});
