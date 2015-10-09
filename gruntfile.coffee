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
      files: ['**/*.coffee']
      tasks: ['build']

    # BDD tests on Node.js
    mochaTest:
      all:
        src: ['tests/spec/**/*.coffee']
        options:
          #grep: "FD -"
          #grep: "Harmonics -"
          timeout: 6000
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

  # Grunt plugins used for building
  @loadNpmTasks 'grunt-browserify'
  @loadNpmTasks 'grunt-contrib-uglify'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-mocha-test'
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-contrib-watch'

  @registerTask 'lint', ['coffeelint']
  @registerTask 'build', ['coffeelint', 'browserify:dist', 'coffee:spec_joined']
  @registerTask 'test', ['coffeelint', 'browserify:dist', 'mochaTest:all']
  @registerTask 'dist', ['coffeelint', 'browserify:dist', 'uglify']
  @registerTask 'default', ['lint']
