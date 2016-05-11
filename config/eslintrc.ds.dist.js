// !!! CHANGES SHOULD BE PROPAGATED TO https://github.com/design-systems/scaffold !!!

/*

DS linting rules

http://eslint.org/docs/user-guide/configuring

Don't add duplicate config from eslinbtrc.standard.js
here unless they change the setting.

Keep rules ordered lexicographically.

Overrides for development only (console, debugger, etc)
should go in eslintrc.ds.dev.js

*/

const OFF = 0
const WARNING = 1
const ERROR = 2

module.exports = {
  extends: './eslintrc.ds.base.js',
  rules: {
    // There is no mode that does 'always' except for
    // the `_ => ...` pattern so let's disable it.
    'arrow-parens': [OFF],
    // This rule requires comma's for every entry in multi line
    // object literals and array literals. This generally prevents
    // awkward diffs in the future. In some cases it leads to
    // better consistency and in other cases it'll feel a bit awkward.
    'comma-dangle': [ERROR, 'always-multiline'],
    // Allow two empty lines but only one at EOF
    'no-multiple-empty-lines': [ERROR, {max: 2, maxEOF: 1}],
    // This is a difficult one. The reason to disable this rule
    // is to allow short lambda loops (`a.forEach(o => o.x = n)`).
    // The rule is properly throwing warnings but there is no
    // option to make an exception for the implicit arrow case.
    // Discussion: https://github.com/eslint/eslint/issues/4743
    'no-return-assign': [OFF],
    'semi': [ERROR, 'always'],
    'space-before-function-paren': [ERROR, 'never'],
    // This rule would require a space after // and /*
    'spaced-comment': [OFF],
  },
};
