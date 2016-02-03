if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'
  require '../fixtures/helpers.spec'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_ranges
    spec_d_create_value
    spec_d_create_zero
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe 'domain.spec', ->

  unless FD.__DEV_BUILD
    return

  {
    domain: Domain
  } = FD

  {
    NO_SUCH_VALUE
  } = FD.helpers

  it 'should exist', ->

    expect(Domain?).to.be.true

  describe "domain_from_list", ->

    {domain_from_list} = Domain

    it 'should exist', ->

      expect(domain_from_list?).to.be.true

    it "[[0,0]]", ->
      expect(domain_from_list [0]).to.eql spec_d_create_zero()
      expect(domain_from_list [0,0]).to.eql spec_d_create_zero()

    it "[[0,1]]", ->
      expect(domain_from_list [0,1]).to.eql spec_d_create_bool()
      expect(domain_from_list [1,0]).to.eql spec_d_create_bool()
      expect(domain_from_list [0,0,1,1]).to.eql spec_d_create_bool()
      expect(domain_from_list [1,1,0,0]).to.eql spec_d_create_bool()

    it "negative elements should throw", ->
      expect(-> domain_from_list [10,1,-1,0]).to.throw()
      expect(-> domain_from_list [10,1,-1,0,10,1,-1,0,10,1,-1,0]).to.throw()

  describe "domain_to_list", ->

    {domain_to_list} = Domain

    it 'should exist', ->

      expect(domain_to_list?).to.be.true

    it 'should require a domain', ->

      expect(-> domain_to_list()).to.throw()

    it "[[0,0]]", ->

      expect(domain_to_list spec_d_create_zero()).to.eql [0]

    it "[[0,1]]", ->

      expect(domain_to_list spec_d_create_bool()).to.eql [0,1]

  describe "domain_remove_next_from_list", ->

    {domain_remove_next_from_list} = Domain

    it 'should exist', ->

      expect(domain_remove_next_from_list?).to.be.true

    it 'should require an array', ->

      expect(-> domain_remove_next_from_list null, [0]).to.throw()

    it 'should return a fresh domain', ->

      a = spec_d_create_range(0, 3)
      expect(domain_remove_next_from_list a, [0]).to.not.equal a

    it 'should return undefined if no element in the list was found', ->

      expect(domain_remove_next_from_list spec_d_create_ranges([1, 10], [20, 30]), [0,11, 13, 15, 104]).to.eql undefined

    it 'should not alter input domain', ->

      a = spec_d_create_range(0, 3)
      expect(domain_remove_next_from_list a, [0]).to.eql spec_d_create_range(1, 3)
      expect(a).to.eql spec_d_create_range(0, 3)

    it "1", ->
      dom = spec_d_create_range(0, 3)
      expect(domain_remove_next_from_list dom, [0]).to.eql spec_d_create_range(1, 3)
      expect(domain_remove_next_from_list dom, [0,10,9,7]).to.eql spec_d_create_range(1, 3)
      expect(domain_remove_next_from_list dom, [10,9,7,0]).to.eql spec_d_create_range(1, 3)
      expect(domain_remove_next_from_list dom, [1]).to.eql spec_d_create_ranges([0,0],[2,3])
      expect(domain_remove_next_from_list dom, [2]).to.eql spec_d_create_ranges([0,1],[3,3])
      expect(domain_remove_next_from_list dom, [3]).to.eql spec_d_create_range(0, 2)
      expect(domain_remove_next_from_list dom, [99,100]).to.eql undefined

    it "2", ->
      dom = spec_d_create_zero()
      expect(domain_remove_next_from_list dom, [0]).to.eql []
      expect(domain_remove_next_from_list dom, [0,10,11]).to.eql []
      expect(domain_remove_next_from_list dom, [10,11,0,12]).to.eql []
      expect(domain_remove_next_from_list dom, [1]).to.eql undefined
      expect(domain_remove_next_from_list dom, [1,2,3,4,5]).to.eql undefined

    it "3", ->
      dom = spec_d_create_ranges([0,4],[10,14])
      expect(domain_remove_next_from_list dom, [0]).to.eql spec_d_create_ranges([1,4],[10,14])
      expect(domain_remove_next_from_list dom, [0,10,11]).to.eql spec_d_create_ranges([1,4],[10,14])
      expect(domain_remove_next_from_list dom, [10,11,0,12]).to.eql spec_d_create_ranges([0,4],[11,14])
      expect(domain_remove_next_from_list dom, [1]).to.eql spec_d_create_ranges([0,0],[2,4],[10,14])
      expect(domain_remove_next_from_list dom, [100,12]).to.eql spec_d_create_ranges([0,4],[10,11],[13,14])
      expect(domain_remove_next_from_list dom, [12,100]).to.eql spec_d_create_ranges([0,4],[10,11],[13,14])

    it "4", ->
      dom = spec_d_create_ranges([0,4],[10,14],[20,24])
      expect(domain_remove_next_from_list dom, [99,5,12,11]).to.eql spec_d_create_ranges([0,4],[10,11],[13,14],[20,24])
      expect(domain_remove_next_from_list dom, [99,5]).to.eql undefined

    it "should throw for negative values", ->
      dom = spec_d_create_ranges([0,4],[10,14],[20,24])
      expect(-> domain_remove_next_from_list dom, [99,-1,12,11]).to.throw()
      expect(-> domain_remove_next_from_list dom, [99,-1]).to.throw()

  describe "domain_get_value_of_first_contained_value_in_list ", ->

    {domain_get_value_of_first_contained_value_in_list} = Domain

    it "1", ->
      dom = spec_d_create_range(0, 3)
      expect( domain_get_value_of_first_contained_value_in_list(dom,[0]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[0,10,9,7]), "[0,10,9,7]").to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[10,9,7,0]), "[10,9,7,0]").to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[1]) ).to.eql 1
      expect( domain_get_value_of_first_contained_value_in_list(dom,[2]) ).to.eql 2
      expect( domain_get_value_of_first_contained_value_in_list(dom,[3]) ).to.eql 3
      expect( domain_get_value_of_first_contained_value_in_list(dom,[99,100]) ).to.eql NO_SUCH_VALUE

    it "2", ->
      dom = spec_d_create_zero()
      expect( domain_get_value_of_first_contained_value_in_list(dom,[0]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[0,10,11]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[10,11,0,12]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[1]) ).to.eql NO_SUCH_VALUE
      expect( domain_get_value_of_first_contained_value_in_list(dom,[1,2,3,4,5]) ).to.eql NO_SUCH_VALUE

    it "3", ->
      dom = spec_d_create_ranges([0,4],[10,14])
      expect( domain_get_value_of_first_contained_value_in_list(dom,[0]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[0,10,11]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[10,11,0,12]) ).to.eql 10
      expect( domain_get_value_of_first_contained_value_in_list(dom,[1]) ).to.eql 1
      expect( domain_get_value_of_first_contained_value_in_list(dom,[100,12]) ).to.eql 12
      expect( domain_get_value_of_first_contained_value_in_list(dom,[12,100]) ).to.eql 12

    it "4", ->
      dom = spec_d_create_ranges([0,4],[10,14],[20,24])
      expect( domain_get_value_of_first_contained_value_in_list(dom,[99,5,12,11]) ).to.eql 12
      expect( domain_get_value_of_first_contained_value_in_list(dom,[99,5]) ).to.eql NO_SUCH_VALUE

    it "should throw for negative values", ->
      dom = spec_d_create_ranges([0,4],[10,14],[20,24])
      expect(-> domain_get_value_of_first_contained_value_in_list(dom,[99,-1,12,11]) ).to.throw()
      expect(-> domain_get_value_of_first_contained_value_in_list(dom,[99,-1]) ).to.throw()

  describe 'domain_contains_value', ->

    {domain_contains_value} = Domain

    it 'should exist', ->

      expect(domain_contains_value?).to.be.true

    describe 'should return true if domain contains given value', ->

      it 'one range in domain', ->

        expect(domain_contains_value spec_d_create_range(0, 10), 5).to.be.true

      it 'multiple ranges in domain', ->

        expect(domain_contains_value spec_d_create_ranges([0, 10], [20, 30], [50, 60]), 25).to.be.true

    describe 'should return false if domain does not contain value', ->

      it 'empty array', ->

        expect(domain_contains_value [], 0).to.be.false

      it 'one range in domain', ->

        expect(domain_contains_value spec_d_create_range(0, 10), 25).to.be.false

      it 'multiple ranges in domain', ->

        expect(domain_contains_value spec_d_create_ranges([0, 10], [20, 30], [50, 60]), 15).to.be.false

  describe 'domain_range_index_of', ->

    {_domain_range_index_of: domain_range_index_of} = Domain

    it 'should exist', ->

      expect(domain_range_index_of?).to.be.true

    describe 'should return index of range that encloses value', ->

      it 'one range in domain', ->

        expect(domain_range_index_of spec_d_create_range(0, 10), 5).to.eql 0

      it 'multiple ranges in domain', ->

        expect(domain_range_index_of spec_d_create_ranges([0, 10], [20, 30], [50, 60]), 25).to.eql 2
        expect(domain_range_index_of spec_d_create_ranges([0, 10], [20, 30], [50, 60]), 51).to.eql 4

    describe 'should return -1 if domain does not contain value', ->

      it 'empty array', ->

        expect(domain_range_index_of [], 0).to.eql -1

      it 'one range in domain', ->

        expect(domain_range_index_of spec_d_create_range(0, 10), 25).to.eql -1

      it 'multiple ranges in domain', ->

        expect(domain_range_index_of spec_d_create_ranges([0, 10], [20, 30], [50, 60]), 15).to.eql -1

  describe 'domain_is_value', ->

    {domain_is_value} = Domain

    it 'should exist', ->

      expect(domain_is_value?).to.be.true

    it 'should require a domain', ->

      expect(-> domain_is_value()).to.throw()

    it 'should return false if domain is empty', ->

      expect(domain_is_value []).to.be.false

    it 'should throw for invalid domains', ->

      expect(-> domain_is_value spec_d_create_value(undefined)).to.throw()

    it 'should be able to check without arg (but return false)', ->

      expect(domain_is_value []).to.be.false

    it 'should return false if only range is not one value', ->

      expect(domain_is_value spec_d_create_range(10, 20), 10).to.be.false

    it 'should return true if the only range is given value', ->

      expect(domain_is_value spec_d_create_range(0, 0), 0).to.be.true
      expect(domain_is_value spec_d_create_range(1, 1), 1).to.be.true
      expect(domain_is_value spec_d_create_range(10, 10), 10).to.be.true
      expect(domain_is_value spec_d_create_range(527, 527), 527).to.be.true

    it 'should return false if value does not match', ->

      expect(domain_is_value(spec_d_create_ranges([0, 0]), 1), 'value 0').to.be.false
      expect(domain_is_value(spec_d_create_ranges([0, 1]), 0), 'bool domain 0').to.be.false
      expect(domain_is_value(spec_d_create_ranges([0, 1]), 1), 'bool domain 1').to.be.false
      expect(domain_is_value(spec_d_create_ranges([1, 1]), 0), 'value 1').to.be.false
      expect(domain_is_value(spec_d_create_ranges([50, 50]), 25), 'value 50').to.be.false

    it 'should not even consider domains when range count isnt 1', ->

      expect(domain_is_value([]), 'empty').to.be.false
      expect(domain_is_value(spec_d_create_ranges([1, 1], [3, 3]), 1), 'first range 1 with second range').to.be.false
      expect(domain_is_value(spec_d_create_ranges([1, 1], [3, 3]), 3), 'first range 1 with second range 3').to.be.false
      expect(domain_is_value(spec_d_create_ranges([10, 20], [50, 50]), 50), 'two ranges').to.be.false

  describe 'domain_remove_value_inline', ->

    {domain_remove_value_inline} = Domain

    it 'should exist', ->

      expect(domain_remove_value_inline?).to.be.true

    it 'should require a domain', ->

      expect(-> domain_remove_value_inline null, 15).to.throw()

    it 'should accept an empty domain', ->

      arr =  []
      domain_remove_value_inline arr, 15
      expect(arr).to.eql []

    it 'should return a domain without given value', ->

      arr = spec_d_create_range 0, 30
      domain_remove_value_inline arr, 15
      expect(arr).to.eql spec_d_create_ranges([0, 14], [16, 30])

    it 'should keep unrelated ranges', ->

      arr = spec_d_create_ranges [0, 10], [12, 20], [22, 30]
      domain_remove_value_inline arr, 15
      expect(arr).to.eql spec_d_create_ranges([0, 10], [12, 14], [16, 20], [22, 30])

  describe 'is_simplified', ->

    is_simplified = Domain._is_simplified

    it 'should exist', ->

      # exposed for testing only
      expect(is_simplified?).to.be.true

    it 'should require a domain', ->

      expect(-> is_simplified()).to.throw()

    it 'should accept empty domain', ->

      expect(is_simplified []).to.be.true

    describe 'single ranged domain', ->

      it 'should accept domain with proper range', ->

        expect(is_simplified spec_d_create_bool()).to.be.true

      it 'should accept domain with proper range of 1', ->

        expect(is_simplified spec_d_create_range(15, 15)).to.be.true

      it 'should reject domain with inverted range', ->

        expect(-> is_simplified spec_d_create_range(1, 0)).to.throw()

    describe 'multiple ranges in domain', ->

      it 'should accept multiple properly ordered non-overlapping ranges', ->

        expect(is_simplified spec_d_create_ranges([5, 10], [15, 20])).to.be.true
