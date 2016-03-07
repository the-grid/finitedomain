chai = require 'chai'
sudoku = require '../../examples/sudoku'

# Check that all the elements of the array are different from each other
isDistinct = (values) ->
  arr = null

  if values instanceof Array
    arr = values
  else if values instanceof Object
    arr = []
    for k, v of values
      arr.push v
  else
      throw new Error "verifyDistinct: Argument is neither Array nor Object"

  for i in [0...arr.length]
    for j in [0...i]
      return false if arr[i] == arr[j]

  return true;

checkBoard = (board) ->
  rows = ['A','B','C','D','E','F','G','H','I']
  cols = ['1','2','3','4','5','6','7','8','9']

  failures = []

  # Check domain validity
  for i in [0...9]
    for j in [0...9]
      index = rows[i] + cols[j]
      value = board[index]
      if value < 1 or value > 9
        failures.push "#{index}: Value not in domain [1, 9]: #{value}"

  # Check rows
  for i in [0...9]
    currentRow = []
    for j in [0...9]
        index = rows[i] + cols[j]
        value = board[index]
        currentRow.push value
    if not isDistinct currentRow
      failures.push "Row #{i}: Has duplicate values: #{currentRow}"

  # Check columns
  for i in [0...9]
      currentColumn = []
      for j in [0...9]
          index = rows[j] + cols[i]
          currentColumn.push board[index]
      if not isDistinct currentColumn
        failures.push "Column #{i}: Has duplicate values: #{currentColumn}"

  # Check boxes
  for i in [0...3]
    for j in [0...3]
      currentBox = []
      for i2 in [0...3]
        for j2 in [0...3]
          index = rows[i * 3 + i2] + cols[j * 3 + j2]
          currentBox.push board[index]
      if not isDistinct currentBox
        failures.push "Box #{i},#{j}: Has duplicate values: #{currentBox}"

  return failures


testcases =
[
  name: 'from wikipedia',
  description: "A <a href=\"http://en.wikipedia.org/wiki/Sudoku\">simple</a> Sudoku board",
  board: {
      A5:8, A8:7, A9:9, 
      B4:4, B5:1, B6:9, B9:5,
      C2:6, C7:2, C8:8,
      D1:7, D5:2, D9:6,
      E1:4, E4:8, E6:3, E9:1,
      F1:8, F5:6, F9:3,
      G2:9, G3:8, G8:6,
      H1:6, H4:1, H5:9, H6:5,
      I1:5, I2:3, I5:7
  }
,
  name: 'from extremesudoku.info',
  description: "An <a href=\"http://www.extremesudoku.info/sudoku.html\">extreme</a> sudoku puzzle",
  board: {
      A1:4, A4:6, A7:7,
      B2:7, B5:4, B8:2,
      C3:5, C6:1, C9:6,
      D3:3, D6:5, D9:8,
      E2:2, E5:1, E8:9,
      F1:9, F4:7, F7:4,
      G1:3, G4:1, G7:9,
      H2:1, H5:8, H8:6,
      I3:7, I6:6, I9:1

  }
,
  name: 'really_hard_sudoku',
  description: "A <a href=\"http://4puz.com/hard_puzzle_v1p1.html\">really hard</a> sudoku",
  board: {
    A6:8, A7:5,
    B2:2, B6:6, B9:1,
    C2:3, C3:9, C8:4, C9:2,
    D7:6, D8:1,
    E1:4, E9:5,
    F2:1, F3:7,
    G1:2, G2:5, G7:1, G8:9,
    H1:3, H4:4, H8:2,
    I3:8, I4:9
  }
,
  name: 'example string',
  board: sudoku.example
]

describe 'Example: Sudoku', ->
  testcases.forEach (testcase) ->

    describe "#{testcase.name}", ->
      solutions = null
      it 'should give 1 solution', ->
        @timeout 5*1000 # for when using dev version
        solutions = sudoku.solveBoard testcase.board
        chai.expect(solutions).to.have.length 1
      it 'should be valid Sudoku solution', ->
        #console.log 's', solutions[0]
        failures = checkBoard solutions[0]
        chai.expect(failures).to.eql []

