#!/usr/bin/env coffee
try
  FD = require '..' # running from source-tree
catch e
  FD = require 'finitedomain'

# Setup rules that holds for all Sudoku games
# https://en.wikipedia.org/wiki/Sudoku
rows = ['A','B','C','D','E','F','G','H','I']
cols = ['1','2','3','4','5','6','7','8','9']
setupSudoku = (S) ->
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

# Parses Sudoku puzzles on format from
# http://www2.warwick.ac.uk/fac/sci/moac/people/students/peter_cock/python/sudoku
parseBoard = (vars, str) ->
  board = {}
  for char, index in str
    position = vars[index]
    board[position] = parseInt(char) if char != '.'
  return board
# ASCII rendering
renderBoard = (board) ->
  lines = []
  for i in [0...9]
    l = ''
    for j in [0...9]
      name = rows[i] + cols[j]
      v = board[name] or ' '
      l += " #{v} "
    lines.push l
  return lines.join '\n'

solveBoard = (board, o={}) ->
  solver = new FD.Solver
  vars = setupSudoku solver

  board = parseBoard vars, board if typeof board == 'string'
  throw new Error "Invalid start board" if not board?

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

example = '.94...13..............76..2.8..1.....32.........2...6.....5.4.......8..7..63.4..8'
main = () ->
  board = process.argv[2]
  usage = """Usage: coffee finitedomain-sudoku PUZZLE

  Example, from http://www2.warwick.ac.uk/fac/sci/moac/people/students/peter_cock/python/sudoku

    coffee finitedomain-sudoku #{example}
  """
  if not board
    console.log usage
    process.exit 1

  solutions = solveBoard board
  throw new Error "No solutions found. Not a proper Sudoku puzzle" if not solutions.length
  throw new Error "Multiple solutions found (#{solutions.length}). Not a proper Sudoku puzzle" if solutions.length > 1
  console.log renderBoard(solutions[0])

module.exports.solveBoard = solveBoard
module.exports.example = example
main() if not module.parent
