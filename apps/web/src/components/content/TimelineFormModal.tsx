import { useEffect, useState } from 'react';
import { Button, Modal } from '@heroui/react';
import { FormField } from '@/components/ui/FormField';
import { IconClock } from '@/components/icons';

export interface TimelineFormValues {
  date: string;
  title: string;
  description: string | null;
}

interface TimelineFormModalProps {
  open: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: TimelineFormValues) => void;
}

export function TimelineFormModal({
  open,
  busy = false,
  error,
  onClose,
  onSubmit,
}: TimelineFormModalProps) {
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setDate('');
      setTitle('');
      setDescription('');
    }
  }, [open]);

  const canSubmit = date.trim().length > 0 && title.trim().length > 0 && !busy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      date: date.trim(),
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
          <Modal.CloseTrigger aria-label="关闭时间线表单" />
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent">
              <IconClock className="size-5" />
            </Modal.Icon>
            <Modal.Heading>添加时间线事件</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <FormField
              isDisabled={busy}
              isRequired
              label="日期"
              type="date"
              onChange={setDate}
              value={date}
            />
            <FormField
              isDisabled={busy}
              isRequired
              label="标题"
              maxLength={60}
              onChange={setTitle}
              placeholder="例如：春季运动会"
              value={title}
            />
            <FormField
              isDisabled={busy}
              label="描述（可选）"
              maxLength={1000}
              multiline
              onChange={setDescription}
              placeholder="记录这一天发生的故事…"
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
              添加
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
