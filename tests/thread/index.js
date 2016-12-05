let MAX_WORKERS = 1;
let MAX_SOLVES = 1;

let started = false;
let finished = false;

let workers = [];
let idle = [];
let busy = [];

let solverx = example(Solver); /* eslint no-undef: "off" */

let steps = new Array(MAX_WORKERS).fill(0);
let solves = [];

solverx._prepareConfig({max: MAX_SOLVES}, 1);

// note: this squashes functions! most important is
// that random functions are blackholed this way.
let bak = {};
for (let key in solverx.config) {
  if (key[0] === '_' && key !== '_class' && key !== '_constrainedAway') {
    bak[key] = solverx.config[key];
    solverx.config[key] = null;
  }
}

for (let i = 0; i < MAX_WORKERS; ++i) spawn(i);

// make sure this solver is equivalent to the solver in each worker
solver = new Solver({config: solverx.config});
solver._prepareConfig({max: MAX_SOLVES}, 1);

let rootSpace = solver.createSpace();
//console.log('getTargetState:', solver.getTargetState(rootSpace));

// stabilize the root space
let result = solver.propagate(rootSpace);
if (result === true) {
  // root space rejected; problem cannot be satisfied
  console.log('Root space rejected; problem cannot be satisfied. The end.');
  complete();
} else {
  solver.state = {stack: [rootSpace], more: true};
}

function spawn(i) {
  let worker = new Worker('worker.js');
  workers.push(worker);
  busy.push(worker);
  worker.onmessage = onWorkerMessage.bind(undefined, worker);
  worker.postMessage({task: 'id', id: i});
  worker.postMessage({task: 'init', config: solverx.config});
}

function onWorkerMessage(worker, e) {
  //console.log('controller received message:', e);
  if (finished) return; // worker should have been terminated. possibly a message that was already in transit limbo.

  let msg = e.data;

  // for now "outstanding tasks" mean the worker is busy
  // (need to handle debugging somehow, if we want to)
  busy.splice(busy.indexOf(worker), 1);
  idle.push(worker);

  switch (msg.task) {
    case 'ready':
      flush();
      break;
    case 'complete':
      ++steps[msg.id];

      console.log('completed:', msg);
      let space = msg.space;
      let rejected = msg.rejected;
      if (rejected) {
        // space was rejected. drop it.
        flush();
      } else if (solver.checkStableSpace(space)) {
        //console.log(solver.getTargetState(space));
        solves.push(space);
        if (solver.state.more && solves.length < MAX_SOLVES) {
          flush();
        } else {
          complete();
        }
      } else {
        // checkStableSpace will have put the space on the stack again
        flush();
      }
      break;
  }
}

function flush() {
  let stack = solver.state.stack;
  //console.log('flush()', stack.map(s => s._path));
  if (!started) {
    started = true;
    console.time('from first flush to solution');
  }
  if (finished) return;

  while (idle.length && stack.length) {
    let parent = stack.pop();
    let child = solver.offspring(parent);

    if (child) {
      stack.push(parent);
      let worker = idle.pop();
      busy.push(worker);
      worker.postMessage({task: 'crunch', space: child});
    }
  }

  if (!busy.length && !stack.length) complete();
}

function complete() {
  finished = true;
  console.timeEnd('from first flush to solution');
  workers.forEach(worker => worker.terminate());
  let solutions = [];
  solver.generateSolutions(solves, solver.config, solutions, 1);
  console.log('solved!', solutions);
  console.log('steps:', steps, 'avg:', steps.reduce((t, n) => t + n) / MAX_WORKERS, 'total:', steps.reduce((t, n) => t + n));
  quit();
}

function quit() {
  console.log('terminating all workers');
  workers.forEach(w => w.terminate());
  console.log('terminated.');
}

// BODY_START
// i dont want this code in the build
// BODY_STOP
