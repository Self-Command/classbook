import { useEffect, useState } from 'react';
import { Button, Modal } from '@heroui/react';
import { getErrorMessage, plazaApi } from '@/lib/api';
import { IconTrash } from '@/components/icons';

interface PlazaDeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  preview?: string | null;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}

export function PlazaDeleteDialog({
  open,
  title,
  description,
  preview,
  onClose,
  onDeleted,
}: PlazaDeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBusy(false);
    setError('');
  }, [open]);

  return (
    <Modal.Backdrop
      isDismissable={!busy}
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !busy) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[420px]">
          <Modal.CloseTrigger aria-label="关闭删除确认" />
          <Modal.Header>
            <Modal.Icon className="bg-danger-soft text-danger">
              <IconTrash className="size-5" />
            </Modal.Icon>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <p className="text-sm leading-6 text-muted">{description}</p>
            {preview && (
              <p className="line-clamp-3 rounded-2xl bg-default px-3.5 py-2.5 text-sm leading-6 text-muted">
                {preview}
              </p>
            )}
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
            <Button
              isPending={busy}
              variant="danger"
              onPress={async () => {
                setBusy(true);
                setError('');
                try {
                  await onDeleted();
                  onClose();
                } catch (deleteError) {
                  setError(getErrorMessage(deleteError));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? '删除中…' : '确认删除'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}