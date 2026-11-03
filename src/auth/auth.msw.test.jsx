import { screen, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { USERS, apiUrl } from '../test/msw/data.js'
import { problem } from '../test/msw/handlers.js'
import { server } from '../test/msw/server.js'
import { renderApp } from '../test/renderApp.jsx'

describe('Authentication workflow (MSW)', () => {
  it('redirects a signed-out visitor to the login page', async () => {
    renderApp('/work-orders', { role: null })
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('signs in with valid credentials and stores the session', async () => {
    const { user } = renderApp('/login', { role: null })
    await user.type(await screen.findByLabelText('Email'), USERS.planner.email)
    await user.type(screen.getByLabelText('Password'), USERS.planner.password)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Operations overview' })).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('careflow.session'))).toMatchObject({
      email: USERS.planner.email, roles: ['ROLE_PLANNER'],
    })
  })

  it('shows the API message for wrong credentials and stays signed out', async () => {
    const { user } = renderApp('/login', { role: null })
    await user.type(await screen.findByLabelText('Email'), USERS.planner.email)
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Sign-in failed.')).toBeInTheDocument()
    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument()
    expect(window.localStorage.getItem('careflow.session')).toBeNull()
  })

  it('signs out and clears the session', async () => {
    const { user } = renderApp('/work-orders')
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(window.localStorage.getItem('careflow.session')).toBeNull()
  })

  it('sends the user back to login when the API says the token expired', async () => {
    server.use(http.get(apiUrl('/work-orders'), () => problem(401, 'Token expired.')))

    renderApp('/work-orders')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(window.localStorage.getItem('careflow.session')).toBeNull()
  })

  it('hides dashboard navigation from technicians', async () => {
    renderApp('/work-orders', { role: 'technician' })
    await screen.findByRole('table')

    const nav = within(screen.getByRole('navigation', { name: 'Primary navigation' }))
    expect(nav.getByRole('link', { name: 'Work orders' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Operations overview' })).not.toBeInTheDocument()
  })
})