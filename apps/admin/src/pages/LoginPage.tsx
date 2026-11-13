import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, FieldError, Input, Label, Spinner, TextField, toast } from '@heroui/react';
import { loginSchema } from '@classbook/shared';
import { getErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fieldErrors } from '../lib/validation';
import { Icon } from '../components/ui/Icon';
import { FullPageLoading } from '../components/ui/States';

const FEATURES = [
  ['邀请码入班', '掌控谁能进入这间教室'],
  ['内容审核', '守护留言墙的温度与边界'],
  ['相册与时间线', '整理属于我们的共同记忆'],
] as const;

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams(location.search);
  const requestedRedirect = params.get('redirect');
  const safeRedirect =
    requestedRedirect &&
    requestedRedirect.startsWith('/') &&
    !requestedRedirect.startsWith('//') &&
    !requestedRedirect.startsWith('/login')
      ? requestedRedirect
      : null;
  const target = safeRedirect ?? '/';

  if (loading) return <FullPageLoading />;
  if (user?.role === 'ADMIN') return <Navigate to={target} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError('请填写用户名和密码');
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await login(parsed.data.username, parsed.data.password);
      toast.success('欢迎回来，管理员');
      navigate(target, { replace: true });
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.danger(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8">
        <section className="hidden lg:block">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent font-display text-xl text-accent-foreground shadow-lg">
              拾
            </span>
            <div>
              <p className="font-display text-2xl tracking-wide text-foreground">拾光同学录</p>
              <p className="text-[10px] tracking-[0.32em] text-muted">CLASSBOOK · ADMIN</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-lg font-display text-5xl font-semibold leading-[1.25] tracking-tight text-foreground">
            把散落的青春，
            <br />
            收进同一本册子。
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted">
            管理邀请码、成员、留言与班级记忆。这里只对管理员开放，所有内容都留在这间私密的班级空间里。
          </p>

          <div className="mt-12 space-y-4">
            {FEATURES.map(([title, description]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-success shadow-sm">
                  <Icon name="check" className="size-3.5" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="mt-0.5 text-xs text-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-16 text-xs tracking-wide text-muted">拾光同学录 · 管理后台</p>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent font-display text-lg text-accent-foreground">
              拾
            </span>
            <div>
              <p className="font-display text-xl text-foreground">拾光同学录</p>
              <p className="text-[10px] tracking-[0.3em] text-muted">管理后台</p>
            </div>
          </div>

          <Card className="p-6 sm:p-8">
            <div className="flex size-11 items-center justify-center rounded-xl bg-default text-foreground">
              <Icon name="lock" className="size-5" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">管理员登录</h2>
            <p className="mt-1.5 text-sm text-muted">使用管理员账号进入班级管理空间。</p>

            {formError ? (
              <Alert status="danger" className="mt-5">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>登录失败</Alert.Title>
                  <Alert.Description>{formError}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
              <TextField
                name="username"
                value={username}
                onChange={(value) => {
                  setUsername(value);
                  setFormError(null);
                  setErrors((current) => ({ ...current, username: '' }));
                }}
                isInvalid={Boolean(errors.username)}
                isDisabled={submitting}
              >
                <Label>用户名</Label>
                <Input placeholder="请输入管理员用户名" autoComplete="username" autoFocus />
                {errors.username ? <FieldError>{errors.username}</FieldError> : null}
              </TextField>

              <TextField
                name="password"
                type="password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  setFormError(null);
                  setErrors((current) => ({ ...current, password: '' }));
                }}
                isInvalid={Boolean(errors.password)}
                isDisabled={submitting}
              >
                <Label>密码</Label>
                <Input placeholder="请输入密码" autoComplete="current-password" />
                {errors.password ? <FieldError>{errors.password}</FieldError> : null}
              </TextField>

              <Button type="submit" fullWidth isPending={submitting}>
                {({ isPending }) => (
                  <>
                    {isPending ? <Spinner color="current" size="sm" /> : null}
                    {isPending ? '正在登录…' : '进入管理后台'}
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 border-t border-separator pt-4 text-center text-[11px] leading-5 text-muted">
              仅限管理员账号登录。非管理员账号将无法进入管理后台。
            </p>
          </Card>

          <p className="mt-6 text-center text-[11px] tracking-wide text-muted lg:hidden">
            拾光同学录 · 管理后台
          </p>
        </section>
      </div>
    </div>
  );
}
