import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { PageLoader } from '../components/common/LoadingSpinner';
import { AppLayout } from '../components/layout/AppLayout';
import { useCurrentUser } from '../hooks/useAuth';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RegisterPage } from '../pages/RegisterPage';
import { TaskDetailPage } from '../pages/TaskDetailPage';
import { TrashPage } from '../pages/TrashPage';

/**
 * Route guards only decide what to *show*. Real authorization happens on the
 * server, which verifies the session on every protected request.
 */
function ProtectedRoute() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

function GuestRoute() {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/trash" element={<TrashPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
