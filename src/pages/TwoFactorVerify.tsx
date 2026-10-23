/**
 * src/pages/TwoFactorVerify.tsx
 *
 * MUNSIF Consumer Protection Portal — Two-Factor Authentication
 * Matches reference/two_factor_verification_sbp_consumer_protection/screen.png exactly.
 *
 * Key visual details from reference:
 * - 6 digit boxes with a separator dot between box 3 and 4
 * - Gold/tricolor top accent bar
 * - Real MUNSIF logo replaced by shield+key icon
 * - Expiry countdown + "Resend SMS OTP" row
 * - "Using institutional hardware key? Authenticate with FIDO2 / YubiKey" secondary action
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const DIGIT_COUNT = 6;

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

export default function TwoFactorVerify() {
  const navigate = useNavigate();

  // Guard: redirect if no session at all
  const [guardChecked, setGuardChecked] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate('/sign-in', { replace: true });
      else setGuardChecked(true);
    });
  }, [navigate]);

  // Digit state
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clock
  const [clock, setClock] = useState('');
  // Countdown 4:52
  const [countdown, setCountdown] = useState(292);
  // Resend cooldown 28s
  const [resendSecs, setResendSecs] = useState(28);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0, 8) + ' PKT');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown(v => v - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (resendSecs <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setResendSecs(v => v - 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatCountdown = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  const codeReady = digits.every(d => d !== '');

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, DIGIT_COUNT);
      const next = [...digits];
      cleaned.split('').forEach((ch, i) => { if (i < DIGIT_COUNT) next[i] = ch; });
      setDigits(next);
      const focus = Math.min(cleaned.length, DIGIT_COUNT - 1);
      inputRefs.current[focus]?.focus();
      return;
    }
    const cleaned = value.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < DIGIT_COUNT - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < DIGIT_COUNT) { setError('Please enter all 6 digits.'); return; }
    setError(null);
    setLoading(true);

    const { data: factorData, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr || !factorData?.totp?.length) {
      setError(listErr?.message ?? 'No TOTP factor enrolled. Please set up 2FA in Settings first.');
      setLoading(false);
      return;
    }

    const factorId = factorData.totp[0].id;
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyErr) {
      setError(verifyErr.message);
      setDigits(Array(DIGIT_COUNT).fill(''));
      inputRefs.current[0]?.focus();
      setLoading(false);
      return;
    }

    navigate('/chat', { replace: true });
  };

  if (!guardChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <span className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--color-surface-container-high)', borderTopColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)' }}>
      <main className="flex-1 flex flex-col">
        <section className="relative w-full py-10 flex items-center justify-center px-4 md:px-8 overflow-hidden">

          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[720px] h-[720px] rounded-full opacity-40"
              style={{ background: 'radial-gradient(ellipse, var(--color-secondary) 0%, transparent 70%)', filter: 'blur(80px)' }} />
          </div>
          <div className="absolute -top-12 right-12 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'var(--color-primary-container)', opacity: 0.05, filter: 'blur(48px)' }} />

          <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center">
            {/* Card */}
            <div className="w-full rounded-2xl overflow-hidden shadow-[var(--shadow-3)] relative"
              style={{ background: 'var(--color-surface-container-lowest)' }}>

              {/* Tricolor top bar (gold accent) */}
              <div className="absolute top-0 inset-x-0 h-1.5"
                style={{ background: 'linear-gradient(to right, var(--color-primary), var(--color-gold), var(--color-secondary))' }} />

              <div className="pt-7 pb-6 px-6 md:px-10">
                {/* Header row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full"
                    style={{ background: 'var(--color-surface-container-low)' }}>
                    <span className="w-2 h-2 rounded-full bg-emerald" />
                    <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
                      TWO-FACTOR AUTHENTICATION
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded text-text-muted bg-surface-container">
                    SECURITY LAYER
                  </span>
                </div>

                {/* Icon + heading */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner"
                      style={{ background: 'var(--color-surface-container)' }}>
                      <svg className="w-8 h-8" style={{ color: 'var(--color-text-brand)' }} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      </svg>
                    </div>
                    {/* Key badge */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm bg-primary dark:bg-surface-container-high">
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                      </svg>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-secondary)' }}>
                    Account Security Verification
                  </span>
                  <h1 className="text-[28px] leading-[36px] font-semibold" style={{ color: 'var(--color-text-brand)' }}>
                    Two-Factor Authentication
                  </h1>
                  <p className="text-sm mt-2" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Enter the 6-digit verification code generated by your Authenticator app or sent via encrypted SMS.
                  </p>
                </div>

                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                  {/* OTP inputs — 3 digits · dot · 3 digits */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
                      {/* First 3 digits */}
                      {[0, 1, 2].map(i => (
                        <input
                          key={i}
                          ref={el => { inputRefs.current[i] = el; }}
                          type="text" inputMode="numeric" maxLength={6}
                          pattern="[0-9]*" autoFocus={i === 0}
                          aria-label={`Digit ${i + 1}`}
                          value={digits[i]}
                          onChange={e => handleDigitChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center font-mono text-[22px] font-semibold rounded-xl transition-all outline-none"
                          style={{
                            background: 'var(--color-surface-container-low)',
                            color: 'var(--color-text-primary)',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
                            border: error ? '1.5px solid var(--color-error)' : 'none',
                          }}
                        />
                      ))}
                      {/* Separator dot */}
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-outline-variant)' }} />
                      {/* Last 3 digits */}
                      {[3, 4, 5].map(i => (
                        <input
                          key={i}
                          ref={el => { inputRefs.current[i] = el; }}
                          type="text" inputMode="numeric" maxLength={1}
                          pattern="[0-9]*"
                          aria-label={`Digit ${i + 1}`}
                          value={digits[i]}
                          onChange={e => handleDigitChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center font-mono text-[22px] font-semibold rounded-xl transition-all outline-none"
                          style={{
                            background: 'var(--color-surface-container-low)',
                            color: 'var(--color-text-primary)',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
                            border: error ? '1.5px solid var(--color-error)' : 'none',
                          }}
                        />
                      ))}
                    </div>

                    {/* Status line */}
                    <div className="min-h-[22px] flex items-center justify-center gap-2 text-[13px]">
                      {error ? (
                        <>
                          <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-error)' }} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                          <span className="font-medium" style={{ color: 'var(--color-error)' }}>{error}</span>
                        </>
                      ) : codeReady ? (
                        <>
                          <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-brand)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          <span className="font-medium" style={{ color: 'var(--color-text-brand)' }}>Code entered. Click verify to validate credentials.</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                          </svg>
                          <span style={{ color: 'var(--color-on-surface-variant)' }}>Hardware or app-bound cryptographically signed challenge</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expiry + resend row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-xl"
                    style={{ background: 'var(--color-surface-container-low)' }}>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg shadow-sm"
                      style={{ background: 'var(--color-surface-container-lowest)' }}>
                      <svg className="w-4 h-4 animate-pulse" style={{ color: 'var(--color-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span className="font-mono text-[12px] font-medium" style={{ color: 'var(--color-on-surface)' }}>
                        {countdown > 0 ? `Expires in ${formatCountdown(countdown)}` : 'Expired'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={!canResend}
                        className="text-[12px] font-semibold flex items-center gap-1 transition-colors"
                        style={{ color: canResend ? 'var(--color-text-brand)' : 'var(--color-text-muted)', cursor: canResend ? 'pointer' : 'not-allowed' }}>
                        <span>Resend SMS OTP</span>
                        {!canResend && (
                          <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            (available in {resendSecs}s)
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <button type="submit" disabled={loading}
                      className="group w-full py-3 px-6 rounded-xl text-base font-semibold flex items-center justify-center gap-2 shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-white bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270]">
                      {loading ? (
                        <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Validating Verification Code…</>
                      ) : (
                        <>
                          Verify &amp; Proceed to Dashboard
                          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </>
                      )}
                    </button>

                    {/* Hardware key secondary action */}
                    <div className="flex items-center justify-center gap-2 text-[13px]">
                      <span style={{ color: 'var(--color-on-surface-variant)' }}>Using institutional hardware key?</span>
                      <button type="button" className="flex items-center gap-0.5 font-semibold transition-colors"
                        style={{ color: 'var(--color-secondary)' }}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                        </svg>
                        Authenticate with FIDO2 / YubiKey
                      </button>
                    </div>
                  </div>
                </form>

                {/* Help block */}
                <div className="mt-6 rounded-xl p-4 flex flex-col gap-3 bg-surface-container-low border border-outline-variant/30">
                  <div className="flex items-start gap-3">
                    <svg className="w-4.5 h-4.5 shrink-0 mt-0.5" style={{ color: 'var(--color-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                        Experiencing accessibility or signal issues?
                      </span>
                      <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
                        You can generate an emergency 16-character backup recovery token or contact the regulatory helpdesk:
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <a href="#" className="text-[12px] font-semibold flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--color-text-brand)' }}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 5.477 10 10-4.477 10-10 10zm0-6v.01M12 7a5 5 0 000 10"/>
                          </svg>
                          Use Emergency Recovery Key
                        </a>
                        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>•</span>
                        <a href="tel:111727273" className="text-[12px] font-semibold flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--color-text-brand)' }}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                          </svg>
                          Official SBP Helpline: 111-727-273
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TLS footer strip */}
                <div className="mt-4 pt-3 flex flex-col md:flex-row items-center justify-between gap-2"
                  style={{ borderTop: '1px solid var(--color-outline-variant)' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-outline)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>TLS 1.3 / EAL6+ Certified HSM</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>IP: 202.163.112.44</span>
                    <span style={{ color: 'var(--color-outline)' }}>•</span>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>{clock}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Below-card strip */}
            <div className="w-full max-w-[480px] mt-4 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z"/>
                </svg>
                <span className="font-mono text-[11px]" style={{ color: 'var(--color-outline)' }}>Regulated by BCO 1962</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-secondary)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-secondary)' }}>
                  Secured Sandbox Active
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  );
}
