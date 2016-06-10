describe('src/constraint.spec', function() {

  /* TODO: migrate tests specific to constraint. propagate.js used
           to do all of it, now it doesn't do the initialization and
           registration of constants anymore.


  describe('propagator_addMarkov', function() {

    it('should exist', function() {
      expect(propagator_addMarkov).to.be.a('function');
    });

    it.only('should not crash', function() {
      propagator_addMarkov(config_create(), 0);
      expect(true).to.equal(true);
    });
  });

  describe('propagator_addReified', function() {

    it('should exist', function() {
      expect(propagator_addReified).to.be.a('function');
    });

    it('should throw for unknown ops', function() {
      let config = config_create();
      expect(_ => propagator_addReified(config, 'fail', 1, 2, 3)).to.throw('add_reified: Unsupported operator \'fail\'');
    });

    describe('with anonymous vars', function() {

      it('should accept numbers for anonymous var A', function() {
        let config = config_create();
        propagator_addReified(config, 'eq', 0, 'B', 'C');
        propagator_addReified(config, 'eq', 0, 'B', 'C');
        expect(true).to.equal(true);
      });

      it('should accept numbers for anonymous var B', function() {
        let config = config_create();
        propagator_addReified(config, 'eq', 'A', 0, 'C');
        expect(true).to.equal(true);
      });

      it('should throw if left and right vars are anonymous vars', function() {
        let config = config_create();
        expect(_ => propagator_addReified(config, 'eq', 0, 0, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
      });
    });

    describe('bool var domain', function() {

      it('should be fine if the boolvar has no one', function() {
        let config = config_create();

        expect(propagator_addReified(config, 'eq', 1, 2, 3)).to.eql('C');
      });

      it('should be fine if the boolvar has no zero', function() {
        let config = config_create();

        expect(propagator_addReified(config, 'eq', 1, 2, 3)).to.eql('C');
      });

      it('should be fine if the boolvar has more than zero and one', function() {
        let config = config_create();

        expect(propagator_addReified(config, 'eq', 1, 2, 3)).to.eql('C');
      });

      it('should reduce the domain to bool if not already', function() {
        let config = config_create();
        propagator_addReified(config, 'eq', 'A', 'B', 'C');

        expect(config.initial_vars.C).to.eql(specDomainCreateRange(0, 1, true));
      });

      it('should accept a number for boolvar', function() {
        let config = config_create();

        expect(() => propagator_addReified(config, 'eq', 'A', 'B', 0)).not.to.throw();
      });

      it('should return the name of the anon boolvar', function() {
        let config = config_create();

        expect(typeof propagator_addReified(config, 'eq', 'A', 'B', 0)).to.eql('string');
      });

      it('should return the name of the named boolvar', function() {
        let config = config_create();

        expect(propagator_addReified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });
    });
  });

  describe('propagator_addEq', function() {

    it('should exist', function() {
      expect(propagator_addLt).to.be.a('function');
    });

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();
        propagator_addEq(config, 0, 'B');
        expect(true).to.equal(true);
      });

      it('should accept a number for var2', function() {
        let config = config_create();
        propagator_addEq(config, 'A', 0);
        expect(true).to.equal(true);
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();
        expect(() => propagator_addEq(config, 0, 0)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
      });
    });
  });

  describe('propagator_addLt', function() {

    it('should exist', function() {
      expect(propagator_addLt).to.be.a('function');
    });

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_addLt(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_addLt(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addLt(config, 0, 0)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
      });
    });
  });

  describe('propagator_addLte', function() {

    it('should exist', function() {
      expect(propagator_addLte).to.be.a('function');
    });

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_addLte(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_addLte(config, 'A', 0)).not.to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addLte(config, 0, 0)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
      });
    });
  });

  describe('propagator_addGt', function() {

    it('should exist', function() {
      expect(propagator_addGt).to.be.a('function');
    });

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_addGt(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_addGt(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addGt(config, 0, 0)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
      });
    });
  });

  describe('propagator_addGte', function() {

    it('should exist', function() {
      expect(propagator_addGte).to.be.a('function');
    });

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(propagator_addGte(config, 0, 'B')).to.equal(undefined);
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(propagator_addGte(config, 'A', 0)).to.equal(undefined);
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addGte(config, 0, 0)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
      });
    });
  });

  describe('propagator_addRingPlusOrMul', function() {

    it('should exist', function() {
      expect(propagator_addRingPlusOrMul).to.be.a('function');
    });

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addRingPlusOrMul(config, 'div', 'mul', 'A', 'B', 0)).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addRingPlusOrMul(config, 'div', 'mul', 'A', 'B', 'C')).to.eql('C');
    });

    it('should accept numbers for either side', function() {
      let config = config_create();

      expect(propagator_addRingPlusOrMul(config, 'x', 'y', 'A', 2, 'C')).to.eql('C');
      expect(propagator_addRingPlusOrMul(config, 'x', 'y', 1, 'B', 'C')).to.eql('C');
    });

    it('should throw if both values are numbers', function() {
      let config = config_create();

      expect(_ => propagator_addRingPlusOrMul(config, 'x', 'y', 1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
    });

    it('should accept numbers for result', function() {
      let config = config_create();

      expect(propagator_addRingPlusOrMul(config, 'x', 'y', 'A', 'B', 20)).to.eql(config.constant_cache[20]);
      expect(propagator_addRingPlusOrMul(config, 'x', 'y', 'A', 2, 21)).to.eql(config.constant_cache[21]);
      expect(propagator_addRingPlusOrMul(config, 'x', 'y', 1, 'B', 22)).to.eql(config.constant_cache[22]);
    });

    it('should throw if result is neither number nor string nor undefined', function() {
      let config = config_create();

      expect(_ => propagator_addRingPlusOrMul(config, 'x', 'y', 'A', 'B', null)).to.throw('expecting sumname to be absent or a number or string: `null`');
      expect(_ => propagator_addRingPlusOrMul(config, 'x', 'y', 'A', 'B', {})).to.throw('expecting sumname to be absent or a number or string: `[object Object]`');
      expect(_ => propagator_addRingPlusOrMul(config, 'x', 'y', 'A', 'B', [])).to.throw('expecting sumname to be absent or a number or string: ``'); // [] -> [].join() -> ''
    });
  });

  describe('propagator_addSum', function() {

    it('should exist', function() {
      expect(propagator_addSum).to.be.a('function');
    });

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addSum(config, ['A', 'B', 'C'])).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addSum(config, ['A', 'B', 'C'], 'D')).to.eql('D');
    });

    it('should not allow any combination of multiple numbers', function() {
      // because it divides and conquers so if two numbers end up paired, the
      // propagator_addPlus function will throw for it. otherwise it's ok. so dont.
      let config = config_create();

      expect(propagator_addSum(config, ['A', 'B', 'C'])).to.be.a('string');
      expect(propagator_addSum(config, [1, 'B', 'C'])).to.be.a('string');
      expect(propagator_addSum(config, ['A', 2, 'C'])).to.be.a('string');
      expect(propagator_addSum(config, ['A', 'B', 3])).to.be.a('string');
      expect(propagator_addSum(config, [1, 'B', 3])).to.be.a('string'); // "safe"
      expect(_ => propagator_addSum(config, [1, 3, 'B', 3])).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
    });

    it('should allow anonymous numbers in the list of vars', function() {
      let config = config_create();

      expect(propagator_addSum(config, ['A', 5, 'C'], 'D')).to.eql('D');
    });

    it('should throw if you dont pass on any vars', function() {
      let config = config_create();

      expect(() => propagator_addSum(config, [], 'A')).to.throw('SUM_REQUIRES_VARS');
    });

    it('should run propagator_addEq with only one var', function() {
      // we dont actually check whether propagator_addEq is called but it should at least not crash
      let config = config_create();

      expect(propagator_addSum(config, ['A'], 'D')).to.eql('D');
    });

    it('should run propagator_addPlus with two vars', function() {
      // we dont actually check whether propagator_addPlus is called but it should at least not crash
      let config = config_create();

      expect(propagator_addSum(config, ['A', 'B'], 'D')).to.eql('D');
    });

    it('should throw if you dont pass on an array', function() {
      let config = config_create();

      expect(() => propagator_addSum(config, undefined, 'A')).to.throw('vars should be an array of var names');
      expect(() => propagator_addSum(config, 'X', 'A')).to.throw('vars should be an array of var names');
      expect(() => propagator_addSum(config, 5, 'A')).to.throw('vars should be an array of var names');
      expect(() => propagator_addSum(config, null, 'A')).to.throw('vars should be an array of var names');
    });

    it('should divide and conquer with multiple vars', function() {
      let config = config_create();

      expect(propagator_addSum(config, ['A', 'B', 'C', 'D'], 'E')).to.eql('E');
      expect(propagator_addSum(config, ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'E')).to.eql('E');
    });
  });

  describe('propagator_addProduct', function() {

    it('should exist', function() {
      expect(propagator_addProduct).to.be.a('function');
    });

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addProduct(config, ['A', 'B', 'C'])).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addProduct(config, ['A', 'B', 'C'], 'D')).to.eql('D');
    });

    it('should not allow any combination of multiple numbers', function() {
      // because it divides and conquers so if two numbers end up paired, the
      // propagator_addRingMul function will throw for it. otherwise it's ok. so dont.
      let config = config_create();

      expect(propagator_addProduct(config, ['A', 'B', 'C'])).to.be.a('string');
      expect(propagator_addProduct(config, [1, 'B', 'C'])).to.be.a('string');
      expect(propagator_addProduct(config, ['A', 2, 'C'])).to.be.a('string');
      expect(propagator_addProduct(config, ['A', 'B', 3])).to.be.a('string');
      expect(propagator_addProduct(config, [1, 'B', 3])).to.be.a('string'); // "safe"
      expect(_ => propagator_addProduct(config, [1, 3, 'B', 3])).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
    });

    it('should allow anonymous numbers in the list of vars', function() {
      let config = config_create();

      expect(propagator_addProduct(config, ['A', 5, 'C'], 'D')).to.eql('D');
    });

    it('should throw if you dont pass on any vars', function() {
      let config = config_create();

      expect(() => propagator_addProduct(config, [], 'A')).to.throw('PRODUCT_REQUIRES_VARS');
    });

    it('should run propagator_addEq with only one var', function() {
      // we dont actually check whether propagator_addEq is called but it should at least not crash
      let config = config_create();

      expect(propagator_addProduct(config, ['A'], 'D')).to.eql('D');
    });

    it('should run propagator_addRingMul with two vars', function() {
      // we dont actually check whether propagator_addRingMul is called but it should at least not crash
      let config = config_create();

      expect(propagator_addProduct(config, ['A', 'B'], 'D')).to.eql('D');
    });

    it('should throw if you dont pass on an array', function() {
      let config = config_create();

      expect(() => propagator_addProduct(config, undefined, 'A')).to.throw('vars should be an array of var names');
      expect(() => propagator_addProduct(config, 'X', 'A')).to.throw('vars should be an array of var names');
      expect(() => propagator_addProduct(config, 5, 'A')).to.throw('vars should be an array of var names');
      expect(() => propagator_addProduct(config, null, 'A')).to.throw('vars should be an array of var names');
    });

    it('should divide and conquer with multiple vars', function() {
      let config = config_create();

      expect(propagator_addProduct(config, ['A', 'B', 'C', 'D'], 'E')).to.eql('E');
      expect(propagator_addProduct(config, ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'E')).to.eql('E');
    });
  });

  describe('propagator_addMin', function() {

    it('should exist', function() {
      expect(propagator_addMin).to.be.a('function');
    });

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addMin(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addMin(config, 'A', 'B', 'C')).to.eql('C');
    });

    it('should accept numbers for either side', function() {
      let config = config_create();

      expect(propagator_addMin(config, 'A', 2, 'C')).to.eql('C');
      expect(propagator_addMin(config, 1, 'B', 'C')).to.eql('C');
    });

    it('should throw if both values are numbers', function() {
      let config = config_create();

      expect(_ => propagator_addMin(config, 1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
    });

    it('should accept numbers for result', function() {
      let config = config_create();

      expect(propagator_addMin(config, 'A', 'B', 20)).to.eql(config.constant_cache[20]);
      expect(propagator_addMin(config, 'A', 2, 21)).to.eql(config.constant_cache[21]);
      expect(propagator_addMin(config, 1, 'B', 22)).to.eql(config.constant_cache[22]);
    });

    it('should throw if result is neither number nor string nor undefined', function() {
      let config = config_create();

      expect(_ => propagator_addMin(config, 'A', 'B', null)).to.throw('expecting result_var to be absent or a number or string: `null`');
      expect(_ => propagator_addMin(config, 'A', 'B', {})).to.throw('expecting result_var to be absent or a number or string: `[object Object]`');
      expect(_ => propagator_addMin(config, 'A', 'B', [])).to.throw('expecting result_var to be absent or a number or string: ``'); // [] -> [].join() -> ''
    });
  });

  describe('propagator_addDiv', function() {

    it('should exist', function() {
      expect(propagator_addDiv).to.be.a('function');
    });

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addDiv(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addDiv(config, 'A', 'B', 'C')).to.eql('C');
    });

    it('should accept numbers for either side', function() {
      let config = config_create();

      expect(propagator_addDiv(config, 'A', 2, 'C')).to.eql('C');
      expect(propagator_addDiv(config, 1, 'B', 'C')).to.eql('C');
    });

    it('should throw if both values are numbers', function() {
      let config = config_create();

      expect(_ => propagator_addDiv(config, 1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
    });

    it('should accept numbers for result', function() {
      let config = config_create();

      expect(propagator_addDiv(config, 'A', 'B', 20)).to.eql(config.constant_cache[20]);
      expect(propagator_addDiv(config, 'A', 2, 21)).to.eql(config.constant_cache[21]);
      expect(propagator_addDiv(config, 1, 'B', 22)).to.eql(config.constant_cache[22]);
    });

    it('should throw if result is neither number nor string nor undefined', function() {
      let config = config_create();

      expect(_ => propagator_addDiv(config, 'A', 'B', null)).to.throw('expecting result_name to be absent or a number or string: `null`');
      expect(_ => propagator_addDiv(config, 'A', 'B', {})).to.throw('expecting result_name to be absent or a number or string: `[object Object]`');
      expect(_ => propagator_addDiv(config, 'A', 'B', [])).to.throw('expecting result_name to be absent or a number or string: ``'); // [] -> [].join() -> ''
    });
  });

  describe('propagator_addMul', function() {

    it('should exist', function() {
      expect(propagator_addMul).to.be.a('function');
    });

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addMul(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addMul(config, 'A', 'B', 'C')).to.eql('C');
    });

    it('should accept numbers for either side', function() {
      let config = config_create();

      expect(propagator_addMul(config, 'A', 2, 'C')).to.eql('C');
      expect(propagator_addMul(config, 1, 'B', 'C')).to.eql('C');
    });

    it('should throw if both values are numbers', function() {
      let config = config_create();

      expect(_ => propagator_addMul(config, 1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
    });

    it('should accept numbers for result', function() {
      let config = config_create();

      expect(propagator_addMul(config, 'A', 'B', 20)).to.eql(config.constant_cache[20]);
      expect(propagator_addMul(config, 'A', 2, 21)).to.eql(config.constant_cache[21]);
      expect(propagator_addMul(config, 1, 'B', 22)).to.eql(config.constant_cache[22]);
    });

    it('should throw if result is neither number nor string nor undefined', function() {
      let config = config_create();

      expect(_ => propagator_addMul(config, 'A', 'B', null)).to.throw('expecting result_name to be absent or a number or string: `null`');
      expect(_ => propagator_addMul(config, 'A', 'B', {})).to.throw('expecting result_name to be absent or a number or string: `[object Object]`');
      expect(_ => propagator_addMul(config, 'A', 'B', [])).to.throw('expecting result_name to be absent or a number or string: ``'); // [] -> [].join() -> ''
    });
  });

  describe('propagator_addNeq', function() {

    it('should exist', function() {
      expect(propagator_addNeq).to.be.a('function');
    });

    it('should return undefined', function() {
      let config = config_create();

      expect(propagator_addNeq(config, 'A', 'B')).to.eql(undefined);
    });

    it('should accept numbers for either side', function() {
      let config = config_create();

      expect(propagator_addNeq(config, 'A', 2)).to.eql(undefined);
      expect(propagator_addNeq(config, 1, 'B')).to.eql(undefined);
    });

    it('should throw if both values are numbers', function() {
      let config = config_create();

      expect(_ => propagator_addNeq(config, 1, 2)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
    });
  });

  describe('propagator_addDistinct', function() {

    it('should exist', function() {
      expect(propagator_addDistinct).to.be.a('function');
    });

    it('should accept zero vars', function() {
      let config = config_create();

      expect(propagator_addDistinct(config, [])).to.eql(undefined);
    });

    it('should only handle one number', function() {
      // because it crosses all vars with each other it would inevitably cross two numbers which is illegal
      let config = config_create();

      expect(propagator_addDistinct(config, ['A', 'B', 'C'])).to.eql(undefined);
      expect(propagator_addDistinct(config, [1, 'B', 'C'])).to.eql(undefined);
      expect(propagator_addDistinct(config, ['A', 2, 'C'])).to.eql(undefined);
      expect(propagator_addDistinct(config, ['A', 'B', 3])).to.eql(undefined);
      expect(_ => propagator_addDistinct(config, [1, 'B', 3])).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
    });
  });
*/

});