#        expect(is_simplified spec_d_create_ranges([5, 6], [7, 8], [9, 10])).to.be.true
#        expect(is_simplified spec_d_create_ranges([5, 6], [7, 8], [9, 10], [100, 200])).to.be.true

      it 'should throw if two ranges overlap despite ordering', ->

        expect(is_simplified spec_d_create_ranges([10, 15], [13, 19], [50, 60])).to.be.false # start
        expect(is_simplified spec_d_create_ranges([1, 3], [10, 15], [13, 19], [70, 75])).to.be.false # middle
        expect(is_simplified spec_d_create_ranges([1, 3], [10, 15], [16, 19], [18, 25])).to.be.false #end

      it 'should reject if two ranges touch', ->

        expect(is_simplified spec_d_create_ranges([0, 1], [1, 2])).to.be.false

      it 'should reject if at least one range is inverted', ->

        expect(-> is_simplified spec_d_create_ranges([15, 10], [40, 50], [55, 60])).to.throw() # start
        expect(-> is_simplified spec_d_create_ranges([10, 15], [50, 40], [55, 60])).to.throw() # middle
        expect(-> is_simplified spec_d_create_ranges([10, 15], [40, 50], [65, 60])).to.throw() # end

  describe 'merge_overlapping_inline', ->

    {
      INLINE
      NOT_INLINE
      _merge_overlapping_inline: merge_overlapping_inline
    } = FD.domain

    it 'should exist', ->

      expect(merge_overlapping_inline?).to.be.true

    describe 'empty domain', ->

      it 'should return empty array for empty domain', ->

        expect(merge_overlapping_inline []).to.eql []

      it 'should return same array', ->

        arr = []
        expect(merge_overlapping_inline arr).to.equal arr

    describe 'non-empty domain', ->

      describe 'return value', ->
        it 'should be same array if unchanged', ->

          arr = spec_d_create_ranges([0, 1], [10, 20], [30, 40])
          expect(merge_overlapping_inline arr).to.equal arr
          expect(arr).to.eql spec_d_create_ranges([0, 1], [10, 20], [30, 40])

        it 'should be same array if changed', ->

          arr = spec_d_create_ranges([0, 1], [10, 20], [20, 40])
          expect(merge_overlapping_inline arr).to.equal arr
          expect(arr).to.eql spec_d_create_ranges([0, 1], [10, 40])

        it 'should be same array for single range', ->

          arr = spec_d_create_bool()
          expect(merge_overlapping_inline arr).to.equal arr
          expect(arr).to.eql spec_d_create_bool()

      it 'should return same range for single range domain', ->

        expect(merge_overlapping_inline spec_d_create_range(10, 100)).to.eql spec_d_create_range(10, 100)
        expect(merge_overlapping_inline spec_d_create_range(30, 213)).to.eql spec_d_create_range(30, 213)
        expect(merge_overlapping_inline spec_d_create_bool()).to.eql spec_d_create_bool()

      it 'should return same if not overlapping', ->

        expect(merge_overlapping_inline spec_d_create_ranges([10, 100], [200, 300])).to.eql spec_d_create_ranges([10, 100], [200, 300])
        expect(merge_overlapping_inline spec_d_create_ranges([0, 0], [2, 2])).to.eql spec_d_create_ranges([0, 0], [2, 2])

      it 'should merge if two domains overlap', ->

        expect(merge_overlapping_inline spec_d_create_ranges([0, 1], [1, 2])).to.eql spec_d_create_range(0, 2)
        expect(merge_overlapping_inline spec_d_create_ranges([0, 50], [25, 75])).to.eql spec_d_create_range(0, 75)
        expect(merge_overlapping_inline spec_d_create_ranges([213, 278], [244, 364])).to.eql spec_d_create_range(213, 364)
        expect(merge_overlapping_inline spec_d_create_ranges([10, 20], [30, 40], [35, 45], [50, 60])).to.eql spec_d_create_ranges([10, 20], [30, 45], [50, 60])

      it 'should merge if two domains touch', ->

        expect(merge_overlapping_inline spec_d_create_ranges([0, 0], [1, 1])).to.eql spec_d_create_bool()
        expect(merge_overlapping_inline spec_d_create_ranges([0, 1], [2, 3])).to.eql spec_d_create_range(0, 3)
        expect(merge_overlapping_inline spec_d_create_ranges([0, 10], [10, 20])).to.eql spec_d_create_range(0, 20)

      it 'should chain merges', ->

        expect(merge_overlapping_inline spec_d_create_ranges([0, 0], [1, 1], [2, 2])).to.eql spec_d_create_range(0, 2)
        expect(merge_overlapping_inline spec_d_create_ranges([0, 1], [1, 2], [2, 3])).to.eql spec_d_create_range(0, 3)
        expect(merge_overlapping_inline spec_d_create_ranges([0, 0], [1, 2], [2, 3])).to.eql spec_d_create_range(0, 3)

      it 'should make sure resulting range wraps both ranges', ->

        expect(merge_overlapping_inline spec_d_create_ranges([0, 0], [0, 1])).to.eql spec_d_create_bool()
        expect(merge_overlapping_inline spec_d_create_ranges([0, 1], [0, 0])).to.eql spec_d_create_bool()
        expect(merge_overlapping_inline spec_d_create_ranges([0, 10], [14, 16], [15, 20], [16, 19], [17, 18])).to.eql spec_d_create_ranges([0, 10], [14, 20])

  describe 'domain_simplify', ->

    {
      INLINE
      NOT_INLINE
      domain_simplify
    } = Domain

    describe 'should exist', ->

      it 'domain_simplify', ->

        expect(domain_simplify?).to.be.true

      it 'INLINE', ->

        expect(INLINE?).to.be.true

      it 'NOT_INLINE', ->

        expect(NOT_INLINE?).to.be.true

    it 'should throw without a domain', ->

      expect(-> domain_simplify()).to.throw()

    # test both empty domains and the case where the domain actually requires an action

    describe 'if flag=INLINE', ->
      # and the array should be updated to reflect the result (tested elsewhere)

      it 'should work with empty domain', ->

        arr = []
        expect(domain_simplify arr, INLINE).to.equal arr

      it 'should work with single ranged domain', ->

        arr = spec_d_create_bool()
        expect(domain_simplify arr, INLINE).to.equal arr

      it 'should work if domain is not changed', ->

        arr = spec_d_create_ranges([1, 2], [20, 30])
        expect(domain_simplify arr, INLINE).to.equal arr

      it 'should work if domain is changed', ->

        arr = spec_d_create_ranges([1, 2], [2, 3])
        expect(domain_simplify arr, INLINE).to.equal arr
        expect(arr).to.eql spec_d_create_range(1, 3)

    describe 'if flag=NOT_INLINE', ->

      it 'should work with empty domain', ->

        arr = []
        expect(domain_simplify arr, NOT_INLINE).to.not.equal arr
        expect(arr).to.eql []
        expect(domain_simplify [], NOT_INLINE).to.eql []

      it 'should work with single ranged domain', ->

        arr = spec_d_create_bool()
        expect(domain_simplify arr, NOT_INLINE).to.not.equal arr
        expect(arr).to.eql spec_d_create_bool()
        expect(domain_simplify spec_d_create_bool(), NOT_INLINE).to.eql spec_d_create_bool()

      it 'should work if domain is not changed', ->

        arr = spec_d_create_ranges([1, 2], [20, 30])
        expect(domain_simplify arr, NOT_INLINE).to.not.equal arr
        expect(arr).to.eql spec_d_create_ranges([1, 2], [20, 30])
        expect(domain_simplify spec_d_create_ranges([1, 2], [20, 30]), NOT_INLINE).to.eql spec_d_create_ranges([1, 2], [20, 30])

      it 'should work if domain is changed', ->

        arr = spec_d_create_ranges([1, 2], [2, 3])
        expect(domain_simplify arr, NOT_INLINE).to.not.equal arr
        expect(arr).to.eql spec_d_create_ranges([1, 2], [2, 3]) # unchanged
        expect(domain_simplify spec_d_create_ranges([1, 2], [2, 3]), NOT_INLINE).to.eql spec_d_create_range(1, 3)

    describe 'if flag is not given flag is NOT_INLINE', ->
      # confirm that the original array is unchanged and the output is as expected

      it 'should work with empty domain', ->

        arr = []
        expect(domain_simplify arr).to.not.equal arr
        expect(arr).to.eql []
        expect(domain_simplify []).to.eql []

      it 'should work with single ranged domain', ->

        arr = spec_d_create_bool()
        expect(domain_simplify arr).to.not.equal arr
        expect(arr).to.eql spec_d_create_bool()
        expect(domain_simplify spec_d_create_bool()).to.eql spec_d_create_bool()

      it 'should work if domain is not changed', ->

        arr = spec_d_create_ranges([1, 2], [20, 30])
        expect(domain_simplify arr).to.not.equal arr
        expect(arr).to.eql spec_d_create_ranges([1, 2], [20, 30])
        expect(domain_simplify spec_d_create_ranges([1, 2], [20, 30])).to.eql spec_d_create_ranges([1, 2], [20, 30])

      it 'should work if domain is changed', ->

        arr = spec_d_create_ranges([1, 2], [2, 3])
        expect(domain_simplify arr).to.not.equal arr
        expect(arr).to.eql spec_d_create_ranges([1, 2], [2, 3]) # unchanged
        expect(domain_simplify spec_d_create_ranges([1, 2], [2, 3])).to.eql spec_d_create_range(1, 3)

    it 'should merge unordered overlapping ranges', ->
      # properly tested in sub-function

      expect(domain_simplify spec_d_create_ranges([2, 3], [1, 2])).to.eql spec_d_create_range(1, 3)

  describe 'domain_intersection', ->

    {domain_intersection} = Domain

    it 'should exist', ->

      expect(domain_intersection?).to.be.true

    describe 'args', ->

      it 'should require two domains', ->

        expect(-> domain_intersection()).to.throw()
        expect(-> domain_intersection []).to.throw()
        expect(-> domain_intersection null, []).to.throw()

      it 'should handle empty domains', ->

        expect(domain_intersection [], []).to.eql []

      it 'should return a fresh array', ->

        arr1 = []
        arr2 = []
        out = domain_intersection arr1, arr2
        expect(arr1).to.not.equal out
        expect(arr2).to.not.equal out

      it 'should handle empty domain with single element domain', ->

        expect(domain_intersection [], spec_d_create_bool()).to.eql []

      it 'should handle empty domain with multi element domain', ->

        expect(domain_intersection [], spec_d_create_ranges([0, 1], [3, 5])).to.eql []

      it 'should handle single element domain with empty domain', ->

        expect(domain_intersection spec_d_create_bool(), []).to.eql []

      it 'should handle single element domain with empty domain', ->

        expect(domain_intersection spec_d_create_ranges([0, 1], [3, 5]), []).to.eql []

      it 'should handle single element domains', ->

        expect(domain_intersection spec_d_create_bool(), spec_d_create_range(3, 5)).to.eql []

      it 'should intersect single element domains', ->

        expect(domain_intersection spec_d_create_range(0, 5), spec_d_create_range(3, 10)).to.eql spec_d_create_range(3, 5)

      it 'should intersect single element domains reversed', ->

        expect(domain_intersection spec_d_create_range(3, 10), spec_d_create_range(0, 5)).to.eql spec_d_create_range(3, 5)

      it 'should handle single element domain with multi element domain', ->

        expect(domain_intersection spec_d_create_bool(), spec_d_create_ranges([10, 20], [30, 40])).to.eql []

      it 'should handle multi element domain with single element domain', ->

        expect(domain_intersection spec_d_create_ranges([0, 1], [10, 20]), spec_d_create_range(30, 40)).to.eql []

      it 'should intersect single element domain with multi element domain', ->

        expect(domain_intersection spec_d_create_range(5, 15), spec_d_create_ranges([10, 20], [30, 40])).to.eql spec_d_create_range(10, 15)

      it 'should intersect multi element domain with single element domain', ->

        expect(domain_intersection spec_d_create_ranges([0, 1], [25, 35]), spec_d_create_range(30, 40)).to.eql spec_d_create_range(30, 35)

      it 'should handle multi element domains', ->

        expect(domain_intersection spec_d_create_ranges([0, 1], [10, 20]), spec_d_create_ranges([30, 40], [50, 60])).to.eql []

      it 'should intersect multi element domains', ->

        expect(domain_intersection spec_d_create_ranges([0, 1], [10, 35]), spec_d_create_ranges([30, 40], [50, 60])).to.eql spec_d_create_range(30, 35)

      it 'should return two ranges if a range in one domain intersects with two ranges of the other domain', ->

        expect(domain_intersection spec_d_create_range(15, 35), spec_d_create_ranges([10, 20], [30, 40])).to.eql spec_d_create_ranges([15, 20], [30, 35])

      it 'should divide and conquer some random tests 1', ->
        # copy(JSON.stringify(function f(n) {
        #   var arr = [];
        #   while (--n > 0) {
        #     var t = Math.floor(Math.random() * 100);
        #     arr.push(t, t+Math.floor(Math.random() * 20));
        #   }
        #   return arr;
        # }(10).map(function(a){
        #   return [Math.min(a[0],a[1]), Math.max(a[0], a[1])];
        # })).replace(/,/g, ', '))

        a = spec_d_create_ranges([10,23],[29,38],[49,49],[54,68],[77,78],[84,100])
        b = spec_d_create_ranges([1,1],[3,21],[25,38],[54,67],[70,84],[88,107])
        expect(domain_intersection a, b).to.eql spec_d_create_ranges([10,21],[29,38],[54,67],[77,78],[84,84],[88,100])

      it 'should divide and conquer some random tests 2', ->

        a = spec_d_create_ranges([17, 23], [37, 78], [85, 104])
        b = spec_d_create_ranges([6,25],[47,56],[58,60],[64,67],[83,103])
        expect(domain_intersection a, b).to.eql spec_d_create_ranges([17,23],[47,56],[58,60],[64,67],[85,103])

      it 'should divide and conquer some random tests 3', ->

        a = spec_d_create_ranges([9,36],[54,66],[74,77],[84,96])
        b = spec_d_create_range(1, 75)
        expect(domain_intersection a, b).to.eql spec_d_create_ranges([9,36],[54,66],[74,75])

  describe 'domain_equal', ->

    {domain_equal} = Domain

    it 'should exist', ->

      expect(domain_equal?).to.be.true

    it 'should return false unconditionally if domain lengths are unequal', ->

      expect(domain_equal [], spec_d_create_range(1, 10)).to.be.false
      expect(domain_equal spec_d_create_range(1, 10), []).to.be.false
      expect(domain_equal spec_d_create_ranges([1, 1], [10, 10]), spec_d_create_range(1, 1)).to.be.false

    it 'should be able to compare single element domains', ->

      expect(domain_equal spec_d_create_range(32, 84), spec_d_create_range(32, 84)).to.be.true

    it 'should return true for same reference', ->

      domain = spec_d_create_range(32, 84)
      expect(domain_equal domain, domain).to.be.true

    it 'should reject if any bound is different', ->

      expect(domain_equal spec_d_create_range(1, 84), spec_d_create_range(32, 84)).to.be.false
      expect(domain_equal spec_d_create_range(1, 84), spec_d_create_range(1, 34)).to.be.false
      expect(domain_equal spec_d_create_range(32, 100), spec_d_create_range(132, 184)).to.be.false

    it 'should be able to deep comparison accept', ->

      expect(domain_equal spec_d_create_ranges([1,1],[3,21],[25,38],[54,67],[70,84],[88,107]), spec_d_create_ranges([1,1],[3,21],[25,38],[54,67],[70,84],[88,107])).to.be.true

    it 'should be able to deep comparison reject', ->

      expect(domain_equal spec_d_create_ranges([1,1],[3,21],[26,39],[54,67],[70,84],[88,107]), spec_d_create_ranges([1,1],[3,21],[25,38],[54,67],[70,84],[88,107])).to.be.false

  describe 'domain_complement', ->

    {SUP} = FD.helpers
    {domain_complement} = Domain

    it 'should exist', ->

      expect(domain_complement?).to.be.true
      expect(SUP?).to.be.true # make sure test setup is proper

    it 'should require a domain', ->

      expect(-> domain_complement()).to.throw()

    it 'should accept an empty array', ->

      expect(domain_complement []).to.eql spec_d_create_ranges([0, SUP])

    it 'should invert a domain', ->

      expect(domain_complement spec_d_create_ranges([5, 10], [100, 200])).to.eql spec_d_create_ranges([0,4],[11,99],[201,SUP])

    it 'should handle domains starting at 0 properly', ->

      expect(domain_complement spec_d_create_range(0, 100)).to.eql spec_d_create_ranges([101, SUP])

    it 'should handle domains ending at SUP properly', ->

      expect(domain_complement spec_d_create_ranges([100, SUP])).to.eql spec_d_create_range(0, 99)

    it 'should handle domains starting at 0 and ending at SUP properly', ->

      expect(domain_complement spec_d_create_ranges([0, 500], [600, 900], [1000, SUP])).to.eql spec_d_create_ranges([501, 599], [901, 999])

    it 'should add 0 if starting at 1', ->

      expect(domain_complement spec_d_create_range(1, 100)).to.eql spec_d_create_ranges([0,0],[101, SUP])

    it 'should add SUP if ending at SUP-1', ->

      expect(domain_complement spec_d_create_range(100, SUP-1)).to.eql spec_d_create_ranges([0, 99], [SUP, SUP])

    it 'should return a fresh array', ->

      arr = spec_d_create_ranges([10,23],[29,38],[49,49],[54,68],[77,78],[84,100])
      expect(domain_complement arr).to.not.equal arr

    it 'should not change the input domain', ->

      arr = spec_d_create_ranges([10,23],[29,38],[49,49],[54,68],[77,78],[84,100])
      clone = arr.slice 0
      domain_complement arr
      expect(arr).to.eql clone

    it 'should return same value when applied twice', ->

      arr = spec_d_create_ranges([10,23],[29,38],[49,49],[54,68],[77,78],[84,100])
      expect(domain_complement domain_complement arr.slice 0).to.eql arr

