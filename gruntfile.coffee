module.exports = ->

  grunt = @

  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    remove:
      default_options:
        trace: true,
        dirList: ['build', 'dist']

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

    # JavaScript minification for the browser
    uglify:
      dist:
        options:
          report: 'min'
        files:
          'build/5.finitedomain.dist.min.js': ['build/4.finitedomain.dist.perf_stripped.js']

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
      # to run perf/perf.html
      perf:
        expand: true
        cwd: 'tests/perf'
        src: ['**/*.coffee']
        dest: 'build/perf'
        ext: '.js'
      dist:
        options:
          bare: true
        expand: true
        cwd: 'dist'
        files:
          'build/3.finitedomain.dist.coffeed.js': ['build/2.finitedomain.dist.dist_stripped.coffee']

    'string-replace': # read helpers.coffee for why this is needed and how it works
      copy_dist: # just copies final build file to dist...
        files:
          'dist/finitedomain.min.js': 'build/5.finitedomain.dist.min.js'
        options:
          replacements: [] # nothing...
      strip_for_dist: # run _before_ coffeefy (because comment gets lost)
        files:
          'build/2.finitedomain.dist.dist_stripped.coffee': 'build/1.finitedomain.dist.coffee'
        options:
          replacements: [
            pattern: /^.*__REMOVE_BELOW_FOR_DIST__(?:.|\n|\r)*?__REMOVE_ABOVE_FOR_DIST__.*$/gm,
            replacement: '# removed stuff here for dist/perf'
          ]
      strip_asserts: # run _after_ coffeefy (because replaces with `1` and doesnt care about indentation)
        files:
          'build/4.finitedomain.dist.perf_stripped.js': 'build/3.finitedomain.dist.coffeed.js'
        options:
          replacements: [
            { # first replace the asserts in an object literal... (exports in helper.coffee)
              pattern: /ASSERT\w*\s*:\s*ASSERT\w*\s*,?/g,
              replacement: ''
            }
            { # remove the ASSERT functions from helper.coffee
              pattern: /^.*__REMOVE_BELOW_FOR_ASSERTS__(?:.|\n|\r)*?__REMOVE_ABOVE_FOR_ASSERTS__.*$/gm,
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

    concat:
      options:
        stripBanners: false
        banner: 'FD = ((module? and module) or {}).exports = do ->\n\n'
        footer:
          # add external exports here
          '\n' +
          '  return {\n' +
          '    Solver\n'+
          '  }\n'
        separator: '\n\n'
        process: (str, fname) ->
          switch fname
            # ignore some files
            when 'src/index.coffee'
            else
              m = str.match(/# BODY_START((?:.|\n|\r)*?)# BODY_STOP/)
              if m[1]
                m = m[1]
              else
                console.log "Warning: #{fname} had no body start/stop, unable to include"
                m = str
              return " ###### file: #{fname} ######\n\n" + m
      dist:
        src: ['src/**/*.coffee']
        dest: 'build/1.finitedomain.dist.coffee'


  # Grunt plugins used for building
  @loadNpmTasks 'grunt-remove'
  @loadNpmTasks 'grunt-contrib-uglify'
  @loadNpmTasks 'grunt-contrib-concat'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-mocha-test'
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-string-replace'

  @registerTask 'target-dist-file', ->
    process.env.TEST_TARGET = 'min'

  @registerTask 'clean', ['remove']
  @registerTask 'lint', ['coffeelint']
  @registerTask 'build', ['clean', 'coffeelint', 'concat:dist', 'string-replace:strip_for_dist', 'coffee:dist','string-replace:strip_asserts', 'uglify:dist']
  @registerTask 'test', ['coffeelint', 'mochaTest:all']
  @registerTask 'dist', ['build', 'target-dist-file', 'test', 'string-replace:copy_dist']
  @registerTask 'perf', ['build', 'coffee:perf', 'target-dist-file', 'mochaTest:perf', 'string-replace:copy_dist']
  @registerTask 'default', ['lint']
