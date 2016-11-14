import {
  domain_arrToSmallest,
  domain_size,
} from '../../src/domain';

function countSolutions(solver) {
  let solutions = solver.solutions;
  let total = 0;
  for (let i = 0, n = solutions.length; i < n; ++i) {
    let solution = solutions[i];
    let keys = Object.keys(solution);
    let sub = 1;
    for (let j = 0, m = keys.length; j < m; ++j) {
      let key = keys[j];
      let value = solution[key];
      if (value === false) {
        sub = 0;
        break;
      }

      if (value instanceof Array) sub *= domain_size(domain_arrToSmallest(value));
    }
    total += sub;
  }
  return total;
}

export {
  countSolutions,
};
