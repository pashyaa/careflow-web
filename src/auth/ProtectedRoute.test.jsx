import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

function LoginStub() { return <div>Login page</div> }
function SecretPage() { return <div>Secret page</div> }

function renderWithRoute(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginStub />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<SecretPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => window.localStorage.clear())

  it('redirects to /login when there is no session', () => {
    renderWithRoute('/secret')

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument()
  })

  it('renders the protected content when a session exists', () => {
    window.localStorage.setItem(
      'careflow.session',
      JSON.stringify({ token: 'fake.jwt', email: 'planner.pat@careflow.local', roles: ['ROLE_PLANNER'] }),
    )

    renderWithRoute('/secret')

    expect(screen.getByText('Secret page')).toBeInTheDocument()
  })
})