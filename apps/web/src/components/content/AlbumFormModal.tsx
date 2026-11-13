import { useEffect, useState } from 'react';
import { Button, Modal } from '@heroui/react';
import { FormField } from '@/components/ui/FormField';
import { IconAlbum } from '@/components/icons';

export interface AlbumFormValues {
  title: string;
  description: string | null;
}

interface AlbumFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Partial<AlbumFormValues>;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: AlbumFormValues) => void;
}

export function AlbumFormModal({
  open,
  mode,
  initial,
  busy = false,
  error,
  onClose,
  onSubmit,
}: AlbumFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
    }
  }, [open, initial?.title, initial?.description]);

  const canSubmit = title.trim().length > 0 && !busy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
    });
  };

  return (
    <Modal.Backdrop
      isDismissable={!busy}
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !busy) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[460px]">
          <Modal.CloseTrigger aria-label="关闭相册表单" />
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent">
              <IconAlbum className="size-5" />
            </Modal.Icon>
            <Modal.Heading>
              {mode === 'create' ? '创建新相册' : '编辑相册信息'}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <FormField
              isDisabled={busy}
              isRequired
              label="相册名称"
              maxLength={40}
              onChange={setTitle}
              placeholder="例如：春季运动会"
              value={title}
            />
            <FormField
              isDisabled={busy}
              label="相册描述（可选）"
              maxLength={300}
              multiline
              onChange={setDescription}
              placeholder="写一点这组照片背后的故事…"
              rows={3}
              value={description}
            />
            {error && (
              <p className="text-sm leading-6 text-danger" role="alert">
                {error}
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button isDisabled={busy} slot="close" variant="secondary">
              取消
            </Button>
            <Button isDisabled={!canSubmit} isPending={busy} onPress={handleSubmit}>
              {mode === 'create' ? '创建相册' : '保存修改'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
