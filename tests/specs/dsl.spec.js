import expect from '../fixtures/mocha_proxy.fixt';
import preSolver from '../../src/runner';

describe('specs/dsl.spec', function() {

  it('should parse trivial case', function() {
    expect(_ => preSolver(`
      : A *
      A == 5
    `)).not.to.throw();
  });

  it('should work with super small dsl', function() {
    // this should require START+EQ+STOP = 1+4+1 = 6 bytes and input is 4
    expect(_ => preSolver(`
      : A, B *
      nall(A B)
    `)).not.to.throw();
  });

  it('should not try to parse a cop after var EOF', function() {
    // this should require START+EQ+STOP = 1+4+1 = 6 bytes and input is 4
    expect(_ => preSolver(`
      : A, B 0
      A == B`)).not.to.throw(); // deliberately not properly formatted!
  });

  it('should not try to parse a cop after lit EOF', function() {
    // this should require START+EQ+STOP = 1+4+1 = 6 bytes and input is 4
    expect(_ => preSolver(`
      : A *
      A == 5
    `)).not.to.throw();
  });

  it('should not allow var decl after using it implicitly', function() {
    expect(_ => preSolver(`
      A == 5
      : A [0 1]
    `)).to.throw('Dont declare a var after using it');
  });

  describe('isnone', function() {

    it('should exist', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = none?(B C)
      `)).to.throw(/ops: isnone #/);
    });
  });


  describe('islte', function() {

    describe('constants', function() {

      it('should morph boolean constant case v1 to neq', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1]
          : R [0 1]
          R = A <=? 0
          @custom noleaf A R
        `)).to.throw(/ops: neq #/);
      });

      it('should solve boolean constant case v2', function() {
        let solution = preSolver(`
          @custom var-strat throw
          : A [0 1]
          : R [0 1]
          R = A <=? 1
          @custom noleaf A R
        `);

        expect(solution).to.eql({A: [0, 1], R: 1});
      });

      it('should solve boolean constant case v3', function() {
        let solution = preSolver(`
          @custom var-strat throw
          : B [0 1]
          : R [0 1]
          R = 0 <=? B
          @custom noleaf B R
        `);

        expect(solution).to.eql({B: [0, 1], R: 1});
      });

      it('should solve boolean constant case v4', function() {
        let solution = preSolver(`
          @custom var-strat throw
          : B [0 1]
          : R [0 1]
          R = 1 <=? B
          @custom noleaf B R
        `);

        expect(solution).to.eql({B: 0, R: 0});
      });
    });
  });

  describe('custom noleaf', function() {

    it('should NOT eliminate the isall WITH the noleaf hint', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = all?(B C)
        @custom noleaf A
      `)).to.throw(/ops: isall2 #/);
    });

    it('should eliminate the isall without the noleaf hint', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = all?(B C)
        #@custom noleaf A
      `);

      expect(solution).to.eql({A: 0, B: 0, C: [0, 1]});
    });

    it('should NOT eliminate the isalls WITH the noleaf hint', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = all?(B C)
        : D,E,F [0 1]
        D = all?(E F)
        @custom noleaf A, D
      `)).to.throw(/ops: isall2,isall2 #/);
    });

    it('should eliminate the isalls without the noleaf hint', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A,B,C [0 1]
        A = all?(B C)
        : D,E,F [0 1]
        D = all?(E F)
        #@custom noleaf A D
      `);

      expect(solution).to.eql({A: 0, B: 0, C: [0, 1], D: 0, E: 0, F: [0, 1]});
    });
  });

  describe('isall regression', function() {

    it('should properly compile an isall and literal assignment', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B, R [0 1]
        R = all?(A B)
        A = 1
      `);

      expect(solution).to.eql({A: 1, B: 0, R: 0});
    });
  });

  describe('jmp32', function() {

    function test(directive, desc) {
      it('should ' + desc, function() {
        let solution = preSolver(`
          @custom var-strat throw
          : A, B, R [0 1]
          R = all?(A B)
          A = 1
          ${directive}
        `);

        expect(solution).to.eql({A: 1, B: 0, R: 0});
      });
    }

    test('', 'solve base case (without a free directive)');
    test('@custom free 65520', 'properly compile a jump covering 0xfff0');
    test('@custom free 65535', 'properly compile a jump covering 0xffff');
    test('@custom free 65536', 'properly compile a jump covering 0x10000');
    test('@custom free 100000', 'properly compile a jump covering 100k');
  });

  describe('compound anonymous expression regression', function() {

    it('should parse an iseq left without assignment', function() {
      let solution = preSolver(`
        @custom var-strat throw

        : A, B, C [0 10]

        (A ==? B) == C
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 1, __1: 1}); // TODO: remove anon var from test check here
    });

    it('should parse an iseq right without assignment', function() {
      let solution = preSolver(`
        @custom var-strat throw

        : A, B, C [0 10]

        C == (A ==? B)
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 1, __1: 1}); // TODO: remove anon var from test check here
    });

    it('should parse a single compound iseq, compile two iseq but no eq (because alias)', function() {
      expect(_ => preSolver(`
        @custom var-strat throw

        : A, C, X, Y [0 10]

        (A ==? X) == (C ==? Y)

        @custom noleaf A C X
      `)).to.throw(/ops: iseq,iseq #/);
    });

    it('should parse two double compound iseqs, compile four iseq but no eq (because alias)', function() {
      expect(_ => preSolver(`
        @custom var-strat throw

        : A, B, C, D, X, Y [0 10]

        (A ==? X) == (C ==? Y)
        (B ==? X) == (D ==? Y)

        @custom noleaf A B C D X Y

      `)).to.throw(/ops: iseq,iseq,iseq,iseq #/);
    });
  });
});
