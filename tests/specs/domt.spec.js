import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
} from '../fixtures/domain.fixt';
import Solver from '../../src/solver';

import {
  DOMT_DEFAULT_FIRST_NODE,

  _domt_debug,
  domt_create,
  domt_initDomain,
  domt_duplicateNode,

  domt_getDomainArr,
  domt_getNodeSize,
  domt_getNodeEnd,
  domt_getSize,
} from '../../src/domt';

import {
  SUP,
} from '../../src/helpers';

describe('src/domt.spec', function() {

  it('should woik', function() {
    let domt = domt_create(4);
    domt_initDomain(domt, 0, fixt_arrdom_range(100, 150));
    domt_initDomain(domt, 1, fixt_arrdom_range(99, SUP));
    domt_initDomain(domt, 2, fixt_arrdom_range(500, 500));
    domt_initDomain(domt, 3, fixt_arrdom_range(0, 15, true));
    _domt_debug(domt, 0);
  });

  it('should add a domain and read it back', function() {
    let domt = domt_create(1);

    domt_initDomain(domt, 0, fixt_arrdom_range(100, 150));

    expect(domt_getDomainArr(domt, DOMT_DEFAULT_FIRST_NODE, 0)).to.eql(fixt_arrdom_range(100, 150));
  });

  it('should add a domain, dupe the node, and still read it back', function() {
    let domt = domt_create(1);

    domt_initDomain(domt, 0, fixt_arrdom_range(100, 150));
    domt_duplicateNode(domt, domt.lastNodeIndex);

    expect(domt.lastNodeIndex).to.not.eql(DOMT_DEFAULT_FIRST_NODE);
    expect(domt_getDomainArr(domt, DOMT_DEFAULT_FIRST_NODE, 0)).to.eql(fixt_arrdom_range(100, 150));
    expect(domt_getDomainArr(domt, domt.lastNodeIndex, 0)).to.eql(fixt_arrdom_range(100, 150));
  });

  it('should not lead to nans', function() {
    let solver = new Solver({});

    solver.addVar('A', [0, 10]);
    solver.addVar('B', [0, 10]);
    solver.addVar('MIN', [19, 19]);
    solver.addVar('MAX', [21, 21]);
    solver.addVar('S', [0, 100]);

    solver.mul('A', 'B', 'S');
    solver.lte('S', 'MAX');
    solver.gte('S', 'MIN');

    let solution = solver.solve({max: 1});

    // There are only three values that multiply to 20 or
    // 21 (and none to 19 because it is a prime). Times
    // two because each value appears in A and B.
    expect(solution).to.eql([
        {A: 2, B: 10, MIN: 19, MAX: 21, S: 20},
    ]);
  });

  it('should add a domain, _double_ dupe the node, and still read it back', function() {
    let domt = domt_create(1);

    domt_initDomain(domt, 0, fixt_arrdom_range(100, 150));
    domt_duplicateNode(domt, domt.lastNodeIndex);
    let between = domt.lastNodeIndex;
    domt_duplicateNode(domt, domt.lastNodeIndex);

    expect(domt.lastNodeIndex).to.not.eql(DOMT_DEFAULT_FIRST_NODE);
    expect(domt.lastNodeIndex).to.not.eql(between);
    expect(between).to.not.eql(DOMT_DEFAULT_FIRST_NODE);

    expect(domt_getDomainArr(domt, DOMT_DEFAULT_FIRST_NODE, 0)).to.eql(fixt_arrdom_range(100, 150));
    expect(domt_getDomainArr(domt, between, 0)).to.eql(fixt_arrdom_range(100, 150));
    expect(domt_getDomainArr(domt, domt.lastNodeIndex, 0)).to.eql(fixt_arrdom_range(100, 150));
  });

  describe('domt_duplicateNode', function() {

    it('should clone optimized node when duplicating', function() {
      let domt = domt_create(4);
      domt_initDomain(domt, 0, fixt_arrdom_range(100, 150));
      domt_initDomain(domt, 1, fixt_arrdom_range(99, SUP));
      domt_initDomain(domt, 2, fixt_arrdom_range(500, 501));
      domt_initDomain(domt, 3, fixt_arrdom_range(0, 15, true));
      domt_duplicateNode(domt, domt.lastNodeIndex);

      let index1 = DOMT_DEFAULT_FIRST_NODE;
      let len1 = domt_getNodeSize(domt, index1);
      let index2 = domt.lastNodeIndex;
      let len2 = domt_getNodeSize(domt, index2);
      let end = domt_getNodeEnd(domt, domt.lastNodeIndex);

      // node 2 should start immediately after where node 1 should end
      expect(index1 + len1, 'node 2 starts where node 1 ends?').to.eql(index2);
      // node 2 should end where the domt ends
      expect(index2 + len2, 'domt ends after node 2?').to.eql(end);

      let first = [].slice.call(domt.buffer, index1, index2);
      let second = [].slice.call(domt.buffer, index2, end);

      expect(first.join(', ')).to.eql(second.join(', '));
    });

    it('should optimize solved domain away into jump table', function() {

      let domt1 = domt_create(4);
      domt_initDomain(domt1, 0, fixt_arrdom_range(100, 150));
      domt_initDomain(domt1, 1, fixt_arrdom_range(99, SUP));
      domt_initDomain(domt1, 2, fixt_arrdom_range(500, 501));
      domt_initDomain(domt1, 3, fixt_arrdom_range(0, 20, true));

      let domt2 = domt_create(4);
      domt_initDomain(domt2, 0, fixt_arrdom_range(100, 150));
      domt_initDomain(domt2, 1, fixt_arrdom_range(99, SUP));
      domt_initDomain(domt2, 2, fixt_arrdom_range(500, 500)); // difference! this is solved
      domt_initDomain(domt2, 3, fixt_arrdom_range(0, 20, true));

      // domt1 and domt2 are nearly identical. the only difference is
      // that the third domain is solved in one and two elements in
      // the other.
      // the domt2, having the solve ddomain, should take less space

      expect(domt_getSize(domt1)).to.be.above(domt_getSize(domt2));
    });
  });
});
