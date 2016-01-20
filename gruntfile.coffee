module.exports = ->

  grunt = @

  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    remove:
      default_options:
        trace: true,
        dirList: ['dist']

    # Coding standards
    coffeelint:
      components: [
        '*.coffee'
        'src/**/*.coffee'
        'tests/spec/**/*.coffee'
      ]
      options:
        'recursive':
          true
        'max_line_length':
          'level': 'ignore'

    browserify:
      dist: # includes ASSERT!
        options:
          browserifyOptions:
            extensions: ['.coffee']
            fullPaths: false
            standalone: 'finitedomain'
        files:
          'dist/finitedomain.dev.js': ['src/index.coffee']
      perf: # strips all ASSERT stuff. should be faster.
        options:
          browserifyOptions:
            extensions: ['.coffee']
            fullPaths: false
            standalone: 'finitedomain'
        files:
          'dist/finitedomain.dev.perf.js': ['src/index.coffee']

    # JavaScript minification for the browser
    uglify:
      dist:
        options:
          report: 'min'
        files:
          './dist/finitedomain.min.js': ['./dist/finitedomain.dev.js']
      perf:
        options:
          report: 'min'
        files:
          './dist/finitedomain.min.perf.js': ['./dist/finitedomain.dev.perf.js']

    # Automated recompilation and testing when developing
    watch:
      all:
        files: ['**/*.coffee']
        tasks: ['build']
      perf:
        files: ['tests/perf/perf.coffee']
        tasks: ['coffee:perf']
      dist:
        files: ['src/**']
        tasks: ['dist']

    # BDD tests on Node.js
    mochaTest:
      all:
        src: ['tests/spec/**/*.coffee']
        options:
          #grep: "FD -"
          #grep: "Harmonics -"
          # note: you can do `grunt test --grep FD` to grep from cli
          timeout: 6000
          reporter: 'spec'
      perf:
        src: ['tests/perf/perf.coffee']
        options:
          timeout: 20000
          reporter: 'spec'

    # CoffeeScript compilation
    coffee:
      # to run with runner.html in the browser:
      spec_joined:
        options:
          bare: true
          join: true
        files: [
          'build/spec.js': 'tests/spec/**/*.coffee'
        ]
      # to run perf/perf.html
      perf:
        expand: true
        cwd: 'tests/perf'
        src: ['**/*.coffee']
        dest: 'build/perf'
        ext: '.js'
      # for fun an profit
      spec:
        options:
          bare: true
        expand: true
        cwd: 'tests/spec'
        src: ['**/*.coffee']
        dest: 'build/spec'
        ext: '.js'
      # we use browserify so this is mostly unused
      src:
        options:
          bare: true
        expand: true
        cwd: 'src/'
        src: ['**/*.coffee']
        dest: 'build/src'
        ext: '.js'

    'string-replace': # read helpers.coffee for why this is needed and how it works
      perf:
        files:
          'dist/': ['dist/finitedomain.dev.perf.js']
        options:
          replacements: [
            { # first replace the asserts in an object literal... (exports in helper.coffee)
              pattern: /ASSERT\w*\s*:\s*ASSERT\w*\s*,?/g,
              replacement: ''
            }
            { # remove the ASSERT functions from helper.coffee
              pattern: /^.*__REMOVE_BELOW_FOR_DIST__(?:.|\n|\r)*?__REMOVE_ABOVE_FOR_DIST__.*$/gm,
              replacement: '// removed stuff here for dist/perf'
            }
            { # now replace any line starting with ASSERT with a `1`, to be a noop while preserving sub-statements
              pattern: /^\s*ASSERT.*$/mg,
              replacement: '1'
            }
            { # remove _class references. they should be for debugging only but increase the object footprints
              pattern: /^.*_class.*$/mg, # should only remove initializations so remove the whole line...
              replacement: ''
            }
            { # turn function expressions into function declarations (coffee by default compiles to expr, perf is better for decl)
              pattern: /([;}])[\s\n]*(\w+)\s*=\s*function([^\d])/mg, # tricky with regex... kitten sacrificed.
              replacement: '$1 function $2 $3'
            }
            { # remove left-over ASSERT* names
              pattern: /ASSERT\w*/g,
              replacement: '\u039B' # lambda
            }
            { # artifacts of doing `ASSERT* = helpers.ASSERT*`
              pattern: /, \u039B = ref\.\u039B/g, # lambdas
              replacement: ''
            }
            { # artifacts of doing `var ASSERT*, ...`
              pattern: /var \u039B,(?: \u039B,)*/g, # lambdas. seem to always be at the front. lexicographical ordering?
              replacement: 'var '
            }
          ]


  # Grunt plugins used for building
  @loadNpmTasks 'grunt-browserify'
  @loadNpmTasks 'grunt-remove'
  @loadNpmTasks 'grunt-contrib-uglify'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-mocha-test'
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-string-replace'

  @registerTask 'clean', ['remove']
  @registerTask 'lint', ['coffeelint']
  @registerTask 'build', ['clean', 'coffeelint', 'browserify:dist', 'coffee:spec_joined']
  @registerTask 'test', ['clean', 'coffeelint', 'browserify:dist', 'mochaTest:all']
  @registerTask 'perf', ['clean', 'browserify:perf', 'mochaTest:perf', 'coffee:perf', 'string-replace:perf']
  @registerTask 'bperf', ['clean', 'browserify:perf', 'coffee:perf', 'string-replace:perf']
  @registerTask 'dist', ['clean', 'coffeelint', 'browserify:dist', 'browserify:perf', 'string-replace:perf', 'uglify:perf']
  @registerTask 'default', ['lint']
