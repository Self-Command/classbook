import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Spinner, toast } from '@heroui/react';
import { loginSchema } from '@classbook/shared';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSafeRedirect, withRedirect } from '@/lib/navigation';
import { validateForm } from '@/lib/validation';
import type { FieldErrors } from '@/lib/validation';
import { FormField } from '@/components/ui/FormField';
import { FullPageLoading, PageContainer } from '@/components/ui/PageState';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = getSafeRedirect(searchParams.get('redirect'));

  const [values, setValues] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <FullPageLoading label="正在确认身份…" />;
  }

  if (user) {
    return <Navigate to={redirect} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const parsed = validateForm(loginSchema, values);
    if (!parsed.success) {
      const friendlyErrors: FieldErrors = { ...parsed.errors };
      if (friendlyErrors.username) friendlyErrors.username = '请输入用户名';
      if (friendlyErrors.password) friendlyErrors.password = '请输入密码';
      setErrors(friendlyErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const signedInUser = await login(parsed.data);
      toast.success(`欢迎回来，${signedInUser.profile?.realName ?? signedInUser.username}`);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer className="flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <div>
            <p className="text-xs font-medium tracking-[0.24em] text-accent">欢迎回来</p>
            <h1 className="mt-2 font-display text-3xl text-foreground">回到拾光</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              登录后，就能看到同学们的近况，也能继续写下新的留言。
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

            <FormField
              label="用户名"
              value={values.username}
              onChange={(value) => {
                setValues((current) => ({ ...current, username: value }));
                if (errors.username) setErrors((current) => ({ ...current, username: '' }));
              }}
              error={errors.username}
              placeholder="你的用户名"
              autoComplete="username"
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
              placeholder="请输入密码"
              autoComplete="current-password"
              isRequired
              isDisabled={submitting}
            />

            <Button type="submit" fullWidth isPending={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" color="current" />
                  登录中…
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted">
            还没有账号？{' '}
            <Link
              to={withRedirect('/register', redirect)}
              className="link font-medium text-accent underline-offset-4 hover:underline"
            >
              用邀请码注册
            </Link>
          </p>
        </Card>

        <p className="mt-4 text-center text-xs leading-6 text-muted">
          这里只属于本班同学。没有邀请码的话，请联系班长或管理员。
        </p>
      </div>
    </PageContainer>
  );
}
