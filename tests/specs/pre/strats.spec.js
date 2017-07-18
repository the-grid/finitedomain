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

  describe('min mid max naive', function() {

    it('should propagate @min', function() {
      expect(Solver.pre(`
        : A [1 3] @min
        @custom noleaf A
      `)).to.eql({A: 1});
    });

    it('should propagate @naive', function() {
      expect(Solver.pre(`
        : A [1 3] @naive
        @custom noleaf A
      `)).to.eql({A: 1});
    });

    it('should propagate @mid', function() {
      expect(Solver.pre(`
        : A [1 3] @mid
        @custom noleaf A
      `)).to.eql({A: 2});
    });

    it('should propagate @max', function() {
      expect(Solver.pre(`
        : A [1 3] @max
        @custom noleaf A
      `)).to.eql({A: 3});
    });
  });

  describe('when aliasing a var with a vardist', function() {

    it('should use naive=min by default', function() {
      expect(Solver.pre(`
        : A [1 3]
        : B [1 3]
        A == B
        @custom noleaf A B
      `)).to.eql({A: 1, B: 1});
    });

    it('should keep the max left', function() {
      expect(Solver.pre(`
        : A [1 3] @max
        : B [1 3]
        A == B
        @custom noleaf A B
      `)).to.eql({A: 3, B: 3});
    });

    it('should keep the max left', function() {
      expect(Solver.pre(`
        : A [1 3]
        : B [1 3] @max
        A == B
        @custom noleaf A B
      `)).to.eql({A: 3, B: 3});
    });

    it('should keep the max both', function() {
      expect(Solver.pre(`
        : A [1 3] @max
        : B [1 3] @max
        A == B
        @custom noleaf A B
      `)).to.eql({A: 3, B: 3});
    });

    it('should keep at least one valdist but which one is not defined', function() {
      expect(Solver.pre(`
        : A [1 3] @mid
        : B [1 3] @max
        A == B
        @custom noleaf A B
      `)).to.eql({A: 2, B: 2}); // if this fails try the other strat.
    });
  });

  describe('edge cases', function() {

    // should prevent alias when two vars have different (or any to be sure?) val dists


  });
});
