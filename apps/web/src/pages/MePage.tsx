import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Chip, Spinner, toast } from '@heroui/react';
import {
  ALLOWED_IMAGE_MIME,
  AVATAR_MAX_BYTES,
  passwordChangeSchema,
  profileUpdateSchema,
} from '@classbook/shared';
import type { ProfileDto } from '@classbook/shared';
import { authApi, getErrorMessage, profilesApi, settingsApi, uploadsApi } from '@/lib/api';
import { compressImage } from '@/lib/compressImage';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { validateForm } from '@/lib/validation';
import type { FieldErrors } from '@/lib/validation';
import { FormField } from '@/components/ui/FormField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import {
  FullPageLoading,
  PageContainer,
  PageHeader,
  SectionHeading,
} from '@/components/ui/PageState';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { IconCamera, IconLock, IconLogout } from '@/components/ui/icons';
import { useSiteCopy } from '@/lib/siteCopy';

interface ProfileFormState {
  realName: string;
  nickname: string;
  avatarUrl: string;
  motto: string;
  bio: string;
  location: string;
  birthday: string;
  wechat: string;
  qq: string;
  email: string;
  phone: string;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function toFormState(profile: ProfileDto | null): ProfileFormState {
  return {
    realName: profile?.realName ?? '',
    nickname: profile?.nickname ?? '',
    avatarUrl: profile?.avatarUrl ?? '',
    motto: profile?.motto ?? '',
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    birthday: profile?.birthday ?? '',
    wechat: profile?.wechat ?? '',
    qq: profile?.qq ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
  };
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function MePage() {
  const { user, refreshUser, logout } = useAuth();
  const { copy } = useSiteCopy();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<ProfileFormState>(() =>
    toFormState(user?.profile ?? null),
  );
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [profileFormError, setProfileFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [password, setPassword] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [passwordFormError, setPasswordFormError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  if (!user) {
    return <FullPageLoading label="正在准备你的档案…" />;
  }

  const displayName = values.realName.trim() || user.username;

  const clearProfileError = (field: keyof ProfileFormState) => {
    setProfileErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleChange = (field: keyof ProfileFormState, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    clearProfileError(field);
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || avatarBusy) return;
    setProfileFormError('');

    const payload = {
      realName: values.realName,
      nickname: orNull(values.nickname),
      avatarUrl: orNull(values.avatarUrl),
      motto: orNull(values.motto),
      bio: orNull(values.bio),
      location: orNull(values.location),
      birthday: orNull(values.birthday),
      wechat: orNull(values.wechat),
      qq: orNull(values.qq),
      email: orNull(values.email),
      phone: orNull(values.phone),
    };

    const parsed = validateForm(profileUpdateSchema, payload);
    if (!parsed.success) {
      const friendlyErrors: FieldErrors = { ...parsed.errors };
      if (friendlyErrors.realName) friendlyErrors.realName = '请填写真实姓名';
      setProfileErrors(friendlyErrors);
      setProfileFormError(friendlyErrors._form ?? '请检查标红的字段后再保存');
      return;
    }

    setProfileErrors({});
    setSaving(true);
    try {
      const result = await profilesApi.updateMe(parsed.data);
      setValues(toFormState(result.profile));
      await refreshUser();
      toast.success('档案已保存');
    } catch (error) {
      setProfileFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setValues(toFormState(user.profile));
    setProfileErrors({});
    setProfileFormError('');
    toast.info('已还原为上次保存的内容');
  };

  const handleAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowedTypes: readonly string[] = ALLOWED_IMAGE_MIME;
    if (!allowedTypes.includes(file.type)) {
      toast.danger('仅支持 JPG、PNG 或 WebP 图片');
      return;
    }
    setAvatarBusy(true);
    try {
      const settings = await settingsApi.getPublic();
      const prepared = await compressImage(
        file,
        {
          enabled: settings.imageCompressEnabled,
          thresholdKb: settings.imageCompressThresholdKb,
          maxDimension: settings.imageMaxDimension,
          quality: settings.imageQuality,
        },
        AVATAR_MAX_BYTES,
      );
      if (prepared.size > AVATAR_MAX_BYTES) {
        toast.danger('头像压缩后仍超过 2MB，请换一张图片');
        return;
      }
      const uploaded = await uploadsApi.avatar(prepared);
      const result = await profilesApi.updateMe({ avatarUrl: uploaded.url });
      setValues((current) => ({
        ...current,
        avatarUrl: result.profile.avatarUrl ?? uploaded.url,
      }));
      await refreshUser();
      toast.success('头像已更新');
    } catch (error) {
      toast.danger(getErrorMessage(error));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!values.avatarUrl || avatarBusy) return;
    setAvatarBusy(true);
    try {
      const result = await profilesApi.updateMe({ avatarUrl: null });
      setValues((current) => ({ ...current, avatarUrl: result.profile.avatarUrl ?? '' }));
      await refreshUser();
      toast.success('头像已移除');
    } catch (error) {
      toast.danger(getErrorMessage(error));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordFormError('');

    const parsed = validateForm(passwordChangeSchema, {
      currentPassword: password.currentPassword,
      newPassword: password.newPassword,
    });

    if (!parsed.success) {
      const friendlyErrors: FieldErrors = { ...parsed.errors };
      if (friendlyErrors.currentPassword) {
        friendlyErrors.currentPassword = '请输入当前密码';
      }
      setPasswordErrors(friendlyErrors);
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      setPasswordErrors({ confirmPassword: '两次输入的新密码不一致' });
      return;
    }

    setPasswordErrors({});
    setChangingPassword(true);
    try {
      await authApi.changePassword(parsed.data);
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('密码已修改，其他设备将退出登录');
    } catch (error) {
      setPasswordFormError(getErrorMessage(error));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('已退出登录');
      navigate('/');
    } catch (error) {
      toast.danger(getErrorMessage(error));
    } finally {
      setLoggingOut(false);
    }
  };

  const roleLabel = user.role === 'ADMIN' ? '管理员' : '同学';
  const busy = saving || avatarBusy;

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        eyebrow="写给自己"
        title={copy.meTitle}
        description={copy.meDescription}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <UserAvatar
                name={displayName}
                src={values.avatarUrl || null}
                className="size-20 shrink-0 text-2xl ring-4 ring-accent/10"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl text-foreground">头像</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  支持 JPG、PNG、WebP，不超过 2MB。上传后会立即保存。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      void handleAvatarSelected(event);
                    }}
                    disabled={busy}
                  />
                  <Button
                    variant="secondary"
                    isPending={avatarBusy}
                    isDisabled={busy}
                    onPress={() => fileInputRef.current?.click()}
                  >
                    {avatarBusy ? (
                      <Spinner size="sm" color="current" />
                    ) : (
                      <IconCamera className="size-4" />
                    )}
                    {avatarBusy ? '上传中…' : '更换头像'}
                  </Button>
                  {values.avatarUrl ? (
                    <Button
                      variant="ghost"
                      isDisabled={busy}
                      onPress={() => void handleRemoveAvatar()}
                    >
                      移除头像
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-7">
            <form className="flex flex-col gap-5" onSubmit={handleProfileSubmit} noValidate>
              <SectionHeading
                title="基本资料"
                description="这些信息会展示给已经登录的本班同学。"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="真实姓名"
                  value={values.realName}
                  onChange={(value) => handleChange('realName', value)}
                  error={profileErrors.realName}
                  placeholder="你的真实姓名"
                  maxLength={20}
                  isRequired
                  isDisabled={busy}
                />

                <FormField
                  label="昵称"
                  value={values.nickname}
                  onChange={(value) => handleChange('nickname', value)}
                  error={profileErrors.nickname}
                  description="最多 20 字"
                  placeholder="同学们叫你的小名"
                  maxLength={20}
                  isDisabled={busy}
                />

                <FormField
                  className="sm:col-span-2"
                  label="一句话寄语"
                  value={values.motto}
                  onChange={(value) => handleChange('motto', value)}
                  error={profileErrors.motto}
                  description="最多 60 字"
                  placeholder="想对同学们说的一句话"
                  maxLength={60}
                  isDisabled={busy}
                />

                <FormField
                  className="sm:col-span-2"
                  label="关于我"
                  multiline
                  rows={5}
                  value={values.bio}
                  onChange={(value) => handleChange('bio', value)}
                  error={profileErrors.bio}
                  description="最多 1000 字"
                  placeholder="这些年去了哪里，又有了哪些新的故事？"
                  maxLength={1000}
                  isDisabled={busy}
                />

                <FormField
                  label="所在地"
                  value={values.location}
                  onChange={(value) => handleChange('location', value)}
                  error={profileErrors.location}
                  placeholder="现在生活的城市"
                  maxLength={40}
                  isDisabled={busy}
                />

                <FormField
                  label="生日"
                  value={values.birthday}
                  onChange={(value) => handleChange('birthday', value)}
                  error={profileErrors.birthday}
                  description="只填月日，例如 06-18"
                  placeholder="MM-DD"
                  maxLength={5}
                  inputMode="numeric"
                  isDisabled={busy}
                />

                <FormField
                  label="微信"
                  value={values.wechat}
                  onChange={(value) => handleChange('wechat', value)}
                  error={profileErrors.wechat}
                  placeholder="微信号"
                  maxLength={40}
                  isDisabled={busy}
                />

                <FormField
                  label="QQ"
                  value={values.qq}
                  onChange={(value) => handleChange('qq', value)}
                  error={profileErrors.qq}
                  placeholder="QQ 号"
                  maxLength={20}
                  inputMode="numeric"
                  isDisabled={busy}
                />

                <FormField
                  label="邮箱"
                  value={values.email}
                  onChange={(value) => handleChange('email', value)}
                  error={profileErrors.email}
                  placeholder="常用邮箱"
                  maxLength={100}
                  inputMode="email"
                  isDisabled={busy}
                />

                <FormField
                  label="电话"
                  type="tel"
                  value={values.phone}
                  onChange={(value) => handleChange('phone', value)}
                  error={profileErrors.phone}
                  placeholder="联系电话"
                  maxLength={30}
                  inputMode="tel"
                  isDisabled={busy}
                />
              </div>

              {profileFormError ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{profileFormError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-separator pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  isDisabled={busy}
                  onPress={handleReset}
                >
                  还原
                </Button>
                <Button type="submit" isPending={saving} isDisabled={busy}>
                  {saving ? (
                    <>
                      <Spinner size="sm" color="current" />
                      保存中…
                    </>
                  ) : (
                    copy.meSaveButton
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <SectionHeading title="账号信息" />
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">用户名</dt>
                <dd className="truncate font-medium text-foreground">@{user.username}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">身份</dt>
                <dd>
                  <Chip color="accent" variant="soft" size="sm">
                    {roleLabel}
                  </Chip>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">加入时间</dt>
                <dd className="text-foreground">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit} noValidate>
              <div>
                <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
                  <IconLock className="size-4 text-accent" />
                  {copy.mePasswordTitle}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  修改成功后，其他设备上的登录会失效。
                </p>
              </div>

              <PasswordInput
                label="当前密码"
                value={password.currentPassword}
                onChange={(value) => {
                  setPassword((current) => ({ ...current, currentPassword: value }));
                  setPasswordErrors((current) => ({ ...current, currentPassword: '' }));
                }}
                error={passwordErrors.currentPassword}
                autoComplete="current-password"
                isDisabled={changingPassword}
              />

              <PasswordInput
                label="新密码"
                value={password.newPassword}
                onChange={(value) => {
                  setPassword((current) => ({ ...current, newPassword: value }));
                  setPasswordErrors((current) => ({ ...current, newPassword: '' }));
                }}
                error={passwordErrors.newPassword}
                description="至少 8 位"
                autoComplete="new-password"
                maxLength={72}
                isDisabled={changingPassword}
              />

              <PasswordInput
                label="确认新密码"
                value={password.confirmPassword}
                onChange={(value) => {
                  setPassword((current) => ({ ...current, confirmPassword: value }));
                  setPasswordErrors((current) => ({ ...current, confirmPassword: '' }));
                }}
                error={passwordErrors.confirmPassword}
                autoComplete="new-password"
                maxLength={72}
                isDisabled={changingPassword}
              />

              {passwordFormError ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{passwordFormError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <Button type="submit" fullWidth isPending={changingPassword}>
                {changingPassword ? (
                  <>
                    <Spinner size="sm" color="current" />
                    提交中…
                  </>
                ) : (
                  copy.mePasswordButton
                )}
              </Button>
            </form>
          </Card>

          <Card className="border border-danger/20">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
                <IconLogout className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-lg text-foreground">退出登录</h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  离开前记得保存好档案。下次带邀请码或账号回来。
                </p>
              </div>
            </div>
            <Button
              variant="danger-soft"
              fullWidth
              isPending={loggingOut}
              onPress={() => void handleLogout()}
            >
              {loggingOut ? (
                <>
                  <Spinner size="sm" color="current" />
                  退出中…
                </>
              ) : (
                '退出登录'
              )}
            </Button>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}
