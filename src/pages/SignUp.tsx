/**
 * src/pages/SignUp.tsx
 *
 * MUNSIF Consumer Protection Portal — Register Consumer Account
 * Matches reference/sign_up_sbp_consumer_protection_assistant/screen.png exactly.
 *
 * Fields: Full Legal Name, Email, CNIC (formatted), Password (+ strength meter),
 *         Confirm Password, statutory acknowledgment checkbox.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { apiPost } from '@/lib/api';
import munsifLogo from '@/assets/munsif-logo.png';

// ── Shared styles (inline vars avoid Tailwind v4 class resolution issues) ──
const INPUT =
  'w-full py-3 text-sm rounded-lg transition-all shadow-sm focus:outline-none focus:shadow-md';
const INPUT_STYLE = {
  background: 'var(--color-surface-container-low)',
  color: 'var(--color-on-surface)',
};
const INPUT_FOCUS_STYLE = { background: 'var(--color-surface-container-lowest)' };

// ── Password strength ───────────────────────────────────────────────────────
type Level = 'none' | 'weak' | 'moderate' | 'strong' | 'max';

function getStrength(val: string): Level {
  if (!val) return 'none';
  let score = 0;
  if (val.length >= 10) score++;
  if (/[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) score++;
  if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
  if (val.length >= 14) score++;
  if (score <= 1) return 'weak';
  if (score === 2) return 'moderate';
  if (score === 3) return 'strong';
  return 'max';
}

const STRENGTH_META: Record<Level, { label: string; bars: number; color: string; barColor: string }> = {
  none:     { label: 'None',                    bars: 0, color: 'var(--color-outline)',             barColor: 'var(--color-surface-variant)' },
  weak:     { label: 'Weak',                    bars: 1, color: 'var(--color-error)',               barColor: 'var(--color-error)' },
  moderate: { label: 'Moderate',                bars: 2, color: 'var(--color-gold)',                barColor: 'var(--color-gold)' },
  strong:   { label: 'Strong',                  bars: 3, color: 'var(--color-secondary)',           barColor: 'var(--color-secondary)' },
  max:      { label: 'Maximum Security',        bars: 4, color: 'var(--color-text-brand)',          barColor: 'var(--color-emerald)' },
};

// ── CNIC formatter ─────────────────────────────────────────────────────────
function formatCNIC(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let out = digits.slice(0, 5);
  if (digits.length > 5) out += '-' + digits.slice(5, 12);
  if (digits.length > 12) out += '-' + digits.slice(12, 13);
  return out;
}

// ── Sub-components ──────────────────────────────────────────────────────────
function PageFooter() {
  return (
    <footer className="w-full border-t border-outline-variant/30" style={{ background: 'var(--color-surface-container-low)' }}>
      <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-center md:text-left">
          <span className="text-[12px] font-medium" style={{ color: 'var(--color-on-surface)' }}>
            MUNSIF is an independent, unofficial educational project and is not affiliated with, endorsed by, or operated by the State Bank of Pakistan.
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-outline)' }}>
            Legal Reference: Banking Companies Ordinance (1962). For official complaints, contact SBP directly at 111-727-273 or cpd.helpdesk@sbp.org.pk.
          </span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-secondary)' }}>
          Educational Guide
        </span>
      </div>
    </footer>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function SignUp() {
  const [fullName, setFullName]           = useState('');
  const [email, setEmail]                 = useState('');
  const [cnic, setCnic]                   = useState('');
  const [dateOfBirth, setDateOfBirth]     = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPwd, setConfirmPwd]       = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [acked, setAcked]                 = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState(false);

  const level   = getStrength(password);
  const meta    = STRENGTH_META[level];
  const mismatch = confirmPwd.length > 0 && password !== confirmPwd;
  const hasLength  = password.length >= 10;
  const hasSpecial = /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
  const hasCase    = /[a-z]/.test(password) && /[A-Z]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnic || !dateOfBirth) {
      setError('CNIC and Date of Birth are required.');
      return;
    }
    if (password !== confirmPwd) {
      setError('Passwords do not match.');
      return;
    }
    if (!acked) {
      setError('You must accept the terms of service and privacy policy to proceed.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await apiPost('/auth/validate-cnic', { cnic });
    } catch (err: any) {
      setError(err.message || 'Invalid CNIC.');
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: fullName,
          full_name: fullName,
          cnic,
          date_of_birth: dateOfBirth,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-on-surface font-sans">
        <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <div className="w-full max-w-[480px] rounded-2xl shadow-[var(--shadow-3)] overflow-hidden"
            style={{ background: 'var(--color-surface-container-lowest)' }}>
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-gold), var(--color-primary))' }} />
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner"
                style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-emerald)' }}>
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-brand)' }}>
                Registration Submitted
              </h2>
              <div className="p-4 rounded-xl mb-6 text-left" style={{ background: 'var(--color-surface-container-low)' }}>
                <p className="text-xs font-mono uppercase tracking-wider mb-2 font-semibold" style={{ color: 'var(--color-secondary)' }}>
                  Verification Email Dispatched
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                  A confirmation link has been sent to{' '}
                  <strong style={{ color: 'var(--color-on-surface)' }}>{email}</strong>.<br /><br />
                  Please check your inbox and click the confirmation link before signing in.
                  The link expires in 24 hours.
                </p>
              </div>
              <Link to="/sign-in"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white">
                Return to Sign In
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        </main>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-sans">
      <main className="flex-1 flex flex-col">
        <div className="relative w-full flex flex-col items-center justify-center min-h-screen py-10 px-4 sm:px-8 overflow-hidden">

          {/* Background */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none opacity-30"
            style={{ background: 'var(--color-secondary)', filter: 'blur(96px)' }} />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none opacity-20"
            style={{ background: 'var(--color-surface-container-highest)', filter: 'blur(96px)' }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(var(--color-primary-container) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

          {/* Protocol badge */}
          <div className="relative z-10 mb-6 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono text-[11px] shadow-sm"
              style={{ background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald" />
              ACCOUNT REGISTRATION · CITIZEN INTAKE
            </span>
          </div>

          {/* Card */}
          <div className="relative z-10 w-full max-w-[480px] rounded-2xl shadow-[var(--shadow-3)] overflow-hidden"
            style={{ background: 'var(--color-surface-container-lowest)' }}>
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-gold), var(--color-primary))' }} />
            <div className="px-8 pt-8 pb-6 flex flex-col items-center">

              {/* Header */}
              <div className="text-center w-full mb-6">
                <div className="relative w-20 h-20 mb-5 mx-auto rounded-2xl p-2 flex items-center justify-center shadow-inner"
                  style={{ background: 'var(--color-surface-container-low)' }}>
                  <img src={munsifLogo} alt="MUNSIF Consumer Protection Logo"
                    className="w-full h-full object-contain rounded-xl select-none pointer-events-none" />
                </div>
                <h1 className="text-[28px] leading-[36px] font-semibold tracking-tight mb-1" style={{ color: 'var(--color-text-brand)' }}>
                  Register Consumer Account
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Consumer Banking Rights &amp; Dispute Assistant
                </p>
                {/* Verification row */}
                <div className="mt-4 w-full px-4 py-2.5 rounded-lg flex items-center justify-between text-left"
                  style={{ background: 'var(--color-surface-container-low)' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-[18px] h-[18px]" style={{ color: 'var(--color-secondary)' }} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                    </svg>
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }}>Identity Verification</span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--color-on-surface-variant)' }}>BCO-1962 SEC-82</span>
                </div>
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

              <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>

                  {/* Full Legal Name */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }} htmlFor="su-name">
                        Full Legal Name <span style={{ color: 'var(--color-error)' }}>*</span>
                      </label>
                      <span className="text-[11px]" style={{ color: 'var(--color-outline)' }}>as per CNIC / Smart Card</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-outline)' }}>
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <input id="su-name" type="text" required autoComplete="name"
                        placeholder="Muhammad Tariq Khan"
                        value={fullName} onChange={e => setFullName(e.target.value)}
                        className={`${INPUT} pl-11 pr-4`} style={INPUT_STYLE}
                        onFocus={e => Object.assign(e.target.style, INPUT_FOCUS_STYLE)}
                        onBlur={e => Object.assign(e.target.style, INPUT_STYLE)}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }} htmlFor="su-email">
                      Email Address <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-outline)' }}>
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <input id="su-email" type="email" required autoComplete="email"
                        placeholder="tariq.khan@domain.pk"
                        value={email} onChange={e => setEmail(e.target.value)}
                        className={`${INPUT} pl-11 pr-4`} style={INPUT_STYLE}
                        onFocus={e => Object.assign(e.target.style, INPUT_FOCUS_STYLE)}
                        onBlur={e => Object.assign(e.target.style, INPUT_STYLE)}
                      />
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                      Used for account notifications and communication.
                    </p>
                  </div>

                  {/* CNIC */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }} htmlFor="su-cnic">
                        CNIC Number <span style={{ color: 'var(--color-error)' }}>*</span>
                      </label>

                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-outline)' }}>
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                        </svg>
                      </div>
                      <input id="su-cnic" type="text" required maxLength={15}
                        placeholder="42101-1234567-1"
                        value={cnic}
                        onChange={e => setCnic(formatCNIC(e.target.value))}
                        className={`${INPUT} pl-11 pr-4 font-mono tracking-widest`} style={INPUT_STYLE}
                        onFocus={e => Object.assign(e.target.style, INPUT_FOCUS_STYLE)}
                        onBlur={e => Object.assign(e.target.style, INPUT_STYLE)}
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }} htmlFor="su-dob">
                      Date of Birth <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-outline)' }}>
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </div>
                      <input id="su-dob" type="date" required
                        value={dateOfBirth}
                        onChange={e => setDateOfBirth(e.target.value)}
                        className={`${INPUT} pl-11 pr-4`} style={INPUT_STYLE}
                        onFocus={e => Object.assign(e.target.style, INPUT_FOCUS_STYLE)}
                        onBlur={e => Object.assign(e.target.style, INPUT_STYLE)}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }} htmlFor="su-pwd">
                        Password <span style={{ color: 'var(--color-error)' }}>*</span>
                      </label>
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
                        {password ? `Strength: ${meta.label}` : 'Strength: None'}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-outline)' }}>
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                        </svg>
                      </div>
                      <input id="su-pwd" type={showPwd ? 'text' : 'password'} required autoComplete="new-password"
                        placeholder="••••••••••••"
                        value={password} onChange={e => setPassword(e.target.value)}
                        className={`${INPUT} pl-11 pr-11`} style={INPUT_STYLE}
                        onFocus={e => Object.assign(e.target.style, INPUT_FOCUS_STYLE)}
                        onBlur={e => Object.assign(e.target.style, INPUT_STYLE)}
                      />
                      <button type="button" aria-label="Toggle password" onClick={() => setShowPwd(v => !v)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                        style={{ color: 'var(--color-outline)' }}>
                        {showPwd
                          ? <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>

                    {/* Strength meter */}
                    <div className="pt-1 space-y-2">
                      <div className="w-full h-1.5 rounded-full overflow-hidden flex gap-0.5"
                        style={{ background: 'var(--color-surface-container-high)' }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} className="h-full w-1/4 rounded-full transition-all duration-300"
                            style={{ background: i <= meta.bars ? meta.barColor : 'var(--color-surface-variant)' }} />
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-0.5">
                        {[
                          { met: hasLength, label: '10+ Chars' },
                          { met: hasSpecial, label: 'Symbol / Num' },
                          { met: hasCase, label: 'Upper & Lower' },
                        ].map(({ met, label }) => (
                          <div key={label} className="flex items-center gap-1 text-[11px]"
                            style={{ color: met ? 'var(--color-emerald)' : 'var(--color-text-muted)' }}>
                            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24"
                              fill={met ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              {met
                                ? <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                                : <circle cx="12" cy="12" r="10"/>}
                            </svg>
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold" style={{ color: 'var(--color-on-surface)' }} htmlFor="su-confirm">
                      Confirm Password <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-outline)' }}>
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                      </div>
                      <input id="su-confirm" type={showConfirmPwd ? 'text' : 'password'} required autoComplete="new-password"
                        placeholder="••••••••••••"
                        value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                        className={`${INPUT} pl-11 pr-11`}
                        style={{ ...INPUT_STYLE, outline: mismatch ? '1.5px solid var(--color-error)' : 'none' }}
                        onFocus={e => Object.assign(e.target.style, INPUT_FOCUS_STYLE)}
                        onBlur={e => Object.assign(e.target.style, INPUT_STYLE)}
                      />
                      <button type="button" aria-label="Toggle confirm password" onClick={() => setShowConfirmPwd(v => !v)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                        style={{ color: 'var(--color-outline)' }}>
                        {showConfirmPwd
                          ? <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                    {mismatch && (
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-error)' }}>
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                        Passwords must match exactly
                      </div>
                    )}
                  </div>

                  {/* Legal acknowledgment */}
                  <div className="pt-1">
                    <label className="flex items-start gap-3 cursor-pointer select-none group">
                      <input type="checkbox" id="su-ack" required checked={acked}
                        onChange={e => setAcked(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded cursor-pointer accent-primary" />
                      <span className="text-[13px] leading-relaxed transition-colors group-hover:text-on-surface"
                        style={{ color: 'var(--color-on-surface-variant)' }}>
                        I certify that the information provided matches my National Identity Card and I agree to the{' '}
                        <a href="#" className="font-semibold underline decoration-outline-variant hover:text-on-primary-container"
                          style={{ color: 'var(--color-text-brand)' }}>
                          Terms of Service &amp; Regulatory Guide
                        </a>{' '}and{' '}
                        <a href="#" className="font-semibold underline decoration-outline-variant hover:text-on-primary-container"
                          style={{ color: 'var(--color-text-brand)' }}>
                          Electronic Data Privacy Policy
                        </a>.
                      </span>
                    </label>
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <button type="submit" disabled={loading || mismatch || !acked}
                      className="w-full py-3.5 px-6 rounded-lg text-base font-semibold tracking-tight flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270]">
                      {loading ? (
                        <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Submitting…</>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                          Create Verified Account
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Card footer */}
              <div className="text-center px-6 py-4 bg-surface-container-low border-t border-outline-variant">
                <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                  Already registered?{' '}
                  <Link to="/sign-in"
                    className="font-semibold hover:underline inline-flex items-center gap-0.5 ml-1"
                    style={{ color: 'var(--color-text-brand)' }}>
                    <span>Sign in to your portal</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </p>
              </div>
            </div>

            {/* Security footnote */}
            <div className="relative z-10 mt-6 text-center">
              <div className="flex items-center justify-center gap-4 font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  256-BIT SSL ENCRYPTION
                </span>
                <span>·</span>
                <span>ISO/IEC 27001 COMPLIANT</span>
                <span>·</span>
                <span>SECURE DATA TRANSFER</span>
              </div>
            </div>
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
