/// <reference types="Cypress" />

beforeEach( () => {
    cy.visit('/')
    cy.tw_login()
})

// after( () => {
//     cy.tw_logout()
// })

describe('tw_schedule_test', () => {    
    it('tests range 1-40', () => {
        //Go to Publisher->Your Schedule tab
        cy.get('#side-nav-button-publisher > .material-icons-round').click()
        cy.get('#sub-nav-item-your-schedule').click()
        //Recreate schedule
        cy.get('#btn-schedule-regenerate-general').as('recreate_btn')
        cy.get('@recreate_btn').click()
        //Enter number between 1 and 40
        cy.get('#per-day-posts').clear().type('25')
        //Verify info message
        cy.tw_verify_message('#regenerate-schedule-spamguard-acceptable', 'in line with', 'rgb(92, 184, 92)')
        //Recreate schedule and verify each day has number of scheduled posts within +/-3 of setting
        cy.get('#regenerate-schedule-btn').click()
        cy.waitFor(cy.get('#regenerate-schedule-modal').should('not.be.visible'), {timeout: 30000})
        cy.tw_verify_tasks(5, 25)
        cy.get('#sub-nav-item-scheduled').click()
        cy.get('.smart-guide-warning').should('be.visible')
    })

    it('tests range 41-50', () => {
        //Go to Publisher->Your Schedule tab
        cy.get('#side-nav-button-publisher > .material-icons-round').click()
        cy.get('#sub-nav-item-your-schedule').click()
        //Recreate schedule
        cy.get('#btn-schedule-regenerate-general').as('recreate_btn')
        cy.get('@recreate_btn').click()
        //Enter number between 1 and 40
        cy.get('#per-day-posts').clear().type('45')
        //Verify info message
        cy.tw_verify_message('#regenerate-schedule-spamguard-warninglimit', 'edging towards', 'rgb(58, 135, 173)')
        //Recreate schedule and verify each day has number of scheduled posts within +/-2 of setting
        cy.get('#regenerate-schedule-btn').click()
        cy.waitFor(cy.get('#regenerate-schedule-modal').should('not.be.visible'), {timeout: 30000})
        cy.tw_verify_tasks(5, 45)
        cy.get('.module > .alert-info').should('contain', 'edging towards')
    })

    it('tests range above 50', () => {
        //Go to Publisher->Your Schedule tab
        cy.get('#side-nav-button-publisher > .material-icons-round').click()
        cy.get('#sub-nav-item-your-schedule').click()
        //Recreate schedule
        cy.get('#btn-schedule-regenerate-general').as('recreate_btn')
        cy.get('@recreate_btn').click()
        //Enter number between 1 and 40
        cy.get('#per-day-posts').clear().type('55')
        //Verify info message
        cy.tw_verify_message('#regenerate-schedule-spamguard-dangerlimit', 'substantially more', 'rgb(183, 115, 29)')
        //Recreate schedule and verify each day has number of scheduled posts within +/-2 of setting
        cy.get('#regenerate-schedule-btn').click()
        //Click on warning acceptance button
        cy.get('#override-schedule-btn').click()
        cy.waitFor(cy.get('#regenerate-schedule-modal').should('not.be.visible'), {timeout: 30000})
        //Verify tasks are created successfully and that warning messages are present
        cy.tw_verify_tasks(5, 55)
        cy.get('.module > .alert-warning').should('contain', 'substantially more')
        cy.get('#table-timeslots-1 > thead > tr > th > .spam-guard-daily-limit-warning > .text-warning').should('be.visible')
        cy.get('#sub-nav-item-scheduled').click()
        //cy.get('.smart-guide-warning').should('not.be.visible')
        cy.get('.smart-guide-lg-icon-wrapper').should('be.visible')
    })

    it('tests uncommon input', () => {
        //Go to Publisher->Your Schedule tab
        cy.get('#side-nav-button-publisher > .material-icons-round').click()
        cy.get('#sub-nav-item-your-schedule').click()
        //Recreate schedule
        cy.get('#btn-schedule-regenerate-general').as('recreate_btn')
        cy.get('#per-day-posts').as('post_setting')
        cy.get('@recreate_btn').click()
        //Enter non-numeric character and verify that the field is left blank
        //Verify tasks are listed as 0 for each day
        cy.get('@post_setting').clear().type('aa')
        cy.get('#regenerate-schedule-btn').click()
        cy.waitFor(cy.get('#regenerate-schedule-modal').should('not.be.visible'), {timeout: 30000})
        cy.get('.average-daily-timeslot-count').should('contain', '0')
        //Enter 0 and verify that 0 posts per day are listed in the schedule
        cy.get('@recreate_btn').click()
        cy.get('@post_setting').clear().type('0')
        cy.get('#regenerate-schedule-btn').click()
        cy.waitFor(cy.get('#regenerate-schedule-modal').should('not.be.visible'), {timeout: 30000})
        cy.get('.average-daily-timeslot-count').should('contain', '0')
        //Enter negative number and verify that 0 posts per day are listed in the schedule
        cy.get('@recreate_btn').click()
        cy.get('@post_setting').clear().type('-14')
        cy.get('#regenerate-schedule-btn').click()
        cy.waitFor(cy.get('#regenerate-schedule-modal').should('not.be.visible'), {timeout: 30000})
        cy.get('.average-daily-timeslot-count').should('contain', '0')
        //Verify Scheduled tab redirects to Schedule Manager
        cy.get('#sub-nav-item-scheduled').click()
        cy.location('pathname').should('contain', '/dashboard/publisher/schedule-manager')
    })
})