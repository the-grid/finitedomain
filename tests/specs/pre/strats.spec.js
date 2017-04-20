// test various strategies

import expect from '../../fixtures/mocha_proxy.fixt';
import Solver from '../../../src/solver';

describe('specs/strats.spec', function() {

  describe('list', function() {

    it('should work with @list first item', function() {
      expect(Solver.pre(`
        : A [1 3] @list prio(3 2 1)
      `)).to.eql({A: 3});
    });

    it('should work with set-valdist', function() {
      expect(Solver.pre(`
        : A = [1 4]
        @custom set-valdist A {"valtype":"list","list":[3,2,1]}
      `)).to.eql({A: 3});
    });

    it('should work with @list middle item', function() {
      expect(Solver.pre(`
        : A [1 4] @list prio(5 2 1)
      `)).to.eql({A: 2});
    });

    it('should work with @list last item', function() {
      expect(Solver.pre(`
        : A [2 4] @list prio(5 1 3)
      `)).to.eql({A: 3});
    });

    it('should work with @list last item', function() {
      expect(Solver.pre(`
        : A [3 10] @list prio(1 2 3)
      `)).to.eql({A: 3});
    });

    it('should work with @list unlisted item', function() {
      expect(Solver.pre(`
        : A [5 10] @list prio(3 2 1)
      `)).to.eql({A: 5});
    });
  });

  describe('edge cases', function() {

    // should prevent alias when two vars have different (or any to be sure?) val dists


  });
});
