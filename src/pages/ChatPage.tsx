/**
 * src/pages/ChatPage.tsx
 *
 * MUNSIF — Main Chat Interface
 * Faithfully matches reference/main_chat_interface_sbp_assistant/ (code.html & screen.png)
 * using MUNSIF design system tokens, Tailwind CSS, and authenticated backend endpoints.
 *
 * Backend endpoints used:
 *   GET    /chats                  — list chat sessions
 *   POST   /chats                  — create new session
 *   GET    /chats/{id}/messages    — get chat messages
 *   POST   /chats/{id}/messages    — send message & get assistant response
 *   PATCH  /chats/{id}             — rename chat session
 *   DELETE /chats/{id}             — delete chat session
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import munsifLogo from '@/assets/munsif-logo.png';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  intent: string;
  score: number;
  example_question: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  matched_intent?: string | null;
  confidence_score?: number | null;
  created_at: string;
  action?: 'answer' | 'no_match' | 'clarify';
  candidates?: Candidate[];
  isOptimistic?: boolean;
}

interface SendMessageResponse {
  action: 'answer' | 'no_match' | 'clarify';
  message: {
    id: string;
    role: 'assistant';
    content: string;
    matched_intent?: string | null;
    confidence_score?: number | null;
    created_at: string;
  };
  candidates?: Candidate[];
}

// ---------------------------------------------------------------------------
// Suggested starter inquiries (for empty states)
// ---------------------------------------------------------------------------
const SUGGESTED_INQUIRIES = [
  {
    icon: '⚖️',
    title: 'Unauthorized ATM Withdrawal',
    prompt: 'My commercial bank deducted funds without sending an SMS OTP or transaction alert. What are my statutory rights under banking regulations?',
  },
  {
    icon: '🏛️',
    title: 'Banking Mohtasib Escalation',
    prompt: 'How do I escalate an unresolved dispute to the Banking Mohtasib (Ombudsman) under Section 82D of BCO 1962?',
  },
  {
    icon: '💳',
    title: 'Hidden Credit Card Fees',
    prompt: 'Can a commercial bank levy unnotified annual card fees without advance Schedule of Charges (SOC) disclosure?',
  },
  {
    icon: '⚡',
    title: 'IBFT Raast Settlement Delay',
    prompt: 'What is the maximum allowable refund timeline for a failed interbank digital fund transfer (IBFT)?',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ChatPage() {
  const { user } = useAuth();

  // Chat list state
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);

  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Form input state
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Inline edit state
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirm state
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  // Mobile sidebar toggle
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Auto-scroll anchor & input ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounter = useRef(0);

  // ── Scroll to bottom when messages update or typing starts ───────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Fetch messages for a specific chat ────────────────────────────────────
  const fetchThreadMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const thread = await apiGet<Message[]>(`/chats/${chatId}/messages`);
      setMessages(thread || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve message thread';
      setError(msg);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ── 1. Initial load: fetch chats ─────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function initChats() {
      setLoadingChats(true);
      setError(null);
      try {
        const fetchedChats = await apiGet<Chat[]>('/chats');
        if (!isMounted) return;
        setChats(fetchedChats || []);
        if (fetchedChats && fetchedChats.length > 0) {
          const first = fetchedChats[0];
          setActiveChatId(first.id);
          fetchThreadMessages(first.id);
        } else {
          setActiveChatId(null);
          setMessages([]);
        }
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to connect to MUNSIF API';
        setError(msg);
      } finally {
        if (isMounted) setLoadingChats(false);
      }
    }

    initChats();
    return () => { isMounted = false; };
  }, [fetchThreadMessages]);

  // ── 2. Create a new chat session ──────────────────────────────────────────
  const handleNewChat = async () => {
    setError(null);
    try {
      const newChat = await apiPost<Chat>('/chats', {});
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setMessages([]);
      setMobileSidebarOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize new inquiry docket';
      setError(msg);
    }
  };

  // ── 3. Select a chat from sidebar ─────────────────────────────────────────
  const handleSelectChat = (chatId: string) => {
    if (chatId === activeChatId && !loadingMessages) return;
    setActiveChatId(chatId);
    setMobileSidebarOpen(false);
    fetchThreadMessages(chatId);
  };

  // ── 4. Rename chat session ────────────────────────────────────────────────
  const startRename = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = async (chatId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = editTitle.trim();
    if (!cleanTitle) {
      setEditingChatId(null);
      return;
    }

    try {
      const updated = await apiPatch<Chat>(`/chats/${chatId}`, { title: cleanTitle });
      setChats(prev => prev.map(c => (c.id === chatId ? { ...c, title: updated.title } : c)));
      setEditingChatId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to rename inquiry';
      setError(msg);
    }
  };

  // ── 4b. Delete chat session with confirmation ────────────────────────────
  const promptDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingChatId(chatId);
  };

  const handleConfirmDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiDelete(`/chats/${chatId}`);
      const remaining = chats.filter(c => c.id !== chatId);
      setChats(remaining);
      setDeletingChatId(null);

      // If active chat was deleted, clear main panel back to empty state
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete inquiry docket';
      setError(msg);
    }
  };

  // ── 5. Send message (optimistic update + handle assistant reply) ──────────
  const handleSendMessage = async (rawText?: string) => {
    const textToSend = (rawText ?? input).trim();
    if (!textToSend || isTyping) return;

    if (!rawText) setInput('');
    setError(null);

    let targetChatId = activeChatId;

    // If no chat is currently selected, create one first
    if (!targetChatId) {
      try {
        const newChat = await apiPost<Chat>('/chats', {});
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        targetChatId = newChat.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create chat docket';
        setError(msg);
        return;
      }
    }

    // Optimistically append the user message
    messageIdCounter.current += 1;
    const tempUserId = `opt-${messageIdCounter.current}`;
    const optimisticMessage: Message = {
      id: tempUserId,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setIsTyping(true);

    try {
      const response = await apiPost<SendMessageResponse>(`/chats/${targetChatId}/messages`, {
        content: textToSend,
      });

      const assistantMessage: Message = {
        ...response.message,
        action: response.action,
        candidates: response.candidates,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update chat title in sidebar if it was "New chat" (backend auto-titles it)
      setChats(prev =>
        prev.map(c => {
          if (c.id === targetChatId) {
            let nextTitle = c.title;
            if (c.title === 'New chat') {
              nextTitle = textToSend.length > 40 ? textToSend.slice(0, 40).trim() + '...' : textToSend;
            }
            return { ...c, title: nextTitle, updated_at: new Date().toISOString() };
          }
          return c;
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to receive assistant response';
      setError(msg);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Keydown in textarea (Enter to send, Shift+Enter for newline) ──────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  // User display name & initials
  const userName =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split('@')[0] ||
    'Consumer / Complainant';
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'ME';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden text-on-surface">

      {/* ── Top System Alert & Regulatory Protocol Bar ── */}
      <div className="w-full bg-surface-container-lowest border-b border-outline-variant/40 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider font-semibold text-on-surface">
            {activeChat ? `Active Chat: MUNSIF-${activeChat.id.slice(0, 8).toUpperCase()}` : 'Awaiting Inquiry'}
          </span>
          <span className="hidden md:inline text-outline-variant font-mono text-xs">•</span>
          <span className="hidden md:inline font-mono text-xs text-on-surface-variant">
            Reference: BCO 1962 §25A &amp; PSD Reg. 2023
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-[11px] font-semibold uppercase tracking-wider">
            Encrypted Connection
          </span>

          {/* Mobile sidebar drawer toggle */}
          <button
            onClick={() => setMobileSidebarOpen(v => !v)}
            className="lg:hidden px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors border border-outline-variant/50"
            type="button"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span>Dockets ({chats.length})</span>
          </button>
        </div>
      </div>

      {/* ── Error notification banner ── */}
      {error && (
        <div className="w-full bg-error-container text-on-error-container px-4 py-2 text-xs flex items-center justify-between border-b border-error/20 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="hover:underline font-semibold ml-4">Dismiss</button>
        </div>
      )}

      {/* ── Main Dual-Column Workbench ── */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden max-w-[1440px] w-full mx-auto p-2 sm:p-4 gap-3 sm:gap-4 relative">

        {/* ── Left Sidebar (Desktop + Mobile Drawer) ── */}
        <aside
          className={`
            ${mobileSidebarOpen ? 'flex absolute inset-2 z-30' : 'hidden'}
            lg:flex flex-col w-full sm:w-80 lg:w-[320px] shrink-0 h-full min-h-0
            bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden
          `}
        >
          {/* Sidebar Header & + New Chat button */}
          <div className="p-3 sm:p-4 bg-surface-container-low border-b border-outline-variant/30 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-text-secondary font-semibold">
                Regulatory Log
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] bg-surface-container px-2 py-0.5 rounded text-on-surface font-semibold">
                  {chats.length} {chats.length === 1 ? 'Docket' : 'Dockets'}
                </span>
                {mobileSidebarOpen && (
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="lg:hidden p-1 text-on-surface-variant hover:text-on-surface"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <button
              id="btn-new-chat"
              onClick={handleNewChat}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-[0.98]"
              type="button"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>New Formal Inquiry</span>
            </button>
          </div>

          {/* Sidebar Streams / Chat List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {loadingChats ? (
              <div className="p-4 flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-lg bg-surface-container animate-pulse" />
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-text-muted">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium">No inquiries recorded yet.</p>
                <p className="text-[11px] text-text-muted">Click above to start a new chat docket.</p>
              </div>
            ) : (
              chats.map(chat => {
                const isActive = chat.id === activeChatId;
                const isEditing = editingChatId === chat.id;
                const isDeleting = deletingChatId === chat.id;

                return (
                  <div
                    key={chat.id}
                    onClick={() => !isEditing && !isDeleting && handleSelectChat(chat.id)}
                    className={`
                      group relative flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer
                      ${isActive
                        ? 'bg-secondary-container/60 text-on-secondary-container font-semibold border-l-4 border-primary'
                        : 'hover:bg-surface-container-high text-on-surface'}
                    `}
                  >
                    {isEditing ? (
                      <form onSubmit={(e) => handleSaveRename(chat.id, e)} className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingChatId(null);
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-surface-container-lowest border border-primary rounded focus:outline-none text-on-surface"
                        />
                        <button type="submit" className="p-1 text-text-secondary hover:text-text-brand" title="Save">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => setEditingChatId(null)} className="p-1 text-text-muted hover:text-on-surface" title="Cancel">
                          ✕
                        </button>
                      </form>
                    ) : isDeleting ? (
                      <div className="flex items-center justify-between w-full bg-error-container/30 p-1 rounded" onClick={e => e.stopPropagation()}>
                        <span className="text-xs text-error font-semibold">Delete inquiry?</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleConfirmDelete(chat.id, e)}
                            className="px-2 py-0.5 text-xs bg-error text-white rounded hover:opacity-90 font-semibold"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingChatId(null)}
                            className="px-2 py-0.5 text-xs bg-surface-container rounded hover:bg-surface-container-highest text-on-surface"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          <div className="mt-0.5 shrink-0 text-text-brand">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate leading-tight">
                              {chat.title || 'New inquiry docket'}
                            </p>
                            <span className="font-mono text-[10px] text-on-surface-variant block truncate mt-0.5">
                              D-{chat.id.slice(0, 6).toUpperCase()} • {formatDate(chat.updated_at || chat.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions on hover or active */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 bg-surface-container-lowest/90 rounded px-1">
                          <button
                            type="button"
                            onClick={(e) => startRename(chat, e)}
                            className="p-1 hover:text-text-brand transition-colors"
                            title="Rename inquiry"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => promptDelete(chat.id, e)}
                            className="p-1 hover:text-error transition-colors"
                            title="Delete docket"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Institutional Sidebar Footer */}
          <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
              <span className="font-semibold text-text-brand">BC&amp;CPD v4.2</span>
              <span className="flex items-center gap-1 text-text-secondary font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald inline-block" />
                Synchronized
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span className="text-text-secondary font-semibold">BCO 1962 Codex</span>
              <span>•</span>
              <span>Ombudsman Portal</span>
              <span>•</span>
              <span>Audit Logs</span>
            </div>
          </div>
        </aside>

        {/* ── Main Chat Area ── */}
        <section className="flex-1 flex flex-col min-h-0 h-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden relative">

          {/* Chat Sub-Header */}
          <div className="px-4 sm:px-6 py-3 bg-surface-container-low border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-base font-semibold text-text-brand truncate">
                  {activeChat ? activeChat.title : 'Banking Consumer Advisory Desk'}
                </span>
                <span className="font-mono text-[11px] text-on-surface-variant truncate">
                  Reference Domain: Banking Consumer Protection
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="font-mono text-[11px] px-2.5 py-1 bg-surface-container rounded text-on-surface font-semibold">
                BCO 1962 § 82D
              </span>
              <span className="font-mono text-[11px] px-2.5 py-1 bg-secondary-container text-on-secondary-container font-semibold rounded">
                Educational Assistant
              </span>
            </div>
          </div>

          {/* Scrollable Message Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6" id="message-container">

            {/* Empty State / Welcome Screen */}
            {(!activeChatId || messages.length === 0) && !loadingMessages && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-[640px] mx-auto py-8 px-4">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-low p-2 flex items-center justify-center shadow-inner mb-4 border border-outline-variant/30">
                  <img
                    src={munsifLogo}
                    alt="MUNSIF Logo"
                    className="w-full h-full object-contain filter drop-shadow-sm select-none pointer-events-none rounded-xl"
                  />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald" />
                  Consumer Inquiry Assistant
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-text-brand mb-2">
                  MUNSIF
                </h2>

                {/* Suggestion Chips */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {SUGGESTED_INQUIRIES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/50 transition-all duration-150 text-left flex flex-col gap-1 group active:scale-[0.98] shadow-xs"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-text-brand group-hover:text-text-brand-accent flex items-center gap-1.5">
                          <span>{item.icon}</span>
                          {item.title}
                        </span>
                        <svg className="w-3.5 h-3.5 text-text-muted group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                      <p className="text-[12px] text-on-surface-variant line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading messages spinner */}
            {loadingMessages && (
              <div className="h-full flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                  <span className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-emerald animate-spin" />
                  <span className="font-mono text-xs">Retrieving docket history…</span>
                </div>
              </div>
            )}

            {/* Message Thread */}
            {!loadingMessages && messages.length > 0 && (
              <>
                {/* Initial intake timestamp header */}
                <div className="flex items-center justify-center my-2">
                  <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    Session Started • MUNSIF Session #{activeChatId?.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                {messages.map((msg) => {
                  const isUser = msg.role === 'user';

                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex justify-end gap-2.5 pl-8 sm:pl-16">
                        <div className="flex flex-col items-end max-w-2xl">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-on-surface-variant">
                              {userName}
                            </span>
                            <span className="font-mono text-[10px] text-text-muted">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                          <div className="bg-primary dark:bg-[#1b365d] text-white p-3.5 sm:p-4 rounded-2xl rounded-tr-xs shadow-sm text-sm leading-relaxed whitespace-pre-wrap border border-transparent dark:border-outline-variant/30">
                            {msg.content}
                          </div>
                          <span className="font-mono text-[10px] text-text-muted mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3 text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Message Sent
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1 shadow-sm">
                          {userInitials}
                        </div>
                      </div>
                    );
                  }

                  // Assistant message
                  return (
                    <div key={msg.id} className="flex items-start gap-3 pr-4 sm:pr-12 max-w-3xl">
                      {/* MUNSIF Logo Avatar */}
                      <div className="w-9 h-9 rounded-full bg-surface-container-low p-1 shrink-0 shadow-sm flex items-center justify-center overflow-hidden border border-outline-variant/40 mt-1">
                        <img src={munsifLogo} alt="MUNSIF Logo" className="w-full h-full object-contain" />
                      </div>

                      <div className="flex flex-col items-start w-full min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-text-brand">
                            MUNSIF
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                            Educational Assistant
                          </span>
                          <span className="font-mono text-[10px] text-text-muted">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>

                        {/* Card body */}
                        <div className="w-full bg-surface-container-low text-on-surface p-4 sm:p-5 rounded-2xl rounded-tl-xs shadow-sm border border-outline-variant/30 space-y-3">
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>

                          {/* ── Clarify candidates (Clickable chips) ── */}
                          {msg.candidates && msg.candidates.length > 0 && (
                            <div className="pt-2 border-t border-outline-variant/30 flex flex-col gap-2">
                              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                Did you mean one of these specific inquiries?
                              </span>
                              <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
                                {msg.candidates.map((candidate, cIdx) => (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    disabled={isTyping}
                                    onClick={() => handleSendMessage(candidate.example_question)}
                                    className="px-3 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-text-brand hover:text-text-brand-accent text-xs font-semibold border border-outline-variant shadow-xs flex items-center justify-between gap-2 transition-all transform active:scale-95 text-left disabled:opacity-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald shrink-0" />
                                      <span>{candidate.example_question}</span>
                                    </div>
                                    <svg className="w-3 h-3 text-text-secondary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Subtly display matched_intent / confidence_score ONLY when present and not clarify/no_match ── */}
                          {msg.matched_intent &&
                            msg.confidence_score != null &&
                            msg.action !== 'no_match' &&
                            msg.action !== 'clarify' && (
                              <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20 font-mono text-[11px] text-text-muted flex-wrap">
                                <span className="flex items-center gap-1 text-on-surface-variant font-medium">
                                  <svg className="w-3 h-3 text-emerald shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                  </svg>
                                  Intent: <strong className="text-text-brand font-semibold">{msg.matched_intent}</strong>
                                </span>
                                <span>•</span>
                                <span>Confidence: {(msg.confidence_score * 100).toFixed(0)}%</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="hidden sm:inline text-text-secondary">Referenced from Banking Knowledge Base</span>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-3 pr-4 max-w-2xl">
                    <div className="w-9 h-9 rounded-full bg-surface-container-low p-1 shrink-0 shadow-sm flex items-center justify-center overflow-hidden border border-outline-variant/40 mt-1">
                      <img src={munsifLogo} alt="MUNSIF Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-text-brand">MUNSIF</span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                          Processing
                        </span>
                      </div>
                      <div className="bg-surface-container-low text-on-surface px-4 py-3 rounded-2xl rounded-tl-xs shadow-sm border border-outline-variant/30 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 rounded-full bg-secondary animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 rounded-full bg-gold animate-bounce" />
                        <span className="text-xs text-on-surface-variant font-medium ml-1">
                          Analyzing banking regulations…
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Floating Prompt & Input Bar Container */}
          <div className="p-3 sm:p-4 bg-surface-container-lowest/95 backdrop-blur border-t border-outline-variant/40 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative w-full max-w-4xl mx-auto flex flex-col gap-2"
            >
              <div className="w-full rounded-2xl bg-surface-container-low focus-within:bg-surface-container-lowest shadow-sm focus-within:shadow-md border border-outline-variant/50 focus-within:border-primary/50 p-2 sm:p-3 flex flex-col transition-all duration-200">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Inquire about consumer rights, file banking complaints, or cite banking regulations..."
                  rows={2}
                  className="w-full px-2 py-1 bg-transparent border-none text-on-surface placeholder:text-text-muted focus:outline-none resize-none text-sm leading-relaxed"
                />

                <div className="flex items-center justify-between pt-2 px-1 border-t border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[11px] font-mono">
                      <svg className="w-3 h-3 text-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                      </svg>
                      BCO 1962 Protocol
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="hidden md:inline font-mono text-[11px] text-text-muted">Press Enter ↵</span>
                    <button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      aria-label="Send query"
                      className="w-9 h-9 rounded-full bg-primary hover:bg-primary-container dark:bg-[#1b365d] dark:hover:bg-[#224270] text-white flex items-center justify-center shadow-sm transition-all duration-150 transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Educational Project Disclaimer */}
              <div className="flex items-center justify-center gap-1.5 px-2 text-center">
                <p className="text-[11px] text-text-muted">
                  MUNSIF is an independent, unofficial educational project and is not affiliated with, endorsed by, or operated by the State Bank of Pakistan.
                </p>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
