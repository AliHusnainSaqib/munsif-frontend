/**
 * src/pages/SettingsPage.tsx
 *
 * MUNSIF Consumer Protection Portal — Settings & Security Policy
 *
 * Implements the institutional three-section settings management interface:
 * 1. Profile: display name, avatar, language preference, and confidential CNIC.
 * 2. Security: password reset and TOTP 2FA enrollment / verification / deactivation.
 * 3. Appearance: system theme luminance selection bound to shared ThemeContext.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiGet, apiPatch } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/context/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  language_preference: string | null;
  cnic: string | null;
  date_of_birth: string | null;
  age: number | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface CnicChangeRequestItem {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  consumed?: boolean;
}

interface MeResponse {
  user_id: string;
  email: string | null;
  profile: Profile;
  aal: string;
}

interface TotpFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

type SettingsTab = 'profile' | 'security' | 'appearance';

// ---------------------------------------------------------------------------
// SettingsPage Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // ── Profile State ──
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [baselineProfile, setBaselineProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [languagePreference, setLanguagePreference] = useState<string>('en');

  // ── CNIC Change Requests State ──
  const [cnicRequests, setCnicRequests] = useState<CnicChangeRequestItem[]>([]);
  const [loadingCnicRequests, setLoadingCnicRequests] = useState<boolean>(true);

  // ── Approved CNIC Update Form State ──
  const [showUpdateCnicModal, setShowUpdateCnicModal] = useState<boolean>(false);
  const [newCnicValue, setNewCnicValue] = useState<string>('');
  const [currentPasswordForCnic, setCurrentPasswordForCnic] = useState<string>('');
  const [mfaCodeForCnic, setMfaCodeForCnic] = useState<string>('');
  const [updatingCnic, setUpdatingCnic] = useState<boolean>(false);
  const [updateCnicError, setUpdateCnicError] = useState<string | null>(null);
  const [updateCnicSuccess, setUpdateCnicSuccess] = useState<string | null>(null);

  // ── Security / Password State ──
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── Security / 2FA State ──
  const [mfaLoading, setMfaLoading] = useState<boolean>(false);
  const [enrolledFactor, setEnrolledFactor] = useState<TotpFactor | null>(null);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [enrollQrCode, setEnrollQrCode] = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState<boolean>(false);
  const [disablingMfa, setDisablingMfa] = useState<boolean>(false);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatCNICInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 13);
    let out = digits.slice(0, 5);
    if (digits.length > 5) out += '-' + digits.slice(5, 12);
    if (digits.length > 12) out += '-' + digits.slice(12, 13);
    return out;
  };

  // ---------------------------------------------------------------------------
  // Data Loaders
  // ---------------------------------------------------------------------------

  // Load user profile via GET /me
  const loadProfile = async () => {
    try {
      const data = await apiGet<MeResponse>('/me');
      if (data?.profile) {
        setBaselineProfile(data.profile);
        setUserEmail(data.email ?? '');
        setDisplayName(data.profile.display_name ?? '');
        setAvatarUrl(data.profile.avatar_url ?? '');
        setLanguagePreference(data.profile.language_preference ?? 'en');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve profile data.';
      setProfileError(msg);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Load CNIC change requests via GET /me/cnic-requests
  const loadCnicRequests = async () => {
    try {
      const data = await apiGet<CnicChangeRequestItem[]>('/me/cnic-requests');
      setCnicRequests(data ?? []);
    } catch (err: unknown) {
      console.error('Failed to retrieve CNIC change requests:', err);
    } finally {
      setLoadingCnicRequests(false);
    }
  };

  // Load MFA factors via Supabase SDK
  const loadMfaFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setMfaError(error.message);
        return;
      }
      const verifiedTotp = data?.totp?.find((f) => f.status === 'verified') ?? null;
      setEnrolledFactor((verifiedTotp as TotpFactor) ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to list authentication factors.';
      setMfaError(msg);
    }
  };

  useEffect(() => {
    let mounted = true;

    loadProfile();
    loadCnicRequests();

    if (location.state && (location.state as { cnicRequestSuccess?: string }).cnicRequestSuccess) {
      setProfileSuccess((location.state as { cnicRequestSuccess: string }).cnicRequestSuccess);
      window.history.replaceState({}, document.title);
    }

    supabase.auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setMfaError(error.message);
          return;
        }
        const verifiedTotp = data?.totp?.find((f) => f.status === 'verified') ?? null;
        setEnrolledFactor((verifiedTotp as TotpFactor) ?? null);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to list authentication factors.';
        setMfaError(msg);
      });

    return () => {
      mounted = false;
    };
  }, [location.state]);

  // ---------------------------------------------------------------------------
  // Profile Handlers
  // ---------------------------------------------------------------------------

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    // Build partial update payload with only the changed fields (CNIC is excluded)
    const patchPayload: Record<string, string> = {};
    if (displayName.trim() !== (baselineProfile?.display_name ?? '')) {
      patchPayload.display_name = displayName.trim();
    }
    if (avatarUrl.trim() !== (baselineProfile?.avatar_url ?? '')) {
      patchPayload.avatar_url = avatarUrl.trim();
    }
    if (languagePreference !== (baselineProfile?.language_preference ?? 'en')) {
      patchPayload.language_preference = languagePreference;
    }

    if (Object.keys(patchPayload).length === 0) {
      setProfileSuccess('All fields are up to date. No modifications detected.');
      return;
    }

    setSavingProfile(true);
    try {
      const updatedProfile = await apiPatch<Profile>('/me', patchPayload);
      setBaselineProfile(updatedProfile);
      setDisplayName(updatedProfile.display_name ?? '');
      setAvatarUrl(updatedProfile.avatar_url ?? '');
      setLanguagePreference(updatedProfile.language_preference ?? 'en');
      setProfileSuccess('Profile changes have been saved.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile changes.';
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateApprovedCnic = async (e: FormEvent) => {
    e.preventDefault();
    setUpdateCnicError(null);
    setUpdateCnicSuccess(null);

    if (!newCnicValue.trim()) {
      setUpdateCnicError('Please enter the new CNIC or B-Form number.');
      return;
    }

    if (!currentPasswordForCnic) {
      setUpdateCnicError('Please enter your current password to authorize this change.');
      return;
    }

    setUpdatingCnic(true);

    try {
      // Check 2FA factor requirement
      const { data: factorData } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = factorData?.totp?.find((f) => f.status === 'verified');

      if (verifiedTotp) {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel !== 'aal2') {
          // If a 6-digit code was provided in the form, try to verify it first
          if (mfaCodeForCnic.trim()) {
            const { error: challengeErr } = await supabase.auth.mfa.challengeAndVerify({
              factorId: verifiedTotp.id,
              code: mfaCodeForCnic.trim(),
            });
            if (challengeErr) {
              setUpdateCnicError(`2FA verification failed: ${challengeErr.message}`);
              setUpdatingCnic(false);
              return;
            }
          } else {
            // Redirect to the existing 2FA verify flow first
            navigate('/verify-2fa');
            return;
          }
        }
      }

      // Call PATCH /me/cnic
      const updatedProfile = await apiPatch<Profile>('/me/cnic', {
        cnic: newCnicValue.trim(),
        current_password: currentPasswordForCnic,
      });

      setBaselineProfile(updatedProfile);
      setUpdateCnicSuccess('Your CNIC has been successfully updated.');
      setNewCnicValue('');
      setCurrentPasswordForCnic('');
      setMfaCodeForCnic('');
      setShowUpdateCnicModal(false);
      setProfileSuccess('Your CNIC has been successfully updated in your profile.');

      await Promise.all([loadProfile(), loadCnicRequests()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update CNIC.';
      setUpdateCnicError(msg);
    } finally {
      setUpdatingCnic(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Security Handlers: Password Change
  // ---------------------------------------------------------------------------

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Password confirmation does not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess('Cryptographic password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Security Handlers: 2FA Enrollment & Verification
  // ---------------------------------------------------------------------------

  const handleStartEnroll = async () => {
    setMfaLoading(true);
    setMfaError(null);
    setMfaSuccess(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'MUNSIF',
      });
      if (error || !data) {
        setMfaError(error?.message ?? 'Failed to initialize TOTP enrollment.');
        setMfaLoading(false);
        return;
      }
      setEnrollFactorId(data.id);
      setEnrollSecret(data.totp.secret);
      setEnrollQrCode(data.totp.qr_code);
      setIsEnrolling(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start 2FA enrollment.';
      setMfaError(msg);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrollFactorId) return;

    const cleanedCode = verifyCode.replace(/\D/g, '');
    if (cleanedCode.length !== 6) {
      setMfaError('Please enter the 6-digit TOTP verification code.');
      return;
    }

    setMfaLoading(true);
    setMfaError(null);
    setMfaSuccess(null);

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollFactorId,
        code: cleanedCode,
      });

      if (error) {
        setMfaError(error.message);
        setMfaLoading(false);
        return;
      }

      setMfaSuccess('Two-factor authentication successfully activated and enforced.');
      setIsEnrolling(false);
      setEnrollFactorId(null);
      setEnrollSecret(null);
      setEnrollQrCode(null);
      setVerifyCode('');
      await loadMfaFactors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification process failed.';
      setMfaError(msg);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCancelEnroll = () => {
    setIsEnrolling(false);
    setEnrollFactorId(null);
    setEnrollSecret(null);
    setEnrollQrCode(null);
    setVerifyCode('');
    setMfaError(null);
  };

  const handleDisableMfa = async () => {
    if (!enrolledFactor) return;

    setDisablingMfa(true);
    setMfaError(null);
    setMfaSuccess(null);

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: enrolledFactor.id,
      });

      if (error) {
        setMfaError(error.message);
      } else {
        setMfaSuccess('Two-factor authentication has been safely removed.');
        setShowDisableConfirm(false);
        await loadMfaFactors();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disable 2FA factor.';
      setMfaError(msg);
    } finally {
      setDisablingMfa(false);
    }
  };

  const handleCopySecret = () => {
    if (!enrollSecret) return;
    navigator.clipboard.writeText(enrollSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const userInitial = displayName.trim()
    ? displayName.trim().charAt(0).toUpperCase()
    : userEmail.charAt(0).toUpperCase() || 'U';

  const maskedCnic = baselineProfile?.cnic
    ? baselineProfile.cnic.length > 5
      ? `${baselineProfile.cnic.slice(0, 5)}-*****${baselineProfile.cnic.slice(-2)}`
      : '*****'
    : 'Not Registered';

  const latestCnicRequest = cnicRequests.length > 0 ? cnicRequests[0] : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto w-full bg-background text-on-surface">
      {/* ── Sovereign Breadcrumb & Statutory Authority Indicator ── */}
      <div className="w-full bg-surface-container-low border-b border-outline-variant/30 px-4 sm:px-8 py-2.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-text-secondary font-medium">
            <span>Banking Portal</span>
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span>User Profile &amp; Security</span>
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-text-brand font-semibold">Settings &amp; Security Policy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container font-mono text-[11px] text-text-primary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
              SECURITY LEVEL: STANDARD
            </span>
            <span className="text-outline-variant hidden sm:inline">|</span>
            <span className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold hidden sm:inline">
              MUNSIF SETTINGS v4.2.1
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* ── Top Editorial Heading ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-primary dark:bg-[#1b365d] text-white text-[11px] tracking-widest uppercase font-bold">
                Verified Identity
              </span>
              <span className="font-mono text-xs text-text-secondary">NODE://KHI-HQ-SEC-09</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-brand tracking-tight">
              Portal Settings &amp; Security Preferences
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Manage authentication profile, multi-factor verification,
              and consumer portal accessibility preferences.
            </p>
          </div>


        </div>

        {/* ── Tabbed Navigation Bar ── */}
        <div className="w-full bg-surface-container rounded-xl p-1 shadow-xs flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'profile'
                ? 'bg-surface-container-lowest text-text-brand shadow-xs'
                : 'text-text-secondary hover:text-text-brand hover:bg-surface-container-high'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile & Mandate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'security'
                ? 'bg-surface-container-lowest text-text-brand shadow-xs'
                : 'text-text-secondary hover:text-text-brand hover:bg-surface-container-high'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Security & 2FA</span>
            {enrolledFactor ? (
              <span className="w-2 h-2 rounded-full bg-emerald" title="2FA Active" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-gold" title="2FA Recommended" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'appearance'
                ? 'bg-surface-container-lowest text-text-brand shadow-xs'
                : 'text-text-secondary hover:text-text-brand hover:bg-surface-container-high'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span>Appearance & Display</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* SECTION 1: PROFILE & MANDATE                                        */}
        {/* =================================================================== */}
        {activeTab === 'profile' && (
          <section className="space-y-6">
            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald flex items-center justify-between text-xs font-medium animate-fadeIn">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{profileSuccess}</span>
                </div>
                <button type="button" onClick={() => setProfileSuccess(null)} className="text-emerald hover:opacity-75">
                  &times;
                </button>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 text-error flex items-center justify-between text-xs font-medium animate-fadeIn">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{profileError}</span>
                </div>
                <button type="button" onClick={() => setProfileError(null)} className="text-error hover:opacity-75">
                  &times;
                </button>
              </div>
            )}

            {loadingProfile ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-text-muted">
                <div className="w-8 h-8 rounded-full border-2 border-outline-variant border-t-primary dark:border-t-white animate-spin" />
                <span className="text-xs font-medium">Loading verified identity record…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── Left Identity Card (4 cols) ── */}
                <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center space-y-4">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-sm bg-surface-container-high flex items-center justify-center border-2 border-outline-variant/30">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="User avatar preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to text initials if avatar url fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-3xl font-bold text-text-brand">{userInitial}</span>
                      )}
                    </div>
                    <span
                      className="absolute -bottom-2 -right-2 bg-primary dark:bg-[#1b365d] text-white rounded-full p-1.5 shadow-sm flex items-center justify-center"
                      title="Verified Identity"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-text-brand">
                      {displayName || 'Registered Consumer'}
                    </h2>
                    <p className="text-xs text-text-secondary font-medium mt-0.5">
                      {userEmail || 'Civilian Account'}
                    </p>
                    <span className="inline-block mt-2 font-mono text-[11px] bg-surface-container px-3 py-1 rounded-full text-text-secondary">
                      CNIC: {maskedCnic}
                    </span>
                  </div>

                  <div className="w-full bg-surface-container-low rounded-xl p-3 text-left space-y-2 text-xs border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Division</span>
                      <span className="font-semibold text-text-brand">Consumer Protection Reference</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Account Role</span>
                      <span className="font-mono text-text-brand font-semibold">
                        {baselineProfile?.is_admin ? 'Admin / Officer' : 'Consumer'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Domain</span>
                      <span className="font-semibold text-text-brand">Banking Consumer Rights</span>
                    </div>
                  </div>
                </div>

                {/* ── Right Profile Information Details (8 cols) ── */}
                <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-text-brand">Personal Information</h3>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Display Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-brand block">
                          Full Display Name
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-text-muted pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. Tariq Mahmood"
                            className="w-full bg-surface-container-low focus:bg-surface-container-lowest pl-9 pr-3 py-2 rounded-lg text-sm text-text-primary border border-outline-variant/50 focus:border-primary transition-all outline-none"
                          />
                        </div>
                      </div>

                      {/* Official Avatar URL */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-text-brand block">
                          Avatar Image URL
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-text-muted pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <input
                            type="url"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://example.com/photo.jpg"
                            className="w-full bg-surface-container-low focus:bg-surface-container-lowest pl-9 pr-3 py-2 rounded-lg text-sm text-text-primary border border-outline-variant/50 focus:border-primary transition-all outline-none"
                          />
                        </div>
                      </div>

                      {/* Read-only Account Email */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-brand block">
                          Account Email Address
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-text-muted pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <input
                            type="email"
                            value={userEmail}
                            readOnly
                            disabled
                            className="w-full bg-surface-container pl-9 pr-3 py-2 rounded-lg text-sm text-text-muted border border-outline-variant/30 cursor-not-allowed select-none"
                          />
                        </div>
                        <span className="text-[11px] text-text-muted block">
                          Managed by Authentication Provider.
                        </span>
                      </div>

                      {/* Verified CNIC (Read-only) & Change Request Workflow */}
                      <div className="space-y-3 sm:col-span-2 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-text-brand block">
                                Verified CNIC / B-Form Number
                              </label>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-text-muted font-semibold">
                                READ-ONLY RECORD
                              </span>
                            </div>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              Protected identity credential stored for identity verification.
                            </p>
                          </div>

                          {/* Distinct Read-Only Value Badge */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high/70 border border-outline-variant/20 text-text-primary">
                            <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                            </svg>
                            <span className="font-mono text-sm tracking-wider font-semibold">
                              {baselineProfile?.cnic ? baselineProfile.cnic : 'Not registered'}
                            </span>
                          </div>
                        </div>

                        {/* CNIC Change Request Flow Status */}
                        <div className="pt-2 border-t border-outline-variant/20">
                          {loadingCnicRequests ? (
                            <p className="text-xs text-text-muted">Checking CNIC change request status...</p>
                          ) : !latestCnicRequest || (latestCnicRequest.status === 'approved' && latestCnicRequest.consumed) ? (
                            /* No requests yet or previous approved request already consumed */
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                              <span className="text-xs text-text-secondary">
                                Need to update your CNIC or B-Form following renewal or legal correction?
                              </span>
                              <Link
                                to="/settings/cnic-request"
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-on-primary hover:opacity-90 transition-all shadow-xs shrink-0"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Request CNIC Change
                              </Link>
                            </div>
                          ) : latestCnicRequest.status === 'pending' ? (
                            /* Most recent is pending */
                            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-medium">
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Your request is under review</span>
                            </div>
                          ) : latestCnicRequest.status === 'rejected' ? (
                            /* Most recent is rejected */
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-semibold">
                                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Your last request was rejected</span>
                                </div>
                                {latestCnicRequest.admin_note && (
                                  <p className="text-[11px] text-error/90 pl-5">
                                    Reason: {latestCnicRequest.admin_note}
                                  </p>
                                )}
                              </div>
                              <Link
                                to="/settings/cnic-request"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-error text-white hover:opacity-90 transition-all shrink-0"
                              >
                                Submit a new request
                              </Link>
                            </div>
                          ) : (
                            /* Most recent is approved */
                            <div className="space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-emerald/10 border border-emerald/30 text-emerald text-xs">
                                <div className="flex items-center gap-2 font-medium">
                                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Your request was approved — you can now update your CNIC</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowUpdateCnicModal(true)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald text-white hover:opacity-90 transition-all shrink-0 shadow-xs cursor-pointer"
                                >
                                  Update CNIC
                                </button>
                              </div>

                              {/* Inline Form for Updating CNIC */}
                              {showUpdateCnicModal && (
                                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/50 space-y-4 animate-fadeIn">
                                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                                    <h5 className="text-xs font-bold text-text-brand uppercase tracking-wider">
                                      Authorize CNIC Record Update
                                    </h5>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowUpdateCnicModal(false);
                                        setUpdateCnicError(null);
                                      }}
                                      className="text-text-muted hover:text-text-primary text-sm font-bold cursor-pointer"
                                    >
                                      &times;
                                    </button>
                                  </div>

                                  {updateCnicError && (
                                    <div className="p-2.5 rounded-lg bg-error/10 border border-error/30 text-error text-xs">
                                      {updateCnicError}
                                    </div>
                                  )}

                                  {updateCnicSuccess && (
                                    <div className="p-2.5 rounded-lg bg-emerald/10 border border-emerald/30 text-emerald text-xs">
                                      {updateCnicSuccess}
                                    </div>
                                  )}

                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-text-brand block">
                                        New CNIC / B-Form Number <span className="text-error">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        placeholder="42101-1234567-1"
                                        maxLength={15}
                                        value={newCnicValue}
                                        onChange={(e) => setNewCnicValue(formatCNICInput(e.target.value))}
                                        className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-mono text-sm text-text-primary border border-outline-variant/50 focus:border-primary transition-all outline-none"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-text-brand block">
                                        Current Account Password <span className="text-error">*</span>
                                      </label>
                                      <input
                                        type="password"
                                        required
                                        placeholder="••••••••••••"
                                        value={currentPasswordForCnic}
                                        onChange={(e) => setCurrentPasswordForCnic(e.target.value)}
                                        className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg text-sm text-text-primary border border-outline-variant/50 focus:border-primary transition-all outline-none"
                                      />
                                    </div>

                                    {/* Conditionally show 6-digit 2FA code field if enrolledFactor exists */}
                                    {enrolledFactor && (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <label className="text-xs font-bold text-text-brand block">
                                            Two-Factor Authentication Code (6 digits) <span className="text-error">*</span>
                                          </label>
                                          <span className="text-[10px] text-text-muted">TOTP Authenticator</span>
                                        </div>
                                        <input
                                          type="text"
                                          maxLength={6}
                                          placeholder="123456"
                                          value={mfaCodeForCnic}
                                          onChange={(e) => setMfaCodeForCnic(e.target.value.replace(/\D/g, ''))}
                                          className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-mono text-sm tracking-widest text-text-primary border border-outline-variant/50 focus:border-primary transition-all outline-none"
                                        />
                                        <p className="text-[10px] text-text-muted">
                                          Enter the current 6-digit code from your authenticator app.
                                        </p>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 pt-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowUpdateCnicModal(false);
                                          setUpdateCnicError(null);
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleUpdateApprovedCnic}
                                        disabled={updatingCnic}
                                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                                      >
                                        {updatingCnic ? 'Verifying & Updating...' : 'Confirm CNIC Update'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Verified Date of Birth & Age (Read-only) */}
                    <div className="space-y-3 sm:col-span-2 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-text-brand block">
                              Date of Birth &amp; Age
                            </label>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-text-muted font-semibold">
                              READ-ONLY RECORD
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Record used for age verification and profile information.
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {/* Date of Birth Badge */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high/70 border border-outline-variant/20 text-text-primary">
                            <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-mono text-sm tracking-wider font-semibold">
                              {baselineProfile?.date_of_birth ? baselineProfile.date_of_birth : 'Not registered'}
                            </span>
                          </div>

                          {/* Age Badge */}
                          {baselineProfile?.age !== null && baselineProfile?.age !== undefined && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                              <span>{baselineProfile.age} yrs old</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Language Preference ── */}
                    <div className="space-y-2 pt-3 border-t border-outline-variant/30">
                      <div>
                        <h4 className="text-xs font-bold text-text-brand">
                          Regulatory Language Interface
                        </h4>
                        <p className="text-[11px] text-text-secondary">
                          Sets default language parsing for Banking Companies Ordinance syntheses and official Ombudsman decrees.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                        {[
                          { code: 'en', title: 'English', sub: 'Official Regulatory', note: 'Standard for notifications' },
                          { code: 'ur', title: 'اردو (Urdu)', sub: 'قومی زبان', note: 'کسٹمر سپورٹ اور ریگولیٹری' },
                          { code: 'sd', title: 'سنڌي (Sindhi)', sub: 'صوبائي ٻولي', note: 'صارفين جي شڪايتن جي ورڪ فلو' },
                          { code: 'ps', title: 'پښتو (Pashto)', sub: 'سيمه ايزه ژبه', note: 'قانوني او مالي شخړو ملاتړ' },
                        ].map((lang) => {
                          const isSelected = languagePreference === lang.code;
                          return (
                            <label
                              key={lang.code}
                              className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-surface-container-high border-primary dark:border-[#8fa8cf] shadow-xs'
                                  : 'bg-surface-container-low border-outline-variant/40 hover:bg-surface-container'
                              }`}
                            >
                              <input
                                type="radio"
                                name="language_preference"
                                value={lang.code}
                                checked={isSelected}
                                onChange={(e) => setLanguagePreference(e.target.value)}
                                className="sr-only"
                              />
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-text-brand">{lang.title}</span>
                                <span
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-primary dark:border-[#8fa8cf] bg-primary dark:bg-[#8fa8cf]'
                                      : 'border-outline-variant'
                                  }`}
                                >
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-text-secondary font-semibold">
                                {lang.sub}
                              </span>
                              <span className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                                {lang.note}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
                      <button
                        type="button"
                        onClick={loadProfile}
                        disabled={savingProfile}
                        className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
                      >
                        {savingProfile ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                            <span>Saving Changes…</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Save Profile Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =================================================================== */}
        {/* SECTION 2: SECURITY & 2FA                                           */}
        {/* =================================================================== */}
        {activeTab === 'security' && (
          <section className="space-y-6">
            {mfaSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald flex items-center justify-between text-xs font-medium animate-fadeIn">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{mfaSuccess}</span>
                </div>
                <button type="button" onClick={() => setMfaSuccess(null)} className="text-emerald hover:opacity-75">
                  &times;
                </button>
              </div>
            )}

            {mfaError && (
              <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 text-error flex items-center justify-between text-xs font-medium animate-fadeIn">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{mfaError}</span>
                </div>
                <button type="button" onClick={() => setMfaError(null)} className="text-error hover:opacity-75">
                  &times;
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ── Password Change Card (5 cols) ── */}
              <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-text-brand">Cryptographic Credentials</h3>
                      <p className="text-xs text-text-secondary">Enforce Central Bank entropy & rotation rules.</p>
                    </div>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3 rounded-lg bg-emerald/10 border border-emerald/30 text-emerald text-xs font-medium">
                      {passwordSuccess}
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs font-medium">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-brand block">
                        New Password
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full bg-surface-container-low focus:bg-surface-container-lowest px-3 py-2 pr-9 rounded-lg text-sm text-text-primary border border-outline-variant/50 focus:border-primary transition-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 text-text-muted hover:text-text-primary"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-brand block">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full bg-surface-container-low focus:bg-surface-container-lowest px-3 py-2 rounded-lg text-sm text-text-primary border border-outline-variant/50 focus:border-primary transition-all outline-none"
                      />
                    </div>

                    {/* Policy checklist */}
                    <div className="p-3 bg-surface-container-low rounded-xl space-y-1.5 text-xs text-text-secondary border border-outline-variant/30">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald' : 'bg-outline-variant'}`} />
                        <span>Minimum 8 alphanumeric characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${newPassword && newPassword === confirmPassword ? 'bg-emerald' : 'bg-outline-variant'}`} />
                        <span>Password and confirmation must match</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {passwordLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          <span>Updating Password…</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Update Portal Password</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* ── 2FA Enrollment & Management Card (7 cols) ── */}
              <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-text-brand">Two-Factor Authentication (2FA)</h3>
                        {enrolledFactor ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald/15 text-emerald text-[11px] font-bold tracking-wide">
                            ACTIVE & ENFORCED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold tracking-wide">
                            NOT ENROLLED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">
                        TOTP authenticator app verification following standard 2FA security practices.
                      </p>
                    </div>
                  </div>

                  {/* ── State A: Factor is ALREADY ENROLLED ── */}
                  {enrolledFactor && !isEnrolling && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald/15 text-emerald flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-text-brand block">
                              Authenticator App (TOTP) Factor
                            </span>
                            <span className="text-[11px] text-text-muted font-mono">
                              Factor ID: {enrolledFactor.id.slice(0, 12)}…
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald" />
                          Enrolled
                        </span>
                      </div>

                      {/* Deactivation Box */}
                      <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl space-y-3">
                        <div className="flex items-start gap-2.5">
                          <svg className="w-4 h-4 text-error shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-xs text-text-primary">
                            Deactivating 2FA leaves your account unprotected and requires verification on next sign-in.
                          </p>
                        </div>

                        {showDisableConfirm ? (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleDisableMfa}
                              disabled={disablingMfa}
                              className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {disablingMfa ? 'Removing Factor…' : 'Confirm & Disable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDisableConfirm(false)}
                              className="px-3 py-1.5 rounded-lg bg-surface-container text-text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowDisableConfirm(true)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-error hover:text-white text-error border border-error/30 text-xs font-semibold transition-all shadow-xs"
                          >
                            Disable 2FA
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── State B: NO FACTOR & NOT ENROLLING YET ── */}
                  {!enrolledFactor && !isEnrolling && (
                    <div className="py-6 flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-text-muted">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="max-w-md">
                        <h4 className="text-sm font-bold text-text-brand">
                          Elevate Your Portal Security
                        </h4>
                        <p className="text-xs text-text-secondary mt-1">
                          Protect your banking dispute submissions and grievance records with Google Authenticator, Microsoft Authenticator, or 1Password.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartEnroll}
                        disabled={mfaLoading}
                        className="mt-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
                      >
                        {mfaLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                            <span>Generating Key…</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Enable Two-Factor Authentication</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* ── State C: ACTIVE ENROLLMENT IN PROGRESS ── */}
                  {!enrolledFactor && isEnrolling && (
                    <div className="space-y-4 pt-1">
                      <div className="p-4 bg-surface-container-low border border-outline-variant/40 rounded-xl flex flex-col md:flex-row items-center gap-5">
                        {/* Render QR code via SDK SVG data URL */}
                        {enrollQrCode && (
                          <div className="p-3 bg-white rounded-xl shadow-xs shrink-0 flex flex-col items-center">
                            <img
                              src={enrollQrCode}
                              alt="Scan TOTP QR Code in Authenticator"
                              className="w-36 h-36 object-contain select-none"
                            />
                            <span className="text-[10px] text-slate-600 font-semibold mt-1">
                              Scan with Authenticator
                            </span>
                          </div>
                        )}

                        {/* Secret key & copy */}
                        <div className="space-y-2 flex-1 w-full text-left">
                          <div>
                            <span className="text-xs font-bold text-text-brand block">
                              1. Scan QR or Enter Secret Manually
                            </span>
                            <p className="text-[11px] text-text-secondary mt-0.5">
                              Add this TOTP credential to Google Authenticator or Microsoft Authenticator.
                            </p>
                          </div>

                          {enrollSecret && (
                            <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/50">
                              <code className="font-mono text-xs font-bold text-text-brand flex-1 tracking-wider select-all overflow-x-auto">
                                {enrollSecret}
                              </code>
                              <button
                                type="button"
                                onClick={handleCopySecret}
                                className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-text-brand text-[11px] font-semibold transition-colors shrink-0"
                              >
                                {copiedSecret ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
                            <span>SHA-1 / 30-second time-step TOTP standard</span>
                          </div>
                        </div>
                      </div>

                      {/* Code Confirmation Form */}
                      <form onSubmit={handleConfirmEnroll} className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-text-brand block">
                            2. Enter 6-Digit Code from Authenticator App
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={verifyCode}
                              onChange={(e) => setVerifyCode(e.target.value)}
                              placeholder="000000"
                              maxLength={6}
                              autoFocus
                              className="w-40 bg-surface-container-low focus:bg-surface-container-lowest text-center tracking-widest font-mono text-lg font-bold py-2 rounded-lg text-text-brand border border-outline-variant/50 focus:border-primary outline-none"
                            />
                            <button
                              type="submit"
                              disabled={mfaLoading || verifyCode.length < 6}
                              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {mfaLoading ? 'Verifying…' : 'Confirm & Activate 2FA'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEnroll}
                              className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-secondary text-xs font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* SECTION 3: APPEARANCE & DISPLAY                                     */}
        {/* =================================================================== */}
        {activeTab === 'appearance' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ── Theme Segmented Radio Cards (7 cols) ── */}
              <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-text-brand">Interface Theme & Luminance</h3>
                  <p className="text-xs text-text-secondary">
                    Select high-legibility ambient profiles designed for central banking workstations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Light Canvas */}
                  <div
                    onClick={() => {
                      if (isDark) toggle();
                    }}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col gap-3 ${
                      !isDark
                        ? 'bg-surface-container-high border-primary dark:border-[#8fa8cf] shadow-sm'
                        : 'bg-surface-container-low border-outline-variant/40 hover:bg-surface-container'
                    }`}
                  >
                    <div className="h-24 w-full rounded-xl bg-white p-3 flex flex-col justify-between shadow-xs border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-2 bg-slate-300 rounded" />
                        <div className="w-3 h-3 rounded-full bg-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="w-3/4 h-2 bg-slate-200 rounded" />
                        <div className="w-1/2 h-2 bg-slate-200 rounded" />
                      </div>
                      <div className="w-full h-3 bg-[#000e27] rounded" />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-brand flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Light Canvas
                      </span>
                      {!isDark ? (
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-outline-variant" />
                      )}
                    </div>
                    <span className="text-[11px] text-text-secondary">
                      Daylight high-contrast regulatory document standard.
                    </span>
                  </div>

                  {/* Dark Mode */}
                  <div
                    onClick={() => {
                      if (!isDark) toggle();
                    }}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col gap-3 ${
                      isDark
                        ? 'bg-surface-container-high border-primary dark:border-[#8fa8cf] shadow-sm'
                        : 'bg-surface-container-low border-outline-variant/40 hover:bg-surface-container'
                    }`}
                  >
                    <div className="h-24 w-full rounded-xl bg-[#0a192f] p-3 flex flex-col justify-between shadow-xs border border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-2 bg-slate-700 rounded" />
                        <div className="w-3 h-3 rounded-full bg-slate-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="w-3/4 h-2 bg-slate-800 rounded" />
                        <div className="w-1/2 h-2 bg-slate-800 rounded" />
                      </div>
                      <div className="w-full h-3 bg-[#1b365d] rounded" />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-brand flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        Deep Navy Slate
                      </span>
                      {isDark ? (
                        <svg className="w-4 h-4 text-[#8fa8cf]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-outline-variant" />
                      )}
                    </div>
                    <span className="text-[11px] text-text-secondary">
                      Reduced glare navy palette for prolonged audit shifts.
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Accessibility & Legibility Info (5 cols) ── */}
              <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-surface-container text-text-brand flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-text-brand">Accessibility &amp; Contrast</h3>
                    <p className="text-xs text-text-secondary">Web Accessibility Guidelines (WCAG 2.1 AAA).</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Body Text Contrast</span>
                      <span className="font-mono text-emerald font-bold">17.1:1 (AAA)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Brand Headings Contrast</span>
                      <span className="font-mono text-emerald font-bold">19.2:1 (AAA)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Dark Mode Slate Contrast</span>
                      <span className="font-mono text-emerald font-bold">13.1:1 (AAA)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-text-brand block">Synchronized Storage</span>
                      <span className="text-[11px] text-text-secondary">
                        Theme state persisted to local storage key <code>sbp-theme</code>.
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald/15 text-emerald text-[10px] font-bold">
                      SYNCED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

