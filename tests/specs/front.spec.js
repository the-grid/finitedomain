import expect from '../fixtures/mocha_proxy.fixt';

import {
  FRONT_FIRST_NODE_OFFSET,
  FRONT_DEFAULT_SIZE,

  front_addCell,
  front_addNode,
  front_create,
  _front_debug,
  front_getCell,
  front_getSizeOf,
  front_setSizeOf,
} from '../../src/front';

describe('src/front.spec', function() {

  describe('front_addNode', function() {

    it('should exist', function() {
      expect(front_addNode).to.be.a('function');
    });

    it('should throw for adding a node to an empty node', function() {
      let front = front_create(30);
      let nodeIndex = front.lastNodeIndex;
      expect(nodeIndex).to.eql(FRONT_FIRST_NODE_OFFSET);
      front_setSizeOf(front, nodeIndex, 15);
      nodeIndex = front_addNode(front);
      front_setSizeOf(front, nodeIndex, 0);

      expect(_ => front_addNode(front)).to.throw('E_LAST_NODE_EMPTY');
    });

    it('should not throw for adding a second node when the first node is empty', function() {
      let front = front_create();
      let nodeIndex = front.lastNodeIndex;
      expect(nodeIndex).to.eql(FRONT_FIRST_NODE_OFFSET);

      expect(front_getSizeOf(front, nodeIndex)).to.eql(0);
      front_addNode(front);
      expect(true).to.eql(true);
    });

    it('should add node immediately after first node on a fresh front with some elements', function() {
      let front = front_create();
      let nodeIndex = front.lastNodeIndex;
      expect(nodeIndex).to.eql(FRONT_FIRST_NODE_OFFSET);

      // we could skip the add cells and just set the len but let's be nice
      front_addCell(front, nodeIndex, 0, 0xfff);
      front_addCell(front, nodeIndex, 1, 0xfff);
      front_addCell(front, nodeIndex, 2, 0xfff);
      front_addCell(front, nodeIndex, 3, 0xfff);
      front_addCell(front, nodeIndex, 4, 0xfff);
      front_setSizeOf(front, nodeIndex, 5);
      expect(front_getSizeOf(front, nodeIndex)).to.eql(5);

      front_addNode(front);
      expect(front.lastNodeIndex).to.eql(nodeIndex + 1 + 5);
    });

    it('should add node immediately after another non-first node', function() {
      let front = front_create();
      let nodeIndex = front.lastNodeIndex;
      expect(nodeIndex).to.eql(FRONT_FIRST_NODE_OFFSET);

      // we could skip the add cells and just set the len but let's be nice
      front_addCell(front, nodeIndex, 0, 0xfff);
      front_addCell(front, nodeIndex, 1, 0xfff);
      front_addCell(front, nodeIndex, 2, 0xfff);
      front_addCell(front, nodeIndex, 3, 0xfff);
      front_addCell(front, nodeIndex, 4, 0xfff);
      front_setSizeOf(front, nodeIndex, 5);
      expect(front_getSizeOf(front, nodeIndex)).to.eql(5);

      // we could skip the add cells and just set the len but let's be nice
      nodeIndex = front_addNode(front);
      front_addCell(front, nodeIndex, 0, 0xfff);
      front_addCell(front, nodeIndex, 1, 0xfff);
      front_addCell(front, nodeIndex, 2, 0xfff);
      front_addCell(front, nodeIndex, 3, 0xfff);
      front_setSizeOf(front, nodeIndex, 4);
      expect(front_getSizeOf(front, nodeIndex)).to.eql(4);

      front_addNode(front);
      expect(front.lastNodeIndex).to.eql(nodeIndex + 1 + 4);
    });

    it('should throw for adding a node after an empty node because the search ends when the list is empty', function() {
      let front = front_create();
      let nodeIndex = front.lastNodeIndex;
      expect(nodeIndex).to.eql(FRONT_FIRST_NODE_OFFSET);

      // we could skip the add cells and just set the len but let's be nice
      front_addCell(front, nodeIndex, 0, 0xfff);
      front_addCell(front, nodeIndex, 1, 0xfff);
      front_addCell(front, nodeIndex, 2, 0xfff);
      front_addCell(front, nodeIndex, 3, 0xfff);
      front_addCell(front, nodeIndex, 4, 0xfff);
      front_setSizeOf(front, nodeIndex, 5);
      expect(front_getSizeOf(front, nodeIndex)).to.eql(5);

      // we could skip the add cells and just set the len but let's be nice
      nodeIndex = front_addNode(front);
      front_setSizeOf(front, nodeIndex, 0);
      expect(front_getSizeOf(front, nodeIndex)).to.eql(0);

      expect(_ => front_addNode(front)).to.throw('E_LAST_NODE_EMPTY');
    });

    it('should grow if it has less space left than prev node size', function() {
      let front = front_create(20);
      expect(front.buffer.length).to.equal(20);

      front_setSizeOf(front, front.lastNodeIndex, 15);
      front_addNode(front);

      expect(front.buffer.length).to.be.gt(20);
    });

    it('should grow to at least have enough space to fit previous node', function() {
      let front = front_create(200);
      expect(front.buffer.length).to.equal(200);

      front_setSizeOf(front, front.lastNodeIndex, 190);
      front_addNode(front);

      _front_debug(front);

      expect(front.buffer.length).to.be.gte(382); // each node is length+1, so 2x190+2=382
    });

    it('should accept a length fills the buffer precisely', function() {
      let front = front_create(10);
      expect(front.buffer.length).to.equal(10);

      front_setSizeOf(front, front.lastNodeIndex, 4);
      front_addNode(front); // should start at 5, room for 1 + 4 cells = max cell index 9 (=10th cell)
      front_setSizeOf(front, front.lastNodeIndex, 4);

      _front_debug(front, {showBuf: true});

      expect(front.buffer.length).to.be.gte(10); // each node is length+1, so 2x190+2=382
    });

    it('should be able to set len 0 on first node when buffer is len 1', function() {
      let front = front_create(1); // only fits one size cell
      expect(front.buffer.length).to.equal(1);
      front_setSizeOf(front, front.lastNodeIndex, 0);
      expect(front.buffer.length).to.equal(1);
    });

    it('should be able to grow exactly during an addNode request', function() {
      let front = front_create(10);
      expect(front.buffer.length).to.equal(10);

      front_setSizeOf(front, front.lastNodeIndex, 6);
      // fill with 10~15
      for (let i = 0; i < 6; ++i) {
        front_addCell(front, front.lastNodeIndex, i, 10 + i);
      }
      // the next node should start at 5 (6th cell), room for 1 + 4 cells = max cell index 9 (=10th cell)
      front_addNode(front);
      // fill with 20~25
      for (let i = 0; i < 6; ++i) {
        front_addCell(front, front.lastNodeIndex, i, 20 + i);
      }
      // len 6 + 1 length cell = 7 cells so next node starts at 7 (=8th cell)
      expect(front.lastNodeIndex).to.eql(7);
      // while it should *1.1, it will increase that to fit the max size of the new node if it's bigger, like in this case (11 vs 14)
      expect(front.buffer.length).to.equal(14);
      front_setSizeOf(front, front.lastNodeIndex, 6); // should fill the buffer exactly

      expect(front.buffer.length).to.be.gte(11);
    });

    it('should grow when adding cell to first node that would exceed buffer', function() {
      let front = front_create(2);
      front_addCell(front, FRONT_FIRST_NODE_OFFSET, 0, 10);
      front_addCell(front, FRONT_FIRST_NODE_OFFSET, 1, 11);

      expect(front.buffer.length).to.eql(3); // only added one cell to the start
    });

    it('should grow when adding a few cells to first node that would exceed buffer', function() {
      let front = front_create(2);
      front_addCell(front, FRONT_FIRST_NODE_OFFSET, 0, 10);
      _front_debug(front, {buf: true});
      front_addCell(front, FRONT_FIRST_NODE_OFFSET, 1, 11);
      front_addCell(front, FRONT_FIRST_NODE_OFFSET, 2, 12);
      front_addCell(front, FRONT_FIRST_NODE_OFFSET, 3, 13);


      expect(front.buffer.length).to.eql(5); // four cells + size cell = 5 cells
    });
  });

  describe('front_addCell', function() {

    it('should exist', function() {
      expect(front_addCell).to.be.a('function');
    });
  });

  describe('front_getCell', function() {

    it('should exist', function() {
      expect(front_getCell).to.be.a('function');
    });

    it('should return a set cell', function() {
      let front = front_create();
      front_addCell(front, front.lastNodeIndex, 0, 10);

      expect(front_getCell(front, front.lastNodeIndex, 0)).to.eql(10);
    });

    it('should throw for exceeding bounds', function() {
      let front = front_create(50);
      // note; 50 is the 51st cell
      expect(_ => front_getCell(front, front.lastNodeIndex, 50)).to.throw('target cell should be within bounds');
      expect(_ => front_getCell(front, front.lastNodeIndex, -1)).to.throw('cell must not be OOB');
      expect(_ => front_getCell(front, 51, 1)).to.throw('node must not be OOB');
      expect(_ => front_getCell(front, -1, 1)).to.throw('node must not be OOB');
    });

    it('should throw for bad cell index', function() {
      let front = front_create(50);
      // note; 50 is the 51st cell
      expect(_ => front_getCell(front, front.lastNodeIndex, undefined)).to.throw('cell must be number');
      expect(_ => front_getCell(front, front.lastNodeIndex, {})).to.throw('cell must be number');
    });
  });

  describe('front_create', function() {

    it('should exist', function() {
      expect(front_create).to.be.a('function');
    });

    it('should create a front with default size', function() {
      let front = front_create();

      expect(front._class).to.eql('$front');
      expect(front.buffer.length).to.eql(FRONT_DEFAULT_SIZE);
    });

    it('should create a front with explicit size', function() {
      let front = front_create(50);

      expect(front._class).to.eql('$front');
      expect(front.buffer.length).to.eql(50);
    });
  });

  describe('_front_debug', function() {

    it('should exist', function() {
      expect(_front_debug).to.be.a('function');
    });

    it('should not crash on an empty front', function() {
      let front = front_create();
      _front_debug(front);
      expect(true).to.eql(true);
    });

    it('should not crash on a front with some nodes', function() {
      let front = front_create();
      let nodeIndex = front.lastNodeIndex;

      // we could skip the add cells and just set the len but let's be nice
      front_addCell(front, nodeIndex, 0, 0xfff);
      front_addCell(front, nodeIndex, 1, 0xfff);
      front_addCell(front, nodeIndex, 2, 0xfff);
      front_addCell(front, nodeIndex, 3, 0xfff);
      front_addCell(front, nodeIndex, 4, 0xfff);
      front_setSizeOf(front, nodeIndex, 5);

      // we could skip the add cells and just set the len but let's be nice
      nodeIndex = front_addNode(front);
      front_addCell(front, nodeIndex, 0, 0xfff);
      front_addCell(front, nodeIndex, 1, 0xfff);
      front_addCell(front, nodeIndex, 2, 0xfff);
      front_addCell(front, nodeIndex, 3, 0xfff);
      front_setSizeOf(front, nodeIndex, 4);

      _front_debug(front);
      expect(true).to.eql(true);
    });
  });

  describe('front_getSizeOf', function() {

    it('should exist', function() {
      expect(front_getSizeOf).to.be.a('function');
    });

    it('should report zero for a fresh node', function() {
      let front = front_create();

      expect(front_getSizeOf(front, front.lastNodeIndex)).to.eql(0);
    });

    it('should report zero for a node even when cells are added', function() {
      let front = front_create();
      front_addCell(front, front.lastNodeIndex, 0, 20);
      front_addCell(front, front.lastNodeIndex, 1, 20);

      expect(front_getSizeOf(front, front.lastNodeIndex)).to.eql(0);
    });

    it('should only care about what setSizeOf did', function() {
      let front = front_create(20);
      front_setSizeOf(front, front.lastNodeIndex, 15);

      expect(front_getSizeOf(front, front.lastNodeIndex)).to.eql(15);
    });
  });

  describe('front_setSizeOf', function() {

    it('should exist', function() {
      expect(front_setSizeOf).to.be.a('function');
    });

    it('should not need actual elements to be set', function() {
      let front = front_create(50);
      front_setSizeOf(front, front.lastNodeIndex, 20);

      expect(front_getSizeOf(front, front.lastNodeIndex)).to.eql(20);
    });

    it('should throw if setting length beyond buffer', function() {
      let front = front_create(50);

      expect(_ => front_setSizeOf(front, front.lastNodeIndex, 51)).to.throw('NODE_SHOULD_END_INSIDE_BUFFER');
    });
  });
});
