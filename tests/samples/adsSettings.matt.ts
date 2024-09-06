import { Locator, Page, request } from '@playwright/test';
import { tailwindUrl, waitForLocatorToBeStable } from 'shared/helpers';
import { logger } from 'shared/logger';
import { Ads } from 'shared/pages/ads/ads';
import { Secrets } from 'shared/pages/secrets';

const secrets = new Secrets();

type AdsObjectives =
	| 'sell-more-products'
	| 'drive-traffic-to-website'
	| 'grow-brand-awareness'
	| 'increase-engagement-with-content'
	| 'generate-new-sales-leads'
	| 'gain-more-social-followers';

type SectionLinks = 'business-details' | 'customer-details' | 'budget' | 'accounts';

export class AdsSettings extends Ads {
	readonly saveChangesButton: Locator;
	sectionLink = (section: SectionLinks) => this.page.getByTestId(`section-link-${section}`);
	readonly urlInput: Locator;
	readonly urlSubmitButton: Locator;
	readonly siteLoader: Locator;
	commerceRadio = (option: 'yes' | 'no') => this.page.getByTestId(`ecommerce-radio-${option}`);
	readonly platformMenu: Locator;
	readonly deleteProductUrlButton: Locator;
	readonly addAdditionalButton: Locator;
	readonly connectedURL: Locator;
	readonly missingProductButton: Locator;
	readonly fetchProductURLInput: Locator;
	readonly fetchProductButton: Locator;
	readonly businessNameInput: Locator;
	readonly businessTypeMenu: Locator;
	readonly businessGoalMenu: Locator;
	adsObjective = (option: AdsObjectives) => this.page.getByTestId(`objective-radio-${option}`);
	readonly uniqueDescription: Locator;
	readonly noteworthyValues: Locator;
	readonly audienceDescription: Locator;
	readonly minimumAgeInput: Locator;
	readonly maxAgeInput: Locator;
	readonly genderMenu: Locator;
	readonly locationSelect: Locator;
	readonly interestsSelect: Locator;
	readonly budgetInput: Locator;
	readonly oauthFacebookButton: Locator;
	readonly seePendingAdsButton: Locator;
	readonly smsSkipButton: Locator;
	readonly phoneNumberInput: Locator;
	readonly verificationCodeInput: Locator;

	// Actions
	resetOnboarding: (orgID: string, custID: string) => Promise<void>;
	resetBudgetApproval: (orgID: string, custID: string) => Promise<void>;
	waitForBusinessDetails: () => Promise<void>;
	onboardAdUser: () => Promise<void>;

