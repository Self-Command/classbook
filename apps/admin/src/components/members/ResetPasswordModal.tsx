import { useEffect, useState, type FormEvent } from 'react';
import type { AdminMemberDto } from '@classbook/shared';
import { resetPasswordSchema } from '@classbook/shared';
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  Spinner,
  TextField,
  toast,
} from '@heroui/react';
import { admin, getErrorMessage } from '../../lib/api';
import { fieldErrors } from '../../lib/validation';

interface ResetPasswordModalProps {
  member: AdminMemberDto | null;
  onClose: () => void;
}

function memberName(member: AdminMemberDto): string {
  return member.profile?.realName || member.username;
}

export function ResetPasswordModal({ member, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  }, [member]);

  const close = () => {
    if (!busy) onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member) return;

    const parsed = resetPasswordSchema.safeParse({ newPassword });
    const nextErrors = parsed.success ? {} : fieldErrors(parsed.error);
    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = '两次输入的密码不一致';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      await admin.resetMemberPassword(member.id, newPassword);
      toast.success(`已重置 ${memberName(member)} 的密码`);
      onClose();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal.Backdrop
      isOpen={member !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          {busy ? null : <Modal.CloseTrigger />}
          <Modal.Header>
            <Modal.Heading>重置成员密码</Modal.Heading>
            <p className="mt-1 text-sm text-muted">
              {member ? `为 ${memberName(member)} 设置一个新密码，旧会话会立即失效。` : null}
            </p>
          </Modal.Header>
          <Modal.Body>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <TextField
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(value) => {
                  setNewPassword(value);
                  setErrors((current) => ({ ...current, newPassword: '' }));
                }}
                isInvalid={Boolean(errors.newPassword)}
                isDisabled={busy}
                isRequired
              >
                <Label>新密码</Label>
                <Input placeholder="至少 8 位" autoComplete="new-password" />
                {errors.newPassword ? <FieldError>{errors.newPassword}</FieldError> : null}
              </TextField>

              <TextField
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(value) => {
                  setConfirmPassword(value);
                  setErrors((current) => ({ ...current, confirmPassword: '' }));
                }}
                isInvalid={Boolean(errors.confirmPassword)}
                isDisabled={busy}
                isRequired
              >
                <Label>确认新密码</Label>
                <Input placeholder="再次输入新密码" autoComplete="new-password" />
                {errors.confirmPassword ? <FieldError>{errors.confirmPassword}</FieldError> : null}
              </TextField>

              <p className="rounded-xl bg-default/60 px-3 py-2.5 text-xs leading-5 text-muted">
                请通过安全渠道将新密码告知该成员。重置后对方需要重新登录。
              </p>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="tertiary" isDisabled={busy} onPress={close}>
                  取消
                </Button>
                <Button type="submit" isPending={busy}>
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? '正在重置…' : '确认重置'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
