import setup from '../fixtures/helpers.spec';
import {
    spec_d_create_bool,
    spec_d_create_range,
    spec_d_create_value,
    spec_d_create_ranges,
    strip_anon_vars,
} from '../fixtures/domain.spec';
import finitedomain from '../../src/index';
import {
  expect,
  assert,
} from 'chai';

const {
  Space,
} = finitedomain;

const {
  config_add_propagator,
  config_add_var,
  config_add_var_anon,
  config_set_options
} = finitedomain.config;

const {
  space_create_clone,
  space_create_root,
  space_init_from_config,
  space_is_solved,
  space_propagate,
  space_solution,
  space_solution_for
} = finitedomain.space;

describe("space.spec", function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

  describe('Space class', function() {

    describe('space_create_root()', function() {

      it('should exist', function(){
        expect(space_create_root).to.be.a('function');
      });

      it('should create a new instance', function() {
        // I dont want to test for instanceof... but i dont think we can change that due to ext. api.
        expect(space_create_root()).to.be.an('object');
      });

      it('should init vars and var_names', function() {
        expect(space_create_root().vars).to.be.an('object');
        expect(space_create_root().unsolved_var_names).to.be.an('array');
        expect(space_create_root().config.all_var_names).to.be.an('array');
      });
    });

    describe('space_create_clone()', function() {

      let space = space_create_root();
      let clone = space_create_clone(space);

      it('should return a new space', function() {
        expect(clone).to.not.equal(space)
      });

      it('should clone vars', function() {
        expect(space.vars).to.not.equal(clone.vars);
      });

      it('should deep clone the vars', function() {
        //for var_name in space.config.all_var_names
        for (let i = 0; i < space.config.all_var_names.length; ++i) {
          let var_name = space.config.all_var_names[i];

          expect(clone.vars[var_name]).to.not.equal(space.vars[var_name]);
        }
      });

      // note: the deep clone check is already done above, no need to repeat it
      it('should clone certain props, copy others', function() {
        expect(space.unsolved_var_names).to.not.equal(clone.unsolved_var_names);
        expect(space.unsolved_var_names.join()).to.equal(clone.unsolved_var_names.join());
        expect(space.config).to.equal(clone.config);
        expect(space.unsolved_propagators).to.eql(clone.unsolved_propagators);
      });
    });

    describe('space_is_solved()', function() {

      it('should return true if there are no vars', function() {
        expect(space_is_solved(space_create_root())).to.equal(true);
      });

      it('should return true if all 1 vars are solved', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 1);
        space_init_from_config(space);

        expect(space_is_solved(space), 'only one solved var').to.equal(true);
      });

      it('should return true if all 2 vars are solved', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 1);
        config_add_var_anon(space.config, 1);
        space_init_from_config(space);

        expect(space_is_solved(space), 'two solved vars').to.equal(true);
      });

      it('should return false if at least one var is not solved', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 0, 1);
        space_init_from_config(space);

        expect(space_is_solved(space), 'only one unsolved var').to.equal(false);
      });

      it('should return false if at least one var of two is not solved', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 0, 1);
        config_add_var_anon(space.config, 0, 1);
        space_init_from_config(space);

        expect(space_is_solved(space), 'two unsolved vars').to.equal(false);
      });

      it('should return false if at least one var of three is not solved', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 0, 1);
        config_add_var_anon(space.config, 0, 1);
        config_add_var_anon(space.config, 1);
        space_init_from_config(space);

        expect(space_is_solved(space), 'two unsolved vars and a solved var').to.equal(false);
      });
    });

    describe('space_solution()', function() {

      it('should return an object, not array', function() {
        expect(space_solution(space_create_root())).to.be.an('object');
        expect(space_solution(space_create_root())).not.to.be.an('array');
      });

      it('should return an empty object if there are no vars', function() {
        expect(space_solution(space_create_root())).to.eql({});
      });

      it('should return false if a var covers no (more) elements', function() {
        let space = space_create_root();
        config_add_var(space.config, 'test', []);
        space_init_from_config(space);

        expect(space_solution(space)).to.eql({test: false});
      });

      it('should return the value of a var is solved', function() {
        let space = space_create_root();
        config_add_var(space.config, 'test', 5);
        space_init_from_config(space);

        expect(space_solution(space)).to.eql({test: 5});
      });

      it('should return the domain of a var if not yet determined', function() {
        let space = space_create_root();
        config_add_var(space.config, 'single_range', 10, 20);
        config_add_var(space.config, 'multi_range', spec_d_create_ranges([10, 20], [30, 40]));
        config_add_var(space.config, 'multi_range_with_solved', spec_d_create_ranges([10, 20], [25, 25], [30, 40]));
        space_init_from_config(space);

        expect(space_solution(space)).to.eql({
          single_range: spec_d_create_range(10, 20),
          multi_range: spec_d_create_ranges([10, 20], [30, 40]),
          multi_range_with_solved: spec_d_create_ranges([10, 20], [25, 25], [30, 40])
        });
      });

      it('should not add anonymous vars to the result', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 15);
        config_add_var(space.config, 'addme', 20);
        space_init_from_config(space);

        expect(strip_anon_vars(space_solution(space))).to.eql({addme: 20});
      });
    });

    describe('space_solution_for()', function() {

      it('should only collect results for given var names', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 10); // should be ignored
        config_add_var(space.config, 'nope', 10, 20);
        config_add_var(space.config, 'yep10', 10);
        config_add_var(space.config, 'yep20', 20);
        config_add_var(space.config, 'yep30', 30);
        space_init_from_config(space);

        expect(space_solution_for(space, ['yep10', 'yep20', 'yep30'])).to.eql({yep10: 10, yep20: 20, yep30: 30});
      });

      it('should return normal even if a var is unsolved when complete=false', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 10); // should be ignored
        config_add_var(space.config, 'yep10', 10);
        config_add_var(space.config, 'oops20', []);
        config_add_var(space.config, 'yep30', 30);
        space_init_from_config(space);

        expect(space_solution_for(space, ['yep10', 'oops20', 'yep30'])).to.eql({yep10: 10, oops20: false, yep30: 30});
      });

      it('should return false if a var is unsolved when complete=true', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 10); // should be ignored
        config_add_var(space.config, 'yep10', 10);
        config_add_var(space.config, 'oops20', []);
        config_add_var(space.config, 'yep30', 30);
        space_init_from_config(space);

        expect(space_solution_for(space, ['yep10', 'oops20', 'yep30'], true)).to.equal(false);
      });

      it('should return true if a var is unsolved that was not requested when complete=true', function() {
        let space = space_create_root();
        config_add_var_anon(space.config, 10); // should be ignored
        config_add_var(space.config, 'yep10', 10);
        config_add_var(space.config, 'nope20', []);
        config_add_var(space.config, 'yep30', 30);
        space_init_from_config(space);

        expect(space_solution_for(space, ['yep10', 'yep30'], true)).to.eql({yep10: 10, yep30: 30});
      });
    });

    describe('space_propagate', function() {

      describe('simple cases', () =>

        it('should not reject this multiply case', function() {
          let space = space_create_root();

          config_add_var(space.config, 'A', 0, 10);
          config_add_var(space.config, 'B', 0, 10);
          config_add_var(space.config, 'MAX', 25, 25);
          config_add_var(space.config, 'MUL', 0, 100);

          config_add_propagator(space.config, ['ring', ['A', 'B', 'MUL'], 'mul']);
          config_add_propagator(space.config, ['ring', ['MUL', 'A', 'B'], 'div']);
          config_add_propagator(space.config, ['ring', ['MUL', 'B', 'A'], 'div']);
          config_add_propagator(space.config, ['lt', ['MUL', 'MAX']]);

          space_init_from_config(space);
          expect(space_propagate(space)).to.eql(true);
        })
      );

      describe('timeout callback', function() {

        it('should ignore timeout callback if not set at all', function() {
          // (base timeout callback test)

          let space = space_create_root();

          config_add_var(space.config, 'A', 0, 10);
          config_add_var(space.config, 'B', 0, 10);

          config_add_propagator(space.config, ['lt', ['A', 'B']]);

          space_init_from_config(space);
          expect(space_propagate(space)).to.eql(true);
        });

        it('should not break early if callback doesnt return true', function() {
          let space = space_create_root();

          config_add_var(space.config, 'A', 0, 10);
          config_add_var(space.config, 'B', 0, 10);

          config_add_propagator(space.config, ['lt', ['A', 'B']]);

          config_set_options(space.config, {timeout_callback() { return false; }});
          space_init_from_config(space);

          expect(space_propagate(space)).to.eql(true);
        });

        it('should break early if callback returns true', function() {
          let space = space_create_root();

          config_add_var(space.config, 'A', 0, 10);
          config_add_var(space.config, 'B', 0, 10);

          config_add_propagator(space.config, ['lt', ['A', 'B']]);

          config_set_options(space.config, {timeout_callback() { return true; }});
          space_init_from_config(space);

          expect(space_propagate(space)).to.eql(false);
        });
      });
    });
  });
});
