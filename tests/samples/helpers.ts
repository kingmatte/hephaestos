/* eslint-disable sonarjs/no-duplicate-string */
import { ElementHandle, expect, Locator, Page } from '@playwright/test';
import axios from 'axios';
import fs from 'fs';
import { Timeout, timeout } from 'shared/constants';
import { logger } from 'shared/logger';

/**
 * Takes either a selector or a Locator and returns it as a Locator
 * This way we can use our Page model items as Locators without checking the type
 */
export const getAsLocator = (page: Page, input: string | Locator): Locator =>
	typeof input === 'string' ? page.locator(input) : input;

/**
 * Takes an array of either selectors or Locators and returns them all as Locators
 */
export const getAsLocators = (page: Page, selectors: (string | Locator)[]): Locator[] =>
	selectors.map((selector) => getAsLocator(page, selector));

/**
 * Waits for any Locator in an array and returns the first one that is found
 */
const waitForAnyLocator = (page: Page, locators: Locator[], timeToWait?: number): Promise<Locator> =>
	Promise.race(
		locators.map((locator) =>
			locator
				.first()
				.waitFor({ state: 'attached', timeout: timeToWait })
				.then(() => locator),
		),
	);

/**
 * Takes an mixed array of selectors and Locators and waits for the first one that is found and returns it as a Locator
 * This is kind of a hack to let us use our page models that
 * have some selectors and some Locators without checking the type
 */
export const waitForAnyLocatorOrSelector = (
	page: Page,
	selectors: (string | Locator)[],
	timeToWait?: number,
): Promise<Locator> => waitForAnyLocator(page, getAsLocators(page, selectors), timeToWait);

/**
 * @deprecated Use waitForAnyLocatorOrSelector instead
 * Waits for any selector in an array
 * Returns the first selector that was found
 * Please note this returns a selector string, not an elementhandle like page.waitForSelector does
 */
export const waitForAnySelector = (page: Page, selectors: string[], timeToWait?: number): Promise<string> =>
	Promise.race(
		selectors.map((selector) => page.waitForSelector(selector, { timeout: timeToWait }).then(() => selector)),
	);

/**
 * Waits for a selector, then waits for it to be stable (not moving)
 * Returns elementhandle for selector.
 * Default timeout is 30s.
 * @param page
 * @param selector
 * @param timeToWait default 30s
 * @returns ElementHandle
 */
export const waitForSelectorToBeStable = async (
	page: Page,
	selector: string,
	timeToWait: Timeout = timeout.long,
): Promise<ElementHandle> => {
	const elementHandle = await page.waitForSelector(selector, timeToWait);
	await elementHandle.waitForElementState('stable');
	return elementHandle;
};

/**
 * Waits for a selector to be stable by waiting for a trial click.
 * Playwright will auto-wait for stability before performing a trial click.
 * Returns an Element Handle to match the pattern of waitForSelectorToBeStable
 * This is useful to translate tests that were written to use selectors to use locators instead.
 * @param locator
 * @param timeToWait default 5000ms
 * @returns
 */
export const waitForLocatorToBeStable = async (locator: Locator, timeToWait = 5 * 1000) => {
	await locator.click({ trial: true, timeout: timeToWait });
	return locator.elementHandle();
};

/**
 * Returns innertext of given web element by selector
 * If multiple elements match the selector, it returns the first value found.
 * @param page
 * @param selector
 * @param timeout
 * @returns String
 */
export const getElementText = async (page: Page, selector: string, timeToWait?: Timeout): Promise<string> => {
	await waitForSelectorToBeStable(page, selector, timeToWait);
	return page.locator(selector).first().innerText(timeToWait);
};

/**
 * Returns array of innertext for a given selector
 * @param page
 * @param selector
 */
export const getElementsText = async (page: Page, selector: string, timeToWait?: Timeout): Promise<string[]> => {
	await waitForSelectorToBeStable(page, selector, timeToWait);
	return page.locator(selector).allInnerTexts();
};

/**
 * return class value of given web element by selector
 * @param page
 * @param selector
 * @param timeout
 */
export const getElementValue = async (page: Page, selector: string): Promise<string> => {
	await page.waitForSelector(selector);
	const element = await page.$(selector);
	const value = (await (await element!.getProperty('value')).jsonValue()) as string;
	return value || '';
};

/**
 * A handler to accept a Dialog.
 *
 * @param page
 */
export const acceptDialogHandler = async (page: Page): Promise<Page> =>
	page.on('dialog', async (dialog) => {
		await dialog.accept().catch((reason) => {
			if (reason.message && reason.message === 'Cannot accept dialog which is already handled!') {
				// ignore
				return Promise.resolve();
			}
			// reject with reason
			return Promise.reject(reason);
		});
	});

/**
 * Returns false if waitForSelector with visible: true throws an error.
 * @param page
 * @param selector
 * @param timeout
 */
export const isElementVisible = async (
	page: Page,
	selector: string,
	waitTime: Timeout = timeout.tiny,
): Promise<boolean> => {
	try {
		const elementHandle = await page.waitForSelector(selector, waitTime);
		return await elementHandle.isVisible();
	} catch (e) {
		return false;
	}
};

/**
 * Uses keyboard inputs to clear an input field
 */
export const keyboardClear = async (page: Page, selector: string): Promise<void> => {
	await page.focus(selector);
	// click three times to select all text
	await page.click(selector, { clickCount: 3 });
	await page.keyboard.press('Backspace');
};

/**
 * clear text input box using keyboard key combo and enter text after clear
 * @param page
 * @param selector
 * @param text
 * @param wait Wait for autosave after entering text
 */
export const clearEnterInputbox = async (
	page: Page,
	selector: string,
	text: string,
	wait: boolean = false,
): Promise<void> => {
	await waitForSelectorToBeStable(page, selector, timeout.medium);
	await page.fill(selector, ''); // Clears any existing text
	await page.type(selector, text);
	if (wait) {
		await page
			.waitForResponse(
				(resp) =>
					(resp.url().includes('publisher') || resp.url().includes('post/') || resp.url().includes('posts/')) &&
					resp.request().method() === 'PUT' &&
					resp.status() === 200,
				{ timeout: 3000 },
			)
			.catch(() => {
				logger('No post response received');
			});
	}
};

/**
 * Checks if an element exists and returns bool.
 * This is an instant check.
 * If you add timeToWaitInMillis parameter, we will wait and check a second time if the first check fails.
 */
export const doesElementExist = async (page: Page, selector: string, timeToWaitInMillis?: number) => {
	// Check and return true right away if element is found
	if ((await page.$(selector)) !== null) {
		return true;
	}
	// If wait time is given, pause and check again
	if (timeToWaitInMillis) await page.waitForTimeout(timeToWaitInMillis);
	if ((await page.$(selector)) !== null) {
		return true;
	}
	// Return false if element is still not found
	return false;
};

/**
 * Validates that an element exists on the page as a Jest Expect statement
 */
export const expectElementExists = async (page: Page, selector: string, timeToWait?: Timeout) => {
	if (timeToWait) {
		await page.waitForSelector(selector, timeToWait);
	}
	if ((await page.$(selector)) === null) {
		throw new Error(`${selector} not found!`);
	}
};

/**
 * Validates than an array of elements all exist on the page
 */
export const expectElementsExist = async (page: Page, selectors: string[]) => {
	// Our assertions that the dropdown items exist
	const promises = [];
	for (const selector of selectors) {
		promises.push(expectElementExists(page, selector));
	}
	await Promise.all(promises);
};

/**
 * Validates that an element doesn't exist on the page as a Jest Expect statement
 */
export const expectElementDoesNotExist = async (page: Page, selector: string, timeToWaitInMillis?: number) => {
	const elementExists = await doesElementExist(page, selector);
	if (elementExists && timeToWaitInMillis) await page.waitForTimeout(timeToWaitInMillis);
	if ((await page.$(selector)) !== null)
		logger(`Expected ${selector} to not be found, but it was found.`, {
			alwaysLog: true,
			logLevel: 'warn',
		});
	expect((await page.$(selector)) !== null).toEqual(false);
};

