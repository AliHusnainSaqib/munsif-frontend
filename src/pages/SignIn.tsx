/**
 * src/pages/SignIn.tsx
 *
 * MUNSIF Consumer Protection Portal — Sign In
 * Matches reference/sign_in_sbp_consumer_protection_assistant/screen.png exactly.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import munsifLogo from '@/assets/munsif-logo.png';
import { apiPost } from '@/lib/api';

const INPUT =
  'w-full py-3 bg-surface-container-low text-on-surface text-sm ' +
  'placeholder:text-outline rounded-xl transition-all duration-150 ' +
  'focus:outline-none focus:bg-surface-container-lowest focus:shadow-md shadow-inner';

export default function SignIn() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let resolvedEmail = identifier;
    try {
      const res = await apiPost<{ email: string }>('/auth/resolve-login-identifier', { identifier });
      if (res && res.email) {
        resolvedEmail = res.email;
      }
    } catch (err: any) {
      if (err.message && err.message.includes('404')) {
        setError('No account found');
      } else {
        setError(err.message || 'Unable to verify account identifier');
      }
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === 'aal2') {
      navigate('/verify-2fa', { replace: true });
    } else {
      navigate('/chat', { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-sans">
      {/* ── Page body ── */}
      <main className="flex-1 flex flex-col">
        <div className="relative w-full flex flex-col items-center justify-center min-h-screen py-10 px-4 sm:px-8 overflow-hidden">

          {/* Background blobs + grid */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -left-40 w-[38rem] h-[38rem] rounded-full opacity-30"
              style={{ background: 'var(--color-secondary)', filter: 'blur(130px)' }} />
            <div className="absolute top-1/2 -right-48 w-[42rem] h-[42rem] rounded-full opacity-20"
              style={{ background: 'var(--color-surface-container-highest)', filter: 'blur(150px)' }} />
            <div className="absolute bottom-[-10%] left-1/3 w-[30rem] h-[30rem] rounded-full opacity-15"
              style={{ background: 'var(--color-gold)', filter: 'blur(120px)' }} />
            <svg className="absolute inset-0 w-full h-full opacity-[0.03] select-none" width="100%" height="100%">
              <defs>
                <pattern id="si-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="1" />
                  <circle cx="24" cy="24" r="1.5" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#si-grid)" className="text-primary" />
            </svg>
          </div>

          {/* Security banner */}
          <div className="relative z-10 mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full shadow-sm bg-surface-container-low/80 backdrop-blur border border-outline-variant/30">
            <span className="w-2 h-2 rounded-full animate-pulse bg-emerald" />
            <span className="font-mono text-[11px] text-on-surface tracking-widest uppercase">
              Secure Session: MUNSIF-WEB
            </span>
            <span className="mx-1 text-outline-variant">|</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
              User Login
            </span>
          </div>

          {/* Auth card */}
          <div className="relative z-10 w-full max-w-[480px] rounded-2xl overflow-hidden shadow-[var(--shadow-3)]"
            style={{ background: 'var(--color-surface-container-lowest)' }}>

            {/* Gold top accent bar */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-gold), var(--color-primary))' }} />

            <div className="px-8 pt-8 pb-0 flex flex-col items-center">
              {/* Logo emblem */}
              <div className="relative mb-5 group">
                <div className="absolute -inset-2 rounded-full opacity-40 blur-sm group-hover:opacity-70 transition-all duration-300"
                  style={{ background: 'var(--color-secondary)' }} />
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-2 flex items-center justify-center shadow-inner"
                  style={{ background: 'var(--color-surface-container-low)' }}>
                  <img
                    src={munsifLogo}
                    alt="MUNSIF Consumer Protection Emblem"
                    className="w-full h-full object-contain filter drop-shadow-sm select-none pointer-events-none rounded-xl"
                  />
                </div>
              </div>

              {/* Header text */}
              <div className="text-center w-full mb-6">
                <div className="inline-flex items-center justify-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}>
                    BCO 1962 Educational Portal
                  </span>
                </div>
                <h1 className="text-[28px] leading-[36px] font-semibold tracking-tight" style={{ color: 'var(--color-text-brand)' }}>
                  MUNSIF
                </h1>
                <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Independent Banking Dispute &amp; Inquiry Guide
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="w-full mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}>
                  <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
                {/* Email */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold tracking-wide uppercase" htmlFor="si-email"
                      style={{ color: 'var(--color-text-primary)' }}>
                      Official Banking Email or CNIC
                    </label>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Mandatory</span>
                  </div>
                  <div className="relative flex items-center">
                    <svg className="absolute left-3.5 w-[18px] h-[18px] pointer-events-none" style={{ color: 'var(--color-on-surface-variant)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input
                      id="si-email" type="text" autoComplete="username" required
                      placeholder="e.g. consumer@domain.com or 42101-XXXXXXX-X"
                      value={identifier} onChange={e => setIdentifier(e.target.value)}
                      className={`${INPUT} pl-11 pr-4`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold tracking-wide uppercase" htmlFor="si-pwd"
                      style={{ color: 'var(--color-text-primary)' }}>
                      Portal Password
                    </label>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Encrypted TLS 1.3</span>
                  </div>
                  <div className="relative flex items-center">
                    <svg className="absolute left-3.5 w-[18px] h-[18px] pointer-events-none" style={{ color: 'var(--color-on-surface-variant)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <input
                      id="si-pwd" type={showPwd ? 'text' : 'password'} autoComplete="current-password" required
                      placeholder="••••••••••••"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className={`${INPUT} pl-11 pr-12`}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--color-on-surface-variant)' }}>
                      {showPwd
                        ? <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <div className="w-4 h-4 rounded flex items-center justify-center shadow-inner" style={{ background: 'var(--color-surface-container-high)' }}>
                      <input type="checkbox" id="si-remember" className="sr-only peer" />
                      <div className="w-2.5 h-2.5 rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity bg-primary dark:bg-text-brand" />
                    </div>
                    <span className="text-[13px] group-hover:text-text-brand transition-colors" style={{ color: 'var(--color-on-surface-variant)' }}>
                      Remember this device (30 days)
                    </span>
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold hover:underline underline-offset-4 transition-colors" style={{ color: 'var(--color-text-brand)' }}>
                    Forgot Password?
                  </Link>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="group relative w-full mt-2 py-3.5 px-4 rounded-xl font-semibold text-base tracking-wide shadow-md transition-all duration-200 overflow-hidden active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270]">
                  <div className="absolute inset-0 w-1/2 h-full -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none"
                    style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Verifying Credentials…
                      </>
                    ) : (
                      <>
                        Sign In to Portal
                        <svg className="w-[18px] h-[18px] transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                        </svg>
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Security badge */}
              <div className="w-full mt-6 flex items-center justify-center gap-2 text-center py-2.5 px-3 rounded-xl bg-surface-container/70 border border-outline-variant/30">
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-secondary)' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
                <span className="text-[11px] leading-tight text-left sm:text-center" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Protected with 256-bit SSL Encryption &amp; Multi-factor Verification
                </span>
              </div>


            </div>

            {/* Card footer — sign up link */}
            <div className="w-full px-6 py-3.5 text-center flex items-center justify-center gap-1.5 flex-wrap"
              style={{ background: 'var(--color-surface-container-low)' }}>
              <span className="text-[13px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                New to the MUNSIF Dispute Resolution Portal?
              </span>
              <Link to="/sign-up"
                className="text-xs font-bold transition-colors inline-flex items-center gap-0.5"
                style={{ color: 'var(--color-text-brand)' }}>
                Sign up for a consumer account
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Contact strip */}
          <div className="relative z-10 mt-6 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-xs text-text-secondary">
              For official complaints or regulatory inquiries, contact the State Bank of Pakistan directly:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
              {[
                { icon: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>, label: 'Official SBP Helpline: 111-727-273' },
                { icon: <><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></>, label: 'cpd.helpdesk@sbp.org.pk' },
                { icon: <><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>, label: 'Banking Mohtasib Liaison Cell' },
              ].map((item, i, arr) => (
                <span key={item.label} className="contents">
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--color-on-surface-variant)' }}>
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{item.icon}</svg>
                    <span className="font-mono text-[11px]">{item.label}</span>
                  </div>
                  {i < arr.length - 1 && <span className="hidden sm:inline" style={{ color: 'var(--color-outline-variant)' }}>•</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant/30" style={{ background: 'var(--color-surface-container-low)' }}>
        <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <span className="text-[12px] font-medium" style={{ color: 'var(--color-on-surface)' }}>
              MUNSIF is an independent, unofficial educational project and is not affiliated with, endorsed by, or operated by the State Bank of Pakistan.
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-outline)' }}>
              Legal Reference: Banking Companies Ordinance (1962). Information provided for educational guidance only.
            </span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-secondary)' }}>
            Educational Guide
          </span>
        </div>
      </footer>
    </div>
  );
}
