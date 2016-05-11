// !!! CHANGES SHOULD BE PROPAGATED TO https://github.com/design-systems/scaffold !!!

/*

DS linting rules

Base configurations (no actual rules here).
Base rules are in eslintrc.ds.dist.js and
dev rules are overridden in eslintrc.ds.dev.js

http://eslint.org/docs/user-guide/configuring

*/

module.exports = {
  extends: './eslintrc.standard.js',
  parser: 'babel-eslint',
  ecmaFeatures: {
    impliedStrict: true,
    jsx: false,
    mocha: true,
    modules: true,
  },
  env: {
    browser: true,
  },
};
