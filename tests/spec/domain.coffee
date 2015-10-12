if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_ranges
    spec_d_create_value
    spec_d_create_zero
  } = require '../fixtures/domain'

{expect, assert} = chai
FD = finitedomain

describe "FD - Domain", ->

  {Domain} = FD

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
      expect(-> domain_from_list [10,1,-1,0]).to.throw
      expect(-> domain_from_list [10,1,-1,0,10,1,-1,0,10,1,-1,0]).to.throw

  describe "domain_to_list", ->

    {domain_to_list} = Domain

    it 'should exist', ->

      expect(domain_to_list?).to.be.true

    it 'should require a domain', ->

      expect(-> domain_to_list()).to.throw

    it "[[0,0]]", ->

      expect(domain_to_list spec_d_create_zero()).to.eql [0]

    it "[[0,1]]", ->

      expect(domain_to_list spec_d_create_bool()).to.eql [0,1]

    it "negative elements to throw", ->

      expect(-> domain_to_list spec_d_create_ranges([-1,1], [10,10])).to.throw

  describe "domain_remove_next_from_list", ->

    {domain_remove_next_from_list} = Domain

    it 'should exist', ->

      expect(domain_remove_next_from_list?).to.be.true

    it 'should require an array', ->

      expect(-> domain_remove_next_from_list null, [0]).to.throw

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
      expect(-> domain_remove_next_from_list dom, [99,-1,12,11]).to.throw
      expect(-> domain_remove_next_from_list dom, [99,-1]).to.throw

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
      expect( domain_get_value_of_first_contained_value_in_list(dom,[99,100]) ).to.eql undefined

    it "2", ->
      dom = spec_d_create_zero()
      expect( domain_get_value_of_first_contained_value_in_list(dom,[0]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[0,10,11]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[10,11,0,12]) ).to.eql 0
      expect( domain_get_value_of_first_contained_value_in_list(dom,[1]) ).to.eql undefined
      expect( domain_get_value_of_first_contained_value_in_list(dom,[1,2,3,4,5]) ).to.eql undefined

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
      expect( domain_get_value_of_first_contained_value_in_list(dom,[99,5]) ).to.eql undefined

    it "should throw for negative values", ->
      dom = spec_d_create_ranges([0,4],[10,14],[20,24])
      expect(-> domain_get_value_of_first_contained_value_in_list(dom,[99,-1,12,11]) ).to.throw
      expect(-> domain_get_value_of_first_contained_value_in_list(dom,[99,-1]) ).to.throw

  describe "domain_complete_list", ->

    {domain_complete_list} = Domain

    it "1", ->
      dom = spec_d_create_range(0, 3)
      expect( domain_complete_list(dom,[0]) ).to.eql [0,1,2,3]
      expect( domain_complete_list(dom,[0,10,9,7]), "[0,10,9,7]").to.eql [0,10,9,7,1,2,3]
      expect( domain_complete_list(dom,[1]) ).to.eql [1,0,2,3]
      expect( domain_complete_list(dom,[2]) ).to.eql [2,0,1,3]
      expect( domain_complete_list(dom,[3]) ).to.eql [3,0,1,2]
      expect( domain_complete_list(dom,[99,100]) ).to.eql [99,100,0,1,2,3]

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

      expect(-> domain_is_value()).to.throw

    it 'should return false if domain is empty', ->

      expect(domain_is_value []).to.be.false

    it 'should throw for invalid domains', ->

      expect(-> domain_is_value spec_d_create_value(undefined)).to.throw

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

    it 'should throw for invalid (non-csis) domains', ->

      expect(-> domain_is_value(spec_d_create_ranges([50, 50], [10, 20]), 50)).to.throw
      expect(-> domain_is_value(spec_d_create_ranges([50, 50], [60, 70]), 50)).to.throw
      expect(-> domain_is_value(spec_d_create_ranges([50, 50], [54, 54]), 50)).to.throw

    it 'should throw for bogus domains', ->

      expect(-> domain_is_value([[50, 50], ['oops']])).to.throw
      expect(-> domain_is_value([[50, 50], ['oops']])).to.throw

  describe 'domain_remove_value', ->

    {domain_remove_value} = Domain

    it 'should exist', ->

      expect(domain_remove_value?).to.be.true

    it 'should require a domain', ->

      expect(-> domain_remove_value null, 15).to.throw

    it 'should accept an empty domain', ->

      expect(domain_remove_value [], 15).to.eql undefined

    it 'should return a domain without given value', ->

      expect(domain_remove_value spec_d_create_range(0, 30), 15).to.eql spec_d_create_ranges([0, 14], [16, 30])

    it 'should keep unrelated ranges', ->

      expect(domain_remove_value spec_d_create_ranges([0, 10], [12, 20], [22, 30]), 15).to.eql spec_d_create_ranges([0, 10], [12, 14], [16, 20], [22, 30])

    it 'should return a deep clone when removing an element', ->

      a = spec_d_create_ranges([0, 10], [12, 20], [22, 30])
      expect(domain_remove_value a, 15).to.not.equal a

    it 'should return undefined if element was not found at all', ->

      # 14 is not part of the domain
      expect(domain_remove_value spec_d_create_ranges([0, 10], [15, 20], [22, 30]), 14).to.eql undefined

  describe 'is_simplified', ->

    is_simplified = Domain._is_simplified

    it 'should exist', ->

      # exposed for testing only
      expect(is_simplified?).to.be.true

    it 'should require a domain', ->

      expect(-> is_simplified()).to.throw

    it 'should accept empty domain', ->

      expect(is_simplified []).to.be.true

    describe 'single ranged domain', ->

      it 'should accept domain with proper range', ->

        expect(is_simplified spec_d_create_bool()).to.be.true

      it 'should accept domain with proper range of 1', ->

        expect(is_simplified spec_d_create_range(15, 15)).to.be.true

      it 'should reject domain with inverted range', ->

        expect(-> is_simplified spec_d_create_range(1, 0)).to.throw

    describe 'multiple ranges in domain', ->

      it 'should accept multiple properly ordered non-overlapping ranges', ->

        expect(is_simplified spec_d_create_ranges([5, 10], [15, 20])).to.be.true
