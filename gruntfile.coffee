module.exports = ->

  grunt = @

  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

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
      dist:
        options:
          browserifyOptions:
            extensions: ['.coffee']
            fullPaths: false
            standalone: 'finitedomain'
        files:
          'dist/finitedomain.dev.js': ['src/index.coffee']

    # JavaScript minification for the browser
    uglify:
      dist:
        options:
          report: 'min'
        files:
          './dist/finitedomain.min.js': ['./dist/finitedomain.dev.js']

    # Automated recompilation and testing when developing
    watch:
      all:
        files: ['**/*.coffee']
        tasks: ['build']
      perf:
        files: ['tests/perf/perf.coffee']
        tasks: ['coffee:perf']

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
          'dist/': ['dist/finitedomain.dev.js']
        options:
          replacements: [
            { # first replace the asserts in an object literal... (exports in helper.coffee)
              pattern: /ASSERT\w*\s*:\s*ASSERT\w*\s*,?/g,
              replacement: ''
            }
            { # remove the ASSERT functions from helper.coffee
              pattern: /^\s*REMOVE_ASSERTS_START(?:.|\n|\r)*REMOVE_ASSERTS_STOP/m,
              replacement: 'var x'
            }
            { # now replace any line starting with ASSERT with a `1`, to be a noop while preserving sub-statements
              pattern: /^\s*ASSERT.*$/mg,
              replacement: '1'
            }
            { # remove _class references. they should be for debugging only but increase the object footprints
              pattern: /^.*_class.*$/mg, # should only remove initializations so remove the whole line...
              replacement: ''
            }
          ]


  # Grunt plugins used for building
  @loadNpmTasks 'grunt-browserify'
  @loadNpmTasks 'grunt-contrib-uglify'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-mocha-test'
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-string-replace'

  @registerTask 'lint', ['coffeelint']
  @registerTask 'build', ['coffeelint', 'browserify:dist', 'coffee:spec_joined']
  @registerTask 'test', ['coffeelint', 'browserify:dist', 'mochaTest:all']
  @registerTask 'perf', ['browserify:dist', 'mochaTest:perf', 'coffee:perf', 'string-replace:perf']
  @registerTask 'bperf', ['browserify:dist', 'coffee:perf', 'string-replace:perf']
  @registerTask 'dist', ['coffeelint', 'browserify:dist', 'string-replace:perf', 'uglify']
  @registerTask 'default', ['lint']
