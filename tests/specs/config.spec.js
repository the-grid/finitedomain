import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_dom_empty,
  fixt_dom_nums,
  fixt_dom_range,
  fixt_domainEql,
} from '../fixtures/domain.fixt';

import {
  SUB,
  SUP,
} from '../../src/helpers';
import {
  config_addConstraint,
  config_addVarAnonConstant,
  config_addVarAnonNothing,
  config_addVarAnonRange,
  config_addVarConstant,
  config_addVarDomain,
  config_addVarNothing,
  config_addVarRange,
  config_clone,
  config_create,
  config_createVarStratConfig,
  config_setOptions,
  config_setOption,
} from '../../src/config';
import {
  domain__debug,
} from '../../src/domain';

describe('src/config.spec', function() {

  describe('config_addConstraint', function() {

    it('should exist', function() {
      expect(config_addConstraint).to.be.a('function');
    });

    it('should throw for unknown names', function() {
      let config = config_create();
      expect(_ => config_addConstraint(config, 'crap', [])).to.throw('UNKNOWN_PROPAGATOR');
    });

    describe('config_solvedAtCompileTime', function() {

      describe('lt', function() {

        it('should properly solve edge cases A<B', function() {
          let config = config_create();
          let A = config_addVarRange(config, 'A', 0, 10);
          let B = config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'lt', ['A', 'B']);

          fixt_domainEql(config.initialDomains[A], fixt_dom_range(0, 9));
          fixt_domainEql(config.initialDomains[B], fixt_dom_range(1, 10));
        });
      });

      describe('lte', function() {

        it('should properly solve edge cases A<=B', function() {
          let config = config_create();
          let A = config_addVarRange(config, 'A', 0, 10);
          let B = config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'lte', ['A', 'B']);

          fixt_domainEql(config.initialDomains[A], fixt_dom_range(0, 10));
          fixt_domainEql(config.initialDomains[B], fixt_dom_range(0, 10));
        });
      });

      describe('gt', function() {

        it('should properly solve edge cases A>B', function() {
          let config = config_create();
          let A = config_addVarRange(config, 'A', 0, 10);
          let B = config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'gt', ['A', 'B']);

          fixt_domainEql(config.initialDomains[A], fixt_dom_range(1, 10));
          fixt_domainEql(config.initialDomains[B], fixt_dom_range(0, 9));
        });
      });

      describe('gt', function() {

        it('should properly solve edge cases A>=B', function() {
          let config = config_create();
          let A = config_addVarRange(config, 'A', 0, 10);
          let B = config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'gte', ['A', 'B']);

          fixt_domainEql(config.initialDomains[A], fixt_dom_range(0, 10));
          fixt_domainEql(config.initialDomains[B], fixt_dom_range(0, 10));
        });
      });

      describe('reifier', function() {

        function test(op, desc, A, B, C, D, E, F) {
          it(`${domain__debug(A)} ?${op} ${domain__debug(B)} = ${domain__debug(C)} -> ${domain__debug(D)}, ?${op} ${domain__debug(E)} -> ${domain__debug(F)}; ${desc}`, function() {
            let config = config_create();
            let a = config_addVarDomain(config, 'A', A);
            let b = config_addVarDomain(config, 'B', B);
            let c = config_addVarDomain(config, 'C', C);

            config_addConstraint(config, 'reifier', ['A', 'B', 'C'], op);

            fixt_domainEql(config.initialDomains[a], D, 'a=d');
            fixt_domainEql(config.initialDomains[b], E, 'b=e');
            fixt_domainEql(config.initialDomains[c], F, 'c=f');
          });
        }

        describe('?lt', function() {

          test(
            'lt', 'should do nothing if unsolved',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'lt', 'A < min(B): C becomes true',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 10), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'A = min(B): nothing happens',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'lt', 'min(B) < A < max(B): nothing changes', // though B could be pruned...
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'lt', 'A = max(B): C becomes false',
            fixt_arrdom_range(10, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(10, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A > max(B): C becomes false',
            fixt_arrdom_range(11, 11, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(11, 11), fixt_dom_range(0, 10), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'B < min(A): C becomes false',
            fixt_arrdom_range(1, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 10), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'B = min(A): C becomes false',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'min(A) < B < max(A): nothing changes', // though A could be pruned...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(5, 5), fixt_dom_range(0, 1)
          );
          test(
            'lt', 'B = max(A): no change',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(10, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(10, 10), fixt_dom_range(0, 1)
          );
          test(
            'lt', 'B > max(A): C becomes true',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(11, 11, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(11, 11), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'C = 0: nothing changes', // could prune A and B...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'lt', 'C = 1: nothing changes', // could prune A and B...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );

          // ## C = A ?< B
          // A = 0, B = 0, C = bool -> C=0
          // A = 1, B = 0, C = bool -> C=0
          // A = 5, B = 0, C = bool -> C=0
          // A = 0, B = 1, C = bool -> C=1
          // A = 1, B = 1, C = bool -> C=0
          // A = 5, B = 1, C = bool -> C=0
          // A = 0, B = 5, C = bool -> C=1
          // A = 1, B = 5, C = bool -> C=1
          // A = 5, B = 5, C = bool -> C=0
          // A = 0, B = ~, C = 0    -> b>=0
          // A = 1, B = ~, C = 0    -> B>=0
          // A = 5, B = ~, C = 0    -> B>=5
          // A = 0, B = ~, C = 1    -> B>0
          // A = 1, B = ~, C = 1    -> B>1
          // A = 5, B = ~, C = 1    -> B>5
          // A = ~, B = 0, C = 0    -> A>=0
          // A = ~, B = 1, C = 0    -> A>=1
          // A = ~, B = 5, C = 0    -> A>=5
          // A = ~, B = 0, C = 1    -> fail
          // A = ~, B = 1, C = 1    -> A<1
          // A = ~, B = 5, C = 1    -> A<5

          test(
            'lt', 'A=0, B=0: C=0',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=1, B=0: C=0',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=5, B=0: C=0',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=0, B=1: C=1',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'A=1, B=1: C=0',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=5, B=1: C=0',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=0, B=5: C=1',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'A=1, B=5: C=1',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'A=5, B=5: C=0',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=0, C=0: B=0',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=1, C=0: B=0,1',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(1, 1), fixt_dom_range(0, 1), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=5, C=0: B=0,5',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 5), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'A=0, C=1: B=[]',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 10), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'A=1, C=1: B=2,10',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(2, 10), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'A=5, C=1: B=5,10',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(6, 10), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'B=0, C=0: A=0,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'B=1, C=0: A=1,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(1, 10), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'B=5, C=0: A=5,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(5, 10), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'lt', 'B=0, C=1: A=[]',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_empty(), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'B=1, C=1: A=0,0',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'lt', 'B=5, C=1: A=0,4',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 4), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
        });

        describe('?lte', function() {

          test(
            'lte', 'should do nothing if unsolved',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'lte', 'A < min(B): C becomes true',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 10), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'A = min(B): C becomes true',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'min(B) < A < max(B): nothing changes', // though B could be pruned...
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'lte', 'A = max(B): no changes', // though B could become max(B)
            fixt_arrdom_range(10, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(10, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'lte', 'A > max(B): C becomes false',
            fixt_arrdom_range(11, 11, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(11, 11), fixt_dom_range(0, 10), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'B < min(A): C becomes false',
            fixt_arrdom_range(1, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 10), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'B = min(A): no change', // but A could be set to 0
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 0), fixt_dom_range(0, 1)
          );
          test(
            'lte', 'min(A) < B < max(A): nothing changes', // though A could be pruned...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(5, 5), fixt_dom_range(0, 1)
          );
          test(
            'lte', 'B = max(A): C becomes true', // there's no value in A that would invalidate lte
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(10, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(10, 10), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'B > max(A): C becomes true',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(11, 11, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(11, 11), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'C = 0: nothing changes', // could prune A and B...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'lte', 'C = 1: nothing changes', // could prune A and B...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );

          // ## C = A ?<= B
          // A = 0, B = 0, C = bool -> C=1
          // A = 1, B = 0, C = bool -> C=0
          // A = 5, B = 0, C = bool -> C=0
          // A = 0, B = 1, C = bool -> C=1
          // A = 1, B = 1, C = bool -> C=1
          // A = 5, B = 1, C = bool -> C=0
          // A = 0, B = 5, C = bool -> C=0
          // A = 1, B = 5, C = bool -> C=1
          // A = 5, B = 5, C = bool -> C=1
          // A = 0, B = ~, C = 0    -> fail
          // A = 1, B = ~, C = 0    -> B=0
          // A = 5, B = ~, C = 0    -> B<5
          // A = 0, B = ~, C = 1    -> B>=0
          // A = 1, B = ~, C = 1    -> B>=1
          // A = 5, B = ~, C = 1    -> B>=5
          // A = ~, B = 0, C = 0    -> A>0
          // A = ~, B = 1, C = 0    -> A>1
          // A = ~, B = 5, C = 0    -> A>5
          // A = ~, B = 0, C = 1    -> A=0
          // A = ~, B = 1, C = 1    -> A<=1
          // A = ~, B = 5, C = 1    -> A<=5


          test(
            'lte', 'A=0, B=0: C=1',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'A=1, B=0: C=0',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'A=5, B=0: C=0',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'A=0, B=1: C=1',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'A=1, B=1: C=1',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'A=5, B=1: C=0',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'A=0, B=5: C=1',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'A=1, B=5: C=1',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'A=5, B=5: C=1',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );

          test(
            'lte', 'A=0, C=0: B=[]',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 0), fixt_dom_empty(), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'A=1, C=0: B=0',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(1, 1), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'A=5, C=0: B=0,4',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 4), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'A=0, C=1: B=0,10',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'A=1, C=1: B=1,10',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(1, 10), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'A=5, C=1: B=5,10',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(5, 10), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'B=0, C=0: A=1,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(1, 10), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'B=1, C=0: A=2,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(2, 10), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'B=5, C=0: A=6,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(6, 10), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'lte', 'B=0, C=1: A=0',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'B=1, C=1: B=0,1',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 1), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'lte', 'B=5, C=1: B=0,5',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 5), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
        });

        describe('?gt', function() {

          test(
            'gt', 'should do nothing if unsolved',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'gt', 'A < min(B): C becomes false',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 10), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A = min(B): C becomes false',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 10), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'min(B) < A < max(B): nothing changes', // though B could be pruned...
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'gt', 'A = max(B): no change',
            fixt_arrdom_range(10, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(10, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'gt', 'A > max(B): C becomes true',
            fixt_arrdom_range(11, 11, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(11, 11), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'B < min(A): C becomes true',
            fixt_arrdom_range(1, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 10), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'B = min(A): no change',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 0), fixt_dom_range(0, 1)
          );
          test(
            'gt', 'min(A) < B < max(A): nothing changes', // though A could be pruned...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(5, 5), fixt_dom_range(0, 1)
          );
          test(
            'gt', 'B = max(A): C becomes false',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(10, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(10, 10), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'B > max(A): C becomes false',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(11, 11, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(11, 11), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'C = 0: nothing changes', // could prune A and B...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'gt', 'C = 1: nothing changes', // could prune A and B...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );

          // ## C = A ?< B
          // A = 0, B = 0, C = bool -> C=0
          // A = 1, B = 0, C = bool -> C=1
          // A = 5, B = 0, C = bool -> C=1
          // A = 0, B = 1, C = bool -> C=0
          // A = 1, B = 1, C = bool -> C=0
          // A = 5, B = 1, C = bool -> C=1
          // A = 0, B = 5, C = bool -> C=0
          // A = 1, B = 5, C = bool -> C=0
          // A = 5, B = 5, C = bool -> C=0
          // A = 0, B = ~, C = 0    -> B>=0
          // A = 1, B = ~, C = 0    -> B>=1
          // A = 5, B = ~, C = 0    -> B>=5
          // A = 0, B = ~, C = 1    -> fail
          // A = 1, B = ~, C = 1    -> B=0
          // A = 5, B = ~, C = 1    -> B<5
          // A = ~, B = 0, C = 0    -> A=0
          // A = ~, B = 1, C = 0    -> A<=1
          // A = ~, B = 5, C = 0    -> A<=5
          // A = ~, B = 0, C = 1    -> fail
          // A = ~, B = 1, C = 1    -> A>1
          // A = ~, B = 5, C = 1    -> A>5

          test(
            'gt', 'A=0, B=0: C=0',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=1, B=0: C=1',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'A=5, B=0: C=1',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'A=0, B=1: C=0',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=1, B=1: C=0',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=5, B=1: C=1',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'A=0, B=5: C=0',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=1, B=5: C=0',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=5, B=5: C=0',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=0, C=0: B=0,10',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 10), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=1, C=0: B=1,10',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(1, 1), fixt_dom_range(1, 10), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=5, C=0: B=5,10',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(5, 5), fixt_dom_range(5, 10), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'A=0, C=1: B=[]',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 0), fixt_dom_empty(), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'A=1, C=1: B=0',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'A=5, C=1: B=0,4',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 4), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'B=0, C=0: A=0,0',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'B=1, C=0: A=0,1',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 1), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'B=5, C=0: A=0,5',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 5), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'gt', 'B=0, C=1: A=1,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(1, 10), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'B=1, C=1: A=2,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(2, 10), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'gt', 'B=5, C=1: A=6,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(6, 10), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
        });

        describe('?gte', function() {

          test(
            'gte', 'should do nothing if unsolved',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'gte', 'A < min(B): C becomes false',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 10), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'A = min(B): no change',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'gte', 'min(B) < A < max(B): nothing changes', // though B could be pruned...
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'gte', 'A = max(B): C becomes true',
            fixt_arrdom_range(10, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(10, 10), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A > max(B): C becomes true',
            fixt_arrdom_range(11, 11, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(11, 11), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'B < min(A): C becomes true',
            fixt_arrdom_range(1, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 10), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'B = min(A): C becomes true',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'min(A) < B < max(A): nothing changes', // though A could be pruned...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(5, 5), fixt_dom_range(0, 1)
          );
          test(
            'gte', 'B = max(A): no change',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(10, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(10, 10), fixt_dom_range(0, 1)
          );
          test(
            'gte', 'B > max(A): C becomes false',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(11, 11, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(11, 11), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'C = 0: nothing changes', // could prune A and B...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(0, 1)
          );
          test(
            'gte', 'C = 1: nothing changes', // could prune A and B...
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 10), fixt_dom_range(1, 1)
          );

          // ## C = A ?< B
          // A = 0, B = 0, C = bool -> C=1
          // A = 1, B = 0, C = bool -> C=1
          // A = 5, B = 0, C = bool -> C=1
          // A = 0, B = 1, C = bool -> C=0
          // A = 1, B = 1, C = bool -> C=1
          // A = 5, B = 1, C = bool -> C=1
          // A = 0, B = 5, C = bool -> C=0
          // A = 1, B = 5, C = bool -> C=0
          // A = 5, B = 5, C = bool -> C=1
          // A = 0, B = ~, C = 0    -> B>0
          // A = 1, B = ~, C = 0    -> B>1
          // A = 5, B = ~, C = 0    -> B>5
          // A = 0, B = ~, C = 1    -> B=0
          // A = 1, B = ~, C = 1    -> B<=1
          // A = 5, B = ~, C = 1    -> B<=5
          // A = ~, B = 0, C = 0    -> fail
          // A = ~, B = 1, C = 0    -> A<1
          // A = ~, B = 5, C = 0    -> A<5
          // A = ~, B = 0, C = 1    -> A=0
          // A = ~, B = 1, C = 1    -> A>=1
          // A = ~, B = 5, C = 1    -> A>=5

          test(
            'gte', 'A=0, B=0: C=1',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A=1, B=0: C=1',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A=5, B=0: C=1',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A=0, B=1: C=0',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'A=1, B=1: C=1',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A=5, B=1: C=1',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A=0, B=5: C=0',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'A=1, B=5: C=0',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'A=5, B=5: C=1',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A=0, C=0: B=1,10',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 10), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'A=1, C=0: B=2,10',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(1, 1), fixt_dom_range(2, 10), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'A=5, C=0: B=6,10',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(5, 5), fixt_dom_range(6, 10), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'A=0, C=1: B=0',
            fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 0), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A=1, C=1: B=0,1',
            fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(1, 1), fixt_dom_range(0, 1), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'A=5, C=1: B=0,5',
            fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(5, 5), fixt_dom_range(0, 5), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'B=0, C=0: A=[]',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_empty(), fixt_dom_range(0, 0), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'B=1, C=0: A=0,0',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 0), fixt_dom_range(1, 1), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'B=5, C=0: A=0,4',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(0, 0, true),
            fixt_dom_range(0, 4), fixt_dom_range(5, 5), fixt_dom_range(0, 0)
          );
          test(
            'gte', 'B=0, C=1: A=0,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(0, 0, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(0, 10), fixt_dom_range(0, 0), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'B=1, C=1: A=1,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(1, 1, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(1, 10), fixt_dom_range(1, 1), fixt_dom_range(1, 1)
          );
          test(
            'gte', 'B=5, C=1: A=5,10',
            fixt_arrdom_range(0, 10, true), fixt_arrdom_range(5, 5, true), fixt_arrdom_range(1, 1, true),
            fixt_dom_range(5, 10), fixt_dom_range(5, 5), fixt_dom_range(1, 1)
          );
        });
      });
    });
  });

  describe('config_create', function() {

    it('should return an object', function() {
      expect(config_create()).to.be.an('object');
    });
  });

  describe('config_addVarAnonConstant', function() {

    it('should add the value', function() {
      let config = config_create();
      let varIndex = config_addVarAnonConstant(config, 15);

      expect(config.allVarNames[varIndex]).to.be.above(-1);
      expect(config.initialDomains[varIndex]).to.eql(fixt_dom_nums(15));
    });

    it('should populate the constant cache', function() {
      let config = config_create();
      let varIndex = config_addVarAnonConstant(config, 15);

      expect(config.constantCache[15]).to.equal(varIndex);
    });

    it('should reuse the constant cache if available', function() {
      let config = config_create();
      let index1 = config_addVarAnonConstant(config, 1);
      let index2 = config_addVarAnonConstant(config, 2);
      let index3 = config_addVarAnonConstant(config, 1);

      expect(index1).to.not.equal(index2);
      expect(index1).to.equal(index3);
    });
  });

  describe('config_addVarAnonNothing', function() {

    it('should exist', function() {
      expect(config_addVarAnonNothing).to.be.a('function');
    });

    it('should create a new var with max range', function() {
      let config = config_create();

      config_addVarAnonNothing(config);

      expect(config.allVarNames.length).to.equal(1);
      expect(config.initialDomains[0]).to.eql(fixt_dom_range(SUB, SUP));
    });
  });

  describe('config_addVarAnonRange', function() {

    it('should exist', function() {
      expect(config_addVarAnonRange).to.be.a('function');
    });

    it('should throw if hi is missing', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, 15)).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw if lo is missing', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, undefined, 15)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw if lo is an array', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, [15, 30], 15)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let lo = 50;
        let hi = 100;

        config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(lo, hi));
      });

      it('should make a constant if lo=hi', function() {
        let config = config_create();

        let lo = 58778;
        let hi = 58778;

        let varIndex = config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(lo, hi));
        expect(config.constantCache[lo]).to.eql(varIndex);
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let lo = 5;
        let hi = 10;

        config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(lo, hi));
      });

      it('should make a constant if lo=hi', function() {
        let config = config_create();

        let lo = 28;
        let hi = 28;

        let varIndex = config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(lo, hi));
        expect(config.constantCache[lo]).to.eql(varIndex);
      });
    });
  });

  describe('config_addVarConstant', function() {

    it('should exist', function() {
      expect(config_addVarConstant).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', undefined)).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    it('should throw for passing on an array', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', [10, 15])).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', '23')).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = 50;

        config_addVarConstant(config, 'A', value);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(value, value));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = 5;

        config_addVarConstant(config, 'A', value);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(value, value));
      });
    });
  });

  describe('config_addVarDomain', function() {

    it('should exist', function() {
      expect(config_addVarDomain).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarDomain(config, 'A', undefined)).to.throw('DOMAIN_MUST_BE_ARRAY_HERE');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarDomain(config, 'A', '23')).to.throw('DOMAIN_MUST_BE_ARRAY_HERE');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarDomain(config, 'A', fixt_arrdom_range(50, 55));

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(50, 55));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarDomain(config, 'A', fixt_arrdom_range(5, 12, true));

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.equal(fixt_dom_range(5, 12));
      });
    });
  });

  describe('config_addVarNothing', function() {

    it('should exist', function() {
      expect(config_addVarNothing).to.be.a('function');
    });

    it('should throw for missing the name', function() {
      let config = config_create();

      expect(_ => config_addVarNothing(config)).to.throw('VAR_NAMES_SHOULD_BE_STRINGS');
    });

    it('should create a new var with max range', function() {
      let config = config_create();

      config_addVarNothing(config, 'A');

      expect(config.allVarNames).to.eql(['A']);
      expect(config.initialDomains[0]).to.eql(fixt_dom_range(SUB, SUP));
    });
  });

  describe('config_addVarRange', function() {

    it('should exist', function() {
      expect(config_addVarRange).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', undefined)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', '23')).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for missing lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', undefined, 12)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for missing hi', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, undefined)).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw for bad lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', '10', 12)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for bad hi', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, '12')).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw if hi is lower than lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, 10)).to.throw('A_RANGES_SHOULD_ASCEND');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarRange(config, 'A', 50, 55);

        expect(config.allVarNames).to.eql(['A']);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(50, 55));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarRange(config, 'A', 5, 12);

        expect(config.allVarNames).to.eql(['A']);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(5, 12));
      });
    });
  });

  describe('config_setOption', function() {

    it('should exist', function() {
      expect(config_setOption).to.be.a('function');
    });

    it('should set general var strategy', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {type: 'A'});

      expect(config.varStratConfig.type).to.equal('A');
    });

    it('should init the var config of a single level without priorityList', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {type: 'max'});

      expect(config.varStratConfig.type).to.eql('max');
      expect(config.varStratConfig._priorityByIndex).to.equal(undefined);
    });

    it('should init the var config of a single level and a priorityList', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {
        type: 'list',
        priorityList: ['B_list', 'A_list'],
      });

      expect(config.varStratConfig.priorityByName).to.eql(['B_list', 'A_list']);
    });

    it('should init the var config with two fallback levels', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {
        type: 'list',
        priorityList: ['B_list', 'A_list'],
        fallback: {
          type: 'markov',
          fallback: {
            type: 'size',
          },
        },
      });

      expect(config.varStratConfig).to.eql(config_createVarStratConfig({
        type: 'list',
        priorityList: ['B_list', 'A_list'],
        fallback: config_createVarStratConfig({
          type: 'markov',
          fallback: config_createVarStratConfig({
            type: 'size',
          }),
        }),
      }));
    });

    it('should put the priority hash on the var opts even if fallback', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {
        type: 'max',
        fallback: {
          type: 'list',
          priorityList: ['B_list', 'A_list'],
        },
      });

      expect(config.varStratConfig).to.eql(config_createVarStratConfig({
        type: 'max',
        fallback: config_createVarStratConfig({
          type: 'list',
          priorityList: ['B_list', 'A_list'],
        }),
      }));
    });

    it('should throw for some legacy config structs', function() {
      let config = config_create();

      expect(_ => config_setOption(config, 'var', {})).to.throw('REMOVED. Replace `var` with `varStrategy`');
      expect(_ => config_setOption(config, 'varStrategy', _ => 0)).to.throw('functions no longer supported');
      expect(_ => config_setOption(config, 'varStrategy', 'foo')).to.throw('strings should be passed on as');
      expect(_ => config_setOption(config, 'varStrategy', 15)).to.throw('varStrategy should be object');
      expect(_ => config_setOption(config, 'varStrategy', {name: 'foo'})).to.throw('name should be type');
      expect(_ => config_setOption(config, 'varStrategy', {dist_name: 'foo'})).to.throw('dist_name should be type');
      expect(_ => config_setOption(config, 'val', {})).to.throw('REMOVED. Replace `var` with `valueStrategy`');
    });

    it('should copy the targeted var names', function() {
      let config = config_create();
      config_setOption(config, 'targeted_var_names', ['A']);

      expect(config.targetedVars).to.eql(['A']);
    });

    it('should copy the var distribution config', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {valtype: 'B'}, 'A');

      expect(config.varDistOptions).to.eql({A: {valtype: 'B'}});
    });

    it('DEPRECATED; remove once actually obsolete', function() {
      let config = config_create();

      expect(_ => config_setOption(config, 'varStratOverride', {valtype: 'B'}, 'A')).to.throw('deprecated');
    });

    it('should copy the timeout callback', function() {
      let config = config_create();
      config_setOption(config, 'timeoutCallback', 'A');

      expect(config.timeoutCallback).to.equal('A');
    });

    it('should override value strats per var', function() {
      let config = config_create();
      config_setOption(config, 'varStratOverrides', {
        'A': 'foobar',
      });

      expect(config.varDistOptions).to.be.an('object');
      expect(config.varDistOptions.A).to.equal('foobar');
    });

    it('should override value strats per var', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {
        'strat': 'foobar',
      }, 'A');

      expect(config.varDistOptions).to.be.an('object');
      expect(config.varDistOptions.A).to.be.an('object');
      expect(config.varDistOptions.A.strat).to.equal('foobar');
    });

    it('should throw for setting it twice', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {
        'strat': 'foobar',
      }, 'A');

      expect(_ => config_setOption(config, 'varValueStrat', {'another': 'thing'}, 'A')).to.throw('should not be known yet');
    });

    it('should throw for unknown config values', function() {
      let config = config_create();
      expect(_ => config_setOption(config, 'unknown value test', {'strat': 'foobar'}, 'A')).to.throw('unknown option');
    });
  });

  describe('config_setOptions', function() {

    it('should exist', function() {
      expect(config_setOptions).to.be.a('function');
    });

    it('should not require an options object', function() {
      let config = config_create();
      config_setOptions(config);

      expect(true).to.eql(true);
    });

    it('should override the global var strategy', function() {
      let config = config_create();
      config_setOptions(config, {
        varStrategy: {
          type: 'midmax',
        },
      });

      expect(config.varStratConfig.type).to.eql('midmax');
    });

    it('should override the global value strategy', function() {
      let config = config_create();
      expect(config.valueStratName).to.not.eql('mid');

      config_setOptions(config, {valueStrategy: 'mid'});

      expect(config.valueStratName).to.eql('mid');
    });

    it('should override the list of targeted var names', function() {
      let config = config_create();
      expect(config.targetedVars).to.eql('all');

      config_setOptions(config, {targeted_var_names: ['A', 'B']});

      expect(config.targetedVars).to.eql(['A', 'B']);
    });

    it('should override the var-specific strategies for multiple vars', function() {
      let config = config_create();
      expect(config.varDistOptions).to.eql({});

      config_setOptions(config, {varStratOverrides: {
        'A': 'something for a',
        'B': 'something for b',
      }});

      expect(config.varDistOptions).to.eql({
        'A': 'something for a',
        'B': 'something for b',
      });
    });

    it('should override the var-specific strategy for one var', function() {
      let config = config_create();
      expect(config.varDistOptions).to.eql({});

      config_setOptions(config, {varValueStrat: 'max', varStratOverrideName: 'A'});

      expect(config.varDistOptions).to.eql({
        'A': 'max',
      });
    });

    it('DEPRECATED; remove once obsoleted', function() {
      let config = config_create();
      expect(config.varDistOptions).to.eql({});

      config_setOptions(config, {varStratOverride: 'max', varStratOverrideName: 'A'});

      expect(config.varDistOptions).to.eql({
        'A': 'max',
      });
    });

    it('should set the timeout callback', function() {
      let config = config_create();
      config_setOptions(config, {timeoutCallback: function() {}});

      expect(true).to.eql(true);
    });
  });

  describe('config_clone', function() {

    it('should exist', function() {
      expect(config_clone).to.be.a('function');
    });

    it('should clone a config', function() {
      let config = config_create();
      let clone = config_clone(config);

      expect(clone).to.eql(config);
    });

    it('should clone a config with targetedVars as an array', function() {
      let config = config_create();
      let vars = ['a', 'b'];
      config.targetedVars = vars;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(vars);
    });

    it('should clone a config with targetedVars as a string', function() {
      let config = config_create();
      let vars = 'foobala';
      config.targetedVars = vars;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(vars);
    });

    it('should clone a config with targetedVars as an undefined', function() {
      let config = config_create();
      config.targetedVars = undefined;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(undefined);
    });

    it('should accept a new set of new vars', function() {
      let config = config_create();
      let newVars = [];
      let clone = config_clone(config, newVars);

      expect(clone.initialDomains).to.eql(newVars);
    });
  });

  it('should reject a known var', function() {
    let config = config_create();
    config_addVarRange(config, 'again', 0, 10);
    expect(_ => config_addVarRange(config, 'again', 0, 10)).to.throw('Var name already part of this config. Probably a bug?');
  });

  it('should reject number as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, 200, 0, 10)).to.throw('A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  });

  it('should reject zero as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, 0, 0, 10)).to.throw('A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  });

  it('should reject stringified zero as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, '0', 0, 10)).to.throw('DONT_USE_NUMBERS_AS_VAR_NAMES');
  });

  it('should reject adding a number as a var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, '0', 0, 10)).to.throw('DONT_USE_NUMBERS_AS_VAR_NAMES');
  });
});
