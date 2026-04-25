'use client'

import { useActionState, useState } from 'react'
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/app/actions/auth'
import './loginForm.css'

const ALLOWED_DOMAINS = [
  'gmail.com',
  'hotmail.com', 'hotmail.com.ar', 'hotmail.es',
  'outlook.com', 'outlook.com.ar', 'outlook.es',
  'yahoo.com', 'yahoo.com.ar', 'yahoo.es',
  'live.com', 'live.com.ar',
  'icloud.com', 'me.com',
  'protonmail.com', 'proton.me',
  'msn.com',
  'frc.utn.edu.ar', 'utn.edu.ar',
]

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginState, loginAction, loginPending] = useActionState(signInWithEmail, undefined)
  const [registerState, registerAction, registerPending] = useActionState(signUpWithEmail, undefined)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const isLogin = mode === 'login'

  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setPassword('')
    setConfirmPassword('')
    setPasswordError('')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isLogin) {
      const emailInput = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
      const domain = emailInput.split('@')[1]?.toLowerCase()
      if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
        e.preventDefault()
        setPasswordError('Registrate con un email de Gmail, Hotmail, Outlook, Yahoo u otro proveedor conocido.')
        return
      }
      if (password !== confirmPassword) {
        e.preventDefault()
        setPasswordError('Las contraseñas no coinciden')
        return
      }
    }
    setPasswordError('')
  }

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-title">
          <h1>UTN FRC</h1>
          <p>{isLogin ? 'Iniciá sesión para continuar' : 'Creá tu cuenta'}</p>
        </div>

        <div className="login-card">

          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="login-google-btn">
              <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continuar con Google
            </button>
          </form>

          <div className="login-divider">
            <div className="login-divider__line" />
            <span className="login-divider__text">O</span>
            <div className="login-divider__line" />
          </div>

          <form
            action={isLogin ? loginAction : registerAction}
            className="login-form"
            onSubmit={handleSubmit}
          >
            <input type="hidden" name="next" value={next} />
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="tu@email.com" />
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
              />
            </div>

            {/* Campo confirmar contraseña — solo en registro */}
            {!isLogin && (
              <div className="login-field">
                <label htmlFor="confirmPassword">Repetir contraseña</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setPasswordError('')
                  }}
                  className={passwordError ? 'input-error' : ''}
                />
              </div>
            )}

            {/* Aceptación de T&C — solo en registro */}
            {!isLogin && (
              <div className="login-terms">
                <label className="login-terms__label">
                  <input type="checkbox" name="acceptTerms" required className="login-terms__checkbox" />
                  <span>
                    Acepto los{' '}
                    <a href="/terminos" target="_blank" rel="noopener noreferrer">Términos y Condiciones</a>
                    {' '}y la{' '}
                    <a href="/privacidad" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>
                  </span>
                </label>
              </div>
            )}

            {/* Errores */}
            {passwordError && (
              <p className="login-error">{passwordError}</p>
            )}
            {isLogin && loginState?.error && (
              <p className="login-error">{loginState.error}</p>
            )}
            {!isLogin && registerState?.error && (
              <p className="login-error">{registerState.error}</p>
            )}
            {!isLogin && registerState?.message && (
              <p className="login-success">{registerState.message}</p>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loginPending || registerPending}
            >
              {loginPending || registerPending
                ? 'Cargando...'
                : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

        </div>

        <p className="login-toggle">
          {isLogin ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <button className="login-toggle__btn" onClick={() => handleModeChange(isLogin ? 'register' : 'login')}>
            {isLogin ? 'Registrate' : 'Iniciá sesión'}
          </button>
        </p>

      </div>
    </div>
  )
}