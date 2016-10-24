module.exports = function () {
  var grunt = this;

  grunt.initConfig({
    remove: {
      default_options: {
        trace: true,
        dirList: [
          'build',
          'dist',
        ],
      },
    },

    // this is so backwards
    run: {
      coverage: {
        cmd: 'npm',
        args: ['run','coverage','--silent'],
      },
      lint: {
        cmd: 'npm',
        args: ['run','lint','--silent'],
      },
      lintdev: { // allows console/debugger
        cmd: 'npm',
        args: ['run','lintdev','--silent'],
      },
      jsbeautify: {
        cmd: 'node_modules/.bin/js-beautify',
        args: [
          '-s 4',
          '-f', 'build/finitedomain-es5.js',
          '-o', 'build/finitedomain-es5-beautified.js',
        ],
      },
    },

    // we only use this babel for manual inspection. not part of build chain.
    babel: {
      options: { // http://babeljs.io/docs/usage/options/
        // set from package.json (this way it's global, not just this grunt task)
      },
      build: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['**/*.js'],
            dest: 'build/src/',
          },
          {
            expand: true,
            cwd: 'tests/specs/',
            src: ['**/*.js'],
            dest: 'build/specs/',
          },
        ],
      },
      concat: {
        files: {
          'build/finitedomain-es5.js': ['build/finitedomain.es6.concat.js'],
        },
      },
    },

    jsdoc : {
      bare: { // out-of-the-box template. very basic.
        src: [
          // Sources only. Tests are not very relevant.
          'src/**/*.js',
          // Clone git@github.com:design-systems/ds-architecture.git into same dir
          // as your project (so not the project root! one dir up). Optional.
          '../ds-architecture/Types/**/*.js',
        ],
        options: {
          destination: 'build/jsdocs',
        },
      },
      dist : { // uses ink-docstrap. prettier than basic.
        src: [
          // Sources only. Tests are not very relevant.
          'src/**/*.js',
          // Clone git@github.com:design-systems/ds-architecture.git into same dir
          // as your project (so not the project root! one dir up). Optional.
          '../ds-architecture/Types/**/*.js',
        ],
        options: {
          destination: 'build/jsdocs',
          // this requires ink-docstrap in your package.json
          template : 'node_modules/ink-docstrap/template',
          configure : 'node_modules/ink-docstrap/template/jsdoc.conf.json',
        },
      },
    },

    watch: {
      p: { // build for perf in browser
        files: [
          'src/**/*.js',
          'tests/**/*',
        ],
        tasks: [
          'distperf',
        ],
      },
      q: { // quick dist, no linting, testing, or minifying. mostly for debugging quickly.
        files: [
          'src/**/*.js',
          'tests/**/*',
        ],
        tasks: [
          'distq',
        ],
      },
      b: { // quick dist WITH asserts, no linting, testing, or minifying. mostly for debugging quickly.
        files: [
          'src/**/*.js',
          'tests/**/*',
        ],
        tasks: [
          'distbug',
        ],
      },
      h: { // quick dist WITHOUT asserts, no linting, testing, or minifying. mostly for debugging quickly.
        files: [
          'src/**/*.js',
          'tests/**/*',
        ],
        tasks: [
          'distheat',
        ],
      },
    },

    mochaTest: {
      all: {
        src: ['tests/specs/**/*.spec.js'],
        options: {
          bail: true,
          require: [
            'babel-core/register',  // translate es6 syntax to es5
            'babel-polyfill',       // babel only translates, doesnt add new libs
          ],
          // it appears that babel supports an option to redirect the rc but no idea here
          // for now it uses a default config inlined into package.json
          //babelrc: 'config/babelrc',
          timeout: 6000,
          reporter: 'spec',
        },
      },
      nobail: {
        src: ['tests/specs/**/*.spec.js'],
        options: {
          require: [
            'babel-core/register',  // translate es6 syntax to es5
            'babel-polyfill',       // babel only translates, doesnt add new libs
          ],
          // it appears that babel supports an option to redirect the rc but no idea here
          // for now it uses a default config inlined into package.json
          //babelrc: 'config/babelrc',
          timeout: 6000,
          reporter: 'spec',
        },
      },
    },

    browserify: {
      options: {
        browserifyOptions: {
          debug: true,
          // the `standalone` option allows browserified modules to
          // be imported through es6 import/babel (browser too). without
          // this the module would be private and inaccessible forever.
          standalone: 'module.exports',
          noParse: [
            // Include browserified dependency builds
            // Target the file name directly with absolute path (-> __dirname)
            __dirname + '/node_modules/gom/browser/gom.js',
            __dirname + '/node_modules/@the-grid/multiversejson/browser/Multiverse.js',

            // Note: This doesn't work properly in browserify yet but it may just be what we want.
            //       However in that case we should allow chai for phantomjs builds
            //function(absPath) {
            //  var nmPath = __dirname + '/node_modules';
            //  return absPath.slice(0, nmPath.length) === nmPath;
            //},
          ],
        },
        transform: [
          ['babelify', {presets: ['es2015'], sourceMaps: true}],
          //["reactify", {"es6": true}],
        ],
      },
      phantom: {
        files: {
          'dist/finitedomain.dev.js': 'src/index.js',
          // note: this will include chai and mocha and all that but that's fine (I think?) and workarounds are difficult with es6 static modules anyways
          'build/specs-browserified.js': 'tests/specs/**/*.spec.js',
        },
      },
    },

    mocha_phantomjs: {
      all: ['tests/mocha-runner.html'],
    },

    uglify: {
      dist: {
        options: {
          report: 'gzip', // false, 'none', 'min', 'gzip'. gzip is a little slower but not significant and good to see.
          sourceMap: true,
        },
        files: {
          'dist/finitedomain.dist.min.js': ['build/finitedomain-es5.js'],
        },
      },
    },

    concat: {
      build: {
        options: {
          // https://github.com/gruntjs/grunt-contrib-concat
          banner: 'let Solver = (function(){',
          footer: '\n  return Solver;\n})();\nexport default Solver;\n',
          sourceMap: true,
          sourceMapStyle: 'inline', // embed link inline
          process: function(code, path){
            if (path === 'src/index.js') return '';
            console.log('concatting', path);
            var match = code.match(/^[\s\S]*?BODY_START([\s\S]*?)\/\/ BODY_STOP/);
            if (!match) {
              console.error('unable to find body start/stop pragmas in '+path);
              throw 'No body found in '+path;
            }
            code = match[1];
            match = code.match(/^([\s\S]*?)\/\/ __REMOVE_BELOW_FOR_ASSERTS__[\s\S]*?\/\/__REMOVE_ABOVE_FOR_ASSERTS__([\s\S]*)$/);
            if (match) {
              console.log(' - removing for asserts');
              code = match[1] + match[2];
            }
            code = code.replace(/^\s*ASSERT.*$/gm, '');

            return '' +
              '// from: ' + path + '\n\n' +
              code +
              '\n\n// end of ' + path;
          },
        },
        files: {
          'build/finitedomain.es6.concat.js': ['src/**/*'],
        },
      },
      test: {
        options: {
          // https://github.com/gruntjs/grunt-contrib-concat
          banner: '',
          footer: '\nexport default Solver;',
          sourceMap: true,
          sourceMapStyle: 'inline', // embed link inline
          process: function(code, path){
            if (path === 'src/index.js') return '';
            console.log('concatting', path);
            var match = code.match(/^[\s\S]*?BODY_START([\s\S]*?)\/\/ BODY_STOP/);
            if (!match) {
              console.error('unable to find body start/stop pragmas in '+path);
              throw 'No body found in '+path;
            }
            code = match[1];

            return '' +
              '// from: ' + path + '\n\n' +
              code +
              '\n\n// end of ' + path;
          },
        },
        files: {
          'build/finitedomain.es6.concat.js': ['src/**/*'],
        },
      },
    },
  });

  grunt.loadNpmTasks('grunt-babel'); // we dont really need this but can be handy for debugging
  grunt.loadNpmTasks('grunt-browserify'); // used to build packages for testing in phantomjs
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-phantomjs');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-run'); // runs npm scripts
  grunt.loadNpmTasks('grunt-remove');
  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('concat-dist-to-browserjs', function() {
    console.log('- Copying dist to browser.js');
    grunt.file.copy('dist/finitedomain.dist.min.js', 'dist/browser.js');
  });
  grunt.registerTask('concat-bug-to-browserjs', function() {
    console.log('- Copying build to browser.js');
    grunt.file.copy('build/finitedomain-es5-beautified.js', 'dist/browser.js');
    grunt.file.copy('build/finitedomain-es5-beautified.js', 'dist/finitedomain.dist.min.js');
  });

  grunt.registerTask('clean', ['remove']);
  grunt.registerTask('build', 'alias for dist', ['dist']);
  grunt.registerTask('dist', 'lint, test, build, minify', ['clean', 'run:lint', 'mochaTest:all', 'distq']);
  grunt.registerTask('distq', 'create dist without testing', ['clean', 'concat:build', 'babel:concat', 'uglify:dist']);
  grunt.registerTask('distperf', 'create dist for browser perf tests', ['distq', 'concat-dist-to-browserjs']);
  grunt.registerTask('distbug', 'create dist for browser debugging, keeps asserts', ['clean', 'concat:test', 'babel:concat', 'run:jsbeautify', 'concat-bug-to-browserjs']);
  grunt.registerTask('distheat', 'create dist for heatmap inspection, no asserts', ['clean', 'concat:build', 'babel:concat', 'run:jsbeautify', 'concat-bug-to-browserjs']);
  grunt.registerTask('coverage', ['clean', 'run:coverage']);
  grunt.registerTask('test', 'lint then test', ['clean', 'run:lintdev', 'mochaTest:all']);
  grunt.registerTask('testq', 'test without linting', ['clean', 'mochaTest:nobail']);
  // it works in the browser, the phantom test build just needs some love (TODO)
  //grunt.registerTask('testp', 'lint then test in phantomjs', ['clean', 'run:lintdev', 'browserify:phantom', 'mocha_phantomjs']);

  grunt.registerTask('default', ['test']);
};
