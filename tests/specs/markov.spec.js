import expect from '../fixtures/mocha_proxy.fixt';
//import {
//  specDomainCreateRange,
//  specDomainCreateRanges,
//  specDomainCreateValue,
//} from '../fixtures/domain.fixt';

import {
  //markov_createLegend,
  markov_createProbVector,
} from '../../src/markov';
import {
  space_createRoot,
} from '../../src/space';

describe('src/markov.spec', function() {

  describe('markov_createProbVector', function() {

    it('should exist', function() {
      expect(markov_createProbVector).to.be.a('function');
    });

    it('should return an array', function() {
      let space = space_createRoot();
      let R = markov_createProbVector(space, [{vector: []}], undefined, 0);

      expect(R instanceof Array).to.equal(true);
    });

    it('should return the vector by reference', function() {
      let vector = [32, 4, 22];
      let space = space_createRoot();
      let R = markov_createProbVector(space, [{vector}], undefined, 3);

      expect(R).to.equal(vector);
    });

    it('should expand vector to count with expandVectorsWith', function() {
      let vector = [32, 4, 22];
      let space = space_createRoot();
      let R = markov_createProbVector(space, [{vector}], 1, 5);

      expect(R).to.eql([32, 4, 22, 1, 1]);
    });

    it('should accept expandVectorsWith when it is zero', function() {
      let vector = [32, 4, 22];
      let space = space_createRoot();
      let R = markov_createProbVector(space, [{vector}], 0, 5);

      expect(R).to.eql([32, 4, 22, 0, 0]);
    });

    it('should work with empty vector if expandVectorsWith is set', function() {
      let space = space_createRoot();
      let R = markov_createProbVector(space, [{}], 1, 5);

      expect(R).to.eql([1, 1, 1, 1, 1]);
    });

    it('should throw without a vector nor expandVectorsWith', function() {
      let space = space_createRoot();
      expect(_ => markov_createProbVector(space, [{}], undefined, 5)).to.throw();
    });

    it('should throw if vector is of different length than count and expand is not set', function() {
      let vector = [32, 4, 22];
      let space = space_createRoot();
      expect(_ => markov_createProbVector(space, [{vector}], undefined, 6)).to.throw();
    });
  });
});
