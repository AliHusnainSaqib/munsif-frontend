/**
 * src/components/ProtectedRoute.tsx
 *
 * Redirects unauthenticated visitors to /sign-in.
 * Shows a full-screen spinner while the initial session is loading
 * (AuthContext.loading = true) so there's no flicker on first render.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="w-8 h-8 rounded-full border-2 border-surface-container-high border-t-primary animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
