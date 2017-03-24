import expect from '../fixtures/mocha_proxy.fixt';
import preSolver from '../../src/runner';

describe('specs/dsl.spec', function() {

  it('should parse trivial case', function() {
    expect(_ => preSolver(`
      @custom var-strat throw
      : A [0 10]
      : B [20 30]
      : C [59 100]
      : D [100, 110]
      D = sum(A B C)
      @custom noleaf A B C
    `)).to.throw(/strat=throw/);
  });

  describe('@custom with comment at eof', function() {

    it('@custom with comment', function() { // tofix
      expect(_ => preSolver(`
      : A, B, C 1
      @custom noleaf A B C # this is the end`)).not.to.throw();
    });

    it('@custom with comment', function() { // tofix
      expect(_ => preSolver(`
        : A, B, C 1
        @custom noleaf A B C # this is the end
      `)).not.to.throw();
    });
  });
});