/**
 * Validates than an array of elements all do not exist on the page
 */
export const expectElementsDoNotExist = async (page: Page, selectors: string[]) => {
	// Our assertions that the dropdown items exist
	const promises = [];
	for (const selector of selectors) {
		promises.push(expectElementDoesNotExist(page, selector));
	}
	await Promise.all(promises);
};

/*
 * Validates that an element is visible.
 * Optional mustBeInViewPort - if true, the element must intersect the viewport without scrolling to pass.
 * Run test in headful mode to check viewport dimensions.
 */
export const expectElementIsVisible = async (page: Page, selector: string) => {
	const isVisible = await isElementVisible(page, selector, timeout.short);
	// The try catch allows us to see the selector that caused the failure easily in the logs
	try {
		expect(isVisible).toBeTruthy();
	} catch (err) {
		throw new Error(`${selector} was not visible!`);
	}
};

/*
 * Validates that an element is visible.
 * Optional mustBeInViewPort - if true, the element must intersect the viewport without scrolling to pass.
 * Run test in headful mode to check viewport dimensions.
 */
export const expectElementIsNotVisible = async (page: Page, selector: string) => {
	const isVisible = await isElementVisible(page, selector);
	// The try catch allows us to see the selector that caused the failure easily in the logs
	try {
		expect(isVisible).toBeFalsy();
	} catch (err) {
		throw new Error(`${selector} was visible!`);
	}
};

/**
 * Returns a complete url with an https:// prefix and trailing /
 * @param path
 * @returns
 */
const makeCompleteUrl = (inputUrl: string): string => {
	// Adds a trailing / if needed
	let url = inputUrl.trim().replace(/\/?$/, '/');

	// Adds https:// prefix if needed
	if (/^(:\/\/)/.test(url)) {
		url = `https${url.replace(/\/?$/, '/')}`;
	}
	if (!/^(f|ht)tps?:\/\//i.test(url)) {
		url = `https://${url.replace(/\/?$/, '/')}`;
	}
	return url;
};

/**
 * Gets the Tailwind URL based on the system under test.
 * Uses environment variable TEST_URL if available, otherwise NEXT_PUBLIC_TAILWINDAPP_ENVIRONMENT
 * Default is production
 *
 * @param path relative path
 * @see TailwindAppEnvironment
 */
export const tailwindUrl = (path?: string) => {
	let url: string = 'https://www.tailwindapp.com/';

	if (process.env.TEST_URL !== undefined) {
		// Ensure URL begins with https:// and ends with /
		url = makeCompleteUrl(process.env.TEST_URL);
	}

	if (path) {
		url += path.startsWith('/') ? path.substring(1) : path;
	}
	return url;
};

/**
 * Waits for a selector then programmatically clicks all instances of it.
 * This is not a safe click. Default wait time for selector is 5000 ms
 * @param page
 * @param selector
 * @param waitTime Default 5000 ms
 */
export const clickAll = async (page: Page, selector: string, waitTime: Timeout = timeout.short): Promise<void> => {
	await waitForSelectorToBeStable(page, selector, waitTime);
	await page.$$eval(selector, (elHandles) => elHandles.forEach((el) => 'click' in el && el.click()));
};

/**
 * wait for an element to disappear given selector, plus gives a short wait for things to render.
 * Timeout is 5 seconds.
 * @param page
 * @param selector
 * @param timeoutInMilliseconds - default 5000, how long to wait for the selector to disappear
 */
export const waitForSelectorToDisappear = async (
	page: Page,
	selector: string,
	timeoutInMilliseconds: number = 5000,
	waitForElement: boolean = true,
): Promise<void> => {
	if (waitForElement) await page.waitForSelector(selector);
	await page.waitForFunction((s) => !document.querySelector(s), selector, {
		timeout: timeoutInMilliseconds,
	});
};
/**
 * Returns an element's class name
 */
