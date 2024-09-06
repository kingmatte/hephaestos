import { Page } from '@tailwind/playwright-utils/lib/shared/testFixtures';

export async function mockNoDestinationlessDrafts(page: Page) {
	await page.route('**/destinationless-drafts', async (route) => {
		// Fulfill the request with the modified response
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ drafts: [] }),
		});
	});
}
