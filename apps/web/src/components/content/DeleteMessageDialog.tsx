import { useEffect, useState } from 'react';
import type { MessageDto } from '@classbook/shared';
import { Button, Modal } from '@heroui/react';
import { getErrorMessage, messagesApi } from '@/lib/api';
import { IconTrash } from '@/components/icons';

interface DeleteMessageDialogProps {
  message: MessageDto | null;
  onClose: () => void;
  onDeleted: (message: MessageDto) => void;
}

export function DeleteMessageDialog({
  message,
  onClose,
  onDeleted,
}: DeleteMessageDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBusy(false);
    setError('');
  }, [message?.id]);

  const handleConfirm = async () => {
    if (!message) return;
    setBusy(true);
    setError('');
    try {
      await messagesApi.remove(message.id);
      onDeleted(message);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal.Backdrop
      isDismissable={!busy}
      isOpen={Boolean(message)}
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
            <Modal.Heading>删除这条留言？</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <p className="text-sm leading-6 text-muted">
              删除后无法恢复，确定要把这条留言从留言板上取下来吗？
            </p>
            {message && (
              <p className="line-clamp-3 rounded-2xl bg-default px-3.5 py-2.5 text-sm leading-6 text-muted">
                {message.content}
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
            <Button isPending={busy} variant="danger" onPress={handleConfirm}>
              {busy ? '删除中…' : '确认删除'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