export const getElementClassName = async (page: Page, selector: string): Promise<string> => {
	await page.waitForSelector(selector);
	const element = await page.$(selector);
	return (await element!.getProperty('className')).jsonValue();
};

/**
 * hover click an element
 * @param page
 * @param selector
 */
export const hoverClick = async (page: Page, selector: string): Promise<void> => {
	await waitForSelectorToBeStable(page, selector);
	await page.hover(selector);
	await page.click(selector);
};

/**
 * hover on an area to get the hidden element to show, click the element
 * @param page
 * @param selector
 * @param timeout
 */
export const multipleHoverClick = async (page: Page, areaSelector: string, elementSelector: string): Promise<void> => {
	await waitForSelectorToBeStable(page, areaSelector);
	await page.hover(areaSelector, { force: true });
	await page.waitForSelector(elementSelector);
	await page.click(elementSelector, { force: true });
};

/** Executes a function a number of attempts (until either successful or reaching the maximum allowed attempts).
 * This method gracefully handles temporary errors that arise in timing/race conditions (for example due to animations).
 *
 * @param asyncFunction an async function to execute
 * @param retryMessages error messages for which a re-try is warranted
 * @param maxAttempts maximum number of attempts
 */
export const executeWithRetries = async <R>(
	asyncFunction: () => Promise<R>,
	retryMessages: (string | RegExp)[] = ['.*'],
	maxAttempts = 5,
): Promise<R | undefined> => {
	// eslint-disable-line max-len
	let attempt = 0;

	let result: R | undefined;
	while (attempt < maxAttempts) {
		result = await asyncFunction()
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			.then((value) => {
				attempt = maxAttempts;
				return value;
			})
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			.catch((reason) => {
				const { message } = reason;
				if (message && retryMessages.filter((r) => message.match(r) !== null).length > 0) {
					attempt += 1;
				} else {
					attempt = maxAttempts + 1;
				}
				return undefined;
			});
	}

	if (attempt > maxAttempts) {
		logger('Error executing function with retries', {
			logLevel: 'warn',
			alwaysLog: true,
		});
	}

	return result;
};

/**
 * Verify text of a given selector.
 *
 * @param selector
 * @param verificationText Expected text of selector
 * @param timeoutSetting
 */
export const verifyText = async (
	page: Page,
	selector: string,
	verificationText: string,
	timeoutSetting: number = 1500,
) => {
	try {
		expect(await getElementText(page, selector, { timeout: timeoutSetting })).toBe(verificationText);
	} catch {
		// Tries to get selector value if getElementText didn't work
		expect(await page.getAttribute(selector, 'value')).toBe(verificationText);
	}
};

/** Click on specific item in array of selectors
 * @param page
 * @param selector
 * @param elementIndex index number of selector you want to click
 */
export const clickIndexOfSelector = async (page: Page, selector: string, selectorIndex: number) => {
	await waitForSelectorToBeStable(page, `${selector} >> nth=${selectorIndex}`);
	await page.click(`${selector} >> nth=${selectorIndex}`);
};

/** Screenshot a specific element. Omits any white background caught in the screenshot
 * @param page
 * @param selector
 * @param path
 */
export const screenshotByElement = async (page: Page, selector: string, path: string) => {
	const elementHandle = await waitForSelectorToBeStable(page, selector);
	await elementHandle?.screenshot({
		path,
		omitBackground: true,
	});
};

/**
 * Force clicks an element only if it is on the page.
 * Useful for dismissing notifications or other timing-based clicks that could be missed.
 */
export const forceClickIfPresent = async (page: Page, selector: string) => {
	if ((await page.locator(selector).count()) > 0) {
		await waitForSelectorToBeStable(page, selector);
		await page.locator(selector).first().click({ force: true });
	}
};

/**
 * Sets the viewport to a larger size. Needed to use some features, such
 * as the Create Next post type buttons.
 */
export const setLargeViewport = async (page: Page): Promise<void> => {
	await page.setViewportSize({
		width: 1800,
		height: 900,
	});
};

