module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        'commands/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 30000, // 30 secondes pour les tests de compilation
    verbose: true,
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        },
        // Seuils par répertoire - minimum 90%
        './commands/': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        },
        './src/utils/': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        },
        './src/': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90
        }
    }
};

