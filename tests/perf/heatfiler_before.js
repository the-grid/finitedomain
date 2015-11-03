/** This is a header script to make things not crash when using the HeatFiler for profiling.

To use this, use the following steps:
 - clone heatfiler (git@github.com:qfox/Heatfiler.git)
 - open heatfiler (heatfiler/src/index.html) in the browser (not as local file, we need xhr, so url must not start with `file://` !)
 - in finitedomain, run `grunt bperf` to build the files
 - figure out the url to the build, something like http://localhost:5000/finitedomain/dist/finitedomain.dev.js
 - in heatfiler, go to the "run code" tab
 - select "files"
 - select "to localstorage"
 - paste something like this, but fix the paths of course (the - and + prefix help, they include/exclude files)

- http://localhost/finitedomain/tests/perf/heatfiler_before.js
- http://localhost/finitedomain/build/perf/o5.js
+ http://localhost/finitedomain/dist/finitedomain.dev.js
- http://localhost/finitedomain/tests/perf/heatfiler_after.js

 - the first is for setup, the last runs the actual test and o5.js is a large data set to solve
 - press "start", it will start running and freezing that tab for a while (much slower than normal!)
 - open up a new tab, same browser, and open up same heatfiler page again
 - go to the result tab and it should load the source and slowly paint it as the other tab runs it
 - ... profit!
*/

var module = {};
