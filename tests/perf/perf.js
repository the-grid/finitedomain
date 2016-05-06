TOFIX

// workaround implicit local scope of node vs browser and coffee
let w = {};
if (typeof window !== 'undefined') {
  w = window;
}

throw new Error('This file is heavily outdated. Need to rebuild it on the new sources. Find new cases to run without PathFinder, etc.');

let PROFILE = false; // set to true to profile the slowest perf test here in a browser, devtools should auto-profile it here.

if (typeof require === 'function') {
  var finitedomain = require('../../build/3.finitedomain.dist.coffeed');
  finitedomain = require('../../build/4.finitedomain.dist.perf_stripped');
  finitedomain = require('../../build/5.finitedomain.dist.min');
  var chai = require('chai');

  // json files, basically. just large sets of input data. no need to clutter this page with them.
  w.o1 = require('./o1');
  w.o2 = require('./o2');
  w.o3 = require('./o3');
  w.o4 = require('./o4');
  w.o5 = require('./o5');
  w.o6 = require('./o6');
  w.o7 = require('./o7');
  w.o8 = require('./o8');
  w.o9 = require('./o9');
  w.o10 = require('./o10');
  w.o11 = require('./o11');
  w.o12 = require('./o12');
  w.o13 = require('./o13');
  w.o15 = require('./o15');

  w.b1 = require('./big1.js');
  w.b2 = require('./big2.js');
  w.b3 = require('./big3.js');
} else {
  var { chai } = window;
  //finitedomain = window.FD3 # dev
  var finitedomain = window.FD4; // no asserts
  //finitedomain = window.FD5 # minified
  PROFILE = location.href.indexOf('?profile') >= 0;
}

let {expect, assert} = chai;

let {
  PathSolver,
  Solver
} = finitedomain;


  function test(desc, data, profile) {
    it(desc, function (done) {
      this.timeout(20000);

      new PathSolver({rawtree: data}).solve({log: 0, max: 1000}, true);
      expect(true).to.be.true;

      return done();
    });

  if (PROFILE) {

    describe('profile one case', () =>
      it('starting one run, see console (profile tab too)', () => expect(true).to.be.true)
    );

    // for the browser
    if (console.profile) {
      console.profile();
      new PathSolver({rawtree: w.o5}).solve({log: 0, max: 1000}, true);
      console.profileEnd();
    } else {
      console.log("browser does not support console.profile, you'll need to work around it ;)");
    }
  } else {
    describe('pipeline stuff', function () {
      // these are the main calls pipeline makes to FD. exported rawtree
      // from the PathSolver constructor as is and that's what you see here.

      test('1', w.o1);
      test('2', w.o2);
      test('3', w.o3);
      test('4', w.o4);
      test('5', w.o5);
      test('6', w.o6);
      test('7', w.o7);
      test('8', w.o8);
      test('9', w.o9);
      test('10', w.o10);
      test('11', w.o11);
      test('12', w.o12);
      test('13', w.o13);
    });

    describe('repeat simple test', function () {
      this.timeout(60000); // 1min timeout

      // this data was exported from the "4.e) from-to - balanced h tracks" test in MultiverseJSON
      let m = {rawtree: w.o15};

      for (var i = 0; i < 10; ++i) {
        it('run', function (done) {
          new finitedomain.PathSolver(m).solve({log: 0, max: 1000}, true);
          expect(true).to.equal(true);
          done();
        });
      }
    });
  }

  describe('5k+ prop test exports', function() {
    // space exports from Cluster tests (5k+ props)

    function big_test(desc, space, max) {
      it(desc + ' (' + max + 'x)', function (done) {

        this.timeout(20000);

        let solver = new Solver({});
        solver.state.space = space;
        solver._prepared = true;
        solver.run({
          search_func: solver._get_search_func_or_die('depth_first'),
          max,
          log: 0
        });
        expect(solver.solutions.length).to.eql(max);

        done();
      });
    }

    big_test('b1', JSON.parse(JSON.stringify(w.b1)), 100);
    big_test('b1', JSON.parse(JSON.stringify(w.b1)), 250);

    big_test('b2', JSON.parse(JSON.stringify(w.b2)), 100);
    big_test('b2', JSON.parse(JSON.stringify(w.b2)), 250);
    big_test('b2', JSON.parse(JSON.stringify(w.b2)), 500);
    big_test('b2', JSON.parse(JSON.stringify(w.b2)), 1000);

    big_test('b3', JSON.parse(JSON.stringify(w.b3)), 100);
    big_test('b3', JSON.parse(JSON.stringify(w.b3)), 250);
    big_test('b3', JSON.parse(JSON.stringify(w.b3)), 500);
    big_test('b3', JSON.parse(JSON.stringify(w.b3)), 1000);
  });
}