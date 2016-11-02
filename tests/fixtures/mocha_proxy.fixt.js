import chai from 'chai';
// enable stack even for non-thrown assertion failures
// otherwise things like `expect(true).to.eql(false)` would not print a stack trace at all
chai.Assertion.includeStack = true;

let expect = chai.expect;
export default expect;

// we used to need to pre-process inputs to remove expandos:
//let expectReal = chai.expect;
//
//// not sure whether this still works in es6 semantics
//function expect(...args) {
//  // remove assertion expandos
//  if (args[0] instanceof Array) {
//    delete args[0]._trace;
//  }
//
//  // call real chai.expect
//  return expectReal.apply(this, args);
//}

//export default expect;
//export {
//  expectReal,
//};
