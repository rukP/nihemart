module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Formatting
        'refactor', // Code restructuring
        'perf', // Performance improvements
        'test', // Tests
        'chore', // Maintenance
        'revert', // Revert changes
        'security', // Security fixes (custom for ecommerce)
      ],
    ],
  },
};
