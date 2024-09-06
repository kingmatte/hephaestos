// playwright.config.ts
import { devices, PlaywrightTestConfig } from '@tailwind/playwright-utils';

type BrowserName = 'chromium' | 'firefox' | 'webkit';

/**
 * Attempts to run the browser from process.env.BROWSERS. Runs with chromium otherwise.
 * @returns
 */
const parseBrowserName = (): BrowserName | undefined => {
	const browserInput = process.env.BROWSERS ? process.env.BROWSERS : 'chromium';
	const validBrowsers = ['chromium', 'firefox', 'webkit'];
	if (validBrowsers.includes(browserInput)) return browserInput as BrowserName;
	return 'chromium';
};

const config: PlaywrightTestConfig = {
	outputDir: 'test-results',
	forbidOnly: !!process.env.CI,
	globalTimeout: 120 * 60 * 1000, // two hours per run to start
	expect: { timeout: 5 * 1000 }, // 5 seconds default for expect statement to resolve
	timeout: 1.5 * 60 * 1000, // 90 second as a base limit per test. Can be changed in test files with test.setTimeout()
	retries: process.env.RETRIES ? parseInt(process.env.RETRIES, 10) : 1,
	maxFailures: process.env.MAXFAILURES ? parseInt(process.env.MAXFAILURES, 10) : undefined,
	testMatch: /.*\.playwright\.ts/,
	workers: process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : undefined,
	reporter: [
		['json', { outputFile: `playwright-results/results.json`, open: 'never' }],
		['html', { open: 'never', outputFolder: 'playwright-report' }],
		[process.env.CI ? 'dot' : 'list'],
	],
	use: {
		trace: 'retain-on-failure',
		headless: process.env.HEADLESS !== 'false',
		browserName: parseBrowserName(),
		viewport: { width: 1440, height: 1080 },
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		storageState: 'test-storage/default.json',
		actionTimeout: 30 * 1000, // 30 seconds default for actions like clicks to resolve
		navigationTimeout: 30 * 1000, // 30 seconds default for navigation to complete
		testIdAttribute: 'data-e2e-id',
	},
	projects: [
		{ name: 'setup', testMatch: /.*e2eSetup\.ts/ },
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1440, height: 1080 },
			},
			dependencies: ['setup'],
			grep: /^(?!.*@MOBILE).*/,
		},
		{
			name: 'mobile_iphone',
			use: {
				// Running with webkit is closer to iPhone but is only supported on Ubuntu22.04 for now.
				// We should enable this when upgrading playwright and playwright supports 24.04,
				// because github actions runs ubuntu-latest multicore runners
				// browserName: 'webkit',
				...devices['iPhone 14'],
			},
			dependencies: ['setup'],
			grep: /@MOBILE/,
		},
		{
			name: 'mobile_android',
			use: {
				...devices['Galaxy S9+'],
			},
			dependencies: ['setup'],
			grep: /@MOBILE/,
		},
		{
			name: 'desktop',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1440, height: 1080 },
			},
			dependencies: ['setup'],
			grep: /@DESKTOP/,
		},
	],
};
// eslint-disable-next-line import/no-default-export
export default config;