/* Returns the number of elements matching a selector.
 * Does not wait for elements before counting.
 */
export const countElements = async (page: Page, selector: string): Promise<number> => (await page.$$(selector)).length;

/**
 * Waits until the element count matches the expected number.
 * Retries every 1000ms until the count matches, or until the secondsToTry timeout is reached.
 * This is useful to pair with the clickAll method
 */
export const waitUntilElementCount = async (
	page: Page,
	selector: string,
	expectedCount: number,
	secondsToTry: number = 5,
): Promise<number> => {
	let tries = 0;
	let count = await page.locator(selector).count();
	while (tries < secondsToTry) {
		if (count >= expectedCount) {
			return count;
		}
		await page.waitForTimeout(1000);
		count = await page.locator(selector).count();
		tries += 1;
	}
	return count;
};

/**
 * Clears local storage. Useful for updating TLC values
 */
export const clearLocalStorage = async (page: Page) => {
	await page.evaluate(() => localStorage.clear());
};

export const getRandomBoolean = (): boolean => Math.floor(Math.random() * 2) > 0;

/**
 * Get a randomized subset of an array.
 * This is useful for cutting long iterative tests into shorter pieces.
 */
export const getRandomSubset = <T>(array: T[], desiredNumberOfItems: number) => {
	// Shuffle array
	const shuffled = array.sort(() => 0.5 - Math.random());

	// Get sub-array of first n elements after shuffled
	return shuffled.slice(0, desiredNumberOfItems);
};

export const arrayHasDuplicates = (arr: unknown[]) => arr.some((x) => arr.indexOf(x) !== arr.lastIndexOf(x));

/**
 *
 * @param page
 * @param selector slider selector
 * @param percentage percentage of slider bar to set selector to
 */
export const dragSlider = async (page: Page, selector: string, percentage: string) => {
	await waitForSelectorToBeStable(page, selector);
	const newValue = `position: absolute; user-select: none; touch-action: none; left: calc(${percentage}% - 6.64999px);`;
	await page.$eval(
		selector,
		(el, positionInfo) => {
			el.setAttribute('style', positionInfo);
		},
		newValue,
	);
};

/**
 *
 * @param page
 * @param uploadButtonSelector selector that triggers the file upload
 * @param mediaPath path of media file to be uploaded
 */
export const uploadFromFileChooser = async (
	page: Page,
	uploadButtonSelector: string | Locator,
	mediaPath: string,
): Promise<void> => {
	const uploadButton =
		typeof uploadButtonSelector === 'string'
			? await page.waitForSelector(uploadButtonSelector)
			: await uploadButtonSelector.elementHandle();
	if (!uploadButton) throw new Error('Trouble locating upload button handle');
	const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), uploadButton.click()]);
	await fileChooser.setFiles(mediaPath);
};

/**
 * Compares two arrays to verify that they're equal
 * @param array1
 * @param array2
 * @returns boolean
 */
export const compareArrays = async (array1: (string | null | undefined)[], array2: (string | null | undefined)[]) =>
	array1.length === array2.length &&
	array1.every((element, index) => element?.toLowerCase() === array2[index]?.toLowerCase());

/**
 * Attempts to check a checkbox and retries if check fails
 * @param page
 * @param locator locator of checkbox
 * @param retries defaults to 5
 */
export const ensureCheckboxIsChecked = async (page: Page, locator: Locator, retries: number = 5) => {
	let i = 0;
	while (!(await locator.isChecked()) && i < retries) {
		await page.waitForTimeout(1000);
		await locator.check({ force: true });
		if (await locator.isChecked()) {
			break;
		} else i += 1;
	}
};

/**
 *
 * @param page
 * @returns array of data-e2e-id selectors on current page
 */
