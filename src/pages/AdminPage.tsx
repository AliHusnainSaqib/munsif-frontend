/**
 * src/pages/AdminPage.tsx
 *
 * MUNSIF Consumer Protection Portal — Supervisory Intelligence Desk
 *
 * Administrative dashboard for regulatory dataset & model oversight:
 * 1. Unanswered & Low-Confidence Queries: triage backlog, toggle resolved, edit memos,
 *    and commit utterances as training examples to fine-tune intent matching.
 * 2. Intent & Response Governance: canonical ordinance answers management, inline editing,
 *    and addition of new statutory intents with 409 conflict handling.
 * 3. Manage Admins: super-admin-only user table with grant/revoke controls.
 * 4. Access Gating: enforces is_admin and AAL2 (2FA) access requirements gracefully.
 */

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnansweredQuery {
  id: string;
  query_text: string;
  top_match_intent: string | null;
  top_score: number | null;
  resolved: boolean | null;
  admin_note: string | null;
  created_at: string;
  user_id: string | null;
  chat_id: string | null;
}

interface Intent {
  id: string;
  intent_name: string;
  response_text: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean | null;
  is_super_admin: boolean | null;
}

type ResolvedFilter = 'pending' | 'resolved' | 'all';

interface CnicRequestAdmin {
  id: string;
  user_id: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

type CnicStatusFilter = 'pending' | 'approved' | 'rejected' | 'all';


// ---------------------------------------------------------------------------
// AdminPage Component
// ---------------------------------------------------------------------------

export default function AdminPage() {
  // ── Global Status & Access State ──
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [isAal2Error, setIsAal2Error] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ── 2FA lockout screen state (fix 2) ──
  // null = not yet checked, true = factor enrolled, false = no factor at all
  const [hasTotpFactor, setHasTotpFactor] = useState<boolean | null>(null);

  // ── Section 1: Unanswered Queries State ──
  const [queries, setQueries] = useState<UnansweredQuery[]>([]);
  const [filterStatus, setFilterStatus] = useState<ResolvedFilter>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [updatingResolvedId, setUpdatingResolvedId] = useState<string | null>(null);

  // Training Example Modal State
  const [trainingTargetQuery, setTrainingTargetQuery] = useState<UnansweredQuery | null>(null);
  const [selectedIntentId, setSelectedIntentId] = useState<string>('');
  const [submittingTraining, setSubmittingTraining] = useState<boolean>(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  // ── Section 2: Intents Management State ──
  const [intents, setIntents] = useState<Intent[]>([]);
  const [intentSearch, setIntentSearch] = useState<string>('');
  const [editingIntentId, setEditingIntentId] = useState<string | null>(null);
  const [editingResponseText, setEditingResponseText] = useState<string>('');
  const [savingIntentId, setSavingIntentId] = useState<string | null>(null);

  // Add New Intent Modal State
  const [showAddIntentModal, setShowAddIntentModal] = useState<boolean>(false);
  const [newIntentName, setNewIntentName] = useState<string>('');
  const [newResponseText, setNewResponseText] = useState<string>('');
  const [creatingIntent, setCreatingIntent] = useState<boolean>(false);
  const [addIntentError, setAddIntentError] = useState<string | null>(null);

  // ── Section 3: Manage Admins State (super-admin only) ──
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null); // userId being actioned
  const [userActionFeedback, setUserActionFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // ── Section: CNIC Change Requests State ──
  const [cnicRequests, setCnicRequests] = useState<CnicRequestAdmin[]>([]);
  const [cnicFilter, setCnicFilter] = useState<CnicStatusFilter>('pending');
  const [cnicLoading, setCnicLoading] = useState<boolean>(false);
  const [cnicActionLoading, setCnicActionLoading] = useState<string | null>(null); // requestId being approved/rejected
  const [cnicProofLoading, setCnicProofLoading] = useState<string | null>(null); // requestId fetching proof
  const [cnicActionError, setCnicActionError] = useState<string | null>(null);
  const [cnicActionSuccess, setCnicActionSuccess] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Data Loaders
  // ---------------------------------------------------------------------------

  const fetchQueries = async (status: ResolvedFilter): Promise<UnansweredQuery[]> => {
    let endpoint = '/admin/unanswered-queries';
    if (status === 'pending') endpoint += '?resolved=false';
    else if (status === 'resolved') endpoint += '?resolved=true';
    return await apiGet<UnansweredQuery[]>(endpoint);
  };

  const fetchIntents = async (): Promise<Intent[]> => {
    return await apiGet<Intent[]>('/admin/intents');
  };

  const fetchCnicRequests = async (status: CnicStatusFilter): Promise<CnicRequestAdmin[]> => {
    let endpoint = '/admin/cnic-requests';
    if (status !== 'all') {
      endpoint += `?status=${status}`;
    }
    return await apiGet<CnicRequestAdmin[]>(endpoint);
  };

  useEffect(() => {
    let mounted = true;

    // STEP 1: Fast Authorization Check
    apiGet<{ profile?: UserProfile; aal?: string }>('/me')
      .then((me) => {
        if (!mounted) return;

        // Check 1: is_admin
        if (!me.profile?.is_admin) {
          setAccessDeniedMessage(
            'Administrator clearance required (is_admin: true). Your account does not have supervisory permissions.'
          );
          setAuthChecking(false);
          return; // Stop here, do not fetch /admin/*
        }

        // Check 2: aal2
        if (me.aal !== 'aal2') {
          setIsAal2Error(true);
          setAccessDeniedMessage(
            'Admin access requires an administrator account with two-factor authentication (AAL2) completed in this session.'
          );
          // Check factor status for the lockout screen branch
          supabase.auth.mfa.listFactors().then(({ data }) => {
            if (!mounted) return;
            const totp = data?.totp ?? [];
            const verified = totp.filter((f) => f.status === 'verified');
            setHasTotpFactor(verified.length > 0);
          }).catch(() => {
            if (mounted) setHasTotpFactor(false);
          });
          setAuthChecking(false);
          return; // Stop here, do not fetch /admin/*
        }

        // Both checks passed! User is authorized.
        if (me.profile.is_super_admin) {
          setIsSuperAdmin(true);
        }
        setAuthChecking(false);

        // STEP 2: Fetch Dashboard Data
        Promise.all([fetchQueries('pending'), fetchIntents(), fetchCnicRequests('pending')])
          .then(([queriesData, intentsData, cnicData]) => {
            if (!mounted) return;
            setQueries(queriesData);
            setIntents(intentsData);
            setCnicRequests(cnicData);
            if (intentsData.length > 0) {
              setSelectedIntentId(intentsData[0].id);
            }
            setLoading(false);

            if (me.profile?.is_super_admin) {
              setUsersLoading(true);
              apiGet<UserProfile[]>('/admin/users')
                .then((u) => { if (mounted) { setUsers(u); setUsersLoading(false); } })
                .catch((e: unknown) => {
                  if (mounted) {
                    setUsersError(e instanceof Error ? e.message : 'Failed to load users.');
                    setUsersLoading(false);
                  }
                });
            }
          })
          .catch((err: unknown) => {
            if (!mounted) return;
            const msg = err instanceof Error ? err.message : String(err);
            setActionError(`Failed to load administrative console: ${msg}`);
            setLoading(false);
          });

      })
      .catch(() => {
        if (!mounted) return;
        // If /me fails (e.g. not logged in), default to the generic non-admin restriction.
        setAccessDeniedMessage(
          'Administrator clearance required (is_admin: true). Your account does not have supervisory permissions.'
        );
        setAuthChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Handle filter change for queries
  const handleFilterChange = async (newStatus: ResolvedFilter) => {
    setFilterStatus(newStatus);
    setActionError(null);
    try {
      const data = await fetchQueries(newStatus);
      setQueries(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to filter queries.';
      setActionError(msg);
    }
  };

  // ---------------------------------------------------------------------------
  // Query Actions
  // ---------------------------------------------------------------------------

  const handleToggleResolved = async (query: UnansweredQuery) => {
    const nextResolved = !query.resolved;
    setUpdatingResolvedId(query.id);
    setActionError(null);

    try {
      const updated = await apiPatch<UnansweredQuery>(`/admin/unanswered-queries/${query.id}`, {
        resolved: nextResolved,
      });
      // If filtering by pending or resolved, remove or update the row
      if (filterStatus === 'pending' && nextResolved) {
        setQueries((prev) => prev.filter((q) => q.id !== query.id));
      } else if (filterStatus === 'resolved' && !nextResolved) {
        setQueries((prev) => prev.filter((q) => q.id !== query.id));
      } else {
        setQueries((prev) => prev.map((q) => (q.id === query.id ? updated : q)));
      }
      setActionSuccess(
        `Query marked as ${nextResolved ? 'Resolved' : 'Pending'}.`
      );
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update resolution status.';
      setActionError(msg);
    } finally {
      setUpdatingResolvedId(null);
    }
  };

  const handleNoteChange = (queryId: string, value: string) => {
    setEditingNotes((prev) => ({ ...prev, [queryId]: value }));
  };

  const handleSaveNote = async (queryId: string) => {
    const noteText = editingNotes[queryId];
    if (noteText === undefined) return; // Unchanged

    setSavingNoteId(queryId);
    setActionError(null);

    try {
      const updated = await apiPatch<UnansweredQuery>(`/admin/unanswered-queries/${queryId}`, {
        admin_note: noteText,
      });
      setQueries((prev) => prev.map((q) => (q.id === queryId ? updated : q)));
      setEditingNotes((prev) => {
        const next = { ...prev };
        delete next[queryId];
        return next;
      });
      setActionSuccess('Statutory memo recorded.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save memo note.';
      setActionError(msg);
    } finally {
      setSavingNoteId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Training Example Actions
  // ---------------------------------------------------------------------------

  const openTrainingModal = (query: UnansweredQuery) => {
    setTrainingTargetQuery(query);
    setTrainingError(null);
    if (!selectedIntentId && intents.length > 0) {
      setSelectedIntentId(intents[0].id);
    }
  };

  const handleCommitTrainingExample = async (e: FormEvent) => {
    e.preventDefault();
    if (!trainingTargetQuery || !selectedIntentId) return;

    setSubmittingTraining(true);
    setTrainingError(null);

    try {
      await apiPost(`/admin/intents/${selectedIntentId}/training-examples`, {
        query_text: trainingTargetQuery.query_text,
      });

      // Find the matched intent name for confirmation
      const targetIntent = intents.find((i) => i.id === selectedIntentId);
      const intentName = targetIntent?.intent_name ?? 'selected intent';

      // Auto-mark query as resolved with memo
      try {
        await apiPatch<UnansweredQuery>(`/admin/unanswered-queries/${trainingTargetQuery.id}`, {
          resolved: true,
          admin_note: `Trained into: ${intentName}`,
        });
        if (filterStatus === 'pending') {
          setQueries((prev) => prev.filter((q) => q.id !== trainingTargetQuery.id));
        } else {
          setQueries((prev) =>
            prev.map((q) =>
              q.id === trainingTargetQuery.id
                ? { ...q, resolved: true, admin_note: `Trained into: ${intentName}` }
                : q
            )
          );
        }
      } catch {
        // Non-critical if auto-resolve fails
      }

      setActionSuccess(`Training utterance successfully committed to '${intentName}'.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setTrainingTargetQuery(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to commit training utterance.';
      setTrainingError(msg);
    } finally {
      setSubmittingTraining(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Intent Actions
  // ---------------------------------------------------------------------------

  const handleStartEditIntent = (intent: Intent) => {
    setEditingIntentId(intent.id);
    setEditingResponseText(intent.response_text);
  };

  const handleCancelEditIntent = () => {
    setEditingIntentId(null);
    setEditingResponseText('');
  };

  const handleSaveIntentResponse = async (intentId: string) => {
    if (!editingResponseText.trim()) return;

    setSavingIntentId(intentId);
    setActionError(null);

    try {
      const updated = await apiPatch<Intent>(`/admin/intents/${intentId}`, {
        response_text: editingResponseText.trim(),
      });
      setIntents((prev) => prev.map((i) => (i.id === intentId ? updated : i)));
      setEditingIntentId(null);
      setActionSuccess(`Canonical response updated for '${updated.intent_name}'.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update canonical response.';
      setActionError(msg);
    } finally {
      setSavingIntentId(null);
    }
  };

  const handleCreateIntent = async (e: FormEvent) => {
    e.preventDefault();
    setAddIntentError(null);

    const name = newIntentName.trim();
    const response = newResponseText.trim();

    if (!name || !response) {
      setAddIntentError('Both intent name and canonical response text are required.');
      return;
    }

    setCreatingIntent(true);
    try {
      const created = await apiPost<Intent>('/admin/intents', {
        intent_name: name,
        response_text: response,
      });
      setIntents((prev) => [...prev, created].sort((a, b) => a.intent_name.localeCompare(b.intent_name)));
      setShowAddIntentModal(false);
      setNewIntentName('');
      setNewResponseText('');
      setActionSuccess(`New canonical intent '${created.intent_name}' published.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        setAddIntentError(`An intent with the name '${name}' already exists. Please choose a unique identifier.`);
      } else {
        setAddIntentError(`Failed to create intent: ${msg}`);
      }
    } finally {
      setCreatingIntent(false);
    }
  };

  // ---------------------------------------------------------------------------
  // User Management Actions (super-admin only)
  // ---------------------------------------------------------------------------

  const handleGrantAdmin = async (userId: string) => {
    setUserActionLoading(userId);
    setUserActionFeedback((prev) => { const n = { ...prev }; delete n[userId]; return n; });
    try {
      const updated = await apiPost<UserProfile>(`/admin/users/${userId}/grant-admin`, {});
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updated } : u));
      setUserActionFeedback((prev) => ({ ...prev, [userId]: { ok: true, msg: 'Admin access granted.' } }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to grant admin access.';
      setUserActionFeedback((prev) => ({ ...prev, [userId]: { ok: false, msg } }));
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    setUserActionLoading(userId);
    setUserActionFeedback((prev) => { const n = { ...prev }; delete n[userId]; return n; });
    try {
      const updated = await apiPost<UserProfile>(`/admin/users/${userId}/revoke-admin`, {});
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updated } : u));
      setUserActionFeedback((prev) => ({ ...prev, [userId]: { ok: true, msg: 'Admin access revoked.' } }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke admin access.';
      // Surface 400 "super admin" message clearly
      setUserActionFeedback((prev) => ({ ...prev, [userId]: { ok: false, msg } }));
    } finally {
      setUserActionLoading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Section: CNIC Change Requests Actions
  // ---------------------------------------------------------------------------

  const handleCnicFilterChange = async (newStatus: CnicStatusFilter) => {
    setCnicFilter(newStatus);
    setCnicActionError(null);
    setCnicLoading(true);
    try {
      const data = await fetchCnicRequests(newStatus);
      setCnicRequests(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to filter CNIC requests.';
      setCnicActionError(msg);
    } finally {
      setCnicLoading(false);
    }
  };

  const handleViewProof = async (id: string) => {
    setCnicProofLoading(id);
    setCnicActionError(null);
    try {
      const res = await apiGet<{ url: string }>(`/admin/cnic-requests/${id}/proof-url`);
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setCnicActionError('Proof URL was not returned.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load proof URL.';
      if (msg.includes("Only a super admin can review another admin's request")) {
        setCnicActionError("Only a super admin can review another admin's request");
      } else {
        setCnicActionError(msg);
      }
    } finally {
      setCnicProofLoading(null);
    }
  };

  const handleReviewCnic = async (
    id: string,
    status: 'approved' | 'rejected',
    note?: string
  ) => {
    setCnicActionLoading(id);
    setCnicActionError(null);
    try {
      const payload: { status: 'approved' | 'rejected'; admin_note?: string } = { status };
      if (note && note.trim()) {
        payload.admin_note = note.trim();
      }
      const updated = await apiPatch<CnicRequestAdmin>(`/admin/cnic-requests/${id}`, payload);

      if (cnicFilter === 'pending') {
        setCnicRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        setCnicRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }

      setRejectingRequestId(null);
      setRejectNote('');
      setCnicActionSuccess(
        `Request ${status === 'approved' ? 'approved' : 'rejected'} successfully.`
      );
      setTimeout(() => setCnicActionSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to review request.';
      if (msg.includes("Only a super admin can review another admin's request")) {
        setCnicActionError("Only a super admin can review another admin's request");
      } else {
        setCnicActionError(msg);
      }
    } finally {
      setCnicActionLoading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered & Computed Data
  // ---------------------------------------------------------------------------


  const filteredQueries = useMemo(() => {
    if (!searchQuery.trim()) return queries;
    const term = searchQuery.toLowerCase();
    return queries.filter(
      (q) =>
        q.query_text.toLowerCase().includes(term) ||
        (q.top_match_intent && q.top_match_intent.toLowerCase().includes(term)) ||
        (q.admin_note && q.admin_note.toLowerCase().includes(term))
    );
  }, [queries, searchQuery]);

  const filteredIntents = useMemo(() => {
    if (!intentSearch.trim()) return intents;
    const term = intentSearch.toLowerCase();
    return intents.filter(
      (i) =>
        i.intent_name.toLowerCase().includes(term) ||
        i.response_text.toLowerCase().includes(term)
    );
  }, [intents, intentSearch]);

  const pendingCount = useMemo(() => {
    return queries.filter((q) => !q.resolved).length;
  }, [queries]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const term = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.email ?? '').toLowerCase().includes(term) ||
        (u.display_name ?? '').toLowerCase().includes(term)
    );
  }, [users, userSearch]);

  // ---------------------------------------------------------------------------
  // Render: Loading State (Auth Check)
  // ---------------------------------------------------------------------------
  if (authChecking) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto w-full bg-background flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-text-muted bg-surface-container-low px-5 py-3 rounded-xl border border-outline-variant/30 shadow-sm">
          <span className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
          <span className="text-sm font-semibold tracking-wide">Verifying clearance...</span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: 403 Access Restricted Screen
  // ---------------------------------------------------------------------------

  if (accessDeniedMessage) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto w-full bg-background flex items-center justify-center p-4 sm:p-8 text-on-surface">
        <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-error/10 text-error mx-auto flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold uppercase tracking-wider">
              Supervisory Clearance Required
            </span>
            <h2 className="text-xl font-bold text-text-brand">Access Restricted</h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {accessDeniedMessage}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {isAal2Error ? (
              /* ── AAL2 branch: three states based on factor check ── */
              hasTotpFactor === null ? (
                /* Still checking whether a factor exists */
                <div className="w-full py-2.5 px-4 rounded-xl bg-surface-container text-text-secondary text-xs font-semibold flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
                  <span>Checking 2FA status…</span>
                </div>
              ) : hasTotpFactor ? (
                /* Factor enrolled but session hasn't completed AAL2 — show challenge link */
                <Link
                  to="/verify-2fa"
                  className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Authenticate with 2FA Key</span>
                </Link>
              ) : (
                /* No factor enrolled at all — must set one up in Settings first */
                <>
                  <p className="text-xs text-text-secondary leading-relaxed bg-surface-container-low rounded-xl px-4 py-3 text-left">
                    <span className="font-semibold text-text-brand block mb-1">Two-factor authentication not set up</span>
                    Admin access requires 2FA to be enabled on your account. Set it up in your Security settings, then return here.
                  </p>
                  <Link
                    to="/settings"
                    className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Set Up Two-Factor Authentication</span>
                  </Link>
                </>
              )
            ) : (
              <Link
                to="/settings"
                className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-text-brand text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>Manage Profile &amp; Security</span>
              </Link>
            )}

            <Link
              to="/chat"
              className="text-xs text-text-muted hover:text-text-brand transition-colors"
            >
              Return to Assistant Chat
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Main Admin Dashboard
  // ---------------------------------------------------------------------------

  return (
    <div className="flex-1 min-h-0 overflow-y-auto w-full bg-background text-on-surface">
      {/* ── Statutory Breadcrumb ── */}
      <div className="w-full bg-surface-container-low border-b border-outline-variant/30 px-4 sm:px-8 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-text-secondary font-medium">
            <span>MUNSIF Admin Dashboard</span>
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span>Consumer Knowledge Base</span>
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-text-brand font-semibold">AI Governance &amp; Model Ledger</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container font-mono text-[11px] text-text-primary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
              ADMIN SESSION: 2FA VERIFIED
            </span>
            <span className="text-outline-variant hidden sm:inline">|</span>
            <span className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold hidden sm:inline">
              SUPERVISORY DESK
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ── Editorial Heading Bar ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-primary dark:bg-[#1b365d] text-white text-[11px] tracking-widest uppercase font-bold">
                Institutional Oversight
              </span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-mono text-[11px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                LIVE INGEST
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-brand tracking-tight">
              Supervisory Intelligence Desk
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Real-time audit of citizen grievances, unclassified queries, and canonical ordinance-grounded
              matching thresholds under the Banking Companies Ordinance (1962).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleFilterChange(filterStatus)}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-secondary hover:text-text-brand transition-colors shadow-xs"
              title="Refresh Audit Stream"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowAddIntentModal(true)}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New Intent</span>
            </button>
          </div>
        </div>

        {/* ── Global Alert Notifications ── */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald flex items-center justify-between text-xs font-medium animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{actionSuccess}</span>
            </div>
            <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald hover:opacity-75">
              &times;
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 text-error flex items-center justify-between text-xs font-medium animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{actionError}</span>
            </div>
            <button type="button" onClick={() => setActionError(null)} className="text-error hover:opacity-75">
              &times;
            </button>
          </div>
        )}

        {/* ── Supervisory Telemetry Metrics ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Backlog Inquiries
              </span>
              <span className="p-1 rounded-lg bg-surface-container-low text-text-brand">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </span>
            </div>
            <div className="text-2xl font-bold text-text-brand">
              {loading ? '…' : pendingCount}
            </div>
            <p className="text-[11px] text-text-muted">Awaiting administrative triage</p>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Canonical Intents
              </span>
              <span className="p-1 rounded-lg bg-surface-container-low text-text-brand">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
            </div>
            <div className="text-2xl font-bold text-text-brand">
              {loading ? '…' : intents.length}
            </div>
            <p className="text-[11px] text-text-muted">Active Ordinance Response Models</p>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Confidence Floor
              </span>
              <span className="p-1 rounded-lg bg-surface-container-low text-emerald">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="text-2xl font-bold text-text-brand">
              80.0%
            </div>
            <p className="text-[11px] text-emerald font-semibold">Triaged below threshold</p>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Regulatory Protocol
              </span>
              <span className="p-1 rounded-lg bg-surface-container-low text-text-brand">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </span>
            </div>
            <div className="text-base font-bold text-text-brand truncate">
              Banking Ordinance 1962
            </div>
            <p className="text-[11px] text-text-muted">Model Active</p>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 1: UNANSWERED & LOW-CONFIDENCE QUERIES                      */}
        {/* =================================================================== */}
        <section className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xs overflow-hidden">
          {/* Section Header & Toolbar */}
          <div className="p-5 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold" />
                <h2 className="text-base font-bold text-text-brand">
                  Unanswered & Low-Confidence Queries
                </h2>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Citizen submissions triggering fallbacks or scoring under the 80% confidence threshold.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter queries / memos…"
                  className="w-48 sm:w-60 bg-surface-container-low pl-8 pr-3 py-1.5 text-xs text-text-primary rounded-lg border border-outline-variant/40 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 text-xs">
                {(['pending', 'resolved', 'all'] as ResolvedFilter[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleFilterChange(st)}
                    className={`px-3 py-1 rounded-md capitalize font-semibold transition-all ${
                      filterStatus === st
                        ? 'bg-surface-container-lowest text-text-brand shadow-xs'
                        : 'text-text-secondary hover:text-text-brand'
                    }`}
                  >
                    {st === 'pending' ? 'Unresolved' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 border-b border-outline-variant/30 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th className="py-3 px-4 min-w-[280px]">Citizen Submission</th>
                  <th className="py-3 px-4 min-w-[170px]">Top Candidate Intent</th>
                  <th className="py-3 px-4 min-w-[120px]">Confidence</th>
                  <th className="py-3 px-4 min-w-[260px]">Regulatory Memo / Note</th>
                  <th className="py-3 px-4 text-right pr-6 min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
                        <span>Retrieving unanswered query records…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredQueries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted space-y-1">
                      <p className="font-semibold text-text-brand">No queries match current criteria</p>
                      <p className="text-[11px]">All submissions are triaged or no records match this view.</p>
                    </td>
                  </tr>
                ) : (
                  filteredQueries.map((item) => {
                    const isUpdating = updatingResolvedId === item.id;
                    const isSavingNote = savingNoteId === item.id;
                    const currentNoteValue =
                      editingNotes[item.id] !== undefined
                        ? editingNotes[item.id]
                        : item.admin_note ?? '';
                    const hasUnsavedNote =
                      editingNotes[item.id] !== undefined &&
                      editingNotes[item.id] !== (item.admin_note ?? '');

                    const scorePct = item.top_score != null ? Math.round(item.top_score * 100) : 0;
                    const scoreBadgeClass =
                      scorePct >= 80
                        ? 'bg-emerald/15 text-emerald'
                        : scorePct >= 50
                        ? 'bg-gold/20 text-text-gold'
                        : 'bg-error-container text-on-error-container';

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-surface-container-low/40 transition-colors ${
                          item.resolved ? 'opacity-65' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center align-top">
                          <input
                            type="checkbox"
                            checked={!!item.resolved}
                            disabled={isUpdating}
                            onChange={() => handleToggleResolved(item)}
                            title={item.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                            className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer mt-0.5"
                          />
                        </td>

                        {/* Query Text */}
                        <td className="py-3.5 px-4 align-top space-y-1">
                          <p
                            className={`font-medium text-text-primary leading-relaxed ${
                              item.resolved ? 'line-through text-text-muted' : ''
                            }`}
                          >
                            "{item.query_text}"
                          </p>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-text-muted">
                            <span>ID: {item.id.slice(0, 8)}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Matched Intent */}
                        <td className="py-3.5 px-4 align-top">
                          {item.top_match_intent ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-surface-container text-text-brand font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                              {item.top_match_intent}
                            </span>
                          ) : (
                            <span className="text-text-muted italic">No candidate match</span>
                          )}
                        </td>

                        {/* Confidence Score */}
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${scoreBadgeClass}`}
                          >
                            {scorePct}%
                          </span>
                        </td>

                        {/* Regulatory Note / Memo */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={currentNoteValue}
                              onChange={(e) => handleNoteChange(item.id, e.target.value)}
                              onBlur={() => {
                                if (hasUnsavedNote) handleSaveNote(item.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNote(item.id);
                              }}
                              placeholder="Add banking circular / compliance memo…"
                              className="w-full bg-surface-container-low focus:bg-surface-container-lowest px-2.5 py-1.5 text-xs text-text-primary rounded-lg border border-outline-variant/40 focus:border-primary outline-none transition-all"
                            />
                            {hasUnsavedNote && (
                              <button
                                type="button"
                                onClick={() => handleSaveNote(item.id)}
                                disabled={isSavingNote}
                                className="p-1.5 rounded-md bg-primary hover:bg-primary-container dark:bg-[#1b365d] text-white shrink-0 shadow-xs"
                                title="Save Note"
                              >
                                {isSavingNote ? (
                                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin block" />
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right pr-6">
                          <button
                            type="button"
                            onClick={() => openTrainingModal(item)}
                            className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-text-brand font-semibold text-[11px] transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span>Teach Intent</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-[11px] text-text-secondary">
            <span>
              Showing {filteredQueries.length} of {queries.length} records
            </span>
            <span className="font-mono">Real-time Telemetry Active</span>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 2: INTENT & RESPONSE GOVERNANCE                             */}
        {/* =================================================================== */}
        <section className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald" />
                <h2 className="text-base font-bold text-text-brand">
                  Intent & Response Governance
                </h2>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Canonical Ordinance-grounded answers and training corpora matching citizen submissions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={intentSearch}
                  onChange={(e) => setIntentSearch(e.target.value)}
                  placeholder="Filter intents…"
                  className="w-48 sm:w-60 bg-surface-container-low pl-8 pr-3 py-1.5 text-xs text-text-primary rounded-lg border border-outline-variant/40 focus:border-primary outline-none transition-all"
                />
              </div>

              <span className="px-2.5 py-1 rounded-full bg-surface-container font-mono text-xs font-semibold text-text-brand">
                {intents.length} Registered
              </span>
            </div>
          </div>

          {/* Intent Cards Grid */}
          <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 py-12 text-center text-text-muted">
                <div className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
                  <span>Loading canonical intents…</span>
                </div>
              </div>
            ) : filteredIntents.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-text-muted">
                No intents match your search.
              </div>
            ) : (
              filteredIntents.map((intent) => {
                const isEditing = editingIntentId === intent.id;
                const isSaving = savingIntentId === intent.id;

                return (
                  <div
                    key={intent.id}
                    className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between space-y-3 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-primary dark:bg-[#1b365d] text-white">
                          {intent.intent_name}
                        </span>
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartEditIntent(intent)}
                            className="p-1 rounded text-text-secondary hover:text-text-brand hover:bg-surface-container transition-colors"
                            title="Edit Canonical Response"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Response Body */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={editingResponseText}
                            onChange={(e) => setEditingResponseText(e.target.value)}
                            rows={4}
                            className="w-full bg-surface-container-lowest p-2.5 text-xs text-text-primary rounded-lg border border-outline-variant/50 focus:border-primary outline-none leading-relaxed transition-all"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEditIntent}
                              className="px-3 py-1.5 rounded-lg bg-surface-container text-text-secondary hover:text-text-brand text-xs font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveIntentResponse(intent.id)}
                              disabled={isSaving || !editingResponseText.trim()}
                              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container dark:bg-[#1b365d] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isSaving ? 'Saving…' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">
                          "{intent.response_text}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text-muted pt-2 border-t border-outline-variant/20 font-mono">
                      <span>ID: {intent.id.slice(0, 10)}…</span>
                      <span>Standard Response</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION: CNIC CHANGE REQUESTS                                       */}
        {/* =================================================================== */}
        <section className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xs overflow-hidden">
          {/* Section Header & Toolbar */}
          <div className="p-5 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <h2 className="text-base font-bold text-text-brand">
                  CNIC Change Requests
                </h2>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Review citizen identity update requests and verify submitted proof documentation.
              </p>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 text-xs">
              {(['pending', 'approved', 'rejected', 'all'] as CnicStatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleCnicFilterChange(st)}
                  className={`px-3 py-1 rounded-md capitalize font-semibold transition-all ${
                    cnicFilter === st
                      ? 'bg-surface-container-lowest text-text-brand shadow-xs'
                      : 'text-text-secondary hover:text-text-brand'
                  }`}
                >
                  {st === 'pending' ? 'Pending' : st === 'approved' ? 'Approved' : st === 'rejected' ? 'Rejected' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback banners */}
          {cnicActionError && (
            <div className="m-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{cnicActionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setCnicActionError(null)}
                className="text-error hover:opacity-70 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {cnicActionSuccess && (
            <div className="m-4 p-3 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{cnicActionSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setCnicActionSuccess(null)}
                className="text-emerald hover:opacity-70 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 border-b border-outline-variant/30 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 min-w-[200px]">Requester</th>
                  <th className="py-3 px-4 min-w-[220px]">Reason</th>
                  <th className="py-3 px-4 min-w-[160px]">Date Submitted</th>
                  <th className="py-3 px-4 min-w-[200px]">Admin Note</th>
                  <th className="py-3 px-4 text-right pr-6 min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {cnicLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
                        <span>Loading CNIC change requests…</span>
                      </div>
                    </td>
                  </tr>
                ) : cnicRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted space-y-1">
                      <p className="font-semibold text-text-brand">No requests found</p>
                      <p className="text-[11px]">
                        {cnicFilter === 'pending'
                          ? 'No pending CNIC change requests awaiting review.'
                          : `No requests with status "${cnicFilter}".`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  cnicRequests.map((req) => {
                    const isActioning = cnicActionLoading === req.id;
                    const isProofLoading = cnicProofLoading === req.id;
                    const isRejectingThis = rejectingRequestId === req.id;
                    const isPending = req.status === 'pending';

                    return (
                      <tr key={req.id} className="hover:bg-surface-container-low/40 transition-colors">
                        {/* Status */}
                        <td className="py-3.5 px-4 text-center align-top">
                          {req.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending
                            </span>
                          ) : req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald/15 text-emerald font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error/15 text-error font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-error" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Requester */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono text-[11px] text-text-primary">
                            {req.user_id}
                          </div>
                          <div className="text-[10px] text-text-muted font-mono mt-0.5">
                            Req ID: {req.id.slice(0, 8)}…
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 align-top">
                          <p className="text-text-secondary leading-relaxed break-words">
                            {req.reason || <span className="text-text-muted italic">No reason provided</span>}
                          </p>
                        </td>

                        {/* Date Submitted & Reviewed */}
                        <td className="py-3.5 px-4 align-top space-y-1">
                          <div className="text-text-secondary">
                            {new Date(req.created_at).toLocaleString()}
                          </div>
                          {req.reviewed_at && (
                            <div className="text-[10px] text-text-muted">
                              Reviewed: {new Date(req.reviewed_at).toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Admin Note */}
                        <td className="py-3.5 px-4 align-top">
                          {req.admin_note ? (
                            <p className="text-text-secondary italic leading-relaxed break-words">
                              "{req.admin_note}"
                            </p>
                          ) : (
                            <span className="text-text-muted italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right pr-6">
                          {isPending ? (
                            <div className="flex flex-col items-end gap-2">
                              {/* Action buttons row */}
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {/* View Proof Button */}
                                <button
                                  type="button"
                                  disabled={isProofLoading || isActioning}
                                  onClick={() => handleViewProof(req.id)}
                                  className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-text-primary text-[11px] font-semibold transition-colors disabled:opacity-50 flex items-center gap-1 border border-outline-variant/40"
                                  title="Open proof document in new tab (expires in 5m)"
                                >
                                  {isProofLoading ? (
                                    <span className="w-3 h-3 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
                                  ) : (
                                    <svg className="w-3 h-3 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  )}
                                  <span>View Proof</span>
                                </button>

                                {/* Approve Button */}
                                <button
                                  type="button"
                                  disabled={isActioning || isProofLoading}
                                  onClick={() => handleReviewCnic(req.id, 'approved')}
                                  className="px-2.5 py-1 rounded-md bg-emerald/10 hover:bg-emerald/20 text-emerald font-semibold text-[11px] transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isActioning && !isRejectingThis ? (
                                    <span className="w-3 h-3 rounded-full border-2 border-emerald/40 border-t-emerald animate-spin" />
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  <span>Approve</span>
                                </button>

                                {/* Reject Button */}
                                {!isRejectingThis && (
                                  <button
                                    type="button"
                                    disabled={isActioning || isProofLoading}
                                    onClick={() => {
                                      setRejectingRequestId(req.id);
                                      setRejectNote('');
                                      setCnicActionError(null);
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-error/10 hover:bg-error/20 text-error font-semibold text-[11px] transition-colors disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Reject</span>
                                  </button>
                                )}
                              </div>

                              {/* Inline rejection prompt */}
                              {isRejectingThis && (
                                <div className="w-full max-w-xs space-y-1.5 p-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-left mt-1">
                                  <label className="text-[10px] font-semibold text-text-secondary block">
                                    Rejection Note (Optional):
                                  </label>
                                  <textarea
                                    value={rejectNote}
                                    onChange={(e) => setRejectNote(e.target.value)}
                                    placeholder="e.g. Document image is blurry or expired..."
                                    rows={2}
                                    className="w-full bg-surface-container-lowest p-1.5 text-xs text-text-primary rounded border border-outline-variant/50 focus:border-primary outline-none transition-all resize-none"
                                  />
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      disabled={isActioning}
                                      onClick={() => {
                                        setRejectingRequestId(null);
                                        setRejectNote('');
                                      }}
                                      className="px-2 py-0.5 rounded text-[11px] text-text-secondary hover:text-text-brand transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isActioning}
                                      onClick={() => handleReviewCnic(req.id, 'rejected', rejectNote)}
                                      className="px-2 py-0.5 rounded bg-error hover:bg-error/90 text-white font-semibold text-[11px] transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {isActioning ? (
                                        <span className="w-2.5 h-2.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                      ) : null}
                                      <span>Confirm Reject</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-muted text-[11px] italic">
                              Reviewed ({req.status})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-surface-container-low border-t border-outline-variant/30 text-[11px] text-text-secondary flex items-center justify-between">
            <span>Showing {cnicRequests.length} requests</span>
            <span className="font-mono">Identity Verification</span>
          </div>
        </section>

        {/* =================================================================== */}
        {/* SECTION 3: MANAGE ADMINS (super-admin only — completely hidden       */}
        {/* for regular admins)                                                  */}
        {/* =================================================================== */}
        {isSuperAdmin && (
          <section className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xs overflow-hidden">
            {/* Section Header */}
            <div className="p-5 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  <h2 className="text-base font-bold text-text-brand">Manage Admins</h2>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-mono text-[10px] font-bold uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Grant or revoke administrative access for registered users. Super-admin status must be managed directly in the database.
                </p>
              </div>

              {/* Search */}
              <div className="relative shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by email or name…"
                  className="w-56 bg-surface-container-low pl-8 pr-3 py-1.5 text-xs text-text-primary rounded-lg border border-outline-variant/40 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {usersError && (
              <div className="m-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs">
                {usersError}
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/70 border-b border-outline-variant/30 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[220px]">Email</th>
                    <th className="py-3 px-4 min-w-[160px]">Display Name</th>
                    <th className="py-3 px-4 w-28 text-center">Admin</th>
                    <th className="py-3 px-4 w-32 text-center">Super Admin</th>
                    <th className="py-3 px-4 text-right pr-6 min-w-[180px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-text-muted">
                        <div className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
                          <span>Loading users…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-text-muted">
                        No users match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isActioning = userActionLoading === u.id;
                      const feedback = userActionFeedback[u.id];
                      const isSuperAdminRow = u.is_super_admin === true;

                      return (
                        <tr key={u.id} className="hover:bg-surface-container-low/40 transition-colors">
                          {/* Email */}
                          <td className="py-3 px-4 font-mono text-[11px] text-text-primary">
                            {u.email ?? <span className="text-text-muted italic">—</span>}
                          </td>

                          {/* Display name */}
                          <td className="py-3 px-4 text-text-secondary">
                            {u.display_name ?? <span className="text-text-muted italic">—</span>}
                          </td>

                          {/* Admin badge */}
                          <td className="py-3 px-4 text-center">
                            {u.is_admin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald/15 text-emerald font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
                                Yes
                              </span>
                            ) : (
                              <span className="text-text-muted text-[11px]">No</span>
                            )}
                          </td>

                          {/* Super-admin badge */}
                          <td className="py-3 px-4 text-center">
                            {isSuperAdminRow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                Yes
                              </span>
                            ) : (
                              <span className="text-text-muted text-[11px]">No</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right pr-6">
                            <div className="flex flex-col items-end gap-1.5">
                              {isSuperAdminRow ? (
                                <span className="text-[11px] text-text-muted italic">
                                  Manage directly in database
                                </span>
                              ) : u.is_admin ? (
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => handleRevokeAdmin(u.id)}
                                  className="px-3 py-1 rounded-md bg-error/10 hover:bg-error/20 text-error font-semibold text-[11px] transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isActioning ? (
                                    <span className="w-3 h-3 rounded-full border-2 border-error/40 border-t-error animate-spin" />
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                                    </svg>
                                  )}
                                  <span>Revoke Admin</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => handleGrantAdmin(u.id)}
                                  className="px-3 py-1 rounded-md bg-emerald/10 hover:bg-emerald/20 text-emerald font-semibold text-[11px] transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isActioning ? (
                                    <span className="w-3 h-3 rounded-full border-2 border-emerald/40 border-t-emerald animate-spin" />
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                                    </svg>
                                  )}
                                  <span>Grant Admin</span>
                                </button>
                              )}

                              {/* Per-row feedback */}
                              {feedback && (
                                <span className={`text-[10px] font-medium ${feedback.ok ? 'text-emerald' : 'text-error'}`}>
                                  {feedback.msg}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-surface-container-low border-t border-outline-variant/30 text-[11px] text-text-secondary flex items-center justify-between">
              <span>Showing {filteredUsers.length} of {users.length} users</span>
              <span className="font-mono">Super Admin Console</span>
            </div>
          </section>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: ADD AS TRAINING EXAMPLE                                    */}
      {/* =================================================================== */}
      {trainingTargetQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gold" />
                <h3 className="text-base font-bold text-text-brand">Teach Ordinance Model</h3>
              </div>
              <button
                type="button"
                onClick={() => setTrainingTargetQuery(null)}
                className="text-text-muted hover:text-text-brand text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCommitTrainingExample} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-brand block">
                  Citizen Utterance to Learn
                </label>
                <div className="p-3 bg-surface-container-low rounded-xl text-xs text-text-primary font-medium leading-relaxed border border-outline-variant/30">
                  "{trainingTargetQuery.query_text}"
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-brand block">
                  Associate with Target Intent
                </label>
                <select
                  value={selectedIntentId}
                  onChange={(e) => setSelectedIntentId(e.target.value)}
                  className="w-full bg-surface-container-low px-3 py-2 text-xs text-text-primary rounded-lg border border-outline-variant/50 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  {intents.map((intent) => (
                    <option key={intent.id} value={intent.id}>
                      {intent.intent_name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-text-muted">
                  Commits this phrasing to the vector corpus and associates it with the chosen canonical answer.
                </p>
              </div>

              {trainingError && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs">
                  {trainingError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setTrainingTargetQuery(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-text-secondary hover:text-text-brand text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTraining || !selectedIntentId}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container dark:bg-[#1b365d] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingTraining ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span>Embedding Utterance…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Commit Training Utterance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: ADD NEW INTENT                                             */}
      {/* =================================================================== */}
      {showAddIntentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald" />
                <h3 className="text-base font-bold text-text-brand">Create Canonical Intent</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddIntentModal(false)}
                className="text-text-muted hover:text-text-brand text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateIntent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-brand block">
                  Intent Identifier (Canonical Name)
                </label>
                <input
                  type="text"
                  value={newIntentName}
                  onChange={(e) => setNewIntentName(e.target.value)}
                  placeholder="e.g. dispute.unauthorized_debit"
                  className="w-full bg-surface-container-low px-3 py-2 text-xs font-mono text-text-primary rounded-lg border border-outline-variant/50 focus:border-primary outline-none transition-all"
                />
                <p className="text-[11px] text-text-muted">
                  Use dot-notation syntax (category.topic). Must be unique across MUNSIF dataset.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-brand block">
                  Canonical Response Text
                </label>
                <textarea
                  value={newResponseText}
                  onChange={(e) => setNewResponseText(e.target.value)}
                  placeholder="Enter the standard reference response based on BCO 1962 / CPD circulars…"
                  rows={4}
                  className="w-full bg-surface-container-low p-3 text-xs text-text-primary rounded-lg border border-outline-variant/50 focus:border-primary outline-none leading-relaxed transition-all"
                />
              </div>

              {addIntentError && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs leading-relaxed">
                  {addIntentError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setShowAddIntentModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-text-secondary hover:text-text-brand text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingIntent || !newIntentName.trim() || !newResponseText.trim()}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container dark:bg-[#1b365d] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingIntent ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span>Creating Intent…</span>
                    </>
                  ) : (
                    <span>Publish Intent</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

