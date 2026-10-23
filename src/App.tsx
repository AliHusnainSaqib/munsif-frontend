/**
 * src/App.tsx
 *
 * Root component — sets up providers, router, and the app shell layout.
 * NavBar is shown on all authenticated routes; auth pages render full-screen.
 * Protected routes are wrapped in <ProtectedRoute> which redirects to /sign-in
 * when there is no active Supabase session.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import NavBar from '@/components/NavBar';
import ProtectedRoute from '@/components/ProtectedRoute';

import SignIn          from '@/pages/SignIn';
import SignUp          from '@/pages/SignUp';
import ForgotPassword  from '@/pages/ForgotPassword';
import ResetPassword   from '@/pages/ResetPassword';
import TwoFactorVerify from '@/pages/TwoFactorVerify';
import ChatPage        from '@/pages/ChatPage';
import SettingsPage    from '@/pages/SettingsPage';
import AdminPage       from '@/pages/AdminPage';
import LandingPage     from '@/pages/LandingPage';
import CnicChangeRequest from '@/pages/CnicChangeRequest';

// ---------------------------------------------------------------------------
// Shell layout — wraps all authenticated routes with the sticky NavBar
// ---------------------------------------------------------------------------
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background text-on-surface font-primary overflow-hidden">
      <NavBar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>
      <footer className="shrink-0 py-1.5 px-4 bg-surface-container-low border-t border-outline-variant/30 text-center text-[11px] text-text-muted">
        <p>
          MUNSIF is an independent, unofficial educational project and is not affiliated with, endorsed by, or operated by the State Bank of Pakistan.
        </p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public routes — no NavBar ── */}
            <Route path="/"                element={<LandingPage />} />
            <Route path="/sign-in"         element={<SignIn />} />
            <Route path="/sign-up"         element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/verify-2fa"      element={<TwoFactorVerify />} />
            <Route path="/two-factor-verify" element={<TwoFactorVerify />} />

            {/* ── Protected routes — redirect to /sign-in if no session ── */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <AppShell><ChatPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppShell><SettingsPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/cnic-request"
              element={
                <ProtectedRoute>
                  <AppShell><CnicChangeRequest /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AppShell><AdminPage /></AppShell>
                </ProtectedRoute>
              }
            />

            {/* ── Default redirect ── */}
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
