import { useEffect, useState, type FormEvent } from 'react';
import { albumCreateSchema } from '@classbook/shared';
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  Spinner,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { getErrorMessage, type AlbumCreateInput } from '../../lib/api';
import { fieldErrors } from '../../lib/validation';

interface AlbumFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: { title: string; description: string | null };
  onClose: () => void;
  onSubmit: (input: AlbumCreateInput) => Promise<void>;
}

export function AlbumFormModal({ open, mode, initial, onClose, onSubmit }: AlbumFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setErrors({});
  }, [open, initial?.title, initial?.description]);

  const close = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      setErrors({ title: '请填写相册标题' });
      return;
    }

    const parsed = albumCreateSchema.safeParse({
      title: title.trim(),
      description: description.trim() || null,
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await onSubmit({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
      });
      onClose();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setSaving(false);
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
          {saving ? null : <Modal.CloseTrigger />}
          <Modal.Header>
            <Modal.Heading>{mode === 'create' ? '新建相册' : '编辑相册'}</Modal.Heading>
            <p className="mt-1 text-sm text-muted">
              {mode === 'create'
                ? '创建一本新相册，之后可以上传多张照片。'
                : '修改相册标题与描述，照片不会受到影响。'}
            </p>
          </Modal.Header>
          <Modal.Body>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <TextField
                name="title"
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  setErrors((current) => ({ ...current, title: '' }));
                }}
                isInvalid={Boolean(errors.title)}
                isDisabled={saving}
                isRequired
              >
                <Label>相册标题</Label>
                <Input placeholder="例如：毕业典礼、春游合影" maxLength={40} autoFocus />
                {errors.title ? <FieldError>{errors.title}</FieldError> : null}
              </TextField>

              <TextField
                name="description"
                value={description}
                onChange={(value) => {
                  setDescription(value);
                  setErrors((current) => ({ ...current, description: '' }));
                }}
                isInvalid={Boolean(errors.description)}
                isDisabled={saving}
              >
                <Label>描述</Label>
                <TextArea placeholder="写一句关于这本相册的话（可选）" rows={3} maxLength={300} />
                {errors.description ? <FieldError>{errors.description}</FieldError> : null}
              </TextField>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="tertiary" isDisabled={saving} onPress={close}>
                  取消
                </Button>
                <Button type="submit" isPending={saving}>
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? '正在保存…' : mode === 'create' ? '创建相册' : '保存修改'}
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
