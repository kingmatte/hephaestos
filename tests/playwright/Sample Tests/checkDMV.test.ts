import { expect, test } from '@playwright/test'

test.describe('Check DMV status', { tag: ['@SAMPLE'] }, () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('https://skiptheline.ncdot.gov/')
    })
    test('Visit DMV and check for appointments', async ({ page }) => {
        await test.step('Open DMV scheduling page', async () => {
            await page.getByRole('button', {name: 'Make an Appointment'}).click();
            await page.getByText('Driver License Renewal').click()
        })
        await test.step('Enter search criteria', async () => {
            await page.getByRole('textbox', { name: 'Search' }).pressSequentially('27517')
            await page.getByText('27517 Chapel Hill').click()
        })
        await test.step('', async () => {
            //
        })
        expect(page.url()).toContain('wut')
    })
})