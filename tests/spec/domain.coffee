if typeof require is 'function'
  finitedomain = require('../../src/index')
  chai = require 'chai'

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
      expect(domain_from_list [0]).to.eql [[0,0]]
      expect(domain_from_list [0,0]).to.eql [[0,0]]

    it "[[0,1]]", ->
      expect(domain_from_list [0,1]).to.eql [[0,1]]
      expect(domain_from_list [1,0]).to.eql [[0,1]]
      expect(domain_from_list [0,0,1,1]).to.eql [[0,1]]
      expect(domain_from_list [1,1,0,0]).to.eql [[0,1]]

    it "[[-1,1],[10,10]]", ->
      expect(domain_from_list [10,1,-1,0]).to.eql [[-1,1],[10,10]]
      expect(domain_from_list [10,1,-1,0,10,1,-1,0,10,1,-1,0]).to.eql [[-1,1],[10,10]]

  describe "domain_to_list", ->

    {domain_to_list} = Domain

    it 'should exist', ->

      expect(domain_to_list?).to.be.true

    it 'should require a domain', ->

      expect(-> domain_to_list()).to.throw

    it "[[0,0]]", ->

      expect(domain_to_list [[0,0]]).to.eql [0]

    it "[[0,1]]", ->

      expect(domain_to_list [[0,1]]).to.eql [0,1]

    it "[[-1,1],[10,10]]", ->

      expect(domain_to_list [[-1,1], [10,10]]).to.eql [-1,0,1,10]

  describe "domain_remove_next_from_list", ->

    {domain_remove_next_from_list} = Domain

    it 'should exist', ->

      expect(domain_remove_next_from_list?).to.be.true

    it 'should require an array', ->

      expect(-> domain_remove_next_from_list null, [0]).to.throw

    it 'should return a fresh domain', ->

      a = [[0,3]]
      expect(domain_remove_next_from_list a, [0]).to.not.equal a

    it 'should not alter input domain', ->

      a = [[0,3]]
      expect(domain_remove_next_from_list a, [0]).to.eql [[1, 3]]
      expect(a).to.eql [[0,3]]

    it "1", ->
      dom = [[0,3]]
      expect(domain_remove_next_from_list dom, [0]).to.eql [[1,3]]
      expect(domain_remove_next_from_list dom, [0,10,9,7]).to.eql [[1,3]]
      expect(domain_remove_next_from_list dom, [10,9,7,0]).to.eql [[1,3]]
      expect(domain_remove_next_from_list dom, [1]).to.eql [[0,0],[2,3]]
      expect(domain_remove_next_from_list dom, [2]).to.eql [[0,1],[3,3]]
      expect(domain_remove_next_from_list dom, [3]).to.eql [[0,2]]
      expect(domain_remove_next_from_list dom, [99,100]).to.eql []

    it "2", ->
      dom = [[0,0]]
      expect(domain_remove_next_from_list dom, [0]).to.eql []
      expect(domain_remove_next_from_list dom, [0,10,11]).to.eql []
      expect(domain_remove_next_from_list dom, [10,11,0,12]).to.eql []
      expect(domain_remove_next_from_list dom, [1]).to.eql []
      expect(domain_remove_next_from_list dom, [1,2,3,4,5]).to.eql []

    it "3", ->
      dom = [[0,4],[10,14]]
      expect(domain_remove_next_from_list dom, [0]).to.eql [[1,4],[10,14]]
      expect(domain_remove_next_from_list dom, [0,10,11]).to.eql [[1,4],[10,14]]
      expect(domain_remove_next_from_list dom, [10,11,0,12]).to.eql [[0,4],[11,14]]
      expect(domain_remove_next_from_list dom, [1]).to.eql [[0,0],[2,4],[10,14]]
      expect(domain_remove_next_from_list dom, [100,12]).to.eql [[0,4],[10,11],[13,14]]
      expect(domain_remove_next_from_list dom, [12,100]).to.eql [[0,4],[10,11],[13,14]]

    it "4", ->
      dom = [[0,4],[10,14],[20,24]]
      expect(domain_remove_next_from_list dom, [99,-1,12,11]).to.eql [[0,4],[10,11],[13,14],[20,24]]
      expect(domain_remove_next_from_list dom, [99,-1]).to.eql []

  describe "domain_equal_next_from_list ", ->

    {domain_equal_next_from_list} = Domain

    it "1", ->
      dom = [[0,3]]
      expect( domain_equal_next_from_list(dom,[0]) ).to.eql [[0,0]]
      expect( domain_equal_next_from_list(dom,[0,10,9,7]), "[0,10,9,7]").to.eql [[0,0]]
      expect( domain_equal_next_from_list(dom,[10,9,7,0]), "[10,9,7,0]").to.eql [[0,0]]
      expect( domain_equal_next_from_list(dom,[1]) ).to.eql [[1,1]]
      expect( domain_equal_next_from_list(dom,[2]) ).to.eql [[2,2]]
      expect( domain_equal_next_from_list(dom,[3]) ).to.eql [[3,3]]
      expect( domain_equal_next_from_list(dom,[99,100]) ).to.eql []

    it "2", ->
      dom = [[0,0]]
      expect( domain_equal_next_from_list(dom,[0]) ).to.eql [[0,0]]
      expect( domain_equal_next_from_list(dom,[0,10,11]) ).to.eql [[0,0]]
      expect( domain_equal_next_from_list(dom,[10,11,0,12]) ).to.eql [[0,0]]
      expect( domain_equal_next_from_list(dom,[1]) ).to.eql []
      expect( domain_equal_next_from_list(dom,[1,2,3,4,5]) ).to.eql []

    it "3", ->
      dom = [[0,4],[10,14]]
      expect( domain_equal_next_from_list(dom,[0]) ).to.eql [[0,0]]
      expect( domain_equal_next_from_list(dom,[0,10,11]) ).to.eql [[0,0]]
      expect( domain_equal_next_from_list(dom,[10,11,0,12]) ).to.eql [[10,10]]
      expect( domain_equal_next_from_list(dom,[1]) ).to.eql [[1,1]]
      expect( domain_equal_next_from_list(dom,[100,12]) ).to.eql [[12,12]]
      expect( domain_equal_next_from_list(dom,[12,100]) ).to.eql [[12,12]]

    it "4", ->
      dom = [[0,4],[10,14],[20,24]]
      expect( domain_equal_next_from_list(dom,[99,-1,12,11]) ).to.eql [[12,12]]
      expect( domain_equal_next_from_list(dom,[99,-1]) ).to.eql []


  describe "domain_complete_list", ->

    {domain_complete_list} = Domain

    it "1", ->
      dom = [[0,3]]
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

        expect(domain_contains_value [[0, 10]], 5).to.be.true

      it 'multiple ranges in domain', ->

        expect(domain_contains_value [[0, 10], [20, 30], [50, 60]], 25).to.be.true

    describe 'should return false if domain does not contain value', ->

      it 'empty array', ->

        expect(domain_contains_value [], 0).to.be.false

      it 'one range in domain', ->

        expect(domain_contains_value [[0, 10]], 25).to.be.false

      it 'multiple ranges in domain', ->

        expect(domain_contains_value [[0, 10], [20, 30], [50, 60]], 15).to.be.false

  describe 'domain_range_index_of', ->

    {domain_range_index_of} = Domain

    it 'should exist', ->

      expect(domain_range_index_of?).to.be.true

    describe 'should return index of range that encloses value', ->

      it 'one range in domain', ->

        expect(domain_range_index_of [[0, 10]], 5).to.eql 0

      it 'multiple ranges in domain', ->

        expect(domain_range_index_of [[0, 10], [20, 30], [50, 60]], 25).to.eql 1

    describe 'should return -1 if domain does not contain value', ->

      it 'empty array', ->

        expect(domain_range_index_of [], 0).to.eql -1

      it 'one range in domain', ->

        expect(domain_range_index_of [[0, 10]], 25).to.eql -1

      it 'multiple ranges in domain', ->

        expect(domain_range_index_of [[0, 10], [20, 30], [50, 60]], 15).to.eql -1

  describe 'domain_collapsed_value', ->

    {domain_collapsed_value} = Domain

    it 'should exist', ->

      expect(domain_collapsed_value?).to.be.true

    it 'should require a domain', ->

      expect(-> domain_collapsed_value()).to.throw

    it 'should return undefined if domain is empty', ->

      expect(domain_collapsed_value []).to.eql undefined

    it 'should return undefined if first range is not one value', ->

      expect(domain_collapsed_value [[10, 20]]).to.eql undefined

    it 'should return the value if first range covers one value', ->

      expect(domain_collapsed_value [[50, 50]]).to.eql 50

    it 'doesnt care about other ranges', ->

      expect(domain_collapsed_value [[50, 50], [10, 20]]).to.eql 50
      expect(domain_collapsed_value [[50, 50], [60, 70]]).to.eql 50
      expect(domain_collapsed_value [[50, 50], [54, 54]]).to.eql 50
      expect(domain_collapsed_value [[50, 50], ['oops']]).to.eql 50

  describe 'domain_remove_value', ->

    {domain_remove_value} = Domain

    it 'should exist', ->

      expect(domain_remove_value?).to.be.true

    it 'should require a domain', ->

      expect(-> domain_remove_value null, 15).to.throw

    it 'should accept an empty domain', ->

      expect(domain_remove_value [], 15).to.eql []

    it 'should return a fresh array regardless', ->

      a = []
      expect(domain_remove_value a, 15).to.eql []
      a = []
      expect(domain_remove_value a, 15).to.not.equal a

    it 'should return a domain without given value', ->

      expect(domain_remove_value [[0, 30]], 15).to.eql [[0, 14], [16, 30]]

    it 'should keep unrelated ranges', ->

      expect(domain_remove_value [[0, 10], [12, 20], [22, 30]], 15).to.eql [[0, 10], [12, 14], [16, 20], [22, 30]]

    it 'should return a deep clone when removing an element', ->

      a = [[0, 10], [12, 20], [22, 30]]
      b = domain_remove_value [[0, 10], [12, 20], [22, 30]], 15
      expect(a[0]).to.eql b[0]
      expect(a[0]).to.not.equal b[0] # not by ref
      expect(a[a.length-1]).to.eql b[b.length-1]
      expect(a[a.length-1]).to.not.equal b[b.length-1] # not by ref

    it 'should return an empty domain if element was not found at all', ->
      # which is weird... maybe this was a "hack" to trigger a
      # throw when checking if the domain is empty afterwards?

      # 14 is not part of the domain
      expect(domain_remove_value [[0, 10], [15, 20], [22, 30]], 14).to.eql []

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

        expect(is_simplified [[0, 1]]).to.be.true

      it 'should accept domain with proper range of 1', ->

        expect(is_simplified [[15, 15]]).to.be.true

      it 'should reject domain with inverted range', ->

        expect(-> is_simplified [[1, 0]]).to.throw

    describe 'multiple ranges in domain', ->

      it 'should accept multiple properly ordered non-overlapping ranges', ->

        expect(is_simplified [[5, 10], [15, 20]]).to.be.true
        expect(is_simplified [[5, 6], [7, 8], [9, 10]]).to.be.true
        expect(is_simplified [[5, 6], [7, 8], [9, 10], [100, 200]]).to.be.true

      it 'should reject if two ranges overlap despite ordering', ->

        expect(-> is_simplified [[10, 15], [13, 19], [50, 60]]).to.throw # start
        expect(-> is_simplified [[1, 3], [10, 15], [13, 19], [70, 75]]).to.throw # middle
        expect(-> is_simplified [[1, 3], [10, 15], [16, 19], [18, 25]]).to.throw #end

      it 'should reject if two ranges touch', ->

        expect(is_simplified [[0, 1], [1, 2]]).to.be.false

      it 'should reject if at least one range is inverted', ->

        expect(-> is_simplified [[15, 10], [40, 50], [55, 60]]).to.throw # start
        expect(-> is_simplified [[10, 15], [50, 40], [55, 60]]).to.throw # middle
        expect(-> is_simplified [[10, 15], [40, 50], [65, 60]]).to.throw # end

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

          arr = [[0, 1], [10, 20], [30, 40]]
          expect(merge_overlapping_inline arr).to.equal arr
          expect(arr).to.eql [[0, 1], [10, 20], [30, 40]]

        it 'should be same array if changed', ->

          arr = [[0, 1], [10, 20], [20, 40]]
          expect(merge_overlapping_inline arr).to.equal arr
          expect(arr).to.eql [[0, 1], [10, 40]]

        it 'should be same array for single range', ->

          arr = [[0, 1]]
          expect(merge_overlapping_inline arr).to.equal arr
          expect(arr).to.eql [[0, 1]]

      it 'should return same range for single element domain', ->

        expect(merge_overlapping_inline [[10, 100]]).to.eql [[10, 100]]
        expect(merge_overlapping_inline [[30, 213]]).to.eql [[30, 213]]
        expect(merge_overlapping_inline [[0, 1]]).to.eql [[0, 1]]

      it 'should return same if not overlapping', ->

        expect(merge_overlapping_inline [[10, 100], [200, 300]]).to.eql [[10, 100], [200, 300]]
        expect(merge_overlapping_inline [[0, 0], [2, 2]]).to.eql [[0, 0], [2, 2]]

      it 'should merge if two domains overlap', ->

        expect(merge_overlapping_inline [[0, 1], [1, 2]]).to.eql [[0, 2]]
        expect(merge_overlapping_inline [[0, 50], [25, 75]]).to.eql [[0, 75]]
        expect(merge_overlapping_inline [[213, 278], [244, 364]]).to.eql [[213, 364]]
        expect(merge_overlapping_inline [[10, 20], [30, 40], [35, 45], [50, 60]]).to.eql [[10, 20], [30, 45], [50, 60]]

      it 'should merge if two domains touch', ->

        expect(merge_overlapping_inline [[0, 0], [1, 1]]).to.eql [[0, 1]]
        expect(merge_overlapping_inline [[0, 1], [2, 3]]).to.eql [[0, 3]]
        expect(merge_overlapping_inline [[0, 10], [10, 20]]).to.eql [[0, 20]]

      it 'should chain merges', ->

        expect(merge_overlapping_inline [[0, 0], [1, 1], [2, 2]]).to.eql [[0, 2]]
        expect(merge_overlapping_inline [[0, 1], [1, 2], [2, 3]]).to.eql [[0, 3]]
        expect(merge_overlapping_inline [[0, 0], [1, 2], [2, 3]]).to.eql [[0, 3]]

      it 'should make sure resulting range wraps both ranges', ->

        expect(merge_overlapping_inline [[0, 0], [0, 1]]).to.eql [[0, 1]]
        expect(merge_overlapping_inline [[0, 1], [0, 0]]).to.eql [[0, 1]]
        expect(merge_overlapping_inline [[0, 10], [14, 16], [15, 20], [16, 19], [17, 18]]).to.eql [[0, 10], [14, 20]]

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

        arr = [[0, 1]]
        expect(domain_simplify arr, INLINE).to.equal arr

      it 'should work if domain is not changed', ->

        arr = [[1, 2], [20, 30]]
        expect(domain_simplify arr, INLINE).to.equal arr

      it 'should work if domain is changed', ->

        arr = [[1, 2], [2, 3]]
        expect(domain_simplify arr, INLINE).to.equal arr
        expect(arr).to.eql [[1, 3]]

    describe 'if flag=NOT_INLINE', ->

      it 'should work with empty domain', ->

        arr = []
        expect(domain_simplify arr, NOT_INLINE).to.not.equal arr
        expect(arr).to.eql []
        expect(domain_simplify [], NOT_INLINE).to.eql []

      it 'should work with single ranged domain', ->

        arr = [[0, 1]]
        expect(domain_simplify arr, NOT_INLINE).to.not.equal arr
        expect(arr).to.eql [[0, 1]]
        expect(domain_simplify [[0, 1]], NOT_INLINE).to.eql [[0, 1]]

      it 'should work if domain is not changed', ->

        arr = [[1, 2], [20, 30]]
        expect(domain_simplify arr, NOT_INLINE).to.not.equal arr
        expect(arr).to.eql [[1, 2], [20, 30]]
        expect(domain_simplify [[1, 2], [20, 30]], NOT_INLINE).to.eql [[1, 2], [20, 30]]

      it 'should work if domain is changed', ->

        arr = [[1, 2], [2, 3]]
        expect(domain_simplify arr, NOT_INLINE).to.not.equal arr
        expect(arr).to.eql [[1, 2], [2, 3]] # unchanged
        expect(domain_simplify [[1, 2], [2, 3]], NOT_INLINE).to.eql [[1, 3]]

    describe 'if flag is not given flag is NOT_INLINE', ->
      # confirm that the original array is unchanged and the output is as expected

      it 'should work with empty domain', ->

        arr = []
        expect(domain_simplify arr).to.not.equal arr
        expect(arr).to.eql []
        expect(domain_simplify []).to.eql []

      it 'should work with single ranged domain', ->

        arr = [[0, 1]]
        expect(domain_simplify arr).to.not.equal arr
        expect(arr).to.eql [[0, 1]]
        expect(domain_simplify [[0, 1]]).to.eql [[0, 1]]

      it 'should work if domain is not changed', ->

        arr = [[1, 2], [20, 30]]
        expect(domain_simplify arr).to.not.equal arr
        expect(arr).to.eql [[1, 2], [20, 30]]
        expect(domain_simplify [[1, 2], [20, 30]]).to.eql [[1, 2], [20, 30]]

      it 'should work if domain is changed', ->

        arr = [[1, 2], [2, 3]]
        expect(domain_simplify arr).to.not.equal arr
        expect(arr).to.eql [[1, 2], [2, 3]] # unchanged
        expect(domain_simplify [[1, 2], [2, 3]]).to.eql [[1, 3]]

    it 'should merge unordered overlapping ranges', ->
      # properly tested in sub-function

      expect(domain_simplify [[2, 3], [1, 2]]).to.eql [[1, 3]]

  describe 'range_sorter_asc', ->

    # the function is an argument to Array#sort

    range_sorter_asc = Domain._range_sorter_asc

    it 'should sort ranges by lo-bound', ->

      expect([[0, 1], [1, 2]].sort(range_sorter_asc)).to.eql [[0,1], [1, 2]]
      expect([[1, 2], [0, 1]].sort(range_sorter_asc)).to.eql [[0,1], [1, 2]]
      expect([[3, 4], [1, 2], [5, 6], [0, 1], [7, 8]].sort(range_sorter_asc)).to.eql [[0,1], [1, 2], [3, 4], [5, 6], [7, 8]]

    it 'should accept overlapping ranges', ->

      # technically this test may fail if the browser applies an "unstable sort"
      # if that starts to happen, we should disable this test.
      expect([[0, 1], [0, 2]].sort(range_sorter_asc)).to.eql [[0,1], [0, 2]]

  describe 'domain_intersection', ->

    {domain_intersection} = Domain

    it 'should exist', ->

      expect(domain_intersection?).to.be.true

    describe 'intersect_one', ->

      intersect_one = Domain._intersect_one

      it 'should exist', ->

        expect(intersect_one?).to.be.true

      it 'should add an element when the ranges overlap', ->

        arr = []
        intersect_one arr, 0, 10, 5, 15
        expect(arr).to.eql [[5, 10]]

      it 'should throw when b starts before a', ->
        # i think this is a solid assumption...

        expect(-> intersect_one [], 5, 15, 0, 10).to.throw

      it 'should throw if array is not given', ->

        expect(-> intersect_one 0, 10, 5, 15).to.throw

      it 'should add a range of len=1 when the ranges touch', ->

        arr = []
        intersect_one arr, 0, 10, 10, 15
        expect(arr).to.eql [[10, 10]]

      it 'should add an element when range a wraps range b', ->

        arr = []
        intersect_one arr, 0, 20, 10, 15
        expect(arr).to.eql [[10, 15]]

      it 'should add an element when range b wraps range a', ->

        arr = []
        intersect_one arr, 0, 10, 0, 15
        expect(arr).to.eql [[0, 10]]

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

        expect(domain_intersection [], [[0, 1]]).to.eql []

      it 'should handle empty domain with multi element domain', ->

        expect(domain_intersection [], [[0, 1], [3, 5]]).to.eql []

      it 'should handle single element domain with empty domain', ->

        expect(domain_intersection [[0, 1]], []).to.eql []

      it 'should handle single element domain with empty domain', ->

        expect(domain_intersection [[0, 1], [3, 5]], []).to.eql []

      it 'should handle single element domains', ->

        expect(domain_intersection [[0, 1]], [[3, 5]]).to.eql []

      it 'should intersect single element domains', ->

        expect(domain_intersection [[0, 5]], [[3, 10]]).to.eql [[3, 5]]

      it 'should intersect single element domains reversed', ->

        expect(domain_intersection [[3, 10]], [[0, 5]]).to.eql [[3, 5]]

      it 'should handle single element domain with multi element domain', ->

        expect(domain_intersection [[0, 1]], [[10, 20], [30, 40]]).to.eql []

      it 'should handle multi element domain with single element domain', ->

        expect(domain_intersection [[0, 1], [10, 20]], [[30, 40]]).to.eql []

      it 'should intersect single element domain with multi element domain', ->

        expect(domain_intersection [[5, 15]], [[10, 20], [30, 40]]).to.eql [[10, 15]]

      it 'should intersect multi element domain with single element domain', ->

        expect(domain_intersection [[0, 1], [25, 35]], [[30, 40]]).to.eql [[30, 35]]

      it 'should handle multi element domains', ->

        expect(domain_intersection [[0, 1], [10, 20]], [[30, 40], [50, 60]]).to.eql []

      it 'should intersect multi element domains', ->

        expect(domain_intersection [[0, 1], [10, 35]], [[30, 40], [50, 60]]).to.eql [[30, 35]]

      it 'should return two ranges if a range in one domain intersects with two ranges of the other domain', ->

        expect(domain_intersection [[15, 35]], [[10, 20], [30, 40]]).to.eql [[15, 20], [30, 35]]

      it 'should divide and conquer some random tests 1', ->
        # copy(JSON.stringify(function f(n) {
        #   var arr = [];
        #   while (--n > 0) {
        #     var t = Math.floor(Math.random() * 100);
        #     arr.push([t, t+Math.floor(Math.random() * 20)]);
        #   }
        #   return arr;
        # }(10).map(function(a){
        #   return [Math.min(a[0],a[1]), Math.max(a[0], a[1])];
        # })).replace(/,/g, ', '))

        a = [[10,23],[29,38],[49,49],[54,68],[77,78],[84,100]]
        b = [[1,1],[3,21],[25,38],[54,67],[70,84],[88,107]]
        expect(domain_intersection a, b).to.eql [[10,21],[29,38],[54,67],[77,78],[84,84],[88,100]]

      it 'should divide and conquer some random tests 2', ->

        a = [[17, 23], [37, 78], [85, 104]]
        b = [[6,25],[47,56],[58,60],[64,67],[83,103]]
        expect(domain_intersection a, b).to.eql [[17,23],[47,56],[58,60],[64,67],[85,103]]

      it 'should divide and conquer some random tests 3', ->

        a = [[9,36],[54,66],[74,77],[84,96]]
        b = [[1,75]]
        expect(domain_intersection a, b).to.eql [[9,36],[54,66],[74,75]]

  describe 'domain_intersection_csis', ->

    {domain_intersection_csis} = Domain

    it 'should exist', ->

      expect(domain_intersection_csis?).to.be.true

    describe 'args', ->

      it 'should require two domains', ->

        expect(-> domain_intersection_csis).to.throw
        expect(-> domain_intersection_csis []).to.throw
        expect(-> domain_intersection_csis null, []).to.throw

      it 'should handle empty domains', ->

        expect(domain_intersection_csis [], []).to.eql []

      it 'should return a fresh array', ->

        arr1 = []
        arr2 = []
        out = domain_intersection_csis arr1, arr2
        expect(arr1).to.not.equal out
        expect(arr2).to.not.equal out

      it 'should handle empty domain with single element domain', ->

        expect(domain_intersection_csis [], [[0, 1]]).to.eql []

      it 'should handle empty domain with multi element domain', ->

        expect(domain_intersection_csis [], [[0, 1], [3, 5]]).to.eql []

      it 'should handle single element domain with empty domain', ->

        expect(domain_intersection_csis [[0, 1]], []).to.eql []

      it 'should handle single element domain with empty domain', ->

        expect(domain_intersection_csis [[0, 1], [3, 5]], []).to.eql []

      it 'should handle single element domains', ->

        expect(domain_intersection_csis [[0, 1]], [[3, 5]]).to.eql []

      it 'should intersect single element domains', ->

        expect(domain_intersection_csis [[0, 5]], [[3, 10]]).to.eql [[3, 5]]

      it 'should intersect single element domains reversed', ->

        expect(domain_intersection_csis [[3, 10]], [[0, 5]]).to.eql [[3, 5]]

      it 'should handle single element domain with multi element domain', ->

        expect(domain_intersection_csis [[0, 1]], [[10, 20], [30, 40]]).to.eql []

      it 'should handle multi element domain with single element domain', ->

        expect(domain_intersection_csis [[0, 1], [10, 20]], [[30, 40]]).to.eql []

      it 'should intersect single element domain with multi element domain', ->

        expect(domain_intersection_csis [[5, 15]], [[10, 20], [30, 40]]).to.eql [[10, 15]]

      it 'should intersect multi element domain with single element domain', ->

        expect(domain_intersection_csis [[0, 1], [25, 35]], [[30, 40]]).to.eql [[30, 35]]

      it 'should handle multi element domains', ->

        expect(domain_intersection_csis [[0, 1], [10, 20]], [[30, 40], [50, 60]]).to.eql []

      it 'should intersect multi element domains', ->

        expect(domain_intersection_csis [[0, 1], [10, 35]], [[30, 40], [50, 60]]).to.eql [[30, 35]]

      it 'should return two ranges if a range in one domain intersects with two ranges of the other domain', ->

        expect(domain_intersection_csis [[15, 35]], [[10, 20], [30, 40]]).to.eql [[15, 20], [30, 35]]

      it 'should intersect back to back', ->

        a = [[77,78],[84,100]]
        b = [[70,84],[88,107]]
        expect(domain_intersection_csis a, b).to.eql [[77,78],[84,84],[88,100]]

      it 'should intersect back to back reverse', ->

        a = [[70,84],[88,107]]
        b = [[77,78],[84,100]]
        expect(domain_intersection_csis a, b).to.eql [[77,78],[84,84],[88,100]]


      it 'should divide and conquer some random tests 1', ->
        # copy(JSON.stringify(function f(n) {
        #   var arr = [];
        #   while (--n > 0) {
        #     var t = Math.floor(Math.random() * 100);
        #     arr.push([t, t+Math.floor(Math.random() * 20)]);
        #   }
        #   return arr;
        # }(10).map(function(a){
        #   return [Math.min(a[0],a[1]), Math.max(a[0], a[1])];
        # })).replace(/,/g, ', '))

        a = [[10,23],[29,38],[49,49],[54,68],[77,78],[84,100]]
        b = [[1,1],[3,21],[25,38],[54,67],[70,84],[88,107]]
        expect(domain_intersection_csis a, b).to.eql [[10,21],[29,38],[54,67],[77,78],[84,84],[88,100]]

      it 'should divide and conquer some random tests 2', ->

        a = [[17, 23], [37, 78], [85, 104]]
        b = [[6,25],[47,56],[58,60],[64,67],[83,103]]
        expect(domain_intersection_csis a, b).to.eql [[17,23],[47,56],[58,60],[64,67],[85,103]]

      it 'should divide and conquer some random tests 3', ->

        a = [[9,36],[54,66],[74,77],[84,96]]
        b = [[1,75]]
        expect(domain_intersection_csis a, b).to.eql [[9,36],[54,66],[74,75]]

  describe 'domain_equal', ->

    {domain_equal} = Domain

    it 'should exist', ->

      expect(domain_equal?).to.be.true

    it 'should return false unconditionally if domain lengths are unequal', ->

      expect(domain_equal [], [1]).to.be.false
      expect(domain_equal [1], []).to.be.false
      expect(domain_equal [1], [1, 1]).to.be.false

    it 'should be able to compare single element domains', ->

      expect(domain_equal [[32, 84]], [[32, 84]]).to.be.true

    it 'should reject if any bound is different', ->

      expect(domain_equal [[1, 84]], [[32, 84]]).to.be.false
      expect(domain_equal [[32, 100]], [[132, 184]]).to.be.false

    it 'should be able to deep comparison accept', ->

      expect(domain_equal [[1,1],[3,21],[25,38],[54,67],[70,84],[88,107]], [[1,1],[3,21],[25,38],[54,67],[70,84],[88,107]]).to.be.true

    it 'should be able to deep comparison reject', ->

      expect(domain_equal [[1,1],[3,21],[26,39],[54,67],[70,84],[88,107]], [[1,1],[3,21],[25,38],[54,67],[70,84],[88,107]]).to.be.false

  describe 'domain_complement', ->

    {SUP} = FD.helpers
    {domain_complement} = Domain

    it 'should exist', ->

      expect(domain_complement?).to.be.true
      expect(SUP?).to.be.true # make sure test setup is proper

    it 'should require a domain', ->

      expect(-> domain_complement()).to.throw

    it 'should accept an empty array', ->

      expect(domain_complement []).to.eql [[0, SUP]]

    it 'should invert a domain', ->

      expect(domain_complement [[5, 10], [100, 200]]).to.eql [[0,4],[11,99],[201,SUP]]

    it 'should handle domains starting at 0 properly', ->

      expect(domain_complement [[0, 100]]).to.eql [[101, SUP]]

    it 'should handle domains ending at SUP properly', ->

      expect(domain_complement [[100, SUP]]).to.eql [[0, 99]]

    it 'should handle domains starting at 0 and ending at SUP properly', ->

      expect(domain_complement [[0, 500], [600, 900], [1000, SUP]]).to.eql [[501, 599], [901, 999]]

    it 'should add 0 if starting at 1', ->

      expect(domain_complement [[1, 100]]).to.eql [[0,0],[101, SUP]]

    it 'should add SUP if ending at SUP-1', ->

      expect(domain_complement [[100, SUP-1]]).to.eql [[0, 99], [SUP, SUP]]

    it 'should return a fresh array', ->

      arr = [[10,23],[29,38],[49,49],[54,68],[77,78],[84,100]]
      expect(domain_complement arr).to.not.equal arr

    it 'should not change the input domain', ->

      arr = [[10,23],[29,38],[49,49],[54,68],[77,78],[84,100]]
      clone = arr.slice 0
      domain_complement arr
      expect(arr).to.eql clone

    it 'should return same value when applied twice', ->

      arr = [[10,23],[29,38],[49,49],[54,68],[77,78],[84,100]]
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
#      b = [[10,23],[29,38],[49,49],[54,68],[77,78],[84,100]]
#      a_clone = a.slice 0
#      b_clone = b.slice 0
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql a_clone
#      expect(b).to.eql b_clone
#
#    it 'should not change anything if right domain is empty', ->
#
#      a = [[10,23],[29,38],[49,49],[54,68],[77,78],[84,100]]
#      b = []
#      a_clone = a.slice 0
#      b_clone = b.slice 0
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql a_clone
#      expect(b).to.eql b_clone
#
#    it 'should close gaps in right domain of len of only range in left domain', ->
#
#      a = [[10, 20]] # note: len is 11 because ranges are inclusive
#      b = [[100, 110], [120, 200], [300, 310], [321, 400]] # both gaps should be closed
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql [[10, 20]] # had no gaps to close
#      expect(b).to.eql [[100, 200], [300, 400]]
#
#    it 'should not close bigger gaps', ->
#
#      a = [[10, 20]] # note: len is 11 because ranges are inclusive
#      b = [[300, 310], [322, 400]] # gap is 12
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql [[10, 20]]
#      expect(b).to.eql [[300, 310], [322, 400]]
#
#    it 'should close gaps in left domain of len of only range in right domain', ->
#
#      a = [[100, 110], [120, 200], [300, 310], [321, 400]] # both gaps should be closed
#      b = [[10, 20]] # note: len is 11 because ranges are inclusive
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql [[100, 200], [300, 400]]
#      expect(b).to.eql [[10, 20]] # had no gaps to close
#
#    it 'should close gaps in left and right', ->
#
#      a = [[100, 110], [120, 200], [300, 310], [321, 400]] # both gaps should be closed
#      b = [[10, 20]] # note: len is 11 because ranges are inclusive
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      expect(a).to.eql [[100, 200], [300, 400]]
#      expect(b).to.eql [[10, 20]] # had no gaps to close
#
#    it 'should revisit domains after one (double) cycle if min size grew', ->
#      a = [[1,2],[4,5],[8,900]];
#      b = [[1,2],[4,5],[8,900]];
#      expect(domain_close_gaps_inline a, b).to.eql undefined
#      # first min size is 2, so 1~2..4~5 is closed but not 4~5-8~900,
#      # then min size becomes 5 and 1~5..8~900 is closed.
#      # (that holds both ways) so we end up with 1~900
#      expect(a).to.eql [[1,900]]
#      expect(b).to.eql [[1,900]]

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

      a = [[0, 1], [4, 5], [7, 8], [10, 12], [15, 17]]
      expect(domain_plus (a.slice 0), []).to.eql []
      expect(domain_plus [], (a.slice 0)).to.eql []
      expect(domain_plus a, []).to.not.equal a

    it 'should add two ranges', ->

      expect(domain_plus [[5, 10]], [[50, 60]]).to.eql [[55, 70]]

    it 'should add two domains', ->

      a = [[5, 10], [20, 35]]
      b = [[50, 60], [110, 128]]
      expect(domain_plus a, b).to.eql [[55, 95], [115, 163]]

    it 'should add two domains', ->

      a = [[0, 1], [4, 12], [15, 17]]
      b = [[0, 1], [4, 12], [15, 17]]
      expect(domain_plus a, b).to.eql [[0, 2], [4, 34]]

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

      a = [[0, 1], [4, 5], [7, 8], [10, 12], [15, 17]]
      expect(domain_times (a.slice 0), []).to.eql []
      expect(domain_times [], (a.slice 0)).to.eql []
      expect(domain_times a, []).to.not.equal a

    it 'should multiply two ranges', ->

      expect(domain_times [[5, 10]], [[50, 60]]).to.eql [[250, 600]]

    it 'should multiply two domains', ->

      a = [[5, 10], [20, 35]]
      b = [[50, 60], [110, 128]]
      expect(domain_times a, b).to.eql [[250, 2100], [2200, 4480]]

    it 'should multiply two domains', ->

      a = [[0, 1], [4, 12], [15, 17]]
      b = [[0, 1], [4, 12], [15, 17]]
      expect(domain_times a, b).to.eql [[0, 204], [225, 289]]

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

      a = [[0, 1], [4, 5], [7, 8], [10, 12], [15, 17]]
      expect(domain_minus (a.slice 0), []).to.eql []
      expect(domain_minus [], (a.slice 0)).to.eql []
      expect(domain_minus a, []).to.not.equal a

    it 'should subtract one range from another', ->

      expect(domain_minus [[5, 10]], [[50, 60]]).to.eql []

    it 'should subtract one domain from another', ->

      a = [[5, 10], [20, 35]]
      b = [[50, 60], [110, 128]]
      expect(domain_minus a, b).to.eql []

    it 'should multiply one domain from another', ->

      a = [[0, 1], [4, 12], [15, 17]]
      b = [[0, 1], [4, 12], [15, 17]]
      expect(domain_minus a, b).to.eql [[0, 17]]

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

      a = [[0, 1], [4, 5], [7, 8], [10, 12], [15, 17]]
      expect(domain_divby (a.slice 0), []).to.eql []
      expect(domain_divby [], (a.slice 0)).to.eql []
      expect(domain_divby a, []).to.not.equal a

    it 'should divide one range from another', ->

      expect(domain_divby [[5, 10]], [[50, 60]]).to.eql [[0.1/12*10, 0.2]]

    it 'should divide one domain from another', ->

      a = [[5, 10], [20, 35]]
      b = [[50, 60], [110, 128]]
      expect(domain_divby a, b).to.eql [[0.0390625, 0.7]]

    it 'should divide one domain from another', ->

      a = [[1, 1], [4, 12], [15, 17]]
      b = [[1, 1], [4, 12], [15, 17]]
      expect(domain_divby a, b).to.eql [[0.058823529411764705, 12], [15, 17]]

    it 'divide by zero should blow up', ->

      a = [[0, 1], [4, 12], [15, 17]]
      b = [[0, 1], [4, 12], [15, 17]]
      expect(domain_divby a, b).to.eql [[0, SUP]]

