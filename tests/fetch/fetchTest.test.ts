// Website https://sdetchallenge.fetch.com/ allows you to simulate the scaling process. You can write gold bar
// number(s) in left and right bowl grids. Press the “Weigh” button and it will tell you which side weighs more or less or
// the same. The weighing result will be shown in the “Weighing” list so you can track records.
// After you are done with one weighing you can press the “Reset” button to reset the plates grid to empty values so you
// can do another weighing.
// When you find the fake gold bar click on the button with a number corresponding to the fake gold bar at the bottom of
// the screen and check if you were right or wrong: an alert will pop up with two possible messages: “Yay! You found it!”
// or “Oops! Try Again!”.
// NOTE: Do not refresh the page as it will reset the fake bar to a random
// NOTE: Buttons at the bottom with numbers DO NOT represent weights. It’s just the sequential number.
// Challenge
// 1. Play around with the website and find the best algorithm (minimum number of weighings for any possible
// fake bar position) to find the fake gold bar.
// 2. Create the test automation project using any preferred language to perform
// a. clicks on buttons (“Weigh”, “Reset”)
// b. Getting the measurement results (field between the 'bowls')
// c. filling out the bowls grids with bar numbers (0 to 8)
// d. getting a list of weighing
// e. Clicking on the gold bar number at the bottom of the website and checking for the alert message
// 3. Code the algorithm from step 1 which uses a set of actions from step 2 to find the fake gold bar
// The algorithm should populate and weigh gold bars until a fake on
import { expect, test } from '@playwright/test'

let bars = ['0','1','2','3','4','5','6','7']
let leftBars = bars.slice(0, 4)
let rightBars = bars.slice(-4)
const weighings: string[] = []
let fakeBar = ''

test.describe('fetch sdet challenge', () => {
  test.beforeEach('test setup', async ({ page }) => {
    await test.step('navigate to page', async () => {
      await page.goto('https://sdetchallenge.fetch.com', {waitUntil: 'load'})
    })
    await test.step('fill in initial bars to be weighed', async () => {
      for (let index = 0; index < 4; index+=1) {
          await page.locator(`input#left_${index}`).fill(leftBars[index])
          await page.locator(`input#right_${index}`).fill(rightBars[index])
      }
    })
  })

  test('should select fake gold bar', async ({ page }) => {
    const weighButton = page.getByRole('button', {name: 'Weigh'})
    const resetButton = page.getByRole('button', {name: 'Reset'})
    const result = page.locator('button:has-text(">"), button:has-text("<"), button:has-text("=")')
    await test.step('check result of initial weighing', async () => {
      await weighButton.click();
      await result.waitFor({state: 'visible', timeout: 5_000})
      weighings.push(`${leftBars} ${await result.textContent()} ${rightBars}`)
      if (await result.textContent() === '=') {
        fakeBar = '8'
      } else {
        bars = await result.textContent() === '>' ? rightBars : leftBars
        leftBars = bars.slice(0, 2)
        rightBars = bars.slice(-2)
        await resetButton.click()
        await page.locator('button:has-text("?")').waitFor({state: 'visible', timeout: 5_000})
      }
    })
    if (fakeBar === '') {
      await test.step('fill in next batch of bars and weigh', async () => {
        for (let index = 0; index < 2; index+=1) {
            await page.locator(`input#left_${index}`).fill(leftBars[index])
            await page.locator(`input#right_${index}`).fill(rightBars[index])
        }
        await weighButton.click();
        await result.waitFor({state: 'visible', timeout: 5_000})
        weighings.push(`${leftBars} ${await result.textContent()} ${rightBars}`)
        bars = await result.textContent() === '<' ? leftBars : rightBars
        leftBars = [bars[0]]
        rightBars = [bars[1]]
        await resetButton.click()
        await page.locator('button:has-text("?")').waitFor({state: 'visible', timeout: 5_000})
      })
      await test.step('fill in third batch of bars and weigh', async () => {
          await page.locator(`input#left_0`).fill(leftBars[0])
          await page.locator(`input#right_0`).fill(rightBars[0])
          await weighButton.click();
          await page.locator('button:has-text(">"), button:has-text("<")').waitFor({state: 'visible', timeout: 5_000})
          weighings.push(`${leftBars} ${await result.textContent()} ${rightBars}`)
          fakeBar = await result.textContent() === '<' ? leftBars[0] : rightBars[0]
      })
    }
    await test.step('verify results and log', async () => {
      console.log(`The fake bar number is: ${fakeBar}`)
      console.log('Weighings:')
      weighings.forEach((weighing) => {
        console.log(weighing)
      })
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Yay!');
        await dialog.accept();
      });
      await page.getByRole('button', {name: fakeBar}).click();
    })
  })
})