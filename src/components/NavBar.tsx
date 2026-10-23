/**
 * src/components/NavBar.tsx
 *
 * Top navigation bar following the MUNSIF design system (DESIGN.md §8.1, §2.1).
 *
 * Left  : Logo mark + "MUNSIF" wordmark
 * Centre: Primary navigation links (Admin Portal shown only when is_admin=true)
 * Right : Theme toggle + user avatar / initials
 */

import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiGet } from '@/lib/api';
import munsifLogo from '@/assets/munsif-logo.png';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NavLink({
  to,
  label,
  active,
}: {
  to: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={[
        // Base — shared across both states
        'text-sm font-semibold px-3 py-1.5 rounded transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        // Hover only applies to the inactive state (active already has bg)
        active
          ? [
              // Active state
              // text-on-surface: #191c1e in light, #e8ecf1 in dark — always readable
              'text-on-surface',
              // bg-surface-container: #eceef0 in light, #1b365d in dark
              //   Light: visible grey pill against #ffffff nav bg ✓
              //   Dark : visible mid-navy pill against #0f2444 nav bg ✓
              'bg-surface-container',
              // Gold underline — unambiguous institutional active indicator
              // Works identically in both modes (gold is not overridden)
              'border-b-2 border-gold rounded-b-none',
            ].join(' ')
          : [
              // Inactive state
              // text-on-surface-variant: #44474e light, #aab4c4 dark — readable hint text
              'text-on-surface-variant',
              'hover:bg-surface-container hover:text-on-surface',
            ].join(' '),
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        'w-9 h-9 flex items-center justify-center rounded',
        'text-on-surface-variant hover:bg-surface-container',
        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold',
      ].join(' ')}
    >
      {isDark ? (
        /* Sun icon */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Zm11.89-1.499a.75.75 0 0 1 0 1.061l-1.591 1.591a.75.75 0 1 1-1.061-1.06l1.591-1.592a.75.75 0 0 1 1.061 0Zm-14.78 0a.75.75 0 0 1 1.06 0l1.592 1.592a.75.75 0 1 1-1.061 1.06L4.61 11.562a.75.75 0 0 1 0-1.06ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 1 0 1.061l-1.591 1.591a.75.75 0 0 1-1.061-1.06l1.591-1.592a.75.75 0 0 1 1.061 0ZM18 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H17.25A.75.75 0 0 1 18 12ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12Z" />
        </svg>
      ) : (
        /* Moon icon */
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

function UserAvatar() {
  const { user, signOut } = useAuth();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="relative group">
      <button
        aria-label="User menu"
        className={[
          'w-9 h-9 flex items-center justify-center rounded-full text-xs font-semibold',
          'bg-primary-container text-white',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        ].join(' ')}
      >
        {initials}
      </button>
      {/* Dropdown — minimal placeholder until Settings page is wired */}
      <div className={[
        'absolute right-0 mt-1 w-40 hidden group-focus-within:block',
        'bg-surface-container-lowest border border-outline-variant rounded shadow-2',
        'z-50',
      ].join(' ')}>
        <button
          onClick={signOut}
          className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavBar
// ---------------------------------------------------------------------------

export default function NavBar() {
  const { pathname } = useLocation();
  const { session } = useAuth();

  // Fetch the backend profile once per session to read is_admin / is_super_admin.
  // We do this here because AuthContext only holds the raw Supabase user object,
  // which does not include the profile columns.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    apiGet<{ profile: { is_admin?: boolean } }>('/me')
      .then((data) => {
        if (!cancelled) setIsAdmin(data?.profile?.is_admin === true);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => { cancelled = true; };
  }, [session]);

  return (
    <header className="shrink-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-1">
      <div className="max-w-[1200px] mx-auto px-[var(--margin)] h-14 flex items-center gap-6">

        {/* Logo & wordmark */}
        <Link to="/chat" className="flex items-center gap-2.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded">
          <img
            src={munsifLogo}
            alt="MUNSIF"
            className="w-8 h-8 object-contain rounded select-none pointer-events-none"
          />
          <span className="text-sm font-semibold text-on-surface hidden sm:block">
            MUNSIF
          </span>
        </Link>

        {/* Primary navigation */}
        <nav className="flex items-center gap-1 flex-1" aria-label="Primary navigation">
          <NavLink to="/chat"      label="Assistant Chat"  active={pathname.startsWith('/chat')} />
          <NavLink to="/settings"  label="Settings"        active={pathname === '/settings'} />
          {isAdmin && (
            <NavLink to="/admin" label="Admin Portal" active={pathname.startsWith('/admin')} />
          )}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <UserAvatar />
        </div>

      </div>
    </header>
  );
}
