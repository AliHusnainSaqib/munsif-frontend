/**
 * src/pages/ForgotPassword.tsx
 *
 * MUNSIF Consumer Protection Portal — Forgot Password
 * Allows users to request a password reset email securely without account enumeration.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import munsifLogo from '@/assets/munsif-logo.png';

const INPUT =
  'w-full py-3 bg-surface-container-low text-on-surface text-sm ' +
  'placeholder:text-outline rounded-xl transition-all duration-150 ' +
  'focus:outline-none focus:bg-surface-container-lowest focus:shadow-md shadow-inner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        // We log the error but still show the generic success message unless it's a client/rate-limit error
        console.error('Password reset error:', resetError);
      }

      // Always show success message for anti-enumeration security
      setSubmitted(true);
    } catch (err: unknown) {
      console.error('Unexpected password reset error:', err);
      // Still show submitted to avoid leaking account existence
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans relative overflow-x-hidden"
      style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)' }}
    >
      {/* Top accent bar */}
      <div
        className="w-full h-1"
        style={{
          background: 'linear-gradient(90deg, #1b365d 0%, #c49a45 50%, #1b365d 100%)',
        }}
      />

      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Subtle background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-[600px] h-[600px] rounded-full opacity-30"
            style={{
              background:
                'radial-gradient(circle, var(--color-primary-container) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Card Container */}
          <div
            className="w-full rounded-2xl p-6 sm:p-8 shadow-xl border flex flex-col items-center backdrop-blur-sm"
            style={{
              background: 'var(--color-surface-container-lowest)',
              borderColor: 'var(--color-outline-variant)',
            }}
          >
            {/* MUNSIF Logo & Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 p-2 shadow-sm border"
                style={{
                  background: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                }}
              >
                <img src={munsifLogo} alt="MUNSIF" className="w-full h-full object-contain" />
              </div>
              <span
                className="font-mono text-[11px] tracking-widest uppercase font-semibold mb-1"
                style={{ color: 'var(--color-secondary)' }}
              >
                MUNSIF
              </span>
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ color: 'var(--color-text-brand)' }}
              >
                Password Recovery
              </h1>
              <p
                className="text-xs sm:text-sm mt-1.5 leading-relaxed max-w-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Password Recovery
              </p>
            </div>

            {submitted ? (
              /* Success confirmation state */
              <div className="w-full space-y-5 animate-fadeIn text-center">
                <div
                  className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-emerald bg-emerald/10 border border-emerald/20"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-bold text-text-brand">Check Your Email</h2>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    If an account is associated with <span className="font-semibold text-text-primary">{email}</span>,
                    you will receive a secure password reset link shortly.
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Please check your inbox and spam folder. The link will expire after a short period.
                  </p>
                </div>

                <div className="pt-3 border-t border-outline-variant/30 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setEmail('');
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Didn't receive it? Try another email
                  </button>
                  <div>
                    <Link
                      to="/sign-in"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-text-brand hover:text-primary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Sign In
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Request form */
              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                <p className="text-xs text-text-secondary text-center leading-relaxed mb-1">
                  Enter your registered account email below. We'll send you an encrypted link to reset your password.
                </p>

                {error && (
                  <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="fp-email"
                      className="text-xs font-semibold tracking-wide uppercase"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Registered Email Address
                    </label>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Mandatory
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <svg
                      className="absolute left-3.5 w-[18px] h-[18px] pointer-events-none"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      id="fp-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="e.g. consumer@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${INPUT} pl-11 pr-4`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="group relative w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm tracking-wide shadow-md transition-all duration-200 overflow-hidden active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Generating Reset Link…
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </span>
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/sign-in"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-brand transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Remember your password? Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant/30 py-6 px-4" style={{ background: 'var(--color-surface-container-low)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-col gap-1">
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
    </div>
  );
}
