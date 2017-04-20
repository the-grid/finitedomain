import expect from '../fixtures/mocha_proxy.fixt';
import preSolver from '../../src/runner';

describe('specs/dsl2ml.spec', function() {

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
      A == B`
    )).not.to.throw(); // deliberately not properly formatted!
  });

  it('should not try to parse a cop after lit EOF', function() {
    // this should require START+EQ+STOP = 1+4+1 = 6 bytes and input is 4
    expect(_ => preSolver(`
      : A *
      A == 5
    `)).not.to.throw();
  });

  describe('whitespace', function() {

    it('should parse a comment after a constraint', function() {
      expect(_ => preSolver(`
        : A [0 10]
        A > 5 # should remove anything 5 and lower
      `)).not.to.throw();
    });

    it('should throw for bad stuff', function() {
      expect(_ => preSolver(`
        : A [0 10]
        A > 5 x # should not have done that
      `)).to.throw('Expected EOL');
    });
  });

  describe('var declarations', function() {

    it('should work', function() {
      expect(_ => preSolver(`
        : A [0 10]
      `)).not.to.throw();
    });

    describe('unquoted var names', function() {

      function numstarttest(n) {
        it('should not start with a number', function() {
          expect(_ => preSolver(`
            : ${n}A [0 10]
          `)).to.throw('Unquoted ident cant start with number');
        });
      }
      for (let i = 0; i < 10; ++i) numstarttest(i);

      it('should work', function() {
        expect(_ => preSolver(`
          : A [0 10]
        `)).not.to.throw();
      });

      it('should see eof case', function() {
        expect(_ => preSolver(`
          : `
        )).to.throw('Expected to parse identifier, found none');
      });
    });

    describe('single quoted var names', function() {

      it('should allow squoted vars', function() {
        expect(_ => preSolver(`
          : 'A B' [0 10]
          'A B' > 5
        `)).not.to.throw();
      });

      it('should throw on eol midway a squoted var', function() {
        expect(_ => preSolver(`
          : 'A
          B' [0 10]
        `)).to.throw('Quoted identifier wasnt closed');
      });

      it('should throw on eof midway a squoted var', function() {
        expect(_ => preSolver(`
          : 'A B`
        )).to.throw('Quoted identifier wasnt closed');
      });

      it('should throw on empty string as var', function() {
        expect(_ => preSolver(`
          : '' [0 10]
        `)).to.throw('Expected to parse identifier, found none');
      });
    });

    describe('alias', function() {

      it('should parse', function() {
        expect(_ => preSolver(`
          : A [0 10] alias(foo)
          A > 5
        `)).not.to.throw();
      });

      it('should support multiple aliases', function() {
        expect(_ => preSolver(`
          : A [0 10] alias(foo) alias(bar)
          A > 5
        `)).not.to.throw();
      });

      it('should throw for alias on multi-decl', function() {
        expect(_ => preSolver(`
          : A, B [0 10] alias(foo)
          A > 5
        `)).to.throw('Cant use alias when declaring multiple vars');
      });

      it('should throw for eol', function() {
        expect(_ => preSolver(`
          : A [0 10] alias(foo
          )
          A > 5
        `)).to.throw('Alias must be closed');
      });

      it('should throw for eof', function() {
        expect(_ => preSolver(`
          : A [0 10] alias(foo`
        )).to.throw('Alias must be closed');
      });

      it('should throw for empty name', function() {
        expect(_ => preSolver(`
          : A [0 10] alias()
        `)).to.throw('Expected to parse identifier');
      });
    });

    describe('modifiers', function() {

      describe('simple ones', function() {

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @max
            A > 5
          `)).to.throw('implement me (var mod)');
        });

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @min
            A > 5
          `)).to.throw('implement me (var mod)');
        });

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @mid
            A > 5
          `)).to.throw('implement me (var mod)');
        });

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @minMaxCycle
            A > 5
          `)).to.throw('implement me (var mod)');
        });

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @naive
            A > 5
          `)).to.throw('implement me (var mod)');
        });

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @splitMax
            A > 5
          `)).to.throw('implement me (var mod)');
        });

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @splitMin
            A > 5
          `)).to.throw('implement me (var mod)');
        });

        it('should throw for unknowns', function() {
          expect(_ => preSolver(`
            : A [0 10] @nope
            A > 5
          `)).to.throw('Expecting a strategy name');
        });
      });

      describe('@list', function() {

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @list prio(5 8 10 1)
            A > 5
          `)).not.to.throw();
        });

        it('should have a list with at least one number', function() {
          expect(_ => preSolver(`
            : A [0 10] @list prio()
            A > 5
          `)).to.throw('Expected to parse a list of at least some numbers');
        });

        it('should @list must have prio', function() {
          expect(_ => preSolver(`
            : A [0 10] @list
            A > 5
          `)).to.throw('Expecting the priorities');
        });
      });

      describe('@markov', function() {

        it('should parse', function() {
          expect(_ => preSolver(`
            : A [0 10] @markov matrix([{vector: [10, 1]}]) legend(1, 0) expand(1)
            A > 5
          `)).to.throw('implement me (var mod)');
        });
      });
    });

    it('should not allow var decl after using it implicitly', function() {
      expect(_ => preSolver(`
        A == 5
        : A [0 1]
      `)).to.throw('Dont declare a var after using it');
    });
  });

  describe('constraints', function() {

    describe('isnone', function() {

      it('should exist', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = none?(B C)
        `)).to.throw(/ops: isnone #/);
      });
    });

    describe('distinct', function() {

      it('should require at least a vexpr', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          distinct()
        `)).to.throw('Expecting at least one expression');
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
          expect(_ => preSolver(`
            @custom var-strat throw
            : A [0 1]
            : R [0 1]
            R = A <=? 1
            @custom noleaf A R
          `)).not.to.throw();
        });

        it('should solve boolean constant case v3', function() {
          expect(_ => preSolver(`
            @custom var-strat throw
            : B [0 1]
            : R [0 1]
            R = 0 <=? B
            @custom noleaf B R
          `)).not.to.throw();
        });

        it('should solve boolean constant case v4', function() {
          expect(_ => preSolver(`
            @custom var-strat throw
            : B [0 1]
            : R [0 1]
            R = 1 <=? B
            @custom noleaf B R
          `)).not.to.throw();
        });
      });
    });

    describe('isall regression', function() {

      it('should properly compile an isall and literal assignment', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, R [0 1]
          R = all?(A B)
          A = 1
        `)).not.to.throw();
      });
    });

    describe('sum', function() {

      it('should parse trivial case', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 10]
          : B [20 30]
          : C [59 100]
          : D [100, 110]
          D = sum(A B C)
          @custom noleaf A B C
        `)).to.throw(/strat=throw/);
      });
    });

    describe('jmp32', function() {

      function test(directive, desc) {
        it('should ' + desc, function() {
          expect(_ => preSolver(`
            @custom var-strat throw
            : A, B, R [0 1]
            R = all?(A B)
            A = 1
            ${directive}
          `)).not.to.throw();
        });
      }

      test('', 'solve base case (without a free directive)');
      test('@custom free 65520', 'properly compile a jump covering 0xfff0');
      test('@custom free 65535', 'properly compile a jump covering 0xffff');
      test('@custom free 65536', 'properly compile a jump covering 0x10000');
      test('@custom free 100000', 'properly compile a jump covering 100k');
    });

    describe('group', function() {

      it('should init the anonymous vars of grouped constraints properly', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 10]
          (A ==? B) != (A + B)
        `)).to.throw(/domain state: 0:A:0,10: 1:B:0,10: 2:__1:0,1: 3:__2:0,20 ops: iseq,neq,plus #/);
        // note: __1 and __2 should be bool and something non-bool
      });

      it('should init the anonymous vars of grouped constraints properly', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 10]
          C = (A + B)
        `)).to.throw(/ops: plus #/);
        // note: __1 and __2 should be bool and something non-bool
      });

      it('should allow wrapped single vexpr', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 10]
          C = (A)
        `)).not.to.throw();
      });

      it('should detect open ended group at eol', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 10]
          C = (A
        `)).to.throw('expecting right paren or rop');
      });

      it('should detect open ended group at eof', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 10]
          C = (A`
        )).to.throw('expecting right paren or rop');
      });

      it('should detect bad rop', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 10]
          C = (A % B)
        `)).to.throw('expecting right paren or rop');
      });
    });

    describe('lists/args', function() {

      it('should create a default parameter for lists', function() {
        expect(_ => preSolver(`
          : A,B,C [0 10]
          R = sum(A B C)
        `)).not.to.throw();
      });

      it('should create a nonbool default parameter for lists', function() {
        expect(_ => preSolver(`
          : A,B,C [0 10]
          (sum(A B C)) > 10
          @custom var-strat throw
        `)).to.throw(/ops: sum #/);
      });

      it('should create a bool default parameter for lists v1', function() {
        expect(_ => preSolver(`
          : A,B,C [0 10]
          (A ==? B) != C
          @custom var-strat throw
          @custom noleaf A B C
        `)).to.throw(/ops: iseq,neq #/);
      });

      it('should create a bool default parameter for lists v2', function() {
        expect(_ => preSolver(`
          : A,B,C [0 10]
          C != (A ==? B)
          @custom var-strat throw
          @custom noleaf A B C
        `)).to.throw(/ops: iseq,neq #/);
      });

      it('should create a bool default parameter for lists v3', function() {
        expect(_ => preSolver(`
          : A,B,C [0 10]
          C != (all?(A B))
          @custom var-strat throw
          @custom noleaf A B C
        `)).to.throw(/ops: isall2,neq #/);
      });
    });

    describe('edge cases', function() {

      it('should allow a simple identifier at eof', function() {
        expect(_ => preSolver(`
          : A [0 10]
          A`
        )).not.to.throw();
      });

      it('should allow a simple literal at eof', function() {
        expect(_ => preSolver(`
          : A [0 10]
          15`
        )).not.to.throw();
      });

      it('should allow a simple domain at eof', function() {
        expect(_ => preSolver(`
          : A [0 10]
          [0 10]`
        )).not.to.throw();
      });

      it('should allow a complex expression at eof', function() {
        expect(_ => preSolver(`
          : A [0 10]
          A > 5`
        )).not.to.throw();
      });

      it('should allow an identifier at eof', function() {
        expect(_ => preSolver(`
          : A [0 10]
          A > 5`
        )).not.to.throw();
      });

      it('should allow a domain at eof', function() {
        expect(_ => preSolver(`
          : A [0 10]
          A > [0 5]`
        )).not.to.throw();

        expect(_ => preSolver(`
          : A [0 10]
          A > [0 5]`
        )).not.to.throw();
      });

      it('should detect bad op', function() {
        expect(_ => preSolver(`
          : A [0 10]
          A +- B
        `)).to.throw('Unknown cop');
      });

      it('should init reifier anon R to bool ==?', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = A ==? B
        `)).not.to.throw();
      });

      it('should init reifier anon R to bool !=?', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = A !=? B
        `)).not.to.throw();
      });

      it('should init reifier anon R to bool <?', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = A <? B
        `)).not.to.throw();
      });

      it('should init reifier anon R to bool <=?', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = A <=? B
        `)).not.to.throw();
      });

      it('should init reifier anon R to bool all?', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = all?(A B)
        `)).not.to.throw();
      });

      it('should init reifier anon R to bool nall?', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = nall?(A B)
        `)).not.to.throw();
      });

      it('should init reifier anon R to bool none?', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = none?(A B)
        `)).to.throw(/ops: isnone #/); // TODO: add a cutter for isnone..?
      });

      it('should expect a full != when cop is just a !', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          A ! B
        `)).to.throw('Unknown cop that starts');
      });

      it('should not allow a comment where a cop is expected', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          A # no
        `)).to.throw('Expected to parse a cop but found a comment');
      });

      it('should detect eof when parsing a cop', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          A !`
        )).to.throw('Unknown cop that starts');
      });

      it('should allow eof after a single vexpr', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          A`
        )).not.to.throw();
      });

      it('should expect a full !=? when rop is just a !', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = A ! B
        `)).to.throw('middle part of !=? op');
      });

      it('should not allow single = as rop', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = A = B
        `)).to.throw('expected a result op');
      });

      it('should handle unknown rop', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          R = A % B
        `)).to.throw('Unknown result op parsed');
      });

      it('should handle eof at unknown cop', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          A !`
        )).to.throw('Unknown cop that starts');
      });

      it('should handle unknown cop', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B [0 1]
          A % B
        `)).to.throw('Unknown cop');
      });

      it('should allow commas in list ops', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 1]
          A = all?(B, C)
        `)).not.to.throw();
      });

      it('should throw for unknown list ops', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 1]
          A = even?(B, C)
        `)).to.throw('Unknown constraint func');
      });

      // cant prevent this due to parsing constraints. so be it.
      //it('should throw for unknown vars where they should be known 1', function() {
      //  expect(_ => preSolver(`
      //    @custom var-strat throw
      //    : A, C [0 1]
      //    B == C
      //  `)).to.throw('???');
      //});

      it('should throw for unknown vars where they should be known 2', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, C [0 1]
          C == B
        `)).to.throw('unknown var');
      });

      it('should throw for unknown vars where they should be known 3', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, C [0 1]
          A = B ==? C
        `)).to.throw('unknown var');
      });

      it('should throw for unknown vars where they should be known 4', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, C [0 1]
          A = C !=? B
        `)).to.throw('unknown var');
      });
    });

    describe('compound anonymous expression regression', function() {

      it('should parse an iseq left without assignment', function() {
        expect(_ => preSolver(`
          @custom var-strat throw

          : A, B, C [0 10]

          (A ==? B) == C
        `)).not.to.throw();
      });

      it('should parse an iseq right without assignment', function() {
        expect(_ => preSolver(`
          @custom var-strat throw

          : A, B, C [0 10]

          C == (A ==? B)
        `)).not.to.throw();
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

  describe('domains', function() {

    describe('square bracketed', function() {

      it('should parse range [0 10]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 10]
        `)).not.to.throw();
      });

      it('should parse range with comma [0, 10]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0, 10]
        `)).not.to.throw();
      });

      it('should parse range with double wrap [[0 10]]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [[0, 10]]
        `)).not.to.throw();
      });

      it('should parse two ranges [0 10 20 30]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 10 20 30]
        `)).not.to.throw();
      });

      it('should parse two ranges [0 10, 20 30]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 10, 20 30]
        `)).not.to.throw();
      });

      it('should parse two ranges double wrapped [[0 10] [20 30]]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [[0 10] [20 30]]
        `)).not.to.throw();
      });

      it('should parse two ranges double wrapped with comma [[0 10], [20 30]]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [[0 10], [20 30]]
        `)).not.to.throw();
      });

      it('should parse two ranges double wrapped with comma [[0, 10], [20, 30]]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [[0, 10], [20, 30]]
        `)).not.to.throw();
      });

      it('should not accepted mixed bracketing style [[0 1] 3 4]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [[0 1] 3 4]
        `)).to.throw('Expected domain-end');
      });

      it('should not accepted mixed bracketing style [0 1 [3 4]]', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1 [3 4]]
        `)).to.throw('Expecting to parse a number');
      });

      it('should not accepted weird stuff', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [#0 1 [3 4]]
        `)).to.throw('Expecting to parse a number but did not find any digits');
      });

      it('should throw for unknown domain starts', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A nope [0 10]
        `)).to.throw('Expecting valid domain start');
      });
    });
  });

  describe('@custom', function() {

    it('should allow an optional equal', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        @custom noleaf = A
      `)).not.to.throw();
    });

    it('should throw for unknown custom names', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        @custom failme X
      `)).to.throw('Unsupported custom rule');
    });

    it('should throw for unknown at names', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        @doesnt exist
      `)).to.throw('Unknown @ rule');
    });

    it('@custom with comment eof', function() { // tofix
      expect(_ => preSolver(`
      : A, B, C 1
      @custom noleaf A B C # this is the end`)).not.to.throw();
    });

    it('@custom with comment eol', function() { // tofix
      expect(_ => preSolver(`
        : A, B, C 1
        @custom noleaf A B C # this is the end
      `)).not.to.throw();
    });

    describe('var-strat', function() {

      it('should support var-strat', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1]
          @custom val-strat = A
        `)).not.to.throw();
      });

      it('should parse the json contents', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1]
          @custom var-strat = {"_class":"$var_strat_config","type":"naive","inverted":false}
        `)).not.to.throw();
      });

      it('should throw for bad json contents', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1]
          @custom var-strat = {'a':"single quotes are not json"}
        `)).to.throw('JSON');
      });

      it('should accept just an identifier', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1]
          @custom var-strat justaname
        `)).not.to.throw();
      });
    });

    describe('set-valdist', function() {

      it('should not support set-valdist yet', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1]
          @custom set-valdist A {"valtype":"markov","matrix":[{"vector":[1,10000,1,1]}],"legend":[1,2,3,4]}
        `)).to.throw('implement me (var mod) [markov]');
      });

      it('should require valid json', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1]
          @custom set-valdist A {'a':1}
        `)).to.throw('JSON');
      });

      it('should set it twice', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 1]
          @custom set-valdist A {"valtype":"markov","matrix":[{"vector":[1,10000,1,1]}],"legend":[1,2,3,4]}
          @custom set-valdist C {"valtype":"markov","matrix":[{"vector":[1,10000,1,1]}],"legend":[1,2,3,4]}
        `)).to.throw('implement me (var mod) [markov]');
      });

      it('should allow optional eq sign', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C [0 1]
          @custom set-valdist A = {"valtype":"markov","matrix":[{"vector":[1,10000,1,1]}],"legend":[1,2,3,4]}
        `)).to.throw('implement me (var mod) [markov]');
      });
    });

    describe('noleaf', function() {

      it('should NOT eliminate the isall WITH the noleaf hint', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(B C)
          @custom noleaf A B C
        `)).to.throw(/ops: isall2 #/);
      });

      it('should eliminate the isall without the noleaf hint', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(B C)
          @custom noleaf B C
        `)).not.to.throw();
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
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(B C)
          : D,E,F [0 1]
          D = all?(E F)
          #@custom noleaf A D
        `)).not.to.throw();
      });

      it('should require at least one ident', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(B C)
          @custom noleaf
        `)).to.throw('Expected to parse a list of at least some identifiers');
      });

      it('should not allow a leading comma', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(B C)
          @custom noleaf , A
        `)).to.throw('Leading comma not supported');
      });
    });

    describe('targets', function() {

      it('should parse an ident list', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(B C)
          @custom targets(B C)
        `)).not.to.throw();
      });

      it('should allow optional commas', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(B , C)
          @custom targets(B C)
        `)).not.to.throw();
      });

      it('should require at least one ident', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets()
        `)).to.throw('Expected to parse a list of at least some identifiers');
      });

      it('should not allow a leading comma', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(, A B C)
        `)).to.throw('Leading comma not supported');
      });

      it('should not allow a trailing comma at eol', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(A,
        `)).to.throw('Expected to parse identifier');
      });

      it('should not allow a backtoback commas', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(A,,B)
        `)).to.throw('Double comma not supported');
      });

      it('should not allow a backtoback comma at eol', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(A,,
        `)).to.throw('Double comma not supported');
      });

      it('should not allow a trailing comma at eol', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(A,B,
        `)).to.throw('Expected to parse identifier');
      });

      it('should not allow a trailing comma at eof', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(A,B,`
        )).to.throw('Trailing comma not supported');
      });

      it('should not allow a backtoback comma at eof', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(A,,`
        )).to.throw('Double comma not supported');
      });

      it('should expect paren at eol', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(A,B
        `)).to.throw('Missing target char at eol/eof');
      });

      it('should expect paren at eof', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A,B,C [0 1]
          A = all?(A B C)
          @custom targets(A,B`
        )).to.throw('Missing target char at eol/eof');
      });

      it('should allow = sign for `all`', function() {
        expect(_ => preSolver(`
          : A 1
          @custom targets = all
        `)).not.to.throw();
      });

      it('should not allow a double = sign', function() {
        expect(_ => preSolver(`
          : A 1
          @custom targets = = all
        `)).to.throw('Unexpected double eq sign');
      });

      it('should not require = sign for `all`', function() {
        expect(_ => preSolver(`
          : A 1
          @custom targets all
        `)).not.to.throw();
      });

      it('should allow = for parens', function() {
        expect(_ => preSolver(`
          : A,B,C [0 1]
          @custom targets = (A,B)
        `)).not.to.throw('iets');
      });
    });

    describe('free', function() {

      it('should allow free 0', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A 1
          @custom free 0
        `)).not.to.throw();
      });

      it('should allow free 1000', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A 1
          @custom free 1000
        `)).not.to.throw();
      });

      it('should allow free 100000', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A 1
          @custom free 100000
        `)).not.to.throw();
      });
    });
  });
});
