import { Route, Routes } from 'react-router-dom';
import { Toast } from '@heroui/react';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { InvitesPage } from './pages/InvitesPage';
import { MessagesPage } from './pages/MessagesPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { AlbumDetailPage } from './pages/AlbumDetailPage';
import { TimelinePage } from './pages/TimelinePage';
import { CopyPage } from './pages/CopyPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <>
      <Toast.Provider placement="top end" width="min(420px, calc(100vw - 2rem))" />
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedAdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="members" element={<MembersPage />} />
                <Route path="invites" element={<InvitesPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="albums" element={<AlbumsPage />} />
                <Route path="albums/:id" element={<AlbumDetailPage />} />
                <Route path="timeline" element={<TimelinePage />} />
                <Route path="copy" element={<CopyPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </>
  );
}
