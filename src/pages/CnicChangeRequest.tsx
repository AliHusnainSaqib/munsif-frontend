/**
 * src/pages/CnicChangeRequest.tsx
 *
 * MUNSIF Consumer Protection Portal — Request a CNIC Change
 * Matches reference/request_a_cnic_change/code.html faithfully using
 * native components, Tailwind, and theme tokens.
 */

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';

interface Profile {
  id: string;
  display_name: string | null;
  cnic: string | null;
}

interface MeResponse {
  profile: Profile;
}

interface CnicRequestItem {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function CnicChangeRequest() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentCnic, setCurrentCnic] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  const [reason, setReason] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attestationChecked, setAttestationChecked] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [existingRequests, setExistingRequests] = useState<CnicRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    apiGet<MeResponse>('/me')
      .then((data) => {
        if (mounted && data?.profile) {
          setCurrentCnic(data.profile.cnic);
        }
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    apiGet<CnicRequestItem[]>('/me/cnic-requests')
      .then((data) => {
        if (mounted && data) {
          setExistingRequests(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load CNIC requests:', err);
      })
      .finally(() => {
        if (mounted) setLoadingRequests(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('Unsupported format. Allowed types: JPG, PNG, or PDF.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setFileError('File size exceeds the 5 MB limit. Please select a smaller file.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFileError(null);

    if (!reason.trim()) {
      setError('Please provide a reason for the CNIC change request.');
      return;
    }

    if (!selectedFile) {
      setFileError('Please upload a proof of identity document.');
      return;
    }

    if (selectedFile.size > MAX_FILE_BYTES) {
      setFileError('File size exceeds 5 MB. Please select a smaller file.');
      return;
    }

    if (!attestationChecked) {
      setError('You must confirm the legal attestation before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('reason', reason.trim());
      formData.append('proof_image', selectedFile);

      await apiPost<{ id: string; status: string }>('/me/cnic-requests', formData);

      navigate('/settings', {
        state: {
          cnicRequestSuccess: 'Your CNIC change request has been submitted successfully and is now under compliance review.',
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit CNIC change request.';
      if (msg.includes('409') || msg.toLowerCase().includes('already have a pending request')) {
        setError('You already have a pending CNIC change request. Please wait for the compliance officer to review it.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const maskedCnic = currentCnic
    ? currentCnic.length > 5
      ? `${currentCnic.slice(0, 5)}-*****${currentCnic.slice(-2)}`
      : '*****'
    : 'Not Registered';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto w-full bg-background text-on-surface">
      <div className="w-full min-h-full px-4 sm:px-8 lg:px-12 py-8 md:py-10 max-w-7xl mx-auto space-y-8">
        {/* Context & Breadcrumb Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-outline-variant/30">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-primary transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
              arrow_back
            </span>
            <span className="tracking-wide uppercase text-xs">Back to Settings</span>
          </Link>
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-lg shadow-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
            <span className="font-mono text-[11px] tracking-wider text-text-secondary uppercase font-semibold">
              ACCOUNT SECURITY // CNIC CHANGE REQUEST
            </span>
          </div>
        </div>

        {/* Editorial Header Section */}
        <div className="max-w-4xl space-y-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-widest font-bold bg-primary/10 text-primary rounded-sm border border-primary/20">
              KYC PROTOCOL V.4
            </span>
            <span className="text-xs text-text-muted font-mono">COMPLIANCE ID: #CNIC-REG-982</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-brand">
            Request a CNIC Change
          </h1>
          <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-3xl">
            CNIC changes require identity verification under banking consumer guidelines. Submit a valid
            justification alongside a photo or scan of your official document. An administrator
            will review your submission prior to approving the CNIC update.
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Active Form Submission (7 Cols) */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xs p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-5 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-text-brand">
                  <span className="material-symbols-outlined text-[22px]">badge</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-brand">Identity Modification Form</h2>
                  <p className="text-xs text-text-muted">Dual-step verification process</p>
                </div>
              </div>
              <span className="font-mono text-xs text-emerald bg-emerald/10 px-2.5 py-1 rounded-full border border-emerald/20 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span> ENCRYPTED
              </span>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 text-error flex items-start gap-2.5 text-xs font-medium">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current CNIC Box */}
              <div className="space-y-1.5">
                <label className="block font-mono text-xs uppercase tracking-wider text-text-secondary font-bold">
                  Current CNIC On Record
                </label>
                <div className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[22px]">credit_card</span>
                    <div>
                      <div className="font-mono text-sm tracking-widest font-bold text-text-brand">
                        {loadingProfile ? 'Loading...' : maskedCnic}
                      </div>
                      <div className="text-xs text-text-muted">Verified Regulatory Identity Record</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald bg-emerald/10 px-2.5 py-1 rounded-full border border-emerald/30">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified
                  </span>
                </div>
              </div>

              {/* Field 1: Reason */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="reason" className="block font-mono text-xs uppercase tracking-wider text-text-secondary font-bold">
                    Reason For Change <span className="text-error">*</span>
                  </label>
                  <span className="text-xs text-text-muted font-mono">{reason.length} / 300</span>
                </div>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  maxLength={300}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Correction of clerical error on official CNIC renewal, name revision, or replacement following national registry issuance..."
                  className="w-full p-3.5 text-sm text-text-primary bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-primary focus:bg-surface-container-lowest outline-none transition placeholder:text-text-muted/60"
                />
                <p className="text-xs text-text-muted">Clearly state the reason for this request to assist review.</p>
              </div>

              {/* Field 2: Proof of Identity */}
              <div className="space-y-1.5">
                <label className="block font-mono text-xs uppercase tracking-wider text-text-secondary font-bold">
                  Proof Of Identity (Front &amp; Back) <span className="text-error">*</span>
                </label>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="proof_image_input"
                />

                {/* Drop / Browse Area */}
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-outline-variant/60 hover:border-primary rounded-2xl p-6 transition-colors bg-surface-container-low/50 hover:bg-surface-container-low text-center cursor-pointer group space-y-2"
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-surface-container group-hover:bg-primary/10 flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                    </div>
                    <div className="text-sm font-semibold text-text-brand">
                      Drag &amp; drop document or <span className="text-primary underline">browse files</span>
                    </div>
                    <p className="text-xs text-text-muted font-mono">Accepted formats: JPG, PNG, or PDF (Max 5MB)</p>
                    <p className="text-[11px] text-text-muted/80">
                      Both sides of CNIC or Smart Card must be clearly visible with zero glare.
                    </p>
                  </div>
                ) : (
                  /* Attached File Card */
                  <div className="p-4 bg-surface-container-low border border-outline-variant/40 rounded-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">
                          {selectedFile.type === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-brand truncate">{selectedFile.name}</p>
                        <p className="text-xs text-text-muted font-mono">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-primary hover:underline px-2 py-1"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-text-muted hover:text-error p-1.5 rounded-lg hover:bg-surface-container transition-colors"
                        title="Remove file"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                )}

                {fileError && <p className="text-xs text-error mt-1">{fileError}</p>}
              </div>

              {/* Legal Attestation Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={attestationChecked}
                    onChange={(e) => setAttestationChecked(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-text-secondary leading-relaxed">
                    I hereby declare under penalty of banking fraud regulations that the uploaded identity credentials are
                    authentic, unexpired, and belong solely to me.
                  </span>
                </label>
              </div>

              {/* Submit Button & Turnaround */}
              <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={submitting || !selectedFile || !reason.trim() || !attestationChecked}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary font-bold text-sm tracking-wide rounded-xl shadow-xs transition active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
                <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                  <span className="material-symbols-outlined text-[16px] text-emerald">verified</span>
                  <span>Average turnaround: 24–48 business hours</span>
                </div>
              </div>
            </form>
          </div>

          {/* Right: Status Tracker & Compliance States Showcase (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-brand uppercase tracking-wider">Request Status Tracker</h3>
              <span className="font-mono text-xs text-text-muted">
                {existingRequests.length} {existingRequests.length === 1 ? 'RECORD' : 'RECORDS'}
              </span>
            </div>

            {loadingRequests ? (
              <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-xs text-text-muted">
                Loading request status...
              </div>
            ) : existingRequests.length === 0 ? (
              /* Informative card when no previous requests exist */
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-text-brand">
                  <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                  <span className="text-sm font-bold">Audit Workflow Steps</span>
                </div>
                <div className="space-y-3 text-xs text-text-secondary">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-container text-primary font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Submission &amp; Storage</p>
                      <p className="text-text-muted">Document securely stored in an encrypted private vault.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-container text-primary font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Compliance Desk Audit</p>
                      <p className="text-text-muted">Officers verify proof readability and regulatory cause.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-container text-primary font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Request Approval Status</p>
                      <p className="text-text-muted">Once approved, one-time update is enabled in your profile.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Render real requests from database */
              existingRequests.map((req) => (
                <div
                  key={req.id}
                  className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden bg-surface-container-lowest ${
                    req.status === 'pending'
                      ? 'border-gold/40'
                      : req.status === 'approved'
                      ? 'border-emerald/40'
                      : 'border-error/40'
                  }`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      req.status === 'pending' ? 'bg-gold' : req.status === 'approved' ? 'bg-emerald' : 'bg-error'
                    }`}
                  />
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          req.status === 'pending'
                            ? 'text-gold'
                            : req.status === 'approved'
                            ? 'text-emerald'
                            : 'text-error'
                        }`}
                      >
                        {req.status === 'pending'
                          ? 'schedule'
                          : req.status === 'approved'
                          ? 'check_circle'
                          : 'cancel'}
                      </span>
                      <span className="text-sm font-bold text-text-brand">Ticket #{req.id.slice(0, 8)}</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border ${
                        req.status === 'pending'
                          ? 'bg-gold/10 text-gold border-gold/30'
                          : req.status === 'approved'
                          ? 'bg-emerald/10 text-emerald border-emerald/30'
                          : 'bg-error/10 text-error border-error/30'
                      }`}
                    >
                      {req.status === 'pending' ? 'Under Review' : req.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary mb-3">
                    Submitted on {new Date(req.created_at).toLocaleDateString()} at{' '}
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                  </p>

                  {req.status === 'approved' && (
                    <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                      <p className="text-xs text-emerald leading-relaxed">
                        Identity credentials verified. You may now update your CNIC in your profile settings.
                      </p>
                      <Link
                        to="/settings"
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                      >
                        Update in Profile <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  )}

                  {req.status === 'rejected' && (
                    <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                      <p className="text-xs text-error font-medium">Your request could not be verified.</p>
                      {req.admin_note && (
                        <div className="bg-error/10 p-3 rounded-xl border border-error/20 text-xs text-error">
                          <span className="font-bold font-mono text-[10px] block mb-0.5">COMPLIANCE OFFICER NOTE:</span>
                          "{req.admin_note}"
                        </div>
                      )}
                    </div>
                  )}

                  {req.status === 'pending' && (
                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 text-xs text-text-secondary space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-text-muted">STATUS:</span>
                        <span className="font-semibold text-text-brand">Pending Review</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-text-muted">ESTIMATED COMPLETION:</span>
                        <span className="font-semibold text-text-brand">Within 24–48h</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Educational Help Card */}
            <div className="bg-surface-container-high text-on-surface rounded-2xl p-5 space-y-3 border border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-gold text-[22px]">help</span>
                <span className="text-sm font-bold">Need expedited assistance?</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                For official banking complaints or urgent issues, contact the State Bank of Pakistan directly:
              </p>
              <div className="flex items-center justify-between text-xs font-mono border-t border-outline-variant/30 pt-3 text-text-muted">
                <span>SBP HELPLINE: 111-727-273</span>
                <Link to="/chat" className="text-primary hover:underline font-bold uppercase tracking-wider">
                  Open Support Chat
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Verification Badges Footer Row */}
        <div className="mt-12 pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-6 text-text-muted">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-text-brand">
              <span className="material-symbols-outlined text-[20px]">security</span>
            </div>
            <div className="text-xs">
              <p className="font-bold text-text-brand">Bank-grade 256-bit SSL encrypted verification.</p>
              <p>All data is encrypted in transit and at rest.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald" /> BANKING COMPLIANT
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald" /> ISO/IEC 27001
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald" /> ZERO-KNOWLEDGE AUDIT
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
