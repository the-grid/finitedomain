// BODY_START

/* eslint eqeqeq: "off", quotes: "off" */// eslint ought to support asmjs out-of-the-box because this is required syntax :/

/**
 * Note: this block is asm.js compliant. Mainly concerns numbered domains.
 *
 * If a browser does not support asm.js then it still works
 * as regular JS. Behavior should be equal in any case.
 */
function AsmDomainJs(/*stdlib, foreign, heap*/) {
  "use asm";

  /**
   * Add numbers between `from` and `to`, inclusive, to the domain.
   *
   * @param {$domain_num} domain
   * @param {number} from Regular decimal number, not flag!
   * @param {number} to Regular decimal number, not flag!
   * @returns {$domain_num}
   */
  function addRange(domain, from, to) {
    domain = domain | 0;
    from = from | 0;
    to = to | 0;

    // what we do is:
    // - create a 1
    // - move the 1 to the left, `1+to-from` times
    // - subtract 1 to get a series of `to-from` ones
    // - shift those ones `from` times to the left
    // - OR that result with the domain and return it

    return domain | (((1 << (1 + (to | 0) - (from | 0))) - 1) << from);
  }

  /**
   * Returns 1 if the domain contains given number and 0 otherwise.
   *
   * @param {$domain_num} domain
   * @param {number} value NOT a flag
   * @returns {number} "boolean", 0 or 1
   */
  function containsValue(domain, value) {
    domain = domain | 0;
    value = value | 0;

    return ((domain & (1 << value)) != 0) | 0;
  }

  /**
   * Create a new domain with given value as the only member
   *
   * @param {number} value NOT a flag
   * @returns {$domain_num} (basically the flag)
   */
  function createValue(value) {
    value = value | 0;
    return 1 << value;
  }

  /**
   * Create a domain with all numbers lo,hi (inclusive) as member.
   *
   * @param {number} lo NOT a flag
   * @param {number} hi NOT a flag
   * @returns {$domain_num}
   */
  function createRange(lo, hi) {
    lo = lo | 0;
    hi = hi | 0;

    var domain = 0;
    while ((lo | 0) <= (hi | 0)) {
      domain = domain | (1 << lo);
      lo = (lo + 1) | 0;
    }
    return domain | 0;
  }

  /**
   * Return a domain containing all numbers from zero to the highest
   * number in given domain. In binary this means we'll set all the
   * bits of lower value than the most-significant set bit.
   *
   * @param {$domain_num} domain
   * @returns {$domain_num}
   */
  function createRangeZeroToMax(domain) {
    domain = domain | 0;

    domain = domain | (domain >> 1);
    domain = domain | (domain >> 2);
    domain = domain | (domain >> 4);
    domain = domain | (domain >> 8);
    domain = domain | (domain >> 16);
    return domain | 0;
  }

  /**
   * Return -1 if domain is not solved and otherwise return
   * the value to which the domain is solved. A domain is
   * solved when it contains exactly one value.
   *
   * @param {$domain_num} domain
   * @returns {number} -1 means NO_SUCH_VALUE
   */
  function getValue(domain) {
    domain = domain | 0;

    var lo = 0;
    lo = min(domain) | 0;
//    console.log('->',domain,lo,'\n  ', domain.toString(2).padStart(32, '0'),'\n  ', (1<<lo).toString(2).padStart(32, '0'))
    return (((domain | 0) == (1 << lo)) ? lo : -1) | 0;
  }

  /**
   * Return a domain that contains any value that is contained in
   * both domain1 and domain2. For a small domain this is the simple
   * product of `A&B`.
   *
   * @param {$domain_num} domain1
   * @param {$domain_num} domain2
   * @returns {$domain_num}
   */
  function intersection(domain1, domain2) {
    domain1 = domain1 | 0;
    domain2 = domain2 | 0;
    return domain1 & domain2;
  }

  /**
   * Check if every element in one domain does not
   * occur in the other domain and vice versa
   *
   * @param {$domain_num} domain1
   * @param {$domain_num} domain2
   * @returns {number} 0 for false or 1 for true
   */
  function sharesNoElements(domain1, domain2) {
    // checks whether not a single bit in set in _both_ domains
    domain1 = domain1 | 0;
    domain2 = domain2 | 0;
    return ((domain1 & domain2) == 0) | 0;
  }

  /**
   * A domain is "solved" if it contains exactly one
   * value. It is not solved if it is empty.
   *
   * @param {$domain_num} domain
   * @returns {number} 0 for false or 1 for true
   */
  function isSolved(domain) {
    domain = domain | 0;
    var some = 0;
    var any = 0;

    // http://stackoverflow.com/questions/12483843/test-if-a-bitboard-have-only-one-bit-set-to-1
    // first check if <=1 bits were set, then make sure the domain had >=1 set.
    some = ((isPopcountNotOne(domain) | 0) == 0) | 0;
    any = ((domain | 0) != 0) | 0;

    return (some & any);

    //return (((domain & (domain - 1)) == 0) & (domain > 0))|0;
  }

  /**
   * @param {$domain_num} domain
   * @param {number} value
   * @returns {number} 0 for false or 1 for true
   */
  function isValue(domain, value) {
    domain = domain | 0;
    value = value | 0;

    return ((domain | 0) == (1 << value)) | 0;
  }

  /**
   * A domain is "determined" if it's either one value
   * (solved) or none at all (rejected).
   *
   * @param {$domain_num} domain
   * @returns {boolean}
   */
  function isUndetermined(domain) {
    domain = domain | 0;

    var some = 0;
    var any = 0;

    // http://stackoverflow.com/questions/12483843/test-if-a-bitboard-have-only-one-bit-set-to-1
    // first check if not just one bit was set, then make sure the domain had >=1 set.

    some = ((isPopcountNotOne(domain) | 0) != 0) | 0;
    any = ((domain | 0) != 0) | 0;

    return (some & any);

    //return (domain & (domain - 1)) !== 0 && domain !== 0;
  }

  /**
   * Helper function that does a bit trick.
   *
   * @param domain
   * @returns {number}
   */
  function isPopcountNotOne(domain) {
    domain = domain | 0;
    // returns zero if domain had exactly one bit set, non-zero otherwise (returns other values than 1)
    return (domain & (domain - 1));
  }

  /**
   * Returns highest value in domain
   * Relatively expensive because there's no easy trick.
   *
   * @param {$domain_num} domain
   * @returns {number} NOT a flag
   */
  function max(domain) {
    domain = domain | 0;

    var i = 30;

    // fast paths: these are by far the most used case in our situation
    // (the empty domain check is "free" here)
    switch (domain | 0) {
      case 0: return -1; // empty domain
      case 1: return 0;
      case 2: return 1;
      case 3: return 1;
    }
    if ((domain | 0) == 1) return 0;
    if ((domain | 0) == 2) return 1;
    if ((domain | 0) == 3) return 1;

    // there's no pretty way to do this
    while ((i | 0) >= 0) {
      if (domain & (1 << i)) return i | 0;
      i = (i - 1) | 0;
    }

    return -1; // I don't think this really happens, or should, but just in case it does...
  }

  /**
   * Get lowest value in the domain
   *
   * This is also called a "bitscan" or "bitscan forward" because
   * in a small domain we want to know the index of the least
   * significant bit that is set. A different way of looking at
   * this is that we'd want to know the number of leading zeroes
   * ("clz") in the number because we would just need to +1 that
   * to get our desired value. There are various solutiosn to
   * this problem but some are not feasible to implement in JS
   * because we can't rely on low level optimizations. And
   * certainly we can't use the cpu machine instruction.
   *
   * Be aware that there are about a million ways to do this,
   * even to do this efficiently. Mileage under JS varies hto.
   *
   * ES6 _does_ expose `Math.clz32()` so if we can be certain
   * it is natively supported we should go with that and hope
   * it becomes a single instruction. Don't rely on a polyfill.
   *
   * @param {$domain_num} domain
   * @returns {number} NOT a flag
   */
  function min(domain) {
    domain = domain | 0;

    // fast paths: these are by far the most used case in our situation
    if ((domain | 0) == 1) return 0;
    if ((domain | 0) == 2) return 1;
    if ((domain | 0) == 3) return 0;

    // from https://graphics.stanford.edu/~seander/bithacks.html#ZerosOnRightModLookup
    // the table lookup is unfortunate. the mod is probably slow for us but hard to tell
    // the difference so let's not care for now.
    switch (((domain & -domain) % 37) | 0) {
      case 0:
        //return 32;
        return -1; // note: we dont use bits 31 and 32 so we can check for empty domain here "for free"
      case 1:
        return 0;
      case 2:
        return 1;
      case 3:
        return 26;
      case 4:
        return 2;
      case 5:
        return 23;
      case 6:
        return 27;
      case 7:
        return 0;
      case 8:
        return 3;
      case 9:
        return 16;
      case 10:
        return 24;
      case 11:
        return 30;
      case 12:
        return 28;
      case 13:
        return 11;
      case 14:
        return 0;
      case 15:
        return 13;
      case 16:
        return 4;
      case 17:
        return 7;
      case 18:
        return 17;
      case 19:
        return 0;
      case 20:
        return 25;
      case 21:
        return 22;
      case 22:
        //return 31;
        return -1; // we dont use the last bit
      case 23:
        return 15;
      case 24:
        return 29;
      case 25:
        return 10;
      case 26:
        return 12;
      case 27:
        return 6;
      case 28:
        return 0;
      case 29:
        return 21;
      case 30:
        return 14;
      case 31:
        return 9;
      case 32:
        return 5;
      case 33:
        return 20;
      case 34:
        return 8;
      case 35:
        return 19;
      case 36:
        return 18;
    }

    return -1; // I don't think this really happens, or should, but just in case it does...
  }

  /**
   * Remove all values from domain that are greater
   * than or equal to given value
   *
   * @param {$domain_num} domain
   * @param {number} value NOT a flag
   * @returns {$domain_num}
   */
  function removeGte(domain, value) {
    domain = domain | 0;
    value = value | 0;

    switch (value | 0) {
      case 0:
        return 0;
      case 1:
        return domain & 0x00000001;
      case 2:
        return domain & 0x00000003;
      case 3:
        return domain & 0x00000007;
      case 4:
        return domain & 0x0000000f;
      case 5:
        return domain & 0x0000001f;
      case 6:
        return domain & 0x0000003f;
      case 7:
        return domain & 0x0000007f;
      case 8:
        return domain & 0x000000ff;
      case 9:
        return domain & 0x000001ff;
      case 10:
        return domain & 0x000003ff;
      case 11:
        return domain & 0x000007ff;
      case 12:
        return domain & 0x00000fff;
      case 13:
        return domain & 0x00001fff;
      case 14:
        return domain & 0x00003fff;
      case 15:
        return domain & 0x00007fff;
      case 16:
        return domain & 0x0000ffff;
      case 17:
        return domain & 0x0001ffff;
      case 18:
        return domain & 0x0003ffff;
      case 19:
        return domain & 0x0007ffff;
      case 20:
        return domain & 0x000fffff;
      case 21:
        return domain & 0x001fffff;
      case 22:
        return domain & 0x003fffff;
      case 23:
        return domain & 0x007fffff;
      case 24:
        return domain & 0x00ffffff;
      case 25:
        return domain & 0x01ffffff;
      case 26:
        return domain & 0x03ffffff;
      case 27:
        return domain & 0x07ffffff;
      case 28:
        return domain & 0x0fffffff;
      case 30:
        return domain | 0; // assuming domain is "valid" we can just return it now.
    }

    return domain | 0; // when value > 30
  }

  /**
   * Remove all values from domain that are lower
   * than or equal to given value
   *
   * @param {$domain_num} domain
   * @param {number} value NOT a flag
   * @returns {$domain_num}
   */
  function removeLte(domain, value) {
    domain = domain | 0;
    value = value | 0;

    switch (value | 0) {
      case 0:
        return domain & 0x7ffffffe;
      case 1:
        return domain & 0x7ffffffc;
      case 2:
        return domain & 0x7ffffff8;
      case 3:
        return domain & 0x7ffffff0;
      case 4:
        return domain & 0x7fffffe0;
      case 5:
        return domain & 0x7fffffc0;
      case 6:
        return domain & 0x7fffff80;
      case 7:
        return domain & 0x7fffff00;
      case 8:
        return domain & 0x7ffffe00;
      case 9:
        return domain & 0x7ffffc00;
      case 10:
        return domain & 0x7ffff800;
      case 11:
        return domain & 0x7ffff000;
      case 12:
        return domain & 0x7fffe000;
      case 13:
        return domain & 0x7fffc000;
      case 14:
        return domain & 0x7fff8000;
      case 15:
        return domain & 0x7fff0000;
      case 16:
        return domain & 0x7ffe0000;
      case 17:
        return domain & 0x7ffc0000;
      case 18:
        return domain & 0x7ff80000;
      case 19:
        return domain & 0x7ff00000;
      case 20:
        return domain & 0x7fe00000;
      case 21:
        return domain & 0x7fc00000;
      case 22:
        return domain & 0x7f800000;
      case 23:
        return domain & 0x7f000000;
      case 24:
        return domain & 0x7e000000;
      case 25:
        return domain & 0x7c000000;
      case 26:
        return domain & 0x78000000;
      case 27:
        return domain & 0x70000000;
      case 28:
        return domain & 0x60000000;
      case 29:
        return domain & 0x40000000;
      case 30:
        return 0; // assuming domain is "valid" this should remove all elements
    }

    return 0; // when value > 30
  }

  /**
   * @param {$domain_num} domain
   * @param {number} value NOT a flag
   * @returns {$domain_num}
   */
  function removeValue(domain, value) {
    domain = domain | 0;
    value = value | 0;

    var flag = 0;

    if ((value | 0) > 30) return domain | 0;
    flag = 1 << value;
    return (domain | flag) ^ flag;
  }

  /**
   * Return the number of elements this domain covers
   *
   * @param {$domain_num} domain
   * @returns {number}
   */
  function size(domain) {
    domain = domain | 0;

    // need to work on this one because it requires 64bits. should be doable, to revisit later
//      domain = (domain - (((domain >>> 1) & 0x55555555))) | 0;
//      domain = ((domain & 0x33333333) + ((domain >>> 2) & 0x33333333)) | 0;
//      domain = ((+((domain + (domain >>> 4)) & 0x0F0F0F0F) * +0x01010101)|0) >>> 24;
//      return domain;

    // hot paths; binary
    // the empty domain is "free"
    switch (domain | 0) {
      case 0: return 0; // empty domain
      case 1: return 1;
      case 2: return 1;
      case 3: return 2;
    }

    return (
        (domain & 1) +
        ((domain >> 1) & 1) +
        ((domain >> 2) & 1) +
        ((domain >> 3) & 1) +
        ((domain >> 4) & 1) +
        ((domain >> 5) & 1) +
        ((domain >> 6) & 1) +
        ((domain >> 7) & 1) +
        ((domain >> 8) & 1) +
        ((domain >> 9) & 1) +
        ((domain >> 10) & 1) +
        ((domain >> 11) & 1) +
        ((domain >> 12) & 1) +
        ((domain >> 13) & 1) +
        ((domain >> 14) & 1) +
        ((domain >> 15) & 1) +
        ((domain >> 16) & 1) +
        ((domain >> 17) & 1) +
        ((domain >> 18) & 1) +
        ((domain >> 19) & 1) +
        ((domain >> 20) & 1) +
        ((domain >> 21) & 1) +
        ((domain >> 22) & 1) +
        ((domain >> 23) & 1) +
        ((domain >> 24) & 1) +
        ((domain >> 25) & 1) +
        ((domain >> 26) & 1) +
        ((domain >> 27) & 1) +
        ((domain >> 28) & 1) +
        ((domain >> 29) & 1) +
        ((domain >> 30) & 1) +
        ((domain >> 31) & 1)
      ) | 0;
  }

  return {
    addRange: addRange,
    containsValue: containsValue,
    createRange: createRange,
    createValue: createValue,
    createRangeZeroToMax: createRangeZeroToMax,
    getValue: getValue,
    intersection: intersection,
    isSolved: isSolved,
    isUndetermined: isUndetermined,
    isValue: isValue,
    max: max,
    min: min,
    removeGte: removeGte,
    removeLte: removeLte,
    removeValue: removeValue,
    sharesNoElements: sharesNoElements,
    size: size,
  };
}

