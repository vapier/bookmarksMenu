module.exports = {
  printWidth: 130,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'none',
  bracketSpacing: true,
  jsxBracketSameLine: false,
  arrowParens: 'avoid',
  rangeStart: 0,
  rangeEnd: Infinity,
  requirePragma: false,
  insertPragma: false,
  proseWrap: 'preserve',
  overrides: [
    {
      files: '**/*.css',
      options: {
        singleQuote: false
      }
    }
  ]
};
