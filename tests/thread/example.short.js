/**
 * Trivial example with multiple solutions and at least some branching.
 *
 * @param {Function} Solver
 * @returns {Solver}
 */
function example(Solver) {
  let solver = new Solver();

  solver.declRange('A', 0, 10);
  solver.declRange('B', 0, 10);
  solver.declRange('C', 0, 10);
  solver.distinct(['A', 'B', 'C']);

  return solver;
}

// BODY_START
// i dont want this code in the build
// BODY_STOP
