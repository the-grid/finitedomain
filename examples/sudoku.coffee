try
  FD = require '..' # running from source-tree
catch e
  FD = require 'finitedomain'

# Setup rules that holds for all Sudoku games
setupSudoku = (S) ->
  rows = ['A','B','C','D','E','F','G','H','I']
  cols = ['1','2','3','4','5','6','7','8','9']
  vars = []

  # Declare possible board places
  for i in [0...9]
    for j in [0...9]
      varName = rows[i] + cols[j]
      vars.push varName
      S.addVar varName, [1,9]

  # Add row constraints.
  for i in [0...9]
    k = []
    for j in [0...9]
        k.push(rows[i] + cols[j])
    S.distinct k

  # Add column constraints
  for i in [0...9]
    k = []
    for j in [0...9]
      k.push(rows[j] + cols[i])
    S.distinct k

  # Add box constraints.
  for i in [0...3]
    for j in [0...3]
      k = []
      for i2 in [0...3]
        for j2 in [0...3]
          k.push(rows[i * 3 + i2] + cols[j * 3 + j2])
      S.distinct k

  return vars

solveBoard = (board, o={}) ->
  throw new Error "Invalid start board" if not board?

  solver = new FD.Solver
  setupSudoku solver

  # Set known values of the board
  for position, value of board
    solver.eq position, value

  options =
    log: 0
    max: 100
    distribute: 'fail_first' # supposedly gives best results for Sudoku
  for k, v of o
    options[k] = v
  solutions = solver.solve options
  return solutions

# TODO: parse input data in format from http://www2.warwick.ac.uk/fac/sci/moac/people/students/peter_cock/python/sudoku/
# TODO: render results, for instance like in http://norvig.com/sudoku.html
main = () ->
  board = {
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

  solution = solveBoard board
  throw new Error "No solutions found, not a proper Sudoku puzzle" if not solutions.length
  throw new Error "Multiple solutions found (#{solutions.length}). Not a proper Sudoku puzzle" if solutions.length > 1
  console.log solution

module.exports.solveBoard = solveBoard
main() if not module.parent