let obj = AsmDomainJs();

let asmdomain_addRange = obj.addRange;
let asmdomain_containsValue = obj.containsValue;
let asmdomain_createRange = obj.createRange;
let asmdomain_createValue = obj.createValue;
let asmdomain_createRangeZeroToMax = obj.createRangeZeroToMax;
let asmdomain_getValue = obj.getValue;
let asmdomain_intersection = obj.intersection;
let asmdomain_isSolved = obj.isSolved;
let asmdomain_isUndetermined = obj.isUndetermined;
let asmdomain_isValue = obj.isValue;
let asmdomain_max = obj.max;
let asmdomain_min = obj.min;
let asmdomain_removeGte = obj.removeGte;
let asmdomain_removeLte = obj.removeLte;
let asmdomain_removeValue = obj.removeValue;
let asmdomain_sharesNoElements = obj.sharesNoElements;
let asmdomain_size = obj.size;

// BODY_STOP

export {
  asmdomain_addRange,
  asmdomain_containsValue,
  asmdomain_createRange,
  asmdomain_createValue,
  asmdomain_createRangeZeroToMax,
  asmdomain_getValue,
  asmdomain_intersection,
  asmdomain_isSolved,
  asmdomain_isUndetermined,
  asmdomain_isValue,
  asmdomain_max,
  asmdomain_min,
  asmdomain_removeGte,
  asmdomain_removeLte,
  asmdomain_removeValue,
  asmdomain_sharesNoElements,
  asmdomain_size,
};
