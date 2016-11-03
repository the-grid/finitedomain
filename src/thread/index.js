let MAX_WORKERS = 4;

let started = false;
let finished = false;

let workers = [];
let idle = [];
let busy = [];

let solver = new Solver(); /* eslint no-undef: "off" */
let targets;
(function(solver) {
  let H = [0, 1, 2, 3, 4];

  let blue = solver.decl('blue', 0);
  let green = solver.decl('green', 1);
  let red = solver.decl('red', 2);
  let white = solver.decl('white', 3);
  let yellow = solver.decl('yellow', 4);
  let C = [blue, green, red, white, yellow];

  let Dane = solver.decl('danish', 0);
  let Englishman = solver.decl('english', 1);
  let German = solver.decl('german', 2);
  let Swede = solver.decl('swedish', 3);
  let Norwegian = solver.decl('norwegian', 4);
  let N = [Dane, Englishman, German, Swede, Norwegian];

  let bier = solver.decl('bier', 0);
  let coffee = solver.decl('coffee', 1);
  let milk = solver.decl('milk', 2);
  let tea = solver.decl('tea', 3);
  let water = solver.decl('water', 4);
  let D = [bier, coffee, milk, tea, water];

  let Blend = solver.decl('blend', 0);
  let BlueMaster = solver.decl('bluemaster', 1);
  let Dunhill = solver.decl('dunhill', 2);
  let PallMall = solver.decl('pallmall', 3);
  let Prince = solver.decl('prince', 4);
  let S = [Blend, BlueMaster, Dunhill, PallMall, Prince];

  let birds = solver.decl('birds', 0);
  let cats = solver.decl('cats', 1);
  let dogs = solver.decl('dogs', 2);
  let fish = solver.decl('fish', 3);
  let horses = solver.decl('horses', 4);
  let P = [birds, cats, dogs, fish, horses];

  let hash = {};
  H.forEach(x => hash[x] = 'H');
  C.forEach(x => hash[x] = 'C');
  N.forEach(x => hash[x] = 'N');
  D.forEach(x => hash[x] = 'D');
  S.forEach(x => hash[x] = 'S');
  P.forEach(x => hash[x] = 'P');

  H.forEach(i => ['C', 'N', 'S', 'D', 'P'].forEach(type => solver.decl(type + i, [0, 4])));

  let Cn = ['C0', 'C1', 'C2', 'C3', 'C4'];
  let Nn = ['N0', 'N1', 'N2', 'N3', 'N4'];
  let Dn = ['D0', 'D1', 'D2', 'D3', 'D4'];
  let Sn = ['S0', 'S1', 'S2', 'S3', 'S4'];
  let Pn = ['P0', 'P1', 'P2', 'P3', 'P4'];
  solver.distinct(Cn);
  solver.distinct(Nn);
  solver.distinct(Dn);
  solver.distinct(Sn);
  solver.distinct(Pn);

  H.forEach(i => {
    // some logic helper functions
    // they're closures over solver and i so stuff looks cleaner. not very efficient but that's irrelevant here.

    // "iif house=x then house=y"
    let ifThen = (a, b) => ifThenHouse(a, b, i);
    // "iif house[i]=x then house[i]=y"
    let ifThenHouse = (a, b, houseNumber) => _iif(hash[a] + houseNumber, a, hash[b] + houseNumber, b);
    // "iif A=v1 then B=v2"
    let _iif = (ha, va, hb, vb) => solver.lte(solver.isEq(ha, va), solver.isEq(hb, vb));
    // "iif house=x then house+=delta=y" (+1 or -1 for either neighbor)
    let ifThenNeighbor = (a, b, delta) => _iif(hash[a] + i, a, hash[b] + (i + delta), b);
    // "iif house=x then either neighbor=y (not both)"
    let ifThenEitherNeighbor = (a, b) => {
      if (i === 0) ifThenNeighbor(a, b, 1);
      else if (i === 4) ifThenNeighbor(a, b, -1);
      else ifThenXor(hash[a] + i, a, hash[b] + (i - 1), hash[b] + (i + 1), b);
    };
    // "iif a=n then either b=m or c=m" (but not both b=m c=m)
    let ifThenXor = (a, n, b, c, m) => solver.lte(solver.isEq(a, n), solver.isNeq(solver.isEq(b, m), solver.isEq(c, m)));

    // number behind each constraint refers to constraint number outlined above

    ifThen(Englishman, red);                             // 1
    ifThen(Swede, dogs);                                 // 2
    ifThen(Dane, tea);                                   // 3
    if (i < 4) ifThenNeighbor(green, white, +1);         // 4
    else solver.neq('C4', green);                        // - (otherwise last house can be green and ignore rule 4)
    ifThen(green, coffee);                               // 5
    ifThen(PallMall, birds);                             // 6
    ifThen(yellow, Dunhill);                             // 7
    if (i === 2) solver.eq('D2', milk);                  // 8
    if (i === 0) solver.eq('N0', Norwegian);             // 9
    ifThenEitherNeighbor(Blend, cats);                   // 10
    ifThen(BlueMaster, bier);                            // 11
    ifThenEitherNeighbor(horses, Dunhill);               // 12
    ifThen(German, Prince);                              // 13
    ifThenEitherNeighbor(Norwegian, blue);               // 14
    ifThenEitherNeighbor(Blend, water);                  // 15
  });

  targets = [].concat(Cn, Nn, Dn, Sn, Pn);
})(solver);
//solver.declRange('A', 0, 10);
//solver.declRange('B', 0, 10);
//solver.declRange('C', 0, 10);
//solver.distinct(['A', 'B', 'C']);

let steps = 0;
let solves = [];
solver._prepare({max: 10, vars: targets}, 1);

// stabilize the root space
let result = solver.propagate(solver.state.space);
if (result === true) {
  // root space rejected; problem cannot be satisfied
  console.log('Root space rejected; problem cannot be satisfied. The end.');
} else {
  solver.state.stack.push(solver.state.space);

  console.log(solver.getTargetState(solver.state.space));

  // note: this squashes functions! most important is
  // that random functions are blackholed this way.
  let bak = {};
  for (let key in solver.config) {
    if (key[0] === '_' && key !== '_class') {
      bak[key] = solver.config[key];
      solver.config[key] = null;
    }
  }

  for (let i = 0; i < MAX_WORKERS; ++i) spawn(i);

  // restore..
  for (let key in bak) solver.config[key] = bak[key];

  //solver.solve({max: 10, vars: ['A', 'B', 'C'], log: 1});
  //console.log(solver.solutions);
}

function spawn(i) {
  let worker = new Worker('worker.js');
  workers.push(worker);
  busy.push(worker);
  worker.onmessage = onWorkerMessage.bind(undefined, worker);
  worker.postMessage({task: 'id', id: i});
  worker.postMessage({task: 'init', config: solver.config});
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
      ++steps;

      let space = msg.space;
      let rejected = msg.rejected;
      if (rejected) {
        // space was rejected. drop it.
        flush();
      } else if (solver.checkStableSpace(space)) {
        console.log(solver.getTargetState(space));
        solves.push(space);
        if (solver.state.more && solves.length < 10) {
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
  console.log('steps:', steps);
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
