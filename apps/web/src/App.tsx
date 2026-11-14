import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SiteCopyProvider } from './lib/siteCopy';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ClassmatesPage = lazy(() => import('./pages/ClassmatesPage'));
const ClassmateDetailPage = lazy(() => import('./pages/ClassmateDetailPage'));
const PlazaPage = lazy(() => import('./pages/PlazaPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AlbumsPage = lazy(() => import('./pages/AlbumsPage'));
const AlbumDetailPage = lazy(() => import('./pages/AlbumDetailPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const MePage = lazy(() => import('./pages/MePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--color-muted, #8a8177)',
        fontFamily: 'inherit',
        fontSize: 14,
      }}
    >
      正在打开拾光同学录…
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SiteCopyProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/classmates" element={<ClassmatesPage />} />
                <Route path="/classmates/:id" element={<ClassmateDetailPage />} />
                <Route path="/plaza" element={<PlazaPage />} />
                <Route path="/plaza/:id" element={<PostDetailPage />} />
                <Route path="/wall" element={<Navigate replace to="/plaza" />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/albums" element={<AlbumsPage />} />
                <Route path="/albums/:id" element={<AlbumDetailPage />} />
                <Route path="/timeline" element={<TimelinePage />} />
                <Route path="/me" element={<MePage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </SiteCopyProvider>
    </ErrorBoundary>
  );
}