export const getSelectorIDs = async (page: Page, idName = 'data-e2e-id', writeToFile = true) => {
	const idArray: (string | null)[] = [];
	// Ignore selectors in the top and side nav
	const ignoredSelectors = [
		'top-nav-gift',
		'top-nav-help',
		'top-nav-settings',
		'left-nav-home',
		'left-nav-create',
		'left-nav-drafts',
		'left-nav-email',
		'left-nav-communities',
		'left-nav-smart-bio',
		'left-nav-insights',
		'left-nav-publisher',
		'left-nav-marketing',
	];
	const elementArray = await page.$$(`[${idName}]`);
	for (let index = 0; index < elementArray.length; index += 1) {
		const id = await elementArray[index]!.getAttribute(idName);
		const fullSelector = `this.name = '[${idName}="${id}"]';\n`;
		if (!ignoredSelectors.includes(id!)) idArray.push(fullSelector);
	}
	// Remove duplicates
	const uniqueIDs = idArray.filter((c, index) => idArray.indexOf(c) === index);
	if (writeToFile) {
		const filePath = 'test/browser/downloads/qs/temp/currentSelectors.txt';
		if (fs.existsSync(filePath))
			fs.writeFile(filePath, '', () => {
				logger('cleared text file');
			});
		uniqueIDs.forEach((element) => {
			fs.writeFileSync(filePath, element!.toString(), { flag: 'a' });
		});
	} else logger(idArray.toString());
	return uniqueIDs;
};

/**
 * Creates a directory if needed. If the folder already exists, optionally deletes the files inside.
 * @param directory
 */
export const createDirectoryWithCleanup = async (directory: string, deleteExistingFiles = true): Promise<string> => {
	if (fs.existsSync(directory)) {
		if (deleteExistingFiles) {
			fs.readdirSync(directory).forEach((file) => {
				fs.unlinkSync(`${directory}/${file}`);
			});
		}
	} else {
		fs.mkdirSync(directory, { recursive: true });
	}
	return directory;
};

/**
 * Drags mouse from center of one on-screen element to another
 * @param element1 Locator of source element
 * @param element2 Locator of target element
 */
export const dragElement = async (page: Page, element1: Locator, element2: Locator): Promise<void> => {
	const elementBox1 = await element1.boundingBox();
	const elementBox2 = await element2.boundingBox();
	if (!elementBox1 || !elementBox2) {
		throw new Error('Unable to find bounding box on element');
	}

	const element1CenterX: number = elementBox1.x + elementBox1.width / 2;
	const element1CenterY: number = elementBox1.y + elementBox1.height / 2;
	const element2CenterX: number = elementBox2.x + elementBox2.width / 2;
	const element2CenterY: number = elementBox2.y + elementBox2.height / 2;

	await page.mouse.move(element1CenterX, element1CenterY, { steps: 15 });
	await page.mouse.down();
	await page.mouse.move(element2CenterX, element2CenterY, { steps: 15 });
	await page.mouse.up();
};

/** Returns only unique values from a given array.
 */
export const getUniqueArray = <T>(array: T[]) => array.filter((c, index) => array.indexOf(c) === index);

/**
 * Waits for a selector attribute to equal a specific value
 * Useful for situations like waiting for a selector icon to stop spinning
 * @param page
 * @param selector
 * @param attribute attribute to verify
 * @param targetValue expected attribute value
 * @param waitTime time to wait in milliseconds; defaults to 5000
 */
export const waitForAttribute = async (
	page: Page,
	selector: string,
	attribute: string,
	targetValue: unknown,
	waitTime?: number,
) => {
	let attributeState = await page.getAttribute(selector, attribute);
	const timeToWait = waitTime || 5000;
	if (attributeState !== targetValue) {
		let tries = 0;
		while (tries < timeToWait / 1000) {
			attributeState = await page.getAttribute(selector, attribute);
			if (attributeState === targetValue) {
				return;
			}
			await page.waitForTimeout(1000);
			tries += 1;
		}
	}
};

/**
 * Checks to see if a supplied value with within specified range of a target value
 * @param desiredValue
 * @param actualValue
 * @param varianceAllowance
 * @returns boolean
 */
