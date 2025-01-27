/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	globalSetup: '<rootDir>/test/globalSetup.ts',
	collectCoverageFrom: ['credentials/**/*.ts', 'nodes/**/*.ts', 'utils/**/*.ts'],
};
