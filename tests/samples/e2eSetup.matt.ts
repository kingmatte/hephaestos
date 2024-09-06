import {
	logInAndSaveStorageState,
	NextUserCredentialsKey,
	shouldRefreshStorageState,
	test as setup,
} from '@tailwind/playwright-utils';

const twnextAccounts: NextUserCredentialsKey[] = [
	'development',
	'tailwind_next',
	'tailwind_next2',
	'tailwind_next3',
	'tailwind_critical',
	'survey',
	'development_admin',
	'development_viewer',
	'next_pinterest_only',
	'next_ig_only',
];

setup.describe.configure({ mode: 'parallel' });
setup.describe('storage state setup', () => {
	for (const account of twnextAccounts) {
		setup(`authenticate as ${account} user`, async () => {
			if (shouldRefreshStorageState(account)) {
				await logInAndSaveStorageState(account);
			}
		});
	}
});
