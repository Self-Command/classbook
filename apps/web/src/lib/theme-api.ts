import type { ThemeId } from '@classbook/shared';

export async function updateThemePreference(theme: ThemeId | null): Promise<void> {
  const response = await fetch('/api/auth/preferences', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  });

  if (!response.ok) {
    throw new Error('主题偏好保存失败');
  }
}