export const isWithinRange = (desiredValue: number, actualValue: number, varianceAllowance: number): boolean => {
	const variance = Math.abs(desiredValue - actualValue);
	if (varianceAllowance >= variance === false)
		logger(`Expected ${desiredValue} within ${varianceAllowance} but got ${actualValue}`);
	return varianceAllowance >= variance;
};

/**
 * Gets the computed opacity of a locators element
 * @param locator
 * @returns number
 */
export const getOpacityOfaLocator = async (locator: Locator) =>
	+(await locator.evaluate((node) => window.getComputedStyle(node).opacity));

/**
 * Gets the Quack URL based on the system under test
 * Default is production
 *
 * @param path relative path
 */
export const quackUrl = (path?: string) => {
	let url: string = 'https://quack.tailwindapp.com/';

	if (tailwindUrl() !== 'https://www.tailwindapp.com/') {
		url = 'https://quack.qa.tailwindapp.net/';
	}

	if (path) {
		url += path.startsWith('/') ? path.substring(1) : path;
	}
	return url;
};
/**
 * Gets the Tack URL based on the system under test
 * Default is production
 *
 * @param path relative path
 */
export const tackUrl = (path?: string) => {
	let url: string = 'https://tack.tailwindapp.com/';

	if (tailwindUrl() !== 'https://www.tailwindapp.com/') {
		url = 'https://tack.qa.tailwindapp.net/';
	}

	if (path) {
		url += path.startsWith('/') ? path.substring(1) : path;
	}
	return url;
};

/**
 * Clicks a button and then waits for the data-loading attribute
 * to be null
 *
 * @param page
 * @param button locator or data e2e string of button
 */
export const clickAndWaitForSpinner = async (page: Page, button: Locator | string) => {
	let buttonLocator: Locator;
	if (typeof button === 'string') {
		buttonLocator = page.locator(button);
	} else buttonLocator = button;
	await buttonLocator.click();
	let isLoading: string | null = '';
	while (isLoading === '') {
		isLoading = await buttonLocator.getAttribute('data-loading');
	}
};

/**
 * Turns 1 into '1st', 2 into '2nd', etc.
 */
export const getOrdinal = (n: number | string) => {
	const num = typeof n === 'string' ? parseInt(n, 10) : n;
	const s = ['th', 'st', 'nd', 'rd'];
	const v = num % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Set a reminder date and get a notification when it's passed. Useful
 * when you need to re-enable tests after a bug fix.
 *
 * @param remindDate - date string for reminder message to trigger (MM/DD/YYYY)
 * @param reminderText - text to be included in the reminder, i.e. re-enable after bug fix
 */
// TODO: make this an extension of playwright's test fixture, i.e. test.remindMeOn()
export const remindMeOn = async (remindDate: string, reminderText: string) => {
	if (Date.now() > Date.parse(remindDate)) {
		try {
			await axios.post('https://hooks.slack.com/services/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', {
				text: `Maintenance required: ${reminderText}`,
				username: 'E2E Test Beaver',
			});
			return true;
		} catch {
			logger('Slack reminder failed to post', { alwaysLog: true });
		}
	}
	return false;
};

export const skipReconnectModal = async (page: Page) => {
	// TW Next modal
	await page.addLocatorHandler(page.locator('section', { hasText: 'Reconnect your Accounts' }), async () => {
		await page.waitForTimeout(500);
		await page.getByRole('button', { name: 'Close' }).click();
	});
	// Legacy FB reconnect modal
	await page.addLocatorHandler(
		page.locator('[id="oauth"]'),
		async () => {
			if (!page.url().includes('dashboard/oauth')) {
				await page.locator('[class="modal-backdrop fade in"]').click();
			}
		},
		{ noWaitAfter: true },
	);
};

/**
 * Sometimes there are two elements on the page with the same e2e ID, usually when there is a desktop
 * and mobile version. This action will click on the visible element and ignore the hidden one.
 * @param locator - Locator to search for and click
 */
export const clickVisibleLocator = async (locator: Locator) => {
	if (await locator.first().isVisible()) {
		await locator.first().click();
	} else await locator.nth(1).click();
};
