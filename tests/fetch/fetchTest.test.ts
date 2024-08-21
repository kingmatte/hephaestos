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

  test('should select the fake gold bar', async ({ page }) => {
    const weighButton = page.getByRole('button', {name: 'Weigh'})
    const resetButton = page.getByRole('button', {name: 'Reset'})
    const result = page.locator('button:has-text(">"), button:has-text("<"), button:has-text("=")')

    await test.step('check result of initial weighing', async () => {
      await weighButton.click();
      await result.waitFor({state: 'visible', timeout: 5_000})
      weighings.push(`${leftBars} ${await result.textContent()} ${rightBars}`)
      if (await result.textContent() === '=') {
        // If initial sets are equal, the answer must be 8
        fakeBar = '8'
      } else {
        // Select array with lowest combined weight for next weighing
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
        // Select array with lowest combined weight for next weighing
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
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Yay!');
        console.log(dialog.message())
        await dialog.accept();
      });
      await page.getByRole('button', {name: fakeBar}).click();
      console.log(`The fake bar number is: ${fakeBar}`)
      console.log('Weighings:')
      weighings.forEach((weighing) => {
        console.log(weighing)
      })
    })
  })
})