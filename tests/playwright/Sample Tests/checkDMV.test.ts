import { expect, test } from '@playwright/test'

const getMonthNames = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0 for January, 1 for February, ...
    let nextMonth = currentMonth + 1;

    if (nextMonth > 11) {
    // If the next month is greater than 11 (December), reset to January
    nextMonth = 0;
    }

    const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentMonthName = monthNames[currentMonth];
    const nextMonthName = monthNames[nextMonth];
    return [currentMonthName, nextMonthName]
}

/**
 * Checks the NC DMV page to see if there are any nearby appointments
 * in the next 30 days
 */
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
        await test.step('Check for Carrboro status', async () => {
            try {
                await page.getByTitle(/Create an appointment at the Carrboro/).waitFor({state: 'attached'})
                await page.getByText('Carrboro').first().click()
                const nextAvailable = await page.locator('ui-datepicker-month').textContent()
                expect (getMonthNames()).toContain(nextAvailable)
                console.log(`Appointment available in ${nextAvailable}`)
            } catch {
                console.log('No appointments available within 30 days')
            }
        })
    })
})