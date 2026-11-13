import { useEffect, useState, type FormEvent } from 'react';
import type { TimelineEventDto } from '@classbook/shared';
import { timelineCreateSchema } from '@classbook/shared';
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  NumberField,
  Spinner,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { getErrorMessage, type TimelineCreateInput } from '../../lib/api';
import { formatDateInput, toDateInputValue } from '../../lib/format';
import { fieldErrors } from '../../lib/validation';
import { ImageUploader } from '../ui/ImageUploader';

interface TimelineFormModalProps {
  open: boolean;
  initial: TimelineEventDto | null;
  onClose: () => void;
  onSubmit: (input: TimelineCreateInput) => Promise<void>;
}

export function TimelineFormModal({ open, initial, onClose, onSubmit }: TimelineFormModalProps) {
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(initial ? formatDateInput(initial.date) : toDateInputValue(new Date()));
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setImageUrl(initial?.imageUrl ?? null);
    setSortOrder(initial?.sortOrder);
    setErrors({});
  }, [open, initial]);

  const close = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!date) nextErrors.date = '请选择日期';
    if (!title.trim()) nextErrors.title = '请填写事件标题';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const parsed = timelineCreateSchema.safeParse({
      date: new Date(`${date}T12:00:00`),
      title: title.trim(),
      description: description.trim() || null,
      imageUrl: imageUrl || null,
      sortOrder,
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await onSubmit({
        date: parsed.data.date.toISOString(),
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        sortOrder: parsed.data.sortOrder,
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
        <Modal.Dialog className="sm:max-w-2xl">
          {saving ? null : <Modal.CloseTrigger />}
          <Modal.Header>
            <Modal.Heading>{initial ? '编辑时间线事件' : '新增时间线事件'}</Modal.Heading>
            <p className="mt-1 text-sm text-muted">
              记录班级共同经历的重要时刻，展示站会按日期与排序值呈现。
            </p>
          </Modal.Header>
          <Modal.Body>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
                <TextField
                  name="date"
                  value={date}
                  onChange={(value) => {
                    setDate(value);
                    setErrors((current) => ({ ...current, date: '' }));
                  }}
                  isInvalid={Boolean(errors.date)}
                  isDisabled={saving}
                  isRequired
                >
                  <Label>日期</Label>
                  <Input type="date" />
                  {errors.date ? <FieldError>{errors.date}</FieldError> : null}
                </TextField>

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
                  <Label>标题</Label>
                  <Input placeholder="例如：第一次班会、毕业旅行" maxLength={60} autoFocus />
                  {errors.title ? <FieldError>{errors.title}</FieldError> : null}
                </TextField>
              </div>

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
                <TextArea placeholder="写下那天的故事（可选）" rows={4} maxLength={1000} />
                {errors.description ? <FieldError>{errors.description}</FieldError> : null}
              </TextField>

              <NumberField
                name="sortOrder"
                value={sortOrder}
                onChange={setSortOrder}
                isDisabled={saving}
              >
                <Label>排序值（可选）</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input />
                  <NumberField.IncrementButton />
                </NumberField.Group>
                {errors.sortOrder ? <FieldError>{errors.sortOrder}</FieldError> : null}
              </NumberField>

              <ImageUploader
                value={imageUrl}
                onChange={setImageUrl}
                label="配图"
                hint="可选，支持 JPG / PNG / WebP，单张不超过 5MB"
                disabled={saving}
                aspect="compact"
              />
              {errors.imageUrl ? (
                <p className="text-xs text-danger">{errors.imageUrl}</p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="tertiary" isDisabled={saving} onPress={close}>
                  取消
                </Button>
                <Button type="submit" isPending={saving}>
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? '正在保存…' : initial ? '保存修改' : '添加到时间线'}
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