#        expect(is_simplified spec_d_create_ranges([5, 6], [7, 8], [9, 10])).to.be.true
#        expect(is_simplified spec_d_create_ranges([5, 6], [7, 8], [9, 10], [100, 200])).to.be.true

      it 'should reject if two ranges overlap despite ordering', ->

        expect(-> is_simplified spec_d_create_ranges([10, 15], [13, 19], [50, 60])).to.throw # start
        expect(-> is_simplified spec_d_create_ranges([1, 3], [10, 15], [13, 19], [70, 75])).to.throw # middle
        expect(-> is_simplified spec_d_create_ranges([1, 3], [10, 15], [16, 19], [18, 25])).to.throw #end

      it 'should reject if two ranges touch', ->

        expect(is_simplified spec_d_create_ranges([0, 1], [1, 2])).to.be.false

      it 'should reject if at least one range is inverted', ->

        expect(-> is_simplified spec_d_create_ranges([15, 10], [40, 50], [55, 60])).to.throw # start
        expect(-> is_simplified spec_d_create_ranges([10, 15], [50, 40], [55, 60])).to.throw # middle
        expect(-> is_simplified spec_d_create_ranges([10, 15], [40, 50], [65, 60])).to.throw # end

  describe 'merge_overlapping_inline', ->

    {
      INLINE
      NOT_INLINE
      _merge_overlapping_inline: merge_overlapping_inline
    } = FD.Domain

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

      expect(-> domain_simplify()).to.throw

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

        expect(-> domain_intersection).to.throw
        expect(-> domain_intersection []).to.throw
        expect(-> domain_intersection null, []).to.throw

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

    it 'should reject if any bound is different', ->

      expect(domain_equal spec_d_create_range(1, 84), spec_d_create_range(32, 84)).to.be.false
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

      expect(-> domain_complement()).to.throw

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
#      expect(-> domain_close_gaps_inline()).to.throw
#      expect(-> domain_close_gaps_inline []).to.throw
#      expect(-> domain_close_gaps_inline undefined, []).to.throw
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

      expect(-> domain_plus).to.throw
      expect(-> domain_plus []).to.throw
      expect(-> domain_plus null, []).to.throw

    it 'should accept empty domains', ->

      expect(domain_plus [], []).to.eql []

    it 'should accept empty domains', ->

      expect(domain_plus [], []).to.eql []
      a = []
      expect(domain_plus a, []).to.not.equal a
      a = []
      expect(domain_plus [], a).to.not.equal a

    it 'should return empty domain if one is empty', ->

      a = spec_d_create_ranges([0, 1], [4, 5], [7, 8], [10, 12], [15, 17])
      expect(domain_plus (a.slice 0), []).to.eql []
      expect(domain_plus [], (a.slice 0)).to.eql []
      expect(domain_plus a, []).to.not.equal a

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

  describe 'domain_times', ->

    {domain_times} = Domain

    it 'should exist', ->

      expect(domain_times?).to.be.true

    it 'should require domains', ->

      expect(-> domain_times).to.throw
      expect(-> domain_times []).to.throw
      expect(-> domain_times null, []).to.throw

    it 'should accept empty domains', ->

      expect(domain_times [], []).to.eql []

    it 'should accept empty domains', ->

      expect(domain_times [], []).to.eql []
      a = []
      expect(domain_times a, []).to.not.equal a
      a = []
      expect(domain_times [], a).to.not.equal a

    it 'should return empty domain if one is empty', ->

      a = spec_d_create_ranges([0, 1], [4, 5], [7, 8], [10, 12], [15, 17])
      expect(domain_times (a.slice 0), []).to.eql []
      expect(domain_times [], (a.slice 0)).to.eql []
      expect(domain_times a, []).to.not.equal a

    it 'should multiply two ranges', ->

      expect(domain_times spec_d_create_range(5, 10), spec_d_create_range(50, 60)).to.eql spec_d_create_range(250, 600)

    it 'should multiply two domains', ->

      a = spec_d_create_ranges([5, 10], [20, 35])
      b = spec_d_create_ranges([50, 60], [110, 128])
      expect(domain_times a, b).to.eql spec_d_create_ranges([250, 2100], [2200, 4480])

    it 'should multiply two domains', ->

      a = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      expect(domain_times a, b).to.eql spec_d_create_ranges([0, 204], [225, 289])

  describe 'domain_minus', ->

    {domain_minus} = Domain

    it 'should exist', ->

      expect(domain_minus?).to.be.true

    it 'should require domains', ->

      expect(-> domain_minus).to.throw
      expect(-> domain_minus []).to.throw
      expect(-> domain_minus null, []).to.throw

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

      expect(-> domain_divby).to.throw
      expect(-> domain_divby []).to.throw
      expect(-> domain_divby null, []).to.throw

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

      expect(domain_divby spec_d_create_range(5, 10), spec_d_create_range(50, 60)).to.eql spec_d_create_range(0.1/12*10, 0.2)

    it 'should divide one domain from another', ->

      a = spec_d_create_ranges([5, 10], [20, 35])
      b = spec_d_create_ranges([50, 60], [110, 128])
      expect(domain_divby a, b).to.eql spec_d_create_range(0.0390625, 0.7)

    it 'should divide one domain from another (2)', ->

      a = spec_d_create_ranges([1, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([1, 1], [4, 12], [15, 17])
      expect(domain_divby a, b).to.eql spec_d_create_ranges([0.058823529411764705, 12], [15, 17])

    it 'divide by zero should blow up', ->

      a = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      b = spec_d_create_ranges([0, 1], [4, 12], [15, 17])
      expect(domain_divby a, b).to.eql spec_d_create_ranges([0, SUP])

