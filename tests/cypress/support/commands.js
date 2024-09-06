// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import 'cypress-file-upload';

Cypress.Commands.add('login', (username = Cypress.env('user'), password = Cypress.env('pwd')) => {
    cy.contains('Username').as('Username')
    cy.contains('Password').as('Password')
    cy.get('.j-button').as('SignIn')
    cy.get('@Username').type(username)
    cy.get('@Password').type(password)
    cy.get('@SignIn').click()
    cy.location('pathname').should('equal', '/')
})

Cypress.Commands.add('logout', () => {
    //click signout
    cy.get('.j-header-button > .j-accountcircle > div').click()
    cy.get('.j-settingsmenu-separator > h4 > .pending-changes-manager-exit').click()
    //verify username field is visible
    cy.contains('Username').should('exist')
})

Cypress.Commands.add('tw_login', (username = Cypress.env('user'), password = Cypress.env('pwd')) => {
    cy.contains('Login').click()
    cy.get('#email').type(username)
    cy.get('[name=password]').type(password) //.get(':nth-child(6) > .mt-1 > .appearance-none').type(password)
    cy.get('.block > .w-full').click()
    cy.location('pathname').should('contain', '/dashboard')
})

Cypress.Commands.add('tw_logout', () => {
    cy.get('#desktop-top-nav-settings-button').click()
    cy.contains('a', 'Logout').click()
})

Cypress.Commands.add('tw_verify_message', (element, text, color) => {
    cy.get(element)
            .should('be.visible')
            .should('contain', text)
            .should('have.css', 'color', color)
})

Cypress.Commands.add('tw_verify_tasks', (numDays, numTasks) => {
    cy.get('.average-daily-timeslot-count').invoke('text').then(parseInt).should('be.gte', (numTasks - 4)).should('be.lte', (numTasks + 4))

    for (var x = 1; x <= numDays; x++) {
        cy.get('#table-timeslots-' + x + ' > thead > tr > th > .timeslot-day-group-count').invoke('text').then(parseInt).should('be.gte', (numTasks - 10)).should('be.lte', (numTasks + 10))
    }
})