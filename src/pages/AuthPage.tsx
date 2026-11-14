import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Command, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setMessage(''); setBusy(true)
    try {
      if (!supabase) throw new Error('Supabase configuration is missing.')
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password })
        if (signUpError) throw signUpError
        if (data.session) navigate('/', { replace: true })
        else setMessage('Check your inbox to confirm your email, then sign in to continue.')
      } else if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login` })
        if (resetError) throw resetError
        setMessage('If an account exists for that email, a password reset link has been sent.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signInError) throw signInError
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'
  const description = mode === 'signup' ? 'Start converting more of your leads.' : mode === 'reset' ? 'We’ll send a secure reset link to your email.' : 'Sign in to your workspace to continue.'

  return <div className="auth-layout">
    <section className="auth-visual">
      <div className="auth-visual-noise" />
      <Link to="/login" className="auth-brand"><span className="brand-mark"><Command size={17} /></span><span><strong>Leadflow</strong><small>CONVERSION ENGINE</small></span></Link>
      <div className="auth-hero-copy"><div className="auth-eyebrow"><span /> AI-POWERED SALES INTELLIGENCE</div><h1>Turn better<br /><em>leads into</em><br />lasting growth.</h1><p>One clear view of every conversation, score, and opportunity in your pipeline.</p><div className="auth-stat-row"><div><strong>01</strong><span>Capture</span></div><div className="auth-stat-line" /><div><strong>02</strong><span>Qualify</span></div><div className="auth-stat-line" /><div><strong>03</strong><span>Convert</span></div></div></div>
      <div className="auth-visual-footer"><span>Private by design</span><span>Supabase secured</span><span>Built for your team</span></div>
    </section>
    <section className="auth-form-side">
      <div className="auth-mobile-brand"><span className="brand-mark"><Command size={17} /></span><strong>Leadflow</strong></div>
      <div className="auth-form-wrap">
        <div className="auth-form-heading"><div className="eyebrow">YOUR WORKSPACE</div><h2>{title}</h2><p>{description}</p></div>
        {message && <div className="auth-success"><CheckCircle2 size={17} /><span>{message}</span></div>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label>Email address<div className="input-with-icon"><Mail size={16} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></div></label>
          {mode !== 'reset' && <label>Password<div className="input-with-icon"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /><button type="button" className="show-password" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>}
          {mode === 'login' && <button type="button" className="forgot-link" onClick={() => { setMode('reset'); setMessage(''); setError('') }}>Forgot password?</button>}
          <button type="submit" className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}<ArrowRight size={16} /></button>
        </form>
        {mode !== 'reset' ? <div className="auth-switch">{mode === 'login' ? 'New to Leadflow?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); setError('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div> : <div className="auth-switch"><button onClick={() => { setMode('login'); setMessage(''); setError('') }}>Back to sign in</button></div>}
        <div className="auth-privacy"><LockKeyhole size={13} /> Your account is protected by Supabase authentication and organization-level access policies.</div>
      </div>
      <div className="auth-bottom-note">© {new Date().getFullYear()} Leadflow AI <span>·</span> Secure lead operations</div>
    </section>
  </div>
}
