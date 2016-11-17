import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_dom_range,
  fixt_dom_solved,
} from '../../fixtures/domain.fixt';

import distribution_markovSampleNextFromDomain from '../../../src/distribution/markov';

const RNG_UNNORMALIZED = false;
const RNG_NORMALIZED = true;

const funcRngMin = function() { return 0; };
const rngFuncMid = function() { return 0.5; }; // middle (ok, technically slightly above the middle... is that bug?)
const funcRngMax = function() { return 1 - Number.EPSILON; }; // always pick last in legend

describe('distribution/markov.spec', function() {

  it('should return a number', function() {
    let domain = fixt_dom_range(0, 10);
    let valueLegend = [5];
    let probVector = [1];

    expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, funcRngMax)).to.equal(5);
  });

  it('should return first value in legend if rng is 0', function() {
    let domain = fixt_dom_range(0, 10);
    let valueLegend = [2, 5];
    let probVector = [1, 1]; // equal odds (irrelevant for this test)

    expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, funcRngMin)).to.equal(2);
  });

  it('should return first value in legend if rng is 1', function() {
    let domain = fixt_dom_range(0, 10);
    let valueLegend = [2, 8];
    let probVector = [1, 1]; // equal odds (irrelevant for this test)

    expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, funcRngMax, RNG_NORMALIZED)).to.equal(8);
  });

  it('should throw if normalized rng returns 1', function() {
    let domain = fixt_dom_range(0, 10);
    let valueLegend = [2, 8];
    let probVector = [1, 1]; // equal odds (irrelevant for this test)
    let rngFunc = () => 1; // not a valid normalized value

    expect(() => distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rngFunc, RNG_NORMALIZED)).to.throw('RNG_SHOULD_BE_NORMALIZED');
  });

  it('should throw if normalized rng returns 1.1', function() {
    let domain = fixt_dom_range(0, 10);
    let valueLegend = [2, 8];
    let probVector = [1, 1]; // equal odds (irrelevant for this test)
    let rngFunc = () => 1.1; // not a valid normalized value

    expect(() => distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rngFunc, RNG_NORMALIZED)).to.throw('RNG_SHOULD_BE_NORMALIZED');
  });

  it('should throw if normalized rng returns -1', function() {
    let domain = fixt_dom_range(0, 10);
    let valueLegend = [2, 8];
    let probVector = [1, 1]; // equal odds (irrelevant for this test)
    let rngFunc = () => -1; // not a valid normalized value

    expect(() => distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rngFunc, RNG_NORMALIZED)).to.throw('RNG_SHOULD_BE_NORMALIZED');
  });

  it('should return middle value in legend if rng is .5 with equal probs', function() {
    let domain = fixt_dom_range(0, 10);
    let valueLegend = [1, 2, 3];
    let probVector = [1, 1, 1]; // equal odds (irrelevant for this test)

    expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rngFuncMid)).to.equal(2);
  });

  it('should not consider values with zero probability', function() {
    let domain = fixt_dom_range(0, 10);
    let valueLegend = [1, 2, 3, 4, 5, 6];
    let probVector = [0, 0, 0, 0, 1, 0]; // only `5` has non-zero chance

    expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rngFuncMid)).to.equal(5);
  });

  it('should ignore values not in current domain', function() {
    let domain = fixt_dom_range(3, 10); // note: 1 and 2 are not part of domain!
    let valueLegend = [1, 2, 3, 4, 5, 6];
    let probVector = [1, 1, 0, 0, 1, 0]; // 1, 2, and 5 have non-zero probability

    expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, funcRngMin)).to.equal(5);
  });

  describe('distribute according to probability weight', function() {

    it('should solve an explicit case', function() {
      // tricky to explain. rng works on the total of probabilities and "consumes" left-to-right
      // so since `2` has probability of `5/total` and the only value before it has a prob of
      // `1/total`, the `2` will be chosen if rng outcome is one of [1, 6]. We'll fix it to `4`
      // in this test so we'll know this must be the case.
      let domain = fixt_dom_range(0, 10);
      let valueLegend = [1, 2, 3, 4, 5, 6];
      let probVector = [1, 5, 1, 1, 1, 1]; // total probability is 10
      let rngFunc = () => 4; // whole number to prevent precision errors (-> RNG_UNNORMALIZED)

      expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rngFunc, RNG_UNNORMALIZED)).to.equal(2);
    });

    describe('more cases, unnormalized', function() {
      // Make sure that: rngRoll < sum(probVector).
      // The roll must be less! Not lte.
      function caseIt(probVector, rngRoll, outcome, desc) {
        if (rngRoll >= probVector.reduce((a, b) => a + b)) {
          throw new Error(`Test fail, roll must be < prob sum (${rngRoll} >= ${probVector.reduce((a, b) => a + b)})`);
        }

        it(`should solve case probs: ${probVector} roll: ${rngRoll} out: ${outcome} ${desc && ('desc: ' + desc) || ''}`, function() {
          let domain = fixt_dom_range(0, 10);
          let valueLegend = [1, 2, 3, 4, 5, 6];
          let rngFunc = function() { return rngRoll; };

          expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rngFunc, RNG_UNNORMALIZED)).to.equal(outcome);
        });
      }

      caseIt([1, 1, 1, 1, 1, 1], 0, 1);
      caseIt([1, 1, 1, 1, 1, 1], 1, 2);
      caseIt([1, 1, 1, 1, 1, 1], 4, 5);
      caseIt([1, 5, 1, 1, 1, 1], 1, 2);
      caseIt([1, 5, 1, 1, 1, 1], 4, 2, 'the 5 "adds" the second index 5x to the pool so 4 ends up picking the second index');
      caseIt([1, 5, 1, 1, 1, 1], 6, 3, 'the 6 roll skips over index 1 and 5x index 2 so it picks index 3');
      caseIt([1, 5, 1, 1, 1, 1], 9, 6);
      caseIt([1, 8, 1, 12, 1, 1], 22, 5, 'roll 23, skips 1x 1, 8x 2, 1x 3, 12x 4 (=22 indices) to get index 5 (not 6 because it offsets at 0)');
    });

    describe('more cases, normalized', function() {
      // Make sure that: rngRoll < sum(probVector).
      // The roll must be less! Not lte.
      let case_it = function(probVector, rngRoll, outcome, desc) {
        if (rngRoll >= 1) {
          throw new Error(`Test fail, roll must be < 1 (${rngRoll} >= 1`);
        }
        if (Math.abs(probVector.reduce((a, b) => a + b) - 1) > 1e-4) {
          throw new Error(`Test fail, prob total should be 1 (1-${probVector.reduce(function(a, b) { return a + b; })} > ${1e-4})`);
        }

        it(`should solve case probs: ${probVector} roll: ${rngRoll} out: ${outcome} ${desc && ('desc: ' + desc) || ''}`, function() {
          let domain = fixt_dom_range(0, 10);
          let valueLegend = [1, 2, 3, 4, 5, 6];
          let rng_func = _ => rngRoll;
          expect(distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rng_func, RNG_NORMALIZED)).to.equal(outcome);
        });
      };

      case_it([1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6], 0, 1);
      case_it([1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6], 1 - 1e-6, 6);
      //case_it [1/6, 1/6, 1/6, 1/6, 1/6, 1/6], 1/6, 2 # rounding makes this test difficult
      //case_it [1/6, 0, 2/6, 1/6, 1/6, 1/6], 1/6, 3, 'Second index has zero prob so it becomes 3' # rounding makes this test difficult
      case_it([1 / 6, 0, 2 / 6, 1 / 6, 1 / 6, 1 / 6], 2 / 6, 3, 'Second index has zero prob so it becomes 3');
    });
  });

  it('should always return a value from legend (100x)', function() {

    let generateNormalizedProbs = function(r, n) {
      // returns an array of 2^n random values, which should sum up to 1
      let x = r * Math.random();
      let y = r - x;
      if (--n) {
        return [].concat(generateNormalizedProbs(x, n), generateNormalizedProbs(y, n));
      }
      return [x, y];
    };

    for (var i = 0; i < 100; ++i) {
      let domain = fixt_dom_solved(100);
      let valueLegend = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]; // 16x 100
      let probVector = generateNormalizedProbs(1, 4); // 16 values
      let r = Math.random();
      let rng = () => r;

      let out = distribution_markovSampleNextFromDomain(domain, probVector, valueLegend, rng, RNG_NORMALIZED);

      expect(out, `domain: ${domain} valueLegend: ${valueLegend} probVector: ${probVector} r: ${r} out: ${out}`).to.equal(100); // should end up picking a valid index
    }
  });
});
