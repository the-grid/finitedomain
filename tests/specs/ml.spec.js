import expect from '../fixtures/mocha_proxy.fixt';
import preSolver from '../../src/runner';
import {
  ML_LTE,
  ML_JMP,
  ML_START,
  ML_STOP,

  ml_enc8,
  ml_enc16,
  ml_getRecycleOffset,
  ml_heapSort16bitInline,
  ml_recycleVV,
} from '../../src/ml';

describe('specs/ml.spec', function() {

  describe('AND', function() {

    function test(A, B, r) {
      it(`should work: ${A} & ${B} = ${JSON.stringify(r)}`, function() {
        let solution = preSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A & B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 1, B: 1});
    test('0', '[0 1]', false);
    test('[0 1]', '0', false);
    test('1', '[0 1]', {A: 1, B: 1});
    test('[0 1]', '1', {A: 1, B: 1});
    test('0', '0', false);
    test('0', '1', false);
    test('1', '0', false);
    test('1', '1', {A: 1, B: 1});
    test('[5 10]', '1', {A: [5, 10], B: 1});
    test('1', '[5 10]', {A: 1, B: [5, 10]});
    test('[5 10]', '0', false);
    test('0', '[5 10]', false);
    test('[10 20]', '[5 10]', {A: [10, 20], B: [5, 10]});
  });

  describe('OR', function() {

    function test(A, B, r) {
      it(`should work: ${A} | ${B} = ${JSON.stringify(r)}`, function() {
        let solution = preSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A | B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 1, B: [0, 1]}); // note: it will defer A and force solve B to min before solving A
    test('0', '[0 1]', {A: 0, B: 1});
    test('[0 1]', '0', {A: 1, B: 0});
    test('1', '[0 1]', {A: 1, B: [0, 1]});
    test('[0 1]', '1', {A: [0, 1], B: 1});
    test('0', '0', false);
    test('0', '1', {A: 0, B: 1});
    test('1', '0', {A: 1, B: 0});
    test('1', '1', {A: 1, B: 1});
    test('[5 10]', '1', {A: [5, 10], B: 1});
    test('1', '[5 10]', {A: 1, B: [5, 10]});
    test('[5 10]', '0', {A: [5, 10], B: 0});
    test('0', '[5 10]', {A: 0, B: [5, 10]});
    test('[10 20]', '[5 10]', {A: [10, 20], B: [5, 10]});
  });

  describe('XOR', function() {

    function test(A, B, r) {
      it(`should work: ${A} ^ ${B} = ${JSON.stringify(r)}`, function() {
        let solution = preSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A ^ B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 1, B: 0}); // note: it will defer A and force solve B to min before solving A
    test('0', '[0 1]', {A: 0, B: 1});
    test('[0 1]', '0', {A: 1, B: 0});
    test('1', '[0 1]', {A: 1, B: 0});
    test('[0 1]', '1', {A: 0, B: 1});
    test('0', '0', false);
    test('0', '1', {A: 0, B: 1});
    test('1', '0', {A: 1, B: 0});
    test('1', '1', false);
    test('[5 10]', '1', false);
    test('1', '[5 10]', false);
    test('[5 10]', '0', {A: [5, 10], B: 0});
    test('0', '[5 10]', {A: 0, B: [5, 10]});
    test('[10 20]', '[5 10]', false);
  });

  describe('NAND', function() {

    function test(A, B, r) {
      it(`should work: ${A} !& ${B} = ${JSON.stringify(r)}`, function() {
        let solution = preSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A !& B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 0, B: [0, 1]}); // note: it will defer A and force solve A to min before solving B
    test('0', '[0 1]', {A: 0, B: [0, 1]});
    test('[0 1]', '0', {A: [0, 1], B: 0});
    test('1', '[0 1]', {A: 1, B: 0});
    test('[0 1]', '1', {A: 0, B: 1});
    test('0', '0', {A: 0, B: 0});
    test('0', '1', {A: 0, B: 1});
    test('1', '0', {A: 1, B: 0});
    test('1', '1', false);
    test('[5 10]', '1', false);
    test('1', '[5 10]', false);
    test('[5 10]', '0', {A: [5, 10], B: 0});
    test('0', '[5 10]', {A: 0, B: [5, 10]});
    test('[10 20]', '[5 10]', false);
  });

  describe('XNOR', function() {

    function test(A, B, r) {
      it(`should work: ${A} !^ ${B} = ${JSON.stringify(r)}`, function() {
        let solution = preSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A !^ B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 1, B: 1});
    test('0', '[0 1]', {A: 0, B: 0});
    test('[0 1]', '0', {A: 0, B: 0});
    test('1', '[0 1]', {A: 1, B: 1});
    test('[0 1]', '1', {A: 1, B: 1});
    test('0', '0', {A: 0, B: 0});
    test('0', '1', false);
    test('1', '0', false);
    test('1', '1', {A: 1, B: 1});
    test('[5 10]', '1', {A: [5, 10], B: 1});
    test('1', '[5 10]', {A: 1, B: [5, 10]});
    test('[5 10]', '0', false);
    test('0', '[5 10]', false);
    test('[10 20]', '[5 10]', {A: [10, 20], B: [5, 10]});
  });

  it('should parse literals in the math ops', function() {
    let solution = preSolver(`
      @custom var-strat throw
      : A [0 1]
      : B [0 1]
      : C [0 1]

      A = B + C
      1 = B + C
      A = 1 + C
      A = B + 1
      1 = 1 + C
      A = 1 + 1
      1 = B + 1
      1 = 1 + 1

      A = B - C
      1 = B - C
      A = 1 - C
      A = B - 1
      1 = 1 - C
      A = 1 - 1
      1 = B - 1
      1 = 1 - 1

      A = B * C
      1 = B * C
      A = 1 * C
      A = B * 1
      1 = 1 * C
      A = 1 * 1
      1 = B * 1
      1 = 1 * 1

      A = B / C
      1 = B / C
      A = 1 / C
      A = B / 1
      1 = 1 / C
      A = 1 / 1
      1 = B / 1
      1 = 1 / 1
    `);

    expect(solution).to.eql(false);
  });

  describe('regular assignment', function() {

    it('regression; parser was blackholing literal assignments', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : C [1 2]
        A = 0
        C = 2
      `);

      expect(solution).to.eql({A: 0, C: 2});
    });

    it('regression; parser was blackholing regular assignments', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 10]
        : C 2
        A = C
      `);

      expect(solution).to.eql({A: 2, C: 2});
    });

    it('should not ignore unsolvable sum assignment', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 10]
        A = sum(1 2 3 20)
      `);

      expect(solution).to.eql(false);
    });

    it('should not ignore solvable sum assignment', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 50]
        A = sum(1 2 3 20)
      `);

      expect(solution).to.eql({A: 26});
    });
  });

  describe('all nall', function() {

    it('should support nall', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        nall(A B C)
      `)).to.throw(/debug: 3 vars, 1 constraints, current domain state: 0:A:0,1: 1:B:0,1: 2:C:0,1 ops: nall #/); // if this fails check if its just the message
    });

    it('should support isall', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        D = all?(A B C)
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], D: 0});
    });

    it('should support isnall', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        D = nall?(A B C)
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], D: 1});
    });
  });

  describe('eq reifier with booleanesque', function() {

    it('should work when result is bool (C=0)', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [15 20]
        : C [0 1]
        C = A ==? B
      `);

      expect(solution).to.eql({A: [5, 10], B: [15, 20], C: 0});
    });

    it('should work when result is bool (C=1)', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [0 1]
        C = A ==? B
      `);

      expect(solution).to.eql({A: 5, B: 5, C: 1});
    });

    it('should work when result is [0 10] (C=0)', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [15 20]
        : C [0 10]
        C = A ==? B
      `);

      expect(solution).to.eql({A: [5, 10], B: [15, 20], C: 0});
    });

    it('should work when result is [0 10] (C=1)', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [0 10]
        C = A ==? B
      `);

      expect(solution).to.eql({A: 5, B: 5, C: [1, 10]});
    });

    it('should work when result is two values without 1 (C=0)', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [15 20]
        : C [0 0 4 4]
        C = A ==? B
      `);

      expect(solution).to.eql({A: [5, 10], B: [15, 20], C: 0});
    });

    it('should work when result is two values without 1 (C=4)', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [0 0 4 4]
        C = A ==? B
      `);

      expect(solution).to.eql({A: 5, B: 5, C: 4});
    });

    it('should work when result is [0 0] v1', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [15 20]
        : C [0 0]
        C = A ==? B
      `);

      expect(solution).to.eql({A: [5, 10], B: [15, 20], C: 0});
    });

    it('should work when result is [0 0] v2', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [0 0]
        C = A ==? B
      `);

      expect(solution).to.eql({A: [6, 10], B: 5, C: 0});
    });

    it('should work when result is [1 10] v1', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 16]
        : B [15 20]
        : C [1 10]
        C = A ==? B
      `);

      expect(solution).to.eql({A: 15, B: 15, C: [1, 10]});
    });

    it('should work when result is [1 10] v2', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [1 10]
        C = A ==? B
      `);

      expect(solution).to.eql({A: 5, B: 5, C: [1, 10]});
    });

    it('should work when result is [5 10] v1', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 16]
        : B [15 20]
        : C [5 10]
        C = A ==? B
      `);

      expect(solution).to.eql({A: 15, B: 15, C: [5, 10]});
    });

    it('should work when result is [5 10] v2', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [5 10]
        C = A ==? B
      `);

      expect(solution).to.eql({A: 5, B: 5, C: [5, 10]});
    });
  });

  describe('ml_heapSort16bitInline', function() {

    it('should work with empty buffer', function() {
      let buf = new Buffer(0);
      ml_heapSort16bitInline(buf, 0, 0);

      expect(buf).to.eql(new Buffer(0));
    });

    it('should work with empty list', function() {
      let buf = Buffer.from('foobar', 'binary');
      ml_heapSort16bitInline(buf, 0, 0);

      expect(buf).to.eql(Buffer.from('foobar', 'binary')); // [ar, fo, ob], unchanged because len=0
    });

    it('should sort the foobar', function() {
      let buf = Buffer.from('foobar', 'binary');
      ml_heapSort16bitInline(buf, 0, 3);

      expect(buf).to.eql(Buffer.from('arfoob', 'binary')); // [ar, fo, ob]
    });

    it('should sort the foobar offset 1 till end', function() {
      let buf = Buffer.from('\xfffoobar', 'binary');
      ml_heapSort16bitInline(buf, 1, 3);

      expect(buf).to.eql(Buffer.from('\xffarfoob', 'binary')); // [255, ar, fo, ob]
    });

    it('should sort the foobar offset 1 with suffix', function() {
      let buf = Buffer.from('\xfffoobar\xfe', 'binary');
      ml_heapSort16bitInline(buf, 1, 3);

      expect(buf).to.eql(Buffer.from('\xffarfoob\xfe', 'binary')); // [255, ar, fo, ob, 254]
    });

    it('should sort the sum args in this regression', function() {
      let buf = Buffer.from('\x18\x20\x17\x9b\x17\x62\x17\xc1\x17\xe7\x17\xfa\x17\x75\x17\x88', 'binary');
      ml_heapSort16bitInline(buf, 0, 8);

      expect(buf).to.eql(Buffer.from('\x17\x62\x17\x75\x17\x88\x17\x9b\x17\xc1\x17\xe7\x17\xfa\x18\x20', 'binary'));
    });

    it('should not copy child value to parent value in heap sort', function() {
      let buf = Buffer.from('\x00\x06\x00\x03\x00\x01\x00\x04\x00\x05\x00\x02', 'binary');
      ml_heapSort16bitInline(buf, 0, 6);

      // it's mainly testing a a regression
      expect(buf).to.eql(Buffer.from('\x00\x01\x00\x02\x00\x03\x00\x04\x00\x05\x00\x06', 'binary'));
    });
  });

  describe('recycle', function() {

    it('should get an empty offset of exact requested size', function() {
      let ml = new Buffer(7);
      ml_enc8(ml, 0, ML_START);
      ml_enc8(ml, 1, ML_JMP);
      ml_enc16(ml, 2, 2);
      ml_enc8(ml, 6, ML_STOP);
      let offset = ml_getRecycleOffset(ml, 0, 5);

      // note: the first will be considered ML_START so the next will be targeted
      expect(offset).to.eql(1);
    });

    it('should get an empty offset even if its bigger', function() {
      let ml = new Buffer(7);
      ml_enc8(ml, 0, ML_START);
      ml_enc8(ml, 1, ML_JMP);
      ml_enc16(ml, 2, 2);
      ml_enc8(ml, 6, ML_STOP);
      let offset = ml_getRecycleOffset(ml, 0, 5);

      // note: the first will be considered ML_START so the next will be targeted
      expect(offset).to.eql(1);
    });

    it('should fail if there is no empty offset', function() {
      let ml = new Buffer(10);
      ml_enc8(ml, 0, ML_START);
      ml_enc8(ml, 1, ML_JMP);
      ml_enc16(ml, 2, 5);
      ml_enc8(ml, 9, ML_STOP);
      let offset = ml_getRecycleOffset(ml, 0, 9);

      // since the first viable offset would be pos=1 and that only has 9 spaces, the search should fail
      expect(offset).to.eql(undefined);
    });

    it('should skip an offset if its too small and still return the next one if its big enough', function() {
      let ml = new Buffer(30);
      ml_enc8(ml, 0, ML_START);
      ml_enc8(ml, 1, ML_JMP);
      ml_enc16(ml, 2, 5);
      ml_enc8(ml, 9, ML_JMP);
      ml_enc16(ml, 10, 18);
      ml_enc8(ml, 29, ML_STOP);
      let offset = ml_getRecycleOffset(ml, 0, 9);

      // since the first viable offset would be pos=1 and that only has 9 spaces, the search should fail
      expect(offset).to.eql(9);
    });
  });

  describe('ml_recycleVV', function() {

    it('should compile an lte', function() {
      let init = new Buffer(30);
      init.fill(0);
      ml_enc8(init, 0, ML_START);
      ml_enc8(init, 1, ML_JMP);
      ml_enc16(init, 2, 5);
      ml_enc8(init, 9, ML_JMP);
      ml_enc16(init, 10, 17);
      ml_enc8(init, 29, ML_STOP);

      // the recycle should get the second jump (len=3+17), then use that to compile in a LTE (len=5) and a jump for the remaining space (len=3+12)
      let expected = Buffer.from(init);
      ml_enc8(expected, 9, ML_LTE);
      ml_enc16(expected, 10, 1);
      ml_enc16(expected, 12, 2);
      ml_enc8(expected, 14, ML_JMP);
      ml_enc16(expected, 15, 12);

      //console.log('------ start');
      let ml = Buffer.from(init);
      let offset = ml_getRecycleOffset(ml, 0, 9);
      ml_recycleVV(ml, offset, ML_LTE, 1, 2);

      //console.log('');
      //console.log('init:', init);
      //console.log('have:', ml);
      //console.log('want:', expected);

      // since the first viable offset would be pos=1 and that only has 9 spaces, the search should fail
      expect(ml).to.eql(expected);
    });

    it('should compile two ltes', function() {
      let init = new Buffer(30);
      init.fill(0);
      ml_enc8(init, 0, ML_START);
      ml_enc8(init, 1, ML_JMP);
      ml_enc16(init, 2, 5);
      ml_enc8(init, 9, ML_JMP);
      ml_enc16(init, 10, 17);
      ml_enc8(init, 29, ML_STOP);

      // the recycle should get the second jump (len=3+17), then use that to compile in a LTE (len=5) and a jump for the remaining space (len=3+12)
      let expected = Buffer.from(init);
      ml_enc8(expected, 9, ML_LTE);
      ml_enc16(expected, 10, 1);
      ml_enc16(expected, 12, 2);
      ml_enc8(expected, 14, ML_LTE);
      ml_enc16(expected, 15, 1);
      ml_enc16(expected, 17, 2);
      ml_enc8(expected, 19, ML_JMP);
      ml_enc16(expected, 20, 7);

      //console.log('------ start');
      let ml = Buffer.from(init);
      let offset = ml_getRecycleOffset(ml, 0, 9);
      ml_recycleVV(ml, offset, ML_LTE, 1, 2);
      ml_recycleVV(ml, offset + 5, ML_LTE, 1, 2);

      //console.log('');
      //console.log('init:', init);
      //console.log('have:', ml);
      //console.log('want:', expected);

      // since the first viable offset would be pos=1 and that only has 9 spaces, the search should fail
      expect(ml).to.eql(expected);
    });
  });
});
