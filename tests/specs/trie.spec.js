import expect from '../fixtures/mocha_proxy.fixt';

import {
  trie_add,
  trie_create,
  _trie_debug,
  trie_get,
  trie_has,
} from '../../src/trie';

describe('src/tries.spec', function() {

  it('should create a new empty tree', function() {
    let trie = trie_create();

    expect(trie).to.be.an('object');
    expect(trie.buffer instanceof Uint16Array).to.eql(true);
  });

  it('should create a pre-filled tree', function() {
    let trie = trie_create(['a', 'b', 'foo']);

    expect(trie).to.be.an('object');
    expect(trie.buffer instanceof Uint16Array).to.eql(true);
  });

  it('should be able to add a key', function() {
    let trie = trie_create();
    let before = trie_add(trie, 'foo', 15);

    expect(before).to.eql(-1);
  });

  it('should be able to add value=0', function() {
    let trie = trie_create();
    let before = trie_add(trie, 'foo', 0);

    expect(before).to.eql(-1);
  });

  it('should be able to return before-value if it was set', function() {
    let trie = trie_create();
    trie_add(trie, 'bar', 100);
    let before = trie_add(trie, 'bar', 15);
    //console.log(_trie_debug(trie));

    expect(before).to.eql(100);
  });

  it('should be able to return before-value if it was zero', function() {
    let trie = trie_create();
    trie_add(trie, 'bar', 0);
    let before = trie_add(trie, 'bar', 10);

    expect(before).to.eql(0);
  });

  it('should be able to read a key', function() {
    let trie = trie_create();
    trie_add(trie, 'foo', 15);
    let n = trie_get(trie, 'foo');

    expect(n).to.eql(15);
  });

  it('should be able to read a value=0', function() {
    let trie = trie_create();
    trie_add(trie, 'hi', 0);
    let n = trie_get(trie, 'hi');

    //console.log(_trie_debug(trie));
    expect(n).to.eql(0);
  });

  it('should be able to set value>128 when trie is small', function() {
    // buffer should be a clamped array (=unsigned byte) or results can be weird.
    // we assume all input values are zero or positive
    let trie = trie_create();
    trie_add(trie, 'unsigned', 200);
    let n = trie_get(trie, 'unsigned');

    expect(n).to.eql(200);
  });

  it('should fit some small strings', function() {
    // from perf test case. a bit biased but whatever
    let strs = [
      '1', '_ROOT_BRANCH_', 'SECTION', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'ITEM', 'COMPONENT', 'inlets', '11', '12', 'inlets&n=1', '13', '14', 'inlets&n=2', '15', '16', 'inlets&n=3', '17', '18', 'inlets&n=4', '19', '20', 'COMPONENT_START', 'COMPONENT_END', 'SECTION&n=1', 'ITEM&n=1', 'COMPONENT&n=1', 'inlets&n=5', '21', '22', 'inlets&n=6', '23', '24', 'inlets&n=7', '25', '26', 'inlets&n=8', '27', '28', 'inlets&n=9', '29', '30', 'COMPONENT_START&n=1', 'COMPONENT_END&n=1', 'SECTION&n=2', 'ITEM&n=2', 'COMPONENT&n=2', 'inlets&n=10', '31', '32', 'inlets&n=11', '33', '34', 'inlets&n=12', '35', '36', 'inlets&n=13', '37', '38', 'inlets&n=14', '39', '40', 'COMPONENT_START&n=2', 'COMPONENT_END&n=2', 'SECTION&n=3', 'ITEM&n=3', 'COMPONENT&n=3', 'inlets&n=15', '41', '42', 'inlets&n=16', '43', '44', 'inlets&n=17', '45', '46', 'inlets&n=18', '47', '48', 'inlets&n=19', '49', '50', 'COMPONENT_START&n=3', 'COMPONENT_END&n=3', 'SECTION&n=4', 'ITEM&n=4', 'COMPONENT&n=4', 'inlets&n=20', '51', '52', 'inlets&n=21', '53', '54', 'inlets&n=22', '55', '56', 'inlets&n=23', '57', '58', 'inlets&n=24', '59', '60', 'COMPONENT_START&n=4', 'COMPONENT_END&n=4', 'SECTION&n=5', 'ITEM&n=5', 'COMPONENT&n=5', 'inlets&n=25', '61', '62', 'inlets&n=26', '63', '64', 'inlets&n=27', '65', '66', 'inlets&n=28', '67', '68', 'inlets&n=29', '69', '70', 'COMPONENT_START&n=5', 'COMPONENT_END&n=5', 'SECTION&n=6', 'ITEM&n=6', 'COMPONENT&n=6', 'inlets&n=30', '71', '72', 'inlets&n=31', '73', '74', 'inlets&n=32', '75', '76', 'inlets&n=33', '77', '78', 'inlets&n=34', '79', '80', 'COMPONENT_START&n=6', 'COMPONENT_END&n=6', 'SECTION&n=7', 'ITEM&n=7', 'COMPONENT&n=7', 'inlets&n=35', '81', '82', 'inlets&n=36', '83', '84', 'inlets&n=37', '85', '86', 'inlets&n=38', '87', '88', 'inlets&n=39', '89', '90', 'COMPONENT_START&n=7', 'COMPONENT_END&n=7', 'SECTION&n=8', 'ITEM&n=8', 'COMPONENT&n=8', 'inlets&n=40', '91', '92', 'inlets&n=41', '93', '94', 'inlets&n=42', '95', '96', 'inlets&n=43', '97', '98', 'inlets&n=44', '99', '100', 'COMPONENT_START&n=8', 'COMPONENT_END&n=8',
    ];

    let trie = trie_create();

    for (let i = 0; i < strs.length; ++i) {
      expect(trie_get(trie, strs[i])).to.eql(-1);
      expect(trie_has(trie, strs[i]), 'should not yet have it').to.eql(false);
      expect(trie_add(trie, strs[i], i), 'should be unset (-1): i=' + i + ' -> ' + strs[i]).to.eql(-1);
      expect(trie_has(trie, strs[i]), 'should be set now').to.eql(true);
      expect(trie_get(trie, strs[i])).to.eql(i);
    }

    expect(trie.count).to.eql(strs.length);

    // also check after all keys are added to ensure nothing is clobbered or whatever
    for (let i = 0; i < strs.length; ++i) {
      expect(trie_get(trie, strs[i]), 'i=' + i + ' -> ' + strs[i]).to.eql(i);
    }

    console.log(_trie_debug(trie));
  });

});
