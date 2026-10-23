/**
 * src/pages/ResetPassword.tsx
 *
 * MUNSIF Consumer Protection Portal — Reset Password
 * Handles setting a new password when arriving from an authorized recovery session link.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import munsifLogo from '@/assets/munsif-logo.png';

const INPUT =
  'w-full py-3 bg-surface-container-low text-on-surface text-sm ' +
  'placeholder:text-outline rounded-xl transition-all duration-150 ' +
  'focus:outline-none focus:bg-surface-container-lowest focus:shadow-md shadow-inner';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check if a session is currently active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    // Also listen to onAuthStateChange in case hash fragment token takes a moment to exchange
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    // Fallback timer: if after 1.5 seconds no session is found, conclude invalid/expired link
    const timer = setTimeout(() => {
      if (mounted) {
        setCheckingSession(false);
      }
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect after 2.5 seconds to sign in
      setTimeout(() => {
        navigate('/sign-in', { replace: true });
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while resetting password.';
      setError(msg);
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
                Create New Password
              </h1>
              <p
                className="text-xs sm:text-sm mt-1.5 leading-relaxed max-w-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Secure Password Reset
              </p>
            </div>

            {checkingSession ? (
              /* Loading verification state */
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-muted">
                <span className="w-8 h-8 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
                <span className="text-xs font-medium">Validating recovery session…</span>
              </div>
            ) : !hasRecoverySession ? (
              /* Invalid or expired recovery link state */
              <div className="w-full space-y-5 text-center animate-fadeIn">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-error bg-error/10 border border-error/20">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-bold text-text-brand">Invalid or Expired Link</h2>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    This password reset link is invalid or has expired. Password recovery tokens can only be used once and expire shortly after issuance.
                  </p>
                </div>

                <div className="pt-3 border-t border-outline-variant/30 space-y-3">
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-container transition-colors shadow-xs"
                  >
                    Request a New Reset Link
                  </Link>
                  <div>
                    <Link
                      to="/sign-in"
                      className="text-xs font-semibold text-text-secondary hover:text-text-brand transition-colors"
                    >
                      Return to Sign In
                    </Link>
                  </div>
                </div>
              </div>
            ) : success ? (
              /* Success state */
              <div className="w-full space-y-5 text-center animate-fadeIn">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-emerald bg-emerald/10 border border-emerald/20">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-bold text-text-brand">Password Updated Successfully</h2>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Your password has been updated. Redirecting you to the sign-in page…
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to="/sign-in"
                    className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-container transition-colors"
                  >
                    Go to Sign In Now
                  </Link>
                </div>
              </div>
            ) : (
              /* New password form */
              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                {error && (
                  <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* New Password */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="rp-pwd"
                      className="text-xs font-semibold tracking-wide uppercase"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      New Password
                    </label>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Min 8 characters
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
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      id="rp-pwd"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${INPUT} pl-11 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                    >
                      {showPassword ? (
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="rp-confirm-pwd"
                      className="text-xs font-semibold tracking-wide uppercase"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Confirm New Password
                    </label>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Must match
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
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      id="rp-confirm-pwd"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${INPUT} pl-11 pr-4`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="group relative w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm tracking-wide shadow-md transition-all duration-200 overflow-hidden active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Updating Password…
                      </>
                    ) : (
                      <>
                        Update Password
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
                    Cancel and return to Sign In
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
