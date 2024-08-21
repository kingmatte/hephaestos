// playwright.config.ts
import { chromium, PlaywrightTestConfig } from '@playwright/test';

type BrowserName = 'chromium' | 'firefox' | 'webkit';

const config: PlaywrightTestConfig = {
	outputDir: 'tests/test-results',
	globalTimeout: 120 * 60 * 1000, // two hours per run to start
	expect: { timeout: 5 * 1000 }, // 5 seconds default for expect statement to resolve
	timeout: 1.5 * 60 * 1000, // 90 second as a base limit per test. Can be changed in test files with test.setTimeout()
	retries: 0,
	maxFailures: 10,
	testMatch: /.*\.test\.ts/,
	workers: 10,
	reporter: [
		['json', { outputFile: `tests/playwright-results/results.json`, open: 'never' }],
		['html', { open: 'never', outputFolder: 'tests/playwright-report' }],
	],
	use: {
		trace: 'retain-on-failure',
		headless: true,
		browserName: 'chromium',
		viewport: { width: 1440, height: 1080 },
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		storageState: 'tests/test-storage/default.json',
		actionTimeout: 30 * 1000, // 30 seconds default for actions like clicks to resolve
		navigationTimeout: 30 * 1000, // 30 seconds default for navigation to complete
		testIdAttribute: 'data-test-id',
	},
};
// eslint-disable-next-line import/no-default-export
export default config;
