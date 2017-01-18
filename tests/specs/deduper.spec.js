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

  it('should detect swapped duplicate constraints', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 1]
      : B [0 1]
      A != B
      B != A
    `);
    // note: deduper will remove one dupe and then cutter will remove the remaining one (but wouldnt otherwise)

    expect(solution).to.eql({A: 1, B: 0});
  });

  it('should remove duplicate iseq', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 1]
      : B [0 1]
      C = A ==? B
      D = A ==? B
    `);
    // note: deduper will remove one dupe and then cutter will remove the remaining one (but wouldnt otherwise)

    expect(solution).to.eql({A: 0, B: 0, C: 1, D: 1});
  });


  it('should remove swapped duplicate iseq', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 1]
      : B [0 1]
      C = A ==? B
      D = B ==? A
    `);
    // note: deduper will remove one dupe and then cutter will remove the remaining one (but wouldnt otherwise)

    expect(solution).to.eql({A: 0, B: 0, C: 1, D: 1});
  });

  it('should remove pseudo duplicate iseq/isneq', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [2 3]
      C = A ==? 2
      D = A !=? 3
      # in this particular case A==?x is equal to A!=?y because A only contains [x x y y]
      # this should lead to conclude C=D,C=A==?x
    `);

    // this'll work even without deduping due to the cutter
    expect(solution).to.eql({A: 2, C: 1, D: 1});
  });

  it('should reject when a dupe vv8 reifier has different constant', function() {
    // it's an artifact edge case that we can't just ignore

    // if this breaks the output probably changed or the engine improved; this case should result in `false`
    expect(_ => solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      0 = A ==? B
      1 = A ==? B
      # oops
    `)).to.throw('debug: 2 vars, 1 constraints, current domain state: 0:A:: 1:B:??? ops: neq'); // it should actually resolve this... (it ends with x != x) and maybe a future fix will resolve this to reject
  });

  it('should alias two sums', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 10]
      : B [0 10]
      : C [0 10]
      D = sum(A B C)
      E = sum(A B C)
    `);

    // D==E
    expect(solution).to.eql({A: 0, B: 0, C: 0, D: 0, E: 0}); // implicit choices through solveStack pick zero first
  });

  it('should alias two products', function() {
    expect(_ => solverSolver(`
      @custom var-strat throw
      : A [0 10]
      : B [0 10]
      : C [0 10]
      D = product(A B C)
      E = product(A B C)
      # D==E
    `)).to.throw(/debug: 5 vars, 1 constraints, current domain state: 0:A:0,10: 1:B:0,10: 2:C:0,10: 3:D:0,1000: 4:E:\?\?\? ops: product/);
  });

  it('should alias a sum with a plus', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 10]
      : B [0 10]
      D = sum(A B)
      E = A + B
    `);

    // D==E
    expect(solution).to.eql({A: 0, B: 0, D: 0, E: 0});
  });

  it('should eliminate double nalls', function() {
    expect(_ => solverSolver(`
      @custom var-strat throw
      : A [0 10]
      : B [0 10]
      : C [0 10]
      nall(A B C)
      nall(A B C)
    `)).to.throw('debug: 3 vars, 1 constraints, current domain state: 0:A:0,10: 1:B:0,10: 2:C:0,10 ops: nall');
  });

  it('should eliminate swapped double nalls', function() {
    expect(_ => solverSolver(`
      @custom var-strat throw
      : A [0 10]
      : B [0 10]
      : C [0 10]
      nall(A B C)
      nall(B C A)
    `)).to.throw('debug: 3 vars, 1 constraints, current domain state: 0:A:0,10: 1:B:0,10: 2:C:0,10 ops: nall');
  });

  it('should dedupe a contrived dupe', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 10]
      : B [0 10]
      : C [0 10]
      A != C
      distinct(C B A)
      B == 5 # should remove B from the distinct, which should morph to a C != A
    `);

    expect(solution).to.eql({A: [1, 10], B: 5, C: 0});
  });
});
