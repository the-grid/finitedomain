import setup from '../../fixtures/helpers.spec';
import {
  specDomainCreateBool,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateValue,
  specDomainCreateZero,
} from '../../fixtures/domain.spec';
import {
  expect,
  assert,
} from 'chai';

import {
  config_addConstant,
  config_addPropagator,
  config_addVar,
  config_addVarAnon,
  config_addVarsA,
  config_addVarsO,
  config_clone,
  config_create,
  config_generateVars,
  config_getUnknownVars,
  config_createWith,
  config_setDefaults,
  config_setOptions,
  config_addVarValue,
  config_initConfigsAndFallbacks,
} from '../../src/config';
import {
  fdvar_create,
  fdvar_create_range,
} from '../../src/fdvar'
import {
  domain_createRange,
} from '../../src/domain'

describe('config.spec', function() {

  describe('config_create', () => {

    it('should return an object', function() {
      expect(config_create()).to.be.an('object');
    });

  });

  describe('config_add_constant', function() {

    it('should add the value', function() {
      let config = config_create();
      let name = config_add_constant(config, 15);

      expect(config.all_var_names.indexOf(name)).to.be.at.least(0);
      expect(config.constant_uid).to.be.above(0);
      expect(config.initial_vars[name]).to.equal(15);
    });

    it('should populate the constant cache', function() {
      let config = config_create();
      let name = config_add_constant(config, 15);

      expect(config.constant_cache[15]).to.equal(name);
    });

    it('should reuse the constant cache if available', function() {
      let config = config_create();
      let name1 = config_add_constant(config, 1);
      let name2 = config_add_constant(config, 2);
      let name3 = config_add_constant(config, 1);

      expect(name1).to.not.equal(name2);
      expect(name1).to.equal(name3);
    });
  });

  describe('config_addVar', function() {

    it('should accept domain as param', function() {
      let config = config_create();
      config_addVar(config, 'A', [0, 1]);

      expect(config.initial_vars.A).to.eql([0, 1]);
    });

    it('should clone the input domains', function() {
      let d = [0, 1];
      let config = config_create();
      config_addVar(config, 'A', d);

      expect(config.initial_vars.A).to.eql(d);
      expect(config.initial_vars.A).not.to.equal(d);
    });

    it('should accept a number', function() {
      let config = config_create();
      config_addVar(config, 'A', 5);

      expect(config.initial_vars.A).to.eql(5);
    });

    it('should accept two numbers', function() {
      let config = config_create();
      config_addVar(config, 'A', 5, 20);

      expect(config.initial_vars.A).to.eql([5, 20]);
    });

    it('should accept undefined', function() {
      let config = config_create();
      config_addVar(config, 'A');

      expect(config.initial_vars.A).to.eql(undefined);
    });
  });


  describe('_config_addVar_value', function() {

    it('should accept domain as param', function() {
      let config = config_create();
      _config_addVar_value(config, 'A', [0, 1]);

      expect(config.initial_vars.A).to.eql([0, 1]);
    });

    it('should not clone the input domains', function() {
      let d = [0, 1];
      let config = config_create();
      _config_addVar_value(config, 'A', d);

      expect(config.initial_vars.A).to.eql(d);
      expect(config.initial_vars.A).to.equal(d);
    });

    it('should accept a number', function() {
      let config = config_create();
      _config_addVar_value(config, 'A', 5);

      expect(config.initial_vars.A).to.eql(5);
    });

    it('should throw if given lo, hi', function() {
      let config = config_create();

      expect(() => _config_addVar_value(config, 'A', 5, 20)).to.throw();
    });

    it('should accept undefined', function() {
      let config = config_create();
      _config_addVar_value(config, 'A');

      expect(config.initial_vars.A).to.eql(undefined);
      expect(config.all_var_names).to.contain('A');
    });
  });

  describe('config_addVars_a', function() {

    it('should add all vars in the array with domain', function() {
      let config = config_create();
      config_addVars_a(config, [
        'A', 'B', 'C'
      ], [0, 1]);

      expect(config.initial_vars.A).to.eql([0, 1]);
      expect(config.initial_vars.B).to.eql([0, 1]);
      expect(config.initial_vars.C).to.eql([0, 1]);
    });

    it('should add all vars in the array with lo', function() {
      let config = config_create();
      config_addVars_a(config, [
        'A', 'B', 'C'
      ], 0);

      expect(config.initial_vars.A).to.eql(0);
      expect(config.initial_vars.B).to.eql(0);
      expect(config.initial_vars.C).to.eql(0);
    });


    it('should add all vars in the array with lo, hi', function() {
      let config = config_create();
      config_addVars_a(config, [
        'A', 'B', 'C'
      ], 10, 20);

      expect(config.initial_vars.A).to.eql([10, 20]);
      expect(config.initial_vars.B).to.eql([10, 20]);
      expect(config.initial_vars.C).to.eql([10, 20]);
      expect(config.initial_vars.A).to.not.equal(config.initial_vars.B);
      expect(config.initial_vars.B).to.not.equal(config.initial_vars.C);
    });

    it('should add all vars with the array with no domain', function() {
      let config = config_create();
      config_addVars_a(config, [
        'A', 'B', 'C'
      ]);

      expect(config.initial_vars.A).to.eql(undefined);
      expect(config.initial_vars.B).to.eql(undefined);
      expect(config.initial_vars.C).to.eql(undefined);
      expect(config.all_var_names).to.contain('A');
      expect(config.all_var_names).to.contain('B');
      expect(config.all_var_names).to.contain('C');
    });
  });

  describe('config_addVars_o', function() {

    it('should add all vars in the array with domain', function() {
      let config = config_create();
      config_addVars_o(config, {
        A: [0, 1],
        B: [0, 1],
        C: [0, 1]
      });

      expect(config.initial_vars.A).to.eql([0, 1]);
      expect(config.initial_vars.B).to.eql([0, 1]);
      expect(config.initial_vars.C).to.eql([0, 1]);
    });

    it('should add all vars in the array with lo', function() {
      let config = config_create();
      config_addVars_o(config, {
        A: 20,
        B: 30,
        C: 40
      });

      expect(config.initial_vars.A).to.eql(20);
      expect(config.initial_vars.B).to.eql(30);
      expect(config.initial_vars.C).to.eql(40);
    });

    it('should add all vars with the array with no domain', function() {
      let config = config_create();
      config_addVars_o(config, {
        A: undefined,
        B: undefined,
        C: undefined
      });

      expect(config.initial_vars.A).to.eql(undefined);
      expect(config.initial_vars.B).to.eql(undefined);
      expect(config.initial_vars.C).to.eql(undefined);
      expect(config.all_var_names).to.contain('A');
      expect(config.all_var_names).to.contain('B');
      expect(config.all_var_names).to.contain('C');
    });

    describe.skip('space_add_var', function() {
      // to migrate

      it('should accept full parameters', function() {
        let space = space_create_root();
        config_addVar(space.config, 'A', 0, 1);
        space_init_from_config(space);

        expect(space.vars.A).to.eql(fdvar_create_range('A', 0, 1));
      });

      it('should accept only lo and assume [lo,lo] for domain', function() {
        let space = space_create_root();
        config_addVar(space.config, 'A', 0);
        space_init_from_config(space);

        expect(space.vars.A).to.eql(fdvar_create_range('A', 0, 0));
      });

      it('should accept lo as the domain if array', function() {
        let input_domain = [0, 1];
        let space = space_create_root();
        config_addVar(space.config, 'A', input_domain);
        space_init_from_config(space);

        expect(space.vars.A).to.eql(fdvar_create_range('A', 0, 1));
        expect(space.vars.A.dom).to.not.equal(input_domain); // should clone
      });

      it('should create an anonymous var with [lo,lo] if name is not given', function() {
        let space = space_create_root();
        config_addVar(space.config, 0);
        space_init_from_config(space);

        expect(space.vars[space.config.all_var_names[0]].dom).to.eql(domain_createRange(0, 0));
      });

      it('should create an anonymous var with [lo,hi] if name is not given', function() {
        let space = space_create_root();
        config_addVar(space.config, 0, 1);
        space_init_from_config(space);

        expect(space.vars[space.config.all_var_names[0]].dom).to.eql(domain_createRange(0, 1));
      });

      it('should create an anonymous var with given domain if name is not given', function() {
        let input_domain = [0, 1];
        let space = space_create_root();
        config_addVar(space.config, input_domain);
        space_init_from_config(space);

        expect(space.vars[space.config.all_var_names[0]].dom).to.eql(domain_createRange(0, 1));
        expect(space.vars[space.config.all_var_names[0]].dom).to.not.equal(input_domain);
      });

      it('should create a full wide domain for var without lo/hi', function() {
        let space = space_create_root();
        config_addVar(space.config, 'A');
        space_init_from_config(space);

        expect(space.vars.A).to.eql(fdvar_create_range('A', SUB, SUP));
      });

      it('should create a full wide domain for anonymous var', function() {
        let space = space_create_root();
        config_addVar(space.config);
        space_init_from_config(space);

        expect(space.vars[space.config.all_var_names[0]].dom).to.eql(domain_createRange(SUB, SUP));
      });

      it('should create a new var', function() {
        let space = space_create_root();
        config_addVar(space.config, 'foo', 100);
        space_init_from_config(space);

        expect(space.config.all_var_names).to.eql(['foo']);
        expect(space.unsolved_var_names).to.eql(['foo']);
        expect((space.vars.foo != null)).to.be.true;
      });

      it('should set var to domain', function() {
        let space = space_create_root();
        config_addVar(space.config, 'foo', 100);
        space_init_from_config(space);

        expect(space.vars.foo.dom).to.eql(domain_createRange(100, 100));
      });

      it('should set var to full domain if none given', function() {
        let space = space_create_root();
        config_addVar(space.config, 'foo');
        space_init_from_config(space);

        expect(space.vars.foo.dom).to.eql(specDomainCreateRange(SUB, SUP));
      });

      it('should throw if var already exists', function() {
        // this should throw an error instead. when would you _want_ to do this?
        let space = space_create_root();
        config_addVar(space.config, 'foo', 100);
        space_init_from_config(space);

        expect(space.vars.foo.dom).to.eql(specDomainCreateValue(100));
        expect(() => config_addVar(space.config, 'foo', 200)).to.throw();
      });

      it('should return the name', function() {
        let space = space_create_root();
        space_init_from_config(space);

        expect(space_add_var(space, 'foo', 100)).to.equal('foo');
      });

      it('should create a new var p1', function() {
        let space = space_create_root();
        space_init_from_config(space);

        expect(space.config.all_var_names.length, 'before decl').to.eql(0); // no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql(0); // no vars... right? :)
      });

      it('should create a new var p2', function() {
        let space = space_create_root();
        space_add_var(space, 22);
        space_init_from_config(space);

        expect(space.config.all_var_names.length, 'after decl').to.eql(1);
        expect(space.unsolved_var_names.length, 'after decl').to.eql(1);
      });

      it('should return the name of a var', function() {
        let space = space_create_root();
        let name = space_add_var(space, 50);
        space_init_from_config(space);

        expect(space.config.all_var_names.indexOf(name) > -1).to.be.true;
        expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true;
      });

      it('should create a "solved" var with given value', function() {
        let space = space_create_root();
        let name = space_add_var(space, 100);
        space_init_from_config(space);

        expect(space.vars[name].dom).to.eql(specDomainCreateValue(100));
      });

      it('should throw if value is OOB', function() {
        let space = space_create_root();
        space_init_from_config(space);

        expect(() => space_add_var(space, SUB - 100)).to.throw();
        expect(() => space_add_var(space, SUP + 100)).to.throw();
      });

      it('should create a var with given domain', function() {
        let space = space_create_root();
        let name = space_add_var(space, 100, 200);
        space_init_from_config(space);

        expect(space.vars[name].dom).to.eql(specDomainCreateRange(100, 200));
      });

      it('should create a full range var if no name and no domain is given', function() {
        let space = space_create_root();
        let name = space_add_var(space);
        space_init_from_config(space);

        expect(space.vars[name].dom).to.eql(specDomainCreateRange(SUB, SUP));
      });
    });

    describe.skip('space_add_vars', function() {
      // to migrate

      it('should accept multiple vars', function() {

        let space = space_create_root();
        space_add_vars(space,
          ['A'],
          ['B', 0],
          ['C', 10, 20],
          ['D', [5, 8, 20, 30]]);
        space_init_from_config(space);

        expect(space.vars.A).to.eql(fdvar_create_range('A', SUB, SUP));
        expect(space.vars.B).to.eql(fdvar_create_range('B', 0, 0));
        expect(space.vars.C).to.eql(fdvar_create_range('C', 10, 20));
        expect(space.vars.D).to.eql(fdvar_create('D', specDomainCreateRanges([5, 8], [20, 30])));
      });
    });

    describe.skip('space_add_vars_domain', function() {
      // to migrate

      it('should create some new vars', function() {
        let space = space_create_root();
        let names = ['foo', 'bar', 'baz'];
        space_add_vars_domain(space, names, 100);
        space_init_from_config(space);

        expect(space.config.all_var_names).to.eql(names);
        expect(space.unsolved_var_names).to.eql(names);
        // TOFIX: this test is not even taking the name into account...
        for (let name in names) {
          expect(space.vars.foo).to.be.true;
        }
      });

      it('should set to given domain', function() {
        let space = space_create_root();
        let names = ['foo', 'bar', 'baz'];
        let domain = specDomainCreateValue(100);
        space_add_vars_domain(space, names, domain);
        space_init_from_config(space);

        expect(space.config.all_var_names).to.eql(names);
        expect(space.unsolved_var_names).to.eql(names);
        for (let name in names) {
          expect((space.vars[name] != null)).to.be.true;
          expect(space.vars[name].dom, 'domain should be cloned').not.to.equal(domain);
          expect(space.vars[name].dom).to.eql(domain);
        }
      });
      //for name2 in names
      //  expect(space.vars[name].dom, 'domains should be cloned').not.to.equal space.vars[name2]

      it.skip('should be set to full domain if none given', function() {
        // TOFIX: this test is broken. the inner loop is checking the wrong thing (dom === var) and therefor always passes
        let space = space_create_root();
        let names = ['foo', 'bar', 'baz'];
        let domain = specDomainCreateRange(SUB, SUP);
        space_add_vars_domain(space, names);
        space_init_from_config(space);

        expect(space.config.all_var_names).to.eql(names);
        expect(space.unsolved_var_names).to.eql(names);
        for (let name in names) {
          expect((space.vars[name] != null)).to.be.true;
          expect(space.vars[name].dom).to.eql(domain);
          for (let name2 in names) {
            expect(space.vars[name].dom, 'domains should be cloned').not.to.equal(space.vars[name2]);
          }
        }
      });
    });
  });
});
