import { getStorageState, HomePage, MadeForYou, remindMeOn, test } from '@tailwind/playwright-utils';

test('set reminder', async () => {
	await remindMeOn('06/24/2024', 'add smoke label back to mfySignup test');
});

let tempUserInfo: { tempEmailAddress: string; custID: number; orgID: number };

const verifyGeneration = async (madeForYou: MadeForYou, homePage: HomePage) => {
	await test.step('verify loading state or generated drafts', async () => {
		try {
			await homePage.mfyLoadingLabel.waitFor({ state: 'visible', timeout: 30_000 });
		} catch {
			await madeForYou.seeMoreContentCTA.waitFor({ state: 'visible', timeout: 30_000 });
		}
	});
};

test.describe('MFY signup', () => {
	test.slow();
	test.use(getStorageState('loggedOut'));
	test.afterEach(async ({ quack }) => {
		if (tempUserInfo.custID !== 0) await quack.deleteTempUser(tempUserInfo.tempEmailAddress);
	});
	test(
		'should allow user to sign up with supported store',
		{ tag: ['@MFY', '@ONBOARDING', '@SIGNUP', '@REGRESSION'] },
		async ({ signup, madeForYou, homePage, upgradeNext }) => {
			await test.step('add store during signup', async () => {
				tempUserInfo = await signup.onboardUser('Seller', 'urbanhousefashion.com');
				await upgradeNext.planCard('Free').click();
				await upgradeNext.goToDashboardButton.click();
			});
			await test.step('verify loading state or generated drafts', async () => {
				await verifyGeneration(madeForYou, homePage);
			});
		},
	);
	test(
		'should allow user to sign up with supported blog',
		{ tag: ['@MFY', '@ONBOARDING', '@SIGNUP', '@REGRESSION'] },
		async ({ signup, madeForYou, homePage, upgradeNext }) => {
			await test.step('add blog during signup', async () => {
				tempUserInfo = await signup.onboardUser('Blogger', 'https://www.tailwindapp.com/blog');
				await upgradeNext.planCard('Free').click();
				await upgradeNext.goToDashboardButton.click();
			});
			await test.step('verify loading state or generated drafts', async () => {
				await verifyGeneration(madeForYou, homePage);
			});
		},
	);
	test(
		'should allow user to sign up with unsupported store',
		{ tag: ['@MFY', '@ONBOARDING', '@SIGNUP', '@REGRESSION'] },
		async ({ signup, upgradeNext, madeForYou, homePage }) => {
			await test.step('add unsupported store during signup', async () => {
				// Amazon is currently an unsupported store
				tempUserInfo = await signup.onboardUser(
					'Seller',
					'https://www.amazon.com/stores/Madeline-Miller/author/B005GG116K',
				);
				await upgradeNext.planCard('Free').click();
				await upgradeNext.goToDashboardButton.click();
			});
			await test.step('verify broader MFY generation', async () => {
				await verifyGeneration(madeForYou, homePage);
			});
		},
	);
	test(
		'should allow user to sign up with supported store on mobile',
		{ tag: ['@MFY', '@ONBOARDING', '@SIGNUP', '@MOBILE', '@REGRESSION'] },
		async ({ signup, madeForYou, homePage, upgradeNext }) => {
			await test.step('add store during signup - mobile', async () => {
				tempUserInfo = await signup.onboardUser('Seller', 'urbanhousefashion.com', true);
				try {
					await signup.page.getByRole('link', { name: 'Continue with Free' }).click();
				} catch {
					await upgradeNext.planCard('Free').click();
					await upgradeNext.goToDashboardButton.click();
				}
			});
			await test.step('verify loading state or generated drafts', async () => {
				await verifyGeneration(madeForYou, homePage);
			});
		},
	);
});
