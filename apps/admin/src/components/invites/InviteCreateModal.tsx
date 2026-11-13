import { useEffect, useState, type FormEvent } from 'react';
import type { InviteCodeDto } from '@classbook/shared';
import { inviteCreateSchema } from '@classbook/shared';
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  NumberField,
  Spinner,
  TextField,
  toast,
} from '@heroui/react';
import { admin, getErrorMessage } from '../../lib/api';
import { toDateTimeInputValue } from '../../lib/format';
import { fieldErrors } from '../../lib/validation';

interface InviteCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (invite: InviteCodeDto) => void;
}

export function InviteCreateModal({ open, onClose, onCreated }: InviteCreateModalProps) {
  const [note, setNote] = useState('');
  const [maxUses, setMaxUses] = useState<number | undefined>(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setMaxUses(1);
    setExpiresAt('');
    setErrors({});
  }, [open]);

  const close = () => {
    if (!creating) onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      setErrors({ expiresAt: '过期时间需晚于当前时间' });
      return;
    }

    const parsed = inviteCreateSchema.safeParse({
      note: note.trim() || null,
      maxUses: maxUses ?? 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setCreating(true);
    try {
      const invite = await admin.createInvite({
        note: parsed.data.note ?? null,
        maxUses: parsed.data.maxUses,
        expiresAt: parsed.data.expiresAt ? parsed.data.expiresAt.toISOString() : null,
      });
      toast.success(`邀请码 ${invite.code} 已生成`);
      onCreated(invite);
      onClose();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-lg">
          {creating ? null : <Modal.CloseTrigger />}
          <Modal.Header>
            <Modal.Heading>生成邀请码</Modal.Heading>
            <p className="mt-1 text-sm text-muted">邀请码由服务端随机生成，可限制使用次数与有效期。</p>
          </Modal.Header>
          <Modal.Body>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <TextField
                name="note"
                value={note}
                onChange={(value) => {
                  setNote(value);
                  setErrors((current) => ({ ...current, note: '' }));
                }}
                isInvalid={Boolean(errors.note)}
                isDisabled={creating}
              >
                <Label>备注</Label>
                <Input placeholder="例如：2026 届同学群、发给小林" maxLength={100} />
                {errors.note ? <FieldError>{errors.note}</FieldError> : null}
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  name="maxUses"
                  value={maxUses}
                  onChange={setMaxUses}
                  minValue={1}
                  maxValue={200}
                  isDisabled={creating}
                >
                  <Label>可使用次数</Label>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                  {errors.maxUses ? <FieldError>{errors.maxUses}</FieldError> : null}
                </NumberField>

                <TextField
                  name="expiresAt"
                  value={expiresAt}
                  onChange={(value) => {
                    setExpiresAt(value);
                    setErrors((current) => ({ ...current, expiresAt: '' }));
                  }}
                  isInvalid={Boolean(errors.expiresAt)}
                  isDisabled={creating}
                >
                  <Label>过期时间</Label>
                  <Input type="datetime-local" min={toDateTimeInputValue(new Date())} />
                  {errors.expiresAt ? <FieldError>{errors.expiresAt}</FieldError> : null}
                </TextField>
              </div>

              <p className="rounded-xl bg-default/60 px-3 py-2.5 text-xs leading-5 text-muted">
                留空过期时间表示永久有效。使用次数用完后邀请码会自动失效，也可以随时手动停用。
              </p>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="tertiary" isDisabled={creating} onPress={close}>
                  取消
                </Button>
                <Button type="submit" isPending={creating}>
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? '正在生成…' : '生成邀请码'}
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
