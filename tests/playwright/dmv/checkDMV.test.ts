import { test } from '@playwright/test'

test.describe('', () => {
    test('', async ({ page }) => {
        await page.goto('https://www.ncdot.gov/dmv/license-id/driver-license-appointments/Pages/default.aspx')
    })
})