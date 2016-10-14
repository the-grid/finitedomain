// !!! CHANGES SHOULD BE PROPAGATED TO https://github.com/design-systems/scaffold !!!

// config readme: https://github.com/gotwarlost/istanbul/issues/3#issuecomment-31291272
console.log('Included custom istanbul config...');

module.exports = {
  colors: true,
  coverageReporter: {
    reporters: [
      { type: 'html', dir: 'build/coverage/' },
      { type: 'text-summary', dir: 'build/coverage/' },
      { type: 'text'},
    ],
  },
  'es-modules': true,
  reporting: {
    dir: './build/coverage',
  },
  //verbose: true,
};
