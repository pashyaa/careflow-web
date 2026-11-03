import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { AuthProvider } from '../auth/AuthContext.jsx'
import { sessionFor } from './msw/data.js'

export function renderApp(route = '/work-orders', { role = 'planner' } = {}) {
  if (role) window.localStorage.setItem('careflow.session', JSON.stringify(sessionFor(role)))
  const user = userEvent.setup()
  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
  return { user, ...utils }
}