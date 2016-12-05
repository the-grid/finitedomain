
let id = -1;
let config = null;
let solver = null;

this.exports = {};
this.importScripts('../../dist/browser.js');
console.log(id, 'worker bootstrapped');

this.onmessage = function(e) {
  //console.log(id, 'worker received:', e);

  let msg = e.data;
  switch (msg.task) {
    case 'id':
      id = msg.id;
      break;
    case 'init':
      config = msg.config;
      solver = new Solver({config: config});  /* eslint no-undef: "off" */
      solver._prepareConfig({}, 1);
      postMessage({task: 'ready', id: id});
      console.log(id, 'ready');
      break;
    case 'crunch':
      let space = msg.space;
      let before = solver.exp(space, false, true, true);
      //console.log(id, 'crunching...', space._path, space._uid, space.vardoms.length);
      let rejected = solver.propagate(space);
      let after = solver.exp(space, false, true, true);
      postMessage({task: 'complete', space: space, rejected: rejected, path: space._path, id: id, before, after});
      //console.log(id, 'crunch complete');
      break;
    default:
      throw new Error('unknown task: `' + msg.task + '`');
  }
};


// BODY_START
// i dont want this code in the build
// BODY_STOP
