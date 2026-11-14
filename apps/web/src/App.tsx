import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { SiteCopyProvider } from './lib/siteCopy';
import AlbumDetailPage from './pages/AlbumDetailPage';
import AlbumsPage from './pages/AlbumsPage';
import ClassmateDetailPage from './pages/ClassmateDetailPage';
import ClassmatesPage from './pages/ClassmatesPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MePage from './pages/MePage';
import NotFoundPage from './pages/NotFoundPage';
import PlazaPage from './pages/PlazaPage';
import PostDetailPage from './pages/PostDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import RegisterPage from './pages/RegisterPage';
import TimelinePage from './pages/TimelinePage';

export default function App() {
  return (
    <ErrorBoundary>
      <SiteCopyProvider>
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
      </SiteCopyProvider>
    </ErrorBoundary>
  );
}
