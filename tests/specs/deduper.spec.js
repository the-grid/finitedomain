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
      @custom noleaf A B
    `)).to.throw(/ops: neq #/);
  });

  describe('all binary', function() {

    function test(op, name) {
      it('should work with [' + op + ']', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          A ${op} B
          A ${op} B

          @custom var-strat throw
          @custom noleaf A B
        `)).to.throw('ops: ' + name + ' #');
      });
    }

    test('!=', 'neq');
    test('<', 'lt');
    test('<=', 'lte');
    test('|', 'or');
    test('^', 'xor');
    test('!^', 'xnor');
    test('!&', 'nand');

    it('should work with [==]', function() {
      expect(solverSolver(`
        : A, B [0 10]
        A == B
        A == B

        @custom var-strat throw
        @custom noleaf A B
      `)).to.eql({A: 0, B: 0});
    });

    it('should work with [&]', function() {
      expect(solverSolver(`
        : A, B [0 10]
        A & B
        A & B

        @custom var-strat throw
        @custom noleaf A B
      `)).to.eql({A: [1, 10], B: [1, 10]});
    });
  });

  describe('all non-booly ternary', function() {

    function test1(op, name) {
      it('should work with [' + op + '] on same R', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R *
          R = A ${op} B
          R = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.throw('ops: ' + name + ' #');
      });

      it('should work with [' + op + '] on identical R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R, S *
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.throw('ops: ' + name + ' #');
      });

      it('should work with [' + op + '] on partially overlapping R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R [5, 15]
          : S [15, 30]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.throw('ops: ' + name + ' #');
      });

      it('should reject with [' + op + '] on distinct R and S', function() {
        expect(solverSolver(`
          : A, B [0 10]
          : R [5, 10]
          : S [20, 30]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.eql(false);
      });
    }

    test1('+', 'plus');
    test1('*', 'mul');

    function test2(op, name) {
      it('should work with [' + op + '] on same R', function() {
        expect(_ => solverSolver(`
          : A, B [0 100]
          : R *
          R = A ${op} B
          R = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.throw('ops: ' + name + ' #');
      });

      it('should work with [' + op + '] on identical R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 100]
          : R, S *
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.throw('ops: ' + name + ' #');
      });

      it('should work with [' + op + '] on partially overlapping R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 100]
          : R [5, 15]
          : S [15, 30]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.throw('ops: ' + name + ' #');
      });

      it('should reject with [' + op + '] on distinct R and S', function() {
        expect(solverSolver(`
          : A, B [0 100]
          : R [5, 10]
          : S [20, 30]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.eql(false);
      });
    }

    test2('-', 'minus');
    test2('/', 'div');
  });

  describe('simple booly reifiers', function() {

    function test(op, name) {
      it('should work with [' + op + '] on same R', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R *
          R = A ${op} B
          R = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R
        `)).to.throw(`ops: ${name} #`);
      });

      it('should not work with [' + op + '] on wide R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R, S *
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `)).to.throw(`ops: ${name},${name} #`);
      });

      it('should work with [' + op + '] on identical size=2 booly R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R, S [0 0 50 50]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `)).to.throw(`ops: ${name} #`);
      });

      it('should work with [' + op + '] on identical bool R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R, S [0 1]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `)).to.throw(`ops: ${name} #`);
      });

      it('should not work with [' + op + '] on size=2 different booly R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R [0 0 20 20]
          : S [0 0 21 21]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `)).to.throw(`ops: ${name},${name} #`);
      });

      it('should not work with [' + op + '] on size=2 non-booly identical R and S', function() {
        let dsl = `
          : A, B [0 10]
          : R [1 2]
          : S [1 2]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `;

        switch (name) {
          case 'iseq':
            // since R and S are truthy it morphs the iseq to eq which turns into
            // an alias. the problem basically just implodes :)
            expect(solverSolver(dsl)).to.eql({A: 0, B: 0, R: [1, 2], S: [1, 2]});
            break;
          case 'isneq':
            // since R and S are truthy, minimizer will morph them both to identical
            // neqs. deduper will dedupe one of them and needs cutter to solve other
            expect(_ => solverSolver(dsl)).to.throw('ops: neq #');
            break;
          case 'islt':
            // since R and S are truthy, minimizer will morph them both to identical
            // lts. deduper will dedupe one of them and needs cutter to solve other
            expect(_ => solverSolver(dsl)).to.throw('ops: lt #');
            break;
          case 'islte':
            // since R and S are truthy, minimizer will morph them both to identical
            // ltes. deduper will dedupe one of them and needs cutter to solve other
            expect(_ => solverSolver(dsl)).to.throw('ops: lte #');
            break;
          default:
            throw new Error('no [' + op + ']');
        }
      });

      it('should not work with [' + op + '] on size=2 booly R and non-booly S', function() {
        let dsl = `
          : A, B [0 10]
          : R [0 1]
          : S [1 2]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `;

        switch (name) {
          case 'iseq':
            // ok; since S is truthy, it will rewrite the second iseq to an eq which will alias A to B
            // since A == B, R must be truthy and the whole thing solves without the deduper helping
            expect(solverSolver(dsl)).to.eql({A: 0, B: 0, R: 1, S: [1, 2]});
            break;
          case 'isneq':
            // since S is truthy, it will rewrite the second iseq to an neq
            expect(_ => solverSolver(dsl)).to.throw(`ops: ${name},neq #`);
            break;
          case 'islt':
            // since S is truthy, it will rewrite the second islt to an lt
            expect(_ => solverSolver(dsl)).to.throw(`ops: ${name},lt #`);
            break;
          case 'islte':
            // since S is truthy, it will rewrite the second islte to an lte
            expect(_ => solverSolver(dsl)).to.throw(`ops: ${name},lte #`);
            break;
          default:
            throw new Error('no [' + op + ']');
        }
      });

      it('should not work with [' + op + '] on size=2 non-booly R and booly S', function() {
        let dsl = `
          : A, B [0 10]
          : R [1 2]
          : S [0 1]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `;

        switch (name) {
          case 'iseq':
            // ok; since R is truthy, it will rewrite the first iseq to an eq which will alias A to B
            // since A == B, S must be truthy and the whole thing solves without the deduper helping
            expect(solverSolver(dsl)).to.eql({A: 0, B: 0, R: [1, 2], S: 1});
            break;
          case 'isneq':
            // since R is truthy, it will rewrite the first iseq to an neq
            expect(_ => solverSolver(dsl)).to.throw(`ops: ${name},neq #`);
            break;
          case 'islt':
            // since R is truthy, it will rewrite the first islt to an lt
            expect(_ => solverSolver(dsl)).to.throw(`ops: ${name},lt #`);
            break;
          case 'islte':
            // since R is truthy, it will rewrite the first islte to an lte
            expect(_ => solverSolver(dsl)).to.throw(`ops: ${name},lte #`);
            break;
          default:
            throw new Error('no [' + op + ']');
        }
      });

      it('should not work with [' + op + '] on partially overlapping R and S', function() {
        expect(_ => solverSolver(`
          : A, B [0 10]
          : R [0 0 5, 15]
          : S [0 0 15, 30]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `)).to.throw(`ops: ${name},${name} #`);
      });

      // while theoretically possible to dedupe this case, it's just not practical, and so we can't
      it.skip('should dedupe as zero with [' + op + '] on R and S that only share a zero', function() {
        expect(solverSolver(`
          : A, B [0 10]
          : R [0 0 5, 10]
          : S [0 0 20, 30]
          R = A ${op} B
          S = A ${op} B

          @custom var-strat throw
          @custom noleaf A B R S
        `)).to.eql(false);
      });
    }

    test('==?', 'iseq');
    test('!=?', 'isneq');
    test('<?', 'islt');
    test('<=?', 'islte');
  });

  describe('reifier lists', function() {

    function test(op, name) {
      it('should work with [' + op + '] and a plain dupe R', function() {
        expect(_ => solverSolver(`
          : A, B, C, D [0 10]
          : R [0 1]
          R = ${op}(A B C D)
          R = ${op}(A B C D)

          @custom var-strat throw
          @custom noleaf A B C D R
        `)).to.throw('ops: ' + name + ' #');
      });

      it('should work with [' + op + '] on bool R and S', function() {
        expect(_ => solverSolver(`
          : A, B, C, D [0 10]
          : R, S [0 1]
          R = ${op}(A B C D)
          S = ${op}(A B C D)

          @custom var-strat throw
          @custom noleaf A B C D R S
        `)).to.throw('ops: ' + name + ' #');
      });

      it('should not work with [' + op + '] on different R and S', function() {
        expect(_ => solverSolver(`
          : A, B, C, D [0 10]
          : R [0 0 5 5]
          : S [0 0 6 6]
          R = ${op}(A B C D)
          S = ${op}(A B C D)

          @custom var-strat throw
          @custom noleaf A B C D R S
        `)).to.throw(`ops: ${name},${name} #`);
      });
    }

    test('all?', 'isall');
    test('nall?', 'isnall');
    test('none?', 'isnone');
  });

  describe('nonreifier result lists', function() {

    function test(op) {
      it('should work with [' + op + '] and a plain dupe R', function() {
        expect(_ => solverSolver(`
          : A, B, C, D [0 10]
          : R [0 1000]
          R = ${op}(A B C D)
          R = ${op}(A B C D)

          @custom var-strat throw
          @custom noleaf A B C D R
        `)).to.throw('ops: ' + op + ' #');
      });

      it('should work with [' + op + '] on bool R and S', function() {
        expect(_ => solverSolver(`
          : A, B, C, D [0 10]
          : R, S [0 1000]
          R = ${op}(A B C D)
          S = ${op}(A B C D)

          @custom var-strat throw
          @custom noleaf A B C D R S
        `)).to.throw('ops: ' + op + ' #');
      });

      it('should work with [' + op + '] on different R and S', function() {
        let dsl = `
          : A, B, C, D [0 1000]
          : R [0 0 500 500]
          : S [0 0 600 600]
          R = ${op}(A B C D)
          S = ${op}(A B C D)

          @custom var-strat throw
          @custom noleaf A B C D R S
        `;

        // R and S are made aliases, meaning they can only end up 0 or empty
        // when R is 0, all sum args must be 0 as well and the whole thing
        // collapses to solve with zeroes
        if (op === 'sum') expect(solverSolver(dsl)).to.eql({A: 0, B: 0, C: 0, D: 0, R: 0, S: 0});
        // R and S are made aliases, meaning they can only end up 0 or empty
        // with R=0, the product is optimized to a simpler nall() (since at
        // least one of the ops has to be zero for the product to be zero)
        else expect(_ => solverSolver(dsl)).to.throw('ops: nall #');
      });
    }

    test('sum');
    test('product');
  });

  describe('void lists', function() {

    function test(op) {
      it('should work with [' + op + '] already ordered', function() {
        expect(_ => solverSolver(`
          : A, B, C, D [0 10]
          ${op}(A B C D)
          ${op}(A B C D)

          @custom var-strat throw
          @custom noleaf A B C D
        `)).to.throw('ops: ' + op + ' #');
      });

      it('should work with [' + op + '] in any order', function() {
        expect(_ => solverSolver(`
          : A, B, C, D [0 10]
          ${op}(B A C D)
          ${op}(A B C D)
          ${op}(D B C A)

          @custom var-strat throw
          @custom noleaf A B C D
        `)).to.throw('ops: ' + op + ' #');
      });
    }

    test('distinct');
    test('nall');
  });

  it('should detect swapped duplicate constraints', function() {
    expect(_ => solverSolver(`
      @custom var-strat throw
      : A [0 1]
      : B [0 1]
      A != B
      B != A
      @custom noleaf A B
    `)).to.throw(/ops: neq #/);
  });

  describe('iseq/isneq', function() {

    describe('only iseq', function() {

      it('should remove duplicate iseq', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C, D [0 1]
          C = A ==? B
          D = A ==? B
          @custom noleaf A B C D
        `)).to.throw(/ops: iseq #/);
      });

      it('should not remove duplicate iseq when result does not have the same domain', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C [0 1]
          : D [0 0 2 2]
          C = A ==? B
          D = A ==? B

          @custom noleaf A B C D
        `)).to.throw(/ops: iseq,iseq #/);
      });

      it('should remove swapped duplicate iseq', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C, D [0 1]
          C = A ==? B
          D = B ==? A
          @custom noleaf A, B, C, D
        `)).to.throw(/ops: iseq #/);
      });

      it('should not remove swapped duplicate iseq on different results', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C [0 1]
          : D [0 0 2 2]
          C = A ==? B
          D = B ==? A
          # note: C becomes 1, D becomes 2, so they should not be eq
          @custom noleaf A, B, C, D
        `)).to.throw(/ops: iseq,iseq #/);
      });

      it('should reject when a dupe iseq reifier has a different constant R', function() {

        // if this breaks the output probably changed or the engine improved; this case should result in `false`
        let solution = solverSolver(`
          @custom var-strat throw
          : A *
          : B *
          0 = A ==? B
          1 = A ==? B
          # oops
          @custom noleaf A B
        `);

        expect(solution).to.eql(false);
      });

      it('should reject when a dupe iseq reifier has a constant R and different solved alias', function() {

        // if this breaks the output probably changed or the engine improved; this case should result in `false`
        let solution = solverSolver(`
          @custom var-strat throw
          : A *
          : B *
          : C 1
          0 = A ==? B
          C = A ==? B
          # oops
          @custom noleaf A B C
        `);

        expect(solution).to.eql(false);
      });

      it('should reject when a dupe iseq reifier has a solved var and different constant alias', function() {

        // if this breaks the output probably changed or the engine improved; this case should result in `false`
        let solution = solverSolver(`
          @custom var-strat throw
          : A *
          : B *
          : C 0
          C = A ==? B
          1 = A ==? B
          # oops
          @custom noleaf A B C
        `);

        expect(solution).to.eql(false);
      });

      it('should reject when a dupe iseq reifier has a different solved vars', function() {

        // if this breaks the output probably changed or the engine improved; this case should result in `false`
        let solution = solverSolver(`
          @custom var-strat throw
          : A *
          : B *
          : C 0
          : D 1
          C = A ==? B
          D = A ==? B
          # oops
          @custom noleaf A B C D
        `);

        expect(solution).to.eql(false);
      });
    });

    describe('only isneq', function() {

      it('should remove duplicate isneq', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C, D [0 1]
          C = A !=? B
          D = A !=? B
          @custom noleaf A B C D
        `)).to.throw(/ops: isneq #/);
      });

      it('should not remove duplicate isneq when result does not have the same domain', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C [0 1]
          : D [0 0 2 2]
          C = A !=? B
          D = A !=? B

          @custom noleaf A B C D
        `)).to.throw(/ops: isneq,isneq #/);
      });

      it('should remove swapped duplicate isneq', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C, D [0 1]
          C = A !=? B
          D = B !=? A
          @custom noleaf A, B, C, D
        `)).to.throw(/ops: isneq #/);
      });

      it('should not remove swapped duplicate iseq on different results', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C [0 1]
          : D [0 0 2 2]
          C = A !=? B
          D = B !=? A
          # note: C becomes 1, D becomes 2, so they should not be eq
          @custom noleaf A, B, C, D
        `)).to.throw(/ops: isneq,isneq #/);
      });

      it('should reject when a dupe isneq reifier has a different constant R', function() {

        // if this breaks the output probably changed or the engine improved; this case should result in `false`
        let solution = solverSolver(`
          @custom var-strat throw
          : A *
          : B *
          0 = A !=? B
          1 = A !=? B
          # oops
          @custom noleaf A B
        `);

        expect(solution).to.eql(false);
      });

      it('should reject when a dupe isneq reifier has a constant R and different solved alias', function() {

        // if this breaks the output probably changed or the engine improved; this case should result in `false`
        let solution = solverSolver(`
          @custom var-strat throw
          : A *
          : B *
          : C 1
          0 = A !=? B
          C = A !=? B
          # oops
          @custom noleaf A B C
        `);

        expect(solution).to.eql(false);
      });

      it('should reject when a dupe isneq reifier has a solved var and different constant alias', function() {

        // if this breaks the output probably changed or the engine improved; this case should result in `false`
        let solution = solverSolver(`
          @custom var-strat throw
          : A *
          : B *
          : C 0
          C = A !=? B
          1 = A !=? B
          # oops
          @custom noleaf A B C
        `);

        expect(solution).to.eql(false);
      });

      it('should reject when a dupe isneq reifier has a different solved vars', function() {

        // if this breaks the output probably changed or the engine improved; this case should result in `false`
        let solution = solverSolver(`
          @custom var-strat throw
          : A *
          : B *
          : C 0
          : D 1
          C = A !=? B
          D = A !=? B
          # oops
          @custom noleaf A B C D
        `);

        expect(solution).to.eql(false);
      });
    });

    describe('iseq+isneq', function() {

      it('should remove pseudo duplicate iseq/isneq', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [2 3]
          : C, D [0 1]
          C = A ==? 2
          D = A !=? 3
          # in this particular case A==?x is equal to A!=?y because A only contains [x x y y]
          # this should lead to conclude C=D,C=A==?x
          @custom noleaf A, C, D
        `)).to.throw(/ops: iseq #/);
      });

      it('should remove pseudo duplicate isneq/iseq', function() {
        // only the constraints are swapped with isneq going first
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [2 3]
          : C, D [0 1]
          D = A !=? 3
          C = A ==? 2
          # in this particular case A==?x is equal to A!=?y because A only contains [x x y y]
          # this should lead to conclude C=D,C=A==?x
          @custom noleaf A C D
        `)).to.throw(/ops: isneq #/);
      });

      it('should not remove pseudo duplicate iseq/isneq when domains do not "booly-match"', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [2 3]
          : C [0 1]
          : D [0 0 2 2]
          C = A ==? 2
          D = A !=? 3
          # in this case C != D and if the constraint evals to truthy, C and D should become different values...
          @custom noleaf A, C, D
        `)).to.throw(/ops: iseq,xnor #/);
      });

      it('should not remove pseudo duplicate isneq/iseq when domains do not "booly-match"', function() {
        expect(_ => solverSolver(`
          @custom var-strat throw
          : A [2 3]
          : C [0 1]
          : D [0 0 2 2]
          D = A !=? 3
          C = A ==? 2
          # in this case C != D and if the constraint evals to truthy, C and D should become different values...
          @custom noleaf A, C, D
        `)).to.throw(/ops: isneq,xnor #/);
      });
    });
  });

  describe('sum/product', function() {

    it('should alias two sums with same order', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 10]
        : E, F *
        E = sum(A B C D)
        F = sum(A B C D)
        @custom noleaf A B C D E F
      `)).to.throw(/ops: sum #/);
    });

    it('should alias two sums with different order', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 10]
        : E, F *
        E = sum(A B C D)
        F = sum(C D A B)
        @custom noleaf A B C D E F
      `)).to.throw(/ops: sum #/);
    });

    it('should alias two products with same order', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : C [0 10]
        : D, E *
        D = product(A B C)
        E = product(A B C)
        # D==E
        @custom noleaf A B C D E
      `)).to.throw(/ops: product #/);
    });

    it('should alias two products with different order', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 10]
        : E, F *
        E = product(A B C D)
        F = product(B C D A)
        # E==F
        @custom noleaf A B C D E F
      `)).to.throw(/ops: product #/);
    });

    it('should alias a sum with a plus', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : D, E *
        D = sum(A B)
        E = A + B
        @custom noleaf A B D E
      `)).to.throw(/ops: plus #/);
    });
  });

  it('should dedupe a contrived dupe (noleaf)', function() {
    expect(_ => solverSolver(`
      @custom var-strat throw
      : A, B, C [0 10]
      A != C
      distinct(C B A)
      B == 5 # should remove B from the distinct, which should morph to a C != A
      @custom noleaf A B C
    `)).to.throw(/ops: neq #/); // only one neq because B should already be resolved
  });

  it('should dedupe a contrived dupe (cutter)', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A, B, C [0 10]
      A != C
      distinct(C B A)
      B == 5 # should remove B from the distinct, which should morph to a C != A
    `);

    expect(solution).to.eql({A: [1, 4, 6, 10], B: 5, C: 0});
  });

  describe('nand/nall', function() {

    it('should eliminate double nalls', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : C [0 10]
        nall(A B C)
        nall(A B C)
        @custom noleaf A B C
      `)).to.throw(/ops: nall #/);
    });

    it('should eliminate swapped double nalls', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : C [0 10]
        nall(A B C)
        nall(B C A)
        @custom noleaf A B C
      `)).to.throw(/ops: nall #/);
    });

    it('should dedupe nand (v1)', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !& B
        A !& B
        @custom noleaf A B
      `)).to.throw(/ops: nand #/);
    });

    it('should dedupe nand (v2)', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !& B
        B !& A
        @custom noleaf A B
      `)).to.throw(/ops: nand #/);
    });

    it('should completely remove a deduped nall if there is a dupe nand as well (v1)', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        nall(A A B)
        A !& B
        @custom noleaf A B
      `)).to.throw(/ops: nand #/);
    });

    it('should completely remove a deduped nall if there is a dupe nand as well (v2)', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !& B
        nall(A A B)
        @custom noleaf A B
      `)).to.throw(/ops: nand #/);
    });

    it('should completely remove a deduped nall if there is a dupe nand as well (v3)', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        B !& A
        nall(A A B)
        @custom noleaf A B
      `)).to.throw(/ops: nand #/);
    });
  });
});