#  describe 'domain_close_gaps_inline', ->
#
#    domain_close_gaps_inline = Domain._domain_close_gaps_inline
#
#    it 'should exist', ->
#
#      expect(domain_close_gaps_inline?).to.be.true
#
#    it 'should requires two domains', ->
#
#      expect(-> domain_close_gaps_inline()).to.throw()
#      expect(-> domain_close_gaps_inline []).to.throw()
#      expect(-> domain_close_gaps_inline undefined, []).to.throw()
#
#    it 'should accept empty domains', ->
#
#      expect(domain_close_gaps_inline [], []).to.eql undefined
#
#    it 'should not change anything if left domain is empty', ->
#
#      a = []
#      b = spec_d_create_ranges([10,23],[29,38],[49,49],[54,68],[77,78],[84,100])
#      a_clone = a.slice 0
#      b_clone = b.slice 0
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql a_clone
#      expect(b).to.eql b_clone
#
#    it 'should not change anything if right domain is empty', ->
#
#      a = spec_d_create_ranges([10,23],[29,38],[49,49],[54,68],[77,78],[84,100])
#      b = []
#      a_clone = a.slice 0
#      b_clone = b.slice 0
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql a_clone
#      expect(b).to.eql b_clone
#
#    it 'should close gaps in right domain of len of only range in left domain', ->
#
#      a = spec_d_create_range(10, 20) # note: len is 11 because ranges are inclusive
#      b = spec_d_create_ranges([100, 110], [120, 200], [300, 310], [321, 400]) # both gaps should be closed
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql spec_d_create_range(10, 20) # had no gaps to close
#      expect(b).to.eql spec_d_create_ranges([100, 200], [300, 400])
#
#    it 'should not close bigger gaps', ->
#
#      a = spec_d_create_range(10, 20) # note: len is 11 because ranges are inclusive
#      b = spec_d_create_ranges([300, 310], [322, 400]) # gap is 12
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql spec_d_create_range(10, 20)
#      expect(b).to.eql spec_d_create_ranges([300, 310], [322, 400])
#
#    it 'should close gaps in left domain of len of only range in right domain', ->
#
#      a = spec_d_create_ranges([100, 110], [120, 200], [300, 310], [321, 400]) # both gaps should be closed
#      b = spec_d_create_range(10, 20) # note: len is 11 because ranges are inclusive
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql spec_d_create_ranges([100, 200], [300, 400])
#      expect(b).to.eql spec_d_create_range(10, 20) # had no gaps to close
#
#    it 'should close gaps in left and right', ->
#
#      a = spec_d_create_ranges([100, 110], [120, 200], [300, 310], [321, 400]) # both gaps should be closed
#      b = spec_d_create_range(10, 20) # note: len is 11 because ranges are inclusive
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql spec_d_create_ranges([100, 200], [300, 400])
#      expect(b).to.eql spec_d_create_range(10, 20) # had no gaps to close
#
#    it 'should revisit domains after one (double) cycle if min size grew', ->
#      a = spec_d_create_ranges([1,2],[4,5],[8,900]);
#      b = spec_d_create_ranges([1,2],[4,5],[8,900]);
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      # first min size is 2, so 1~2..4~5 is closed but not 4~5-8~900,
#      # then min size becomes 5 and 1~5..8~900 is closed.
#      # (that holds both ways) so we end up with 1~900
#      expect(a).to.eql spec_d_create_range(1, 900)
#      expect(b).to.eql spec_d_create_range(1, 900)

  describe 'domain_plus', ->

    {domain_plus} = Domain

    it 'should exist', ->

      expect(domain_plus?).to.be.true

    it 'should require domains', ->

      expect(-> domain_plus()).to.throw()
      expect(-> domain_plus []).to.throw()
      expect(-> domain_plus null, []).to.throw()

    it 'should accept empty domains', ->

      expect(domain_plus [], []).to.eql []

    it 'should accept empty domains', ->

      expect(domain_plus [], []).to.eql []
      a = []
      expect(domain_plus a, []).to.not.equal a
      a = []
      expect(domain_plus [], a).to.not.equal a

    it 'should add two ranges', ->

      expect(domain_plus spec_d_create_range(5, 10), spec_d_create_range(50, 60)).to.eql spec_d_create_range(55, 70)

    it 'should add two domains', ->

      a = spec_d_create_ranges([5, 10], [20, 35])
      b = spec_d_create_ranges([50, 60], [110, 128])
      expect(domain_plus a, b).to.eql spec_d_create_ranges([55, 95], [115, 163])

    it 'should add two domains', ->

      a = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      expect(domain_plus a, b).to.eql spec_d_create_ranges([0, 2], [4, 34])

  describe 'domain_mul', ->

    {domain_mul} = Domain

    it 'should exist', ->

      expect(domain_mul?).to.be.true

    it 'should require domains', ->

      expect(-> domain_mul()).to.throw()
      expect(-> domain_mul []).to.throw()
      expect(-> domain_mul null, []).to.throw()

    it 'should accept empty domains', ->

      expect(domain_mul [], []).to.eql []

    it 'should accept empty domains', ->

      expect(domain_mul [], []).to.eql []
      a = []
      expect(domain_mul a, []).to.not.equal a
      a = []
      expect(domain_mul [], a).to.not.equal a

    it 'should return empty domain if one is empty', ->

      a = spec_d_create_ranges([0, 1], [4, 5], [7, 8], [10, 12], [15, 17])
      expect(domain_mul (a.slice 0), []).to.eql []
      expect(domain_mul [], (a.slice 0)).to.eql []
      expect(domain_mul a, []).to.not.equal a

    it 'should multiply two ranges', ->

      expect(domain_mul spec_d_create_range(5, 10), spec_d_create_range(50, 60)).to.eql spec_d_create_range(250, 600)

    it 'should multiply two domains', ->

      a = spec_d_create_ranges([5, 10], [20, 35])
      b = spec_d_create_ranges([50, 60], [110, 128])
      expect(domain_mul a, b).to.eql spec_d_create_ranges([250, 2100], [2200, 4480])

    it 'should multiply two domains', ->

      a = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      expect(domain_mul a, b).to.eql spec_d_create_ranges([0, 204], [225, 289])

  describe 'domain_minus', ->

    {domain_minus} = Domain

    it 'should exist', ->

      expect(domain_minus?).to.be.true

    it 'should require domains', ->

      expect(-> domain_minus()).to.throw()
      expect(-> domain_minus []).to.throw()
      expect(-> domain_minus null, []).to.throw()

    it 'should accept empty domains', ->

      expect(domain_minus [], []).to.eql []

    it 'should accept empty domains', ->

      expect(domain_minus [], []).to.eql []
      a = []
      expect(domain_minus a, []).to.not.equal a
      a = []
      expect(domain_minus [], a).to.not.equal a

    it 'should return empty domain if one is empty', ->

      a = spec_d_create_ranges([0, 1], [4, 5], [7, 8], [10, 12], [15, 17])
      expect(domain_minus (a.slice 0), []).to.eql []
      expect(domain_minus [], (a.slice 0)).to.eql []
      expect(domain_minus a, []).to.not.equal a

    it 'should subtract one range by another', ->

      expect(domain_minus spec_d_create_range(5, 10), spec_d_create_range(50, 60)).to.eql []

    it 'should subtract one domain by another', ->

      a = spec_d_create_ranges([5, 10], [20, 35])
      b = spec_d_create_ranges([50, 60], [110, 128])
      expect(domain_minus a, b).to.eql []

    it 'should multiply one domain by another', ->

      a = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      expect(domain_minus a, b).to.eql spec_d_create_range(0, 17)

  describe 'domain_divby', ->

    {SUP} = FD.helpers
    {domain_divby} = Domain

    it 'should exist', ->

      expect(domain_divby?).to.be.true
      expect(SUP?).to.be.true

    it 'should require domains', ->

      expect(-> domain_divby()).to.throw()
      expect(-> domain_divby []).to.throw()
      expect(-> domain_divby null, []).to.throw()

    it 'should accept empty domains', ->

      expect(domain_divby [], []).to.eql []

    it 'should accept empty domains', ->

      expect(domain_divby [], []).to.eql []
      a = []
      expect(domain_divby a, []).to.not.equal a
      a = []
      expect(domain_divby [], a).to.not.equal a

    it 'should return empty domain if one is empty', ->

      a = spec_d_create_ranges([0, 1], [4, 5], [7, 8], [10, 12], [15, 17])
      expect(domain_divby (a.slice 0), []).to.eql []
      expect(domain_divby [], (a.slice 0)).to.eql []
      expect(domain_divby a, []).to.not.equal a

    it 'should divide one range from another', ->

      expect(domain_divby spec_d_create_range(50, 60), spec_d_create_range(5, 10)).to.eql spec_d_create_range(5, 12)

    it 'should divide one domain from another; floored', ->

      a = spec_d_create_ranges([5, 10], [20, 35])
      b = spec_d_create_ranges([50, 60], [110, 128])
      expect(domain_divby a, b, true).to.eql [0, 0] # would be [0.0390625, 0.7] which gets floored to [0, 0.7] so [0,0]

    it 'should divide one domain from another (2); floored', ->

      a = spec_d_create_ranges([1, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([1, 1], [4, 12], [15, 17])
      expect(domain_divby a, b, true).to.eql spec_d_create_ranges([0, 12], [15, 17])

    it 'should divide one domain from another; integer', ->

      a = spec_d_create_ranges([5, 10], [20, 35])
      b = spec_d_create_ranges([50, 60], [110, 128])
      expect(domain_divby a, b, false).to.eql [] # would be [0.0390625, 0.7] but there are no ints in between that so its empty

    it 'should divide one domain from another (2); integer', ->

      a = spec_d_create_ranges([1, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([1, 1], [4, 12], [15, 17])
      expect(domain_divby a, b, false).to.eql spec_d_create_ranges([1, 12], [15, 17])

    it 'divide by zero should blow up', ->

      a = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      expect(domain_divby a, b).to.eql spec_d_create_ranges([0, SUP])

    describe 'simple examples', ->

      doit = (a, b, c) ->

        it 'should pass ['+a+'] / ['+b+'] = ['+c+']', ->

          expect(domain_divby a, b).to.eql c

      doit [50, 60], [5, 5], [10, 12]
      doit [50, 50, 60, 60], [5, 5], [10, 10, 12, 12]
      doit [50, 60], [5, 5, 10, 10], [5, 6, 10, 12]
      doit [50, 60], [5, 10], [5, 12]
      doit [0, 0], [5, 10], [0, 0]
      doit [0, 1], [5, 10], [0, 0] # because all results are <1
      doit [0, 10], [2, 2], [0, 5]
      doit [5, 10], [0, 0], []
      doit [5, 10], [0, 1], [5, SUP]

  describe 'domain_is_solved', ->

    {SUP} = FD.helpers
    {domain_is_solved} = FD.domain

    it 'should exist', ->

      expect(domain_is_solved?).to.be.true

    it 'should return true if a domain covers exactly one value', ->

      expect(domain_is_solved spec_d_create_value 0).to.be.true
      expect(domain_is_solved spec_d_create_value 1).to.be.true
      expect(domain_is_solved spec_d_create_value 18).to.be.true
      expect(domain_is_solved spec_d_create_value SUP).to.be.true

    it 'should return false if a domain is empty', ->

      expect(domain_is_solved []).to.be.false

    it 'should return false if a domain covers more than one value', ->

      expect(domain_is_solved spec_d_create_range 0, 1).to.be.false
      expect(domain_is_solved spec_d_create_range 18, 20).to.be.false
      expect(domain_is_solved spec_d_create_range 50, SUP).to.be.false
      expect(domain_is_solved spec_d_create_range 0, SUP).to.be.false
      expect(domain_is_solved spec_d_create_ranges [0, 1], [5, 10]).to.be.false
      expect(domain_is_solved spec_d_create_ranges [0, 1], [5, SUP]).to.be.false
      expect(domain_is_solved spec_d_create_ranges [5, 8], [50, SUP]).to.be.false
      expect(domain_is_solved spec_d_create_ranges [5, 8], [23, 34], [50, SUP]).to.be.false

  describe 'domain_is_rejected', ->

    {SUP} = FD.helpers
    {domain_is_rejected} = FD.domain

    it 'should exist', ->

      expect(domain_is_rejected?).to.be.true

    it 'should return true if a domain is empty', ->

      expect(domain_is_rejected []).to.be.true

    it 'should return false if a domain covers exactly one value', ->

      expect(domain_is_rejected spec_d_create_value 0).to.be.false
      expect(domain_is_rejected spec_d_create_value 1).to.be.false
      expect(domain_is_rejected spec_d_create_value 18).to.be.false
      expect(domain_is_rejected spec_d_create_value SUP).to.be.false

    it 'should return false if a domain covers more than one value', ->

      expect(domain_is_rejected spec_d_create_range 0, 1).to.be.false
      expect(domain_is_rejected spec_d_create_range 18, 20).to.be.false
      expect(domain_is_rejected spec_d_create_range 50, SUP).to.be.false
      expect(domain_is_rejected spec_d_create_range 0, SUP).to.be.false
      expect(domain_is_rejected spec_d_create_ranges [0, 1], [5, 10]).to.be.false
      expect(domain_is_rejected spec_d_create_ranges [0, 1], [5, SUP]).to.be.false
      expect(domain_is_rejected spec_d_create_ranges [5, 8], [50, SUP]).to.be.false
      expect(domain_is_rejected spec_d_create_ranges [5, 8], [23, 34], [50, SUP]).to.be.false

  describe 'domain_is_determined', ->

    {SUP} = FD.helpers
    {domain_is_determined} = FD.domain

    it 'should exist', ->

      expect(domain_is_determined?).to.be.true

    it 'should return true if a domain is empty', ->

      expect(domain_is_determined []).to.be.true

    it 'should return true if a domain covers exactly one value', ->

      expect(domain_is_determined spec_d_create_value 0).to.be.true
      expect(domain_is_determined spec_d_create_value 1).to.be.true
      expect(domain_is_determined spec_d_create_value 18).to.be.true
      expect(domain_is_determined spec_d_create_value SUP).to.be.true

    it 'should return false if a domain covers more than one value', ->

      expect(domain_is_determined spec_d_create_range 0, 1).to.be.false
      expect(domain_is_determined spec_d_create_range 18, 20).to.be.false
      expect(domain_is_determined spec_d_create_range 50, SUP).to.be.false
      expect(domain_is_determined spec_d_create_range 0, SUP).to.be.false
      expect(domain_is_determined spec_d_create_ranges [0, 1], [5, 10]).to.be.false
      expect(domain_is_determined spec_d_create_ranges [0, 1], [5, SUP]).to.be.false
      expect(domain_is_determined spec_d_create_ranges [5, 8], [50, SUP]).to.be.false
      expect(domain_is_determined spec_d_create_ranges [5, 8], [23, 34], [50, SUP]).to.be.false

  describe 'domain_set_to_range_inline', ->

    {SUP} = FD.helpers
    {domain_set_to_range_inline} = FD.domain

    it 'should exist', ->

      expect(domain_set_to_range_inline?).to.be.true

    it 'should update a domain to given range', ->

      arr = []
      domain_set_to_range_inline arr, 0, 0
      expect(arr).to.eql spec_d_create_range(0, 0)

      arr = []
      domain_set_to_range_inline arr, 0, 1
      expect(arr).to.eql spec_d_create_range(0, 1)

      arr = []
      domain_set_to_range_inline arr, 50, 100
      expect(arr).to.eql spec_d_create_range(50, 100)

      arr = []
      domain_set_to_range_inline arr, 0, SUP
      expect(arr).to.eql spec_d_create_range(0, SUP)

      arr = []
      domain_set_to_range_inline arr, SUP, SUP
      expect(arr).to.eql spec_d_create_range(SUP, SUP)

    it 'should throw for imblalanced ranges', ->

      expect(-> domain_set_to_range_inline [], 27, 0).to.throw()

    it 'should update the array inline', ->

      arr = []
      domain_set_to_range_inline arr, 0, 1
      expect(arr).to.eql spec_d_create_range(0, 1)

    it 'should clobber existing values', ->

      arr = spec_d_create_range(50, 100)
      domain_set_to_range_inline arr, 0, 1
      expect(arr).to.eql spec_d_create_range(0, 1)

    it 'should ensure the result is one range', ->

      arr = spec_d_create_ranges([50, 100], [150, 200], [300, 500])
      domain_set_to_range_inline arr, 110, 175
      expect(arr).to.eql spec_d_create_range(110, 175)

  describe 'domain_sort_by_range', ->

    {_domain_sort_by_range: domain_sort_by_range} = FD.domain

    it 'should exist', ->

      expect(domain_sort_by_range?).to.be.true

    it 'should throw for emtpy domains', ->

      expect(-> domain_sort_by_range []).to.throw()

    it 'should return nothing', ->

      expect(domain_sort_by_range [0, 1]).to.be.undefined

    it 'should keep pairs sorted', ->

      arr = [0, 1, 2, 3]
      domain_sort_by_range arr
      expect(arr).to.eql [0, 1, 2, 3]

    it 'should sort range pairs by lo', ->

      arr = [2, 3, 0, 1]
      domain_sort_by_range arr
      expect(arr).to.eql [0, 1, 2, 3]

    it 'should sort range pairs by hi if lo is equal', ->

      arr = [2, 3, 2, 1]
      domain_sort_by_range arr
      expect(arr).to.eql [2, 1, 2, 3]

    it 'should not change domain if already sorted even when lo is equal', ->

      arr = [2, 3, 2, 6]
      domain_sort_by_range arr
      expect(arr).to.eql [2, 3, 2, 6]

    it 'should accept solved domains', ->

      arr = [50, 50]
      domain_sort_by_range arr
      expect(arr).to.eql [50, 50]

    it 'should allow single value ranges', ->

      arr = [0, 1, 5, 10, 3, 3]
      domain_sort_by_range arr
      expect(arr).to.eql [0, 1, 3, 3, 5, 10]

    it 'should work with 4 ranges', ->

      arr = [20, 30, 0, 1, 5, 10, 3, 3]
      domain_sort_by_range arr
      expect(arr).to.eql [0, 1, 3, 3, 5, 10, 20, 30]

    it 'should work with 5 ranges', ->

      arr = [20, 30, 0, 1, 18, 19, 5, 10, 3, 3]
      domain_sort_by_range arr
      expect(arr).to.eql [0, 1, 3, 3, 5, 10, 18, 19, 20, 30]

    it 'should work with 50 ranges', ->
      # arr = []
      # for i in [0...50]
      #   arr.push (x=Mathf.floor(Math.random() * 100)), x + Math.floor(Math.random() * 100)

      arr = [61, 104, 78, 130, 6, 92, 34, 51, 86, 109, 0, 32, 39, 62, 91, 96, 49, 134, 91, 163, 42, 105, 22, 78, 78, 133, 13, 111, 49, 141, 41, 134, 34, 57, 19, 27, 25, 64, 18, 75, 75, 151, 88, 127, 30, 74, 11, 59, 84, 107, 54, 91, 3, 85, 97, 167, 55, 103, 81, 174, 32, 55, 28, 87, 42, 69, 31, 118, 99, 137, 12, 94, 31, 98, 69, 162, 52, 89, 85, 126, 93, 160, 20, 53, 82, 88, 8, 46, 29, 75, 97, 146, 13, 35, 51, 125, 5, 18, 88, 178]
      domain_sort_by_range arr
      #console.log arr.filter((n,i)->i%2 is 0).join ', '
      expect(arr).to.eql [0, 32, 3, 85, 5, 18, 6, 92, 8, 46, 11, 59, 12, 94, 13, 35, 13, 111, 18, 75, 19, 27, 20, 53, 22, 78, 25, 64, 28, 87, 29, 75, 30, 74, 31, 98, 31, 118, 32, 55, 34, 51, 34, 57, 39, 62, 41, 134, 42, 69, 42, 105, 49, 134, 49, 141, 51, 125, 52, 89, 54, 91, 55, 103, 61, 104, 69, 162, 75, 151, 78, 130, 78, 133, 81, 174, 82, 88, 84, 107, 85, 126, 86, 109, 88, 127, 88, 178, 91, 96, 91, 163, 93, 160, 97, 146, 97, 167, 99, 137]

    it 'should work with 51 ranges', ->

      arr = [4,13,67,101,38,70,99,144,65,126,45,110,86,183,73,134,84,112,64,83,63,90,18,64,52,116,87,134,35,125,13,94,23,30,97,117,64,82,77,134,61,72,63,76,38,111,33,96,5,98,5,50,52,121,18,30,70,155,8,56,4,15,21,98,95,166,83,148,33,62,0,72,57,107,60,133,66,163,48,130,90,163,56,123,14,26,90,92,9,64,4,4,17,22,9,78,25,66,87,95,64,145]
      domain_sort_by_range arr
      #console.log arr.filter((n,i)->i%2 is 0).join ', '
      expect(arr).to.eql [0,72,4,4,4,13,4,15,5,50,5,98,8,56,9,64,9,78,13,94,14,26,17,22,18,30,18,64,21,98,23,30,25,66,33,62,33,96,35,125,38,70,38,111,45,110,48,130,52,116,52,121,56,123,57,107,60,133,61,72,63,76,63,90,64,82,64,83,64,145,65,126,66,163,67,101,70,155,73,134,77,134,83,148,84,112,86,183,87,95,87,134,90,92,90,163,95,166,97,117,99,144]

    it 'should work with 250 ranges', ->
      # this should be very fast.

      arr = [56,103,54,76,81,144,30,103,38,50,3,25,37,80,2,44,67,82,80,88,37,67,25,76,47,105,16,97,46,78,21,111,14,113,47,84,55,63,15,19,54,75,40,57,34,85,62,71,16,52,70,152,1,42,86,126,97,109,9,38,91,140,27,48,54,115,3,18,1,35,17,66,38,65,33,123,7,70,68,150,64,86,77,167,73,159,0,97,76,155,2,50,48,116,52,136,31,43,65,163,20,41,70,146,83,120,79,135,9,98,16,67,55,144,0,26,70,97,9,67,39,98,14,102,67,89,44,140,97,132,90,99,61,108,71,126,31,72,17,26,98,162,32,125,51,115,96,176,39,83,77,147,20,24,18,26,12,17,45,110,57,74,28,49,7,11,32,43,43,50,5,70,42,139,81,83,20,33,77,107,52,101,36,78,49,74,90,118,36,74,4,87,62,109,15,60,11,34,85,184,27,115,2,52,37,102,40,132,87,117,94,163,48,70,50,139,97,137,31,31,42,78,28,29,70,147,8,87,87,140,59,142,43,110,3,76,39,59,57,137,54,128,72,82,66,81,30,39,69,122,5,102,81,170,94,102,25,31,95,190,66,107,1,48,54,81,60,117,2,69,31,42,90,92,13,37,58,94,83,160,96,145,59,80,27,35,60,71,57,102,93,115,43,106,62,72,74,131,93,101,32,51,80,139,17,87,9,11,2,71,57,59,38,71,81,153,59,136,65,94,23,106,77,139,1,91,27,44,96,173,56,139,44,119,85,132,26,33,63,80,73,125,69,98,6,34,27,53,74,160,46,108,88,174,97,154,7,90,89,133,1,46,76,161,85,110,31,100,97,164,66,93,71,156,1,70,99,123,84,126,2,17,65,163,68,102,5,71,95,97,28,49,34,62,22,47,76,145,0,65,38,117,95,161,46,105,93,130,48,48,90,180,67,115,21,54,18,111,98,107,12,38,0,92,7,66,25,57,29,65,9,81,5,14,3,40,6,102,65,92,17,101,11,98,55,110,85,168,51,90,38,99,75,143,84,139,85,114,41,59,9,55,77,166,25,107,40,125,72,160,53,90,0,50,28,28,51,140,3,24,85,154,30,42,62,106,46,89,4,65,45,62,92,175,23,51,32,100,37,102]
      domain_sort_by_range arr
      #console.log arr.filter((n,i)->i%2 is 0).join ', '
      expect(arr).to.eql [0,26,0,50,0,65,0,92,0,97,1,35,1,42,1,46,1,48,1,70,1,91,2,17,2,44,2,50,2,52,2,69,2,71,3,18,3,24,3,25,3,40,3,76,4,65,4,87,5,14,5,70,5,71,5,102,6,34,6,102,7,11,7,66,7,70,7,90,8,87,9,11,9,38,9,55,9,67,9,81,9,98,11,34,11,98,12,17,12,38,13,37,14,102,14,113,15,19,15,60,16,52,16,67,16,97,17,26,17,66,17,87,17,101,18,26,18,111,20,24,20,33,20,41,21,54,21,111,22,47,23,51,23,106,25,31,25,57,25,76,25,107,26,33,27,35,27,44,27,48,27,53,27,115,28,28,28,29,28,49,28,49,29,65,30,39,30,42,30,103,31,31,31,42,31,43,31,72,31,100,32,43,32,51,32,100,32,125,33,123,34,62,34,85,36,74,36,78,37,67,37,80,37,102,37,102,38,50,38,65,38,71,38,99,38,117,39,59,39,83,39,98,40,57,40,125,40,132,41,59,42,78,42,139,43,50,43,106,43,110,44,119,44,140,45,62,45,110,46,78,46,89,46,105,46,108,47,84,47,105,48,48,48,70,48,116,49,74,50,139,51,90,51,115,51,140,52,101,52,136,53,90,54,75,54,76,54,81,54,115,54,128,55,63,55,110,55,144,56,103,56,139,57,59,57,74,57,102,57,137,58,94,59,80,59,136,59,142,60,71,60,117,61,108,62,71,62,72,62,106,62,109,63,80,64,86,65,92,65,94,65,163,65,163,66,81,66,93,66,107,67,82,67,89,67,115,68,102,68,150,69,98,69,122,70,97,70,146,70,147,70,152,71,126,71,156,72,82,72,160,73,125,73,159,74,131,74,160,75,143,76,145,76,155,76,161,77,107,77,139,77,147,77,166,77,167,79,135,80,88,80,139,81,83,81,144,81,153,81,170,83,120,83,160,84,126,84,139,85,110,85,114,85,132,85,154,85,168,85,184,86,126,87,117,87,140,88,174,89,133,90,92,90,99,90,118,90,180,91,140,92,175,93,101,93,115,93,130,94,102,94,163,95,97,95,161,95,190,96,145,96,173,96,176,97,109,97,132,97,137,97,154,97,164,98,107,98,162,99,123]

  describe 'domain_remove_gte_inline', ->

    {domain_remove_gte_inline} = FD.domain

    it 'should exist', ->

      expect(domain_remove_gte_inline?).to.be.true

    it 'should accept an empty domain', ->

      expect(-> domain_remove_gte_inline [], 5).not.to.throw()

    it 'should return bool', ->

      expect(domain_remove_gte_inline([], 5), 'empty').to.be.false
      expect(domain_remove_gte_inline([0, 10], 5), 'range change').to.be.true
      expect(domain_remove_gte_inline([50, 100], 5), 'range cut').to.be.true

    it 'should trim domain until all values are lt to arg', ->

      domain = spec_d_create_range(100, 200)
      domain_remove_gte_inline domain, 150
      expect(domain).to.eql spec_d_create_range(100, 149)

    it 'should remove excess ranges', ->

      domain = spec_d_create_ranges([100, 200], [300, 400])
      domain_remove_gte_inline domain, 150
      expect(domain).to.eql spec_d_create_range(100, 149)

    it 'should not require a range to contain the value', ->

      domain = spec_d_create_ranges([100, 200], [300, 400])
      domain_remove_gte_inline domain, 250
      expect(domain).to.eql spec_d_create_range(100, 200)

    it 'should not require a domain to contain value at all', ->

      domain = spec_d_create_ranges([100, 200], [300, 400])
      domain_remove_gte_inline domain, 500
      expect(domain).to.eql spec_d_create_ranges([100, 200], [300, 400])

    it 'should be able to empty a single domain', ->

      domain = spec_d_create_range(100, 200)
      domain_remove_gte_inline domain, 50
      expect(domain).to.eql []

    it 'should be able to empty a multi domain', ->

      domain = spec_d_create_ranges([100, 200], [300, 400])
      domain_remove_gte_inline domain, 50
      expect(domain).to.eql []

    it 'should be able to empty a domain containing only given value', ->

      domain = spec_d_create_value 50
      domain_remove_gte_inline domain, 50
      expect(domain).to.eql []

    it 'should be able to empty a domain containing only given value+1', ->

      domain = spec_d_create_value 51
      domain_remove_gte_inline domain, 50
      expect(domain).to.eql []

    it 'should ignore a domain with only value-1', ->

      domain = spec_d_create_value 49
      domain_remove_gte_inline domain, 50
      expect(domain).to.eql spec_d_create_value 49

  describe 'domain_remove_lte_inline', ->

    {domain_remove_lte_inline} = FD.domain

    it 'should exist', ->

      expect(domain_remove_lte_inline?).to.be.true

    it 'should accept an empty domain', ->

      expect(-> domain_remove_lte_inline [], 5).not.to.throw()

    it 'should return bool', ->

      expect(domain_remove_lte_inline([], 5), 'empty').to.be.false
      expect(domain_remove_lte_inline([0, 10], 5), 'range change').to.be.true
      expect(domain_remove_lte_inline([50, 100], 500), 'range cut').to.be.true

    it 'should trim domain until all values are gt to arg', ->

      domain = spec_d_create_range(100, 200)
      domain_remove_lte_inline domain, 150
      expect(domain).to.eql spec_d_create_range(151, 200)

    it 'should remove excess ranges', ->

      domain = spec_d_create_ranges([100, 200], [300, 400])
      domain_remove_lte_inline domain, 350
      expect(domain).to.eql spec_d_create_range(351, 400)

    it 'should not require a range to contain the value', ->

      domain = spec_d_create_ranges([100, 200], [300, 400])
      domain_remove_lte_inline domain, 250
      expect(domain).to.eql spec_d_create_range(300, 400)

    it 'should not require a domain to contain value at all', ->

      domain = spec_d_create_ranges([100, 200], [300, 400])
      domain_remove_lte_inline domain, 50
      expect(domain).to.eql spec_d_create_ranges([100, 200], [300, 400])

    it 'should be able to empty a single domain', ->

      domain = spec_d_create_range(100, 200)
      domain_remove_lte_inline domain, 250
      expect(domain).to.eql []

    it 'should be able to empty a multi domain', ->

      domain = spec_d_create_ranges([100, 200], [300, 400])
      domain_remove_lte_inline domain, 450
      expect(domain).to.eql []

    it 'should be able to empty a domain containing only given value', ->

      domain = spec_d_create_value 50
      domain_remove_lte_inline domain, 50
      expect(domain).to.eql []

    it 'should be able to empty a domain containing only given value-1', ->

      domain = spec_d_create_value 49
      domain_remove_lte_inline domain, 50
      expect(domain).to.eql []

    it 'should ignore a domain with only value+1', ->

      domain = spec_d_create_value 51
      domain_remove_lte_inline domain, 50
      expect(domain).to.eql spec_d_create_value 51

  describe.skip 'domain_shares_no_elements', ->
    # TODO test cases
