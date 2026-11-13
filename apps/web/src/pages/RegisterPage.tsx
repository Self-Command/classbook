import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Spinner, toast } from '@heroui/react';
import { registerSchema } from '@classbook/shared';
import { authApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSafeRedirect, withRedirect } from '@/lib/navigation';
import { validateForm } from '@/lib/validation';
import type { FieldErrors } from '@/lib/validation';
import { FormField } from '@/components/ui/FormField';
import { FullPageLoading, PageContainer } from '@/components/ui/PageState';

type InviteState = 'idle' | 'checking' | 'valid' | 'invalid';

const inviteHint = '向班长或管理员索取';

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = getSafeRedirect(searchParams.get('redirect'));

  const [values, setValues] = useState({
    inviteCode: '',
    realName: '',
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [inviteState, setInviteState] = useState<InviteState>('idle');
  const [inviteError, setInviteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inviteCheckId = useRef(0);

  if (loading) {
    return <FullPageLoading label="正在确认身份…" />;
  }

  if (user) {
    return <Navigate to={redirect} replace />;
  }

  const checkInvite = async (): Promise<boolean> => {
    const code = values.inviteCode.trim();
    if (code.length < 4) {
      setInviteState('idle');
      setInviteError('请先填写完整的邀请码');
      return false;
    }

    const requestId = inviteCheckId.current + 1;
    inviteCheckId.current = requestId;
    setInviteState('checking');
    setInviteError('');

    try {
      const result = await authApi.validateInvite(code);
      if (inviteCheckId.current !== requestId) return false;
      setInviteState(result.valid ? 'valid' : 'invalid');
      if (!result.valid) setInviteError('邀请码无效或已用完，请向管理员确认');
      return result.valid;
    } catch (error) {
      if (inviteCheckId.current !== requestId) return false;
      setInviteState('idle');
      setFormError(getErrorMessage(error));
      return false;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const parsed = validateForm(registerSchema, values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const inviteValid = inviteState === 'valid' ? true : await checkInvite();
      if (!inviteValid) {
        setErrors({ inviteCode: '邀请码无效或已用完，请向管理员确认' });
        return;
      }

      const newUser = await register(parsed.data);
      toast.success(`欢迎加入，${newUser.profile?.realName ?? newUser.username}`);
      navigate(redirect, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer className="flex items-center justify-center">
      <div className="w-full max-w-lg">
        <Card className="p-6 sm:p-8">
          <div>
            <p className="text-xs font-medium tracking-[0.24em] text-accent">加入我们</p>
            <h1 className="mt-2 font-display text-3xl text-foreground">写下你的名字</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              使用管理员发放的邀请码注册，从此这一页也有你的故事。
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{formError}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <div className="flex items-start gap-2">
              <FormField
                className="min-w-0 flex-1"
                label="邀请码"
                value={values.inviteCode}
                onChange={(value) => {
                  const inviteCode = value.toUpperCase();
                  setValues((current) => ({ ...current, inviteCode }));
                  setInviteState('idle');
                  setInviteError('');
                  inviteCheckId.current += 1;
                  if (errors.inviteCode) {
                    setErrors((current) => ({ ...current, inviteCode: '' }));
                  }
                }}
                error={errors.inviteCode || inviteError}
                description={inviteHint}
                placeholder="例如：AB3D7K9M"
                autoComplete="off"
                maxLength={64}
                isRequired
                isDisabled={submitting}
              />
              <Button
                className="mt-6 shrink-0"
                variant="secondary"
                isPending={inviteState === 'checking'}
                isDisabled={submitting || values.inviteCode.trim().length < 4}
                onPress={() => void checkInvite()}
              >
                {inviteState === 'checking' ? <Spinner size="sm" color="current" /> : null}
                校验
              </Button>
            </div>

            {inviteState === 'valid' ? (
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>邀请码有效，欢迎加入。</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <FormField
              label="真实姓名"
              value={values.realName}
              onChange={(value) => {
                setValues((current) => ({ ...current, realName: value }));
                if (errors.realName) setErrors((current) => ({ ...current, realName: '' }));
              }}
              error={errors.realName}
              description="注册后会以真实姓名加入班级同学录"
              placeholder="同学们怎么称呼你"
              autoComplete="name"
              maxLength={20}
              isRequired
              isDisabled={submitting}
            />

            <FormField
              label="用户名"
              value={values.username}
              onChange={(value) => {
                setValues((current) => ({ ...current, username: value }));
                if (errors.username) setErrors((current) => ({ ...current, username: '' }));
              }}
              error={errors.username}
              description="3–20 位字母、数字或下划线"
              placeholder="用于登录的用户名"
              autoComplete="username"
              maxLength={20}
              isRequired
              isDisabled={submitting}
            />

            <FormField
              label="密码"
              type="password"
              value={values.password}
              onChange={(value) => {
                setValues((current) => ({ ...current, password: value }));
                if (errors.password) setErrors((current) => ({ ...current, password: '' }));
              }}
              error={errors.password}
              description="至少 8 位"
              placeholder="设置一个只有你知道的密码"
              autoComplete="new-password"
              maxLength={72}
              isRequired
              isDisabled={submitting}
            />

            <Button type="submit" fullWidth isPending={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" color="current" />
                  正在注册…
                </>
              ) : (
                '完成注册'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted">
            已经有账号了？{' '}
            <Link
              to={withRedirect('/login', redirect)}
              className="link font-medium text-accent underline-offset-4 hover:underline"
            >
              直接登录
            </Link>
          </p>
        </Card>

        <p className="mt-4 text-center text-xs leading-6 text-muted">
          注册成功后会以真实姓名加入班级同学录，请确认信息无误。
        </p>
      </div>
    </PageContainer>
  );
}