	constructor(page: Page) {
		super(page);
		this.saveChangesButton = page.getByTestId('save-changes-btn');
		this.urlInput = page.getByTestId('url-input');
		this.urlSubmitButton = page.getByTestId('url-submit-btn');
		this.siteLoader = page.getByTestId('site-load-animation');
		this.platformMenu = page.getByTestId('platform-menu');
		this.deleteProductUrlButton = page.getByTestId('delete-product-url-btn');
		this.addAdditionalButton = page.getByTestId('add-additional-btn');
		this.connectedURL = page.getByTestId('connected-store-url');
		this.missingProductButton = page.getByTestId('missing-product-btn');
		this.fetchProductURLInput = page.getByTestId('fetch-product-url-input');
		this.fetchProductButton = page.getByTestId('fetch-product-btn');
		this.businessNameInput = page.getByTestId('business-name-input');
		this.businessTypeMenu = page.getByTestId('business-type-select');
		this.businessGoalMenu = page.getByTestId('business-goal-select');
		this.uniqueDescription = page.getByTestId('unique-description-field');
		this.noteworthyValues = page.getByTestId('noteworthy-values-field');
		this.audienceDescription = page.getByTestId('audience-description');
		this.minimumAgeInput = page.getByTestId('minimum-age-input').getByLabel('Minimum age');
		this.maxAgeInput = page.getByTestId('max-age-input').getByLabel('Maximum age');
		this.genderMenu = page.getByTestId('gender-select');
		this.locationSelect = page.getByTestId('location-select');
		this.interestsSelect = page.getByTestId('interests-select');
		this.budgetInput = page.getByTestId('budget-input');
		this.oauthFacebookButton = page.getByRole('button', { name: 'Continue with Facebook' });
		this.seePendingAdsButton = page.getByTestId('see-pending-ads-btn');
		this.smsSkipButton = page.getByTestId('sms-skip-btn');
		this.phoneNumberInput = page.getByTestId('phone-number-input');
		this.verificationCodeInput = page.getByTestId('verification-input');

		// Actions
		this.resetOnboarding = async (orgID: string, custID: string) => {
			const gandalfToken = await secrets.fetchV2GandalfToken(['draper:user'], orgID, custID);
			const draperID = await this.getDraperID(orgID);
			let baseURL = 'https://draper.tailwindapp.com';
			if (tailwindUrl() !== 'https://www.tailwindapp.com/') {
				baseURL = 'https://draper.qa.tailwindapp.net';
			}
			const requestContext = await request.newContext();
			await requestContext.delete(`${baseURL}/v1/${draperID}/account-settings`, {
				headers: { Authorization: `Bearer ${gandalfToken}` },
			});
			await requestContext.delete(`${baseURL}/v1/${draperID}/onboarding-data`, {
				headers: { Authorization: `Bearer ${gandalfToken}` },
			});
		};

		this.resetBudgetApproval = async (orgID: string, custID: string) => {
			const gandalfToken = await secrets.fetchV2GandalfToken(['draper:user'], orgID, custID);
			const draperID = await this.getDraperID(orgID);
			let baseURL = 'https://draper.tailwindapp.com';
			if (tailwindUrl() !== 'https://www.tailwindapp.com/') {
				baseURL = 'https://draper.qa.tailwindapp.net';
			}
			const requestContext = await request.newContext();
			await requestContext.delete(`${baseURL}/v1/${draperID}/charges-approved`, {
				headers: { Authorization: `Bearer ${gandalfToken}` },
			});
		};

		this.waitForBusinessDetails = async () => {
			await this.page
				.waitForResponse(
					async (resp) =>
						resp.url().includes('business-details-generation-requests') &&
						resp.status() === 200 &&
						(await resp.text()).includes('succeeded'),
					{
						timeout: 60_000,
					},
				)
				.catch(() => {
					logger('No post response received', { alwaysLog: true });
				});
		};

		this.onboardAdUser = async () => {
			await this.urlInput.fill('urbanhousefashion.com');
			await Promise.all([this.siteLoader.waitFor({ state: 'hidden', timeout: 15_000 }), this.urlSubmitButton.click()]);
			await this.selectProducts([1, 2, 3]);
			await this.continueButton.click();
			await this.waitForBusinessDetails();
			// For this test, we're skipping the SMS collection/verification step
			// That will be handled in a separate, production-only test
			try {
				await waitForLocatorToBeStable(this.smsSkipButton, 10_000);
				await this.smsSkipButton.click();
				await this.continueButton.click();
			} catch {
				logger('sms button not shown', { alwaysLog: true });
			}
			await waitForLocatorToBeStable(this.page.getByRole('combobox', { name: 'Facebook User' }), 45_000);
			await this.page.getByRole('combobox', { name: 'Facebook User' }).selectOption('Barry Boauth');
			await this.page.getByRole('combobox', { name: 'Facebook Ad Account' }).selectOption('Barry Boauth');
			await this.page.getByRole('combobox', { name: 'Facebook Page' }).selectOption('Three X Three');
			await this.continueButton.click();
			await this.continueButton.click(); // Skip pixel setup
			await this.locationSelect.nth(1).fill('United States');
			try {
				await this.page.getByRole('button', { name: 'United States' }).first().click();
			} catch {
				logger('Already selected');
			}
			await this.continueButton.click();
			await this.budgetInput.fill('40');
			await this.continueButton.click();
			await waitForLocatorToBeStable(this.seePendingAdsButton, 30_000);
			await this.seePendingAdsButton.click();
		};
	}
}
