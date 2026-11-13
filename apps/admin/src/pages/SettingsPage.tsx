import { useEffect, useState, type FormEvent } from 'react';
import { settingsUpdateSchema, type ThemeId } from '@classbook/shared';
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { admin, getErrorMessage } from '../lib/api';
import { useAsyncData } from '../lib/useAsyncData';
import { fieldErrors } from '../lib/validation';
import { ImageUploader } from '../components/ui/ImageUploader';
import { PageHeader } from '../components/ui/PageHeader';
import { ThemeDefaultPicker } from '../components/theme/ThemeDefaultPicker';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';

const FORM_ID = 'site-settings-form';

function clampNumber(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function SettingsPage() {
  const { data, loading, error, reload, setData } = useAsyncData(() => admin.settings(), []);
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [slogan, setSlogan] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [defaultTheme, setDefaultTheme] = useState<ThemeId>('warm');
  const [imageCompressEnabled, setImageCompressEnabled] = useState(true);
  const [imageThresholdKb, setImageThresholdKb] = useState('1024');
  const [imageMaxDimension, setImageMaxDimension] = useState('1920');
  const [imageQuality, setImageQuality] = useState('82');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setClassName(data.className);
    setSchoolName(data.schoolName ?? '');
    setGraduationYear(data.graduationYear ? String(data.graduationYear) : '');
    setSlogan(data.slogan ?? '');
    setHeroImageUrl(data.heroImageUrl);
    setDefaultTheme(data.defaultTheme ?? 'warm');
    setImageCompressEnabled(data.imageCompressEnabled ?? true);
    setImageThresholdKb(String(data.imageCompressThresholdKb ?? 1024));
    setImageMaxDimension(String(data.imageMaxDimension ?? 1920));
    setImageQuality(String(data.imageQuality ?? 82));
  }, [data]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const yearText = graduationYear.trim();
    if (!className.trim()) {
      setErrors({ className: '请填写班级名称' });
      return;
    }
    if (yearText && !/^\d{4}$/.test(yearText)) {
      setErrors({ graduationYear: '请输入 4 位毕业年份' });
      return;
    }

    const parsed = settingsUpdateSchema.safeParse({
      className: className.trim(),
      schoolName: schoolName.trim() || null,
      graduationYear: yearText ? Number(yearText) : null,
      slogan: slogan.trim() || null,
      heroImageUrl: heroImageUrl || null,
      defaultTheme,
      imageCompressEnabled,
      imageCompressThresholdKb: clampNumber(imageThresholdKb, 128, 20480, 1024),
      imageMaxDimension: clampNumber(imageMaxDimension, 320, 6000, 1920),
      imageQuality: clampNumber(imageQuality, 40, 100, 82),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSaving(true);
    try {
      const updated = await admin.updateSettings(parsed.data);
      setData(updated);
      toast.success('站点设置已保存');
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <>
        <PageHeader title="站点设置" description="更新展示站的班级信息与首页封面。" />
        <LoadingBlock label="正在读取站点设置…" />
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        <PageHeader title="站点设置" description="更新展示站的班级信息与首页封面。" />
        <ErrorBlock message={getErrorMessage(error)} onRetry={reload} />
      </>
    );
  }

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
      <PageHeader
        title="站点设置"
        description="这些信息会展示在同学录首页，修改后保存即可生效。"
        actions={
          <Button type="submit" isPending={saving}>
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : null}
                {isPending ? '正在保存…' : '保存设置'}
              </>
            )}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">基本信息</h2>
              <p className="mt-0.5 text-xs text-muted">展示站首页与页脚会使用这些内容。</p>
            </div>

            <div className="space-y-4">
              <TextField
                name="className"
                value={className}
                onChange={(value) => {
                  setClassName(value);
                  setErrors((current) => ({ ...current, className: '' }));
                }}
                isInvalid={Boolean(errors.className)}
                isDisabled={saving}
                isRequired
              >
                <Label>班级名称</Label>
                <Input placeholder="例如：高三（2）班" maxLength={30} />
                {errors.className ? <FieldError>{errors.className}</FieldError> : null}
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  name="schoolName"
                  value={schoolName}
                  onChange={(value) => {
                    setSchoolName(value);
                    setErrors((current) => ({ ...current, schoolName: '' }));
                  }}
                  isInvalid={Boolean(errors.schoolName)}
                  isDisabled={saving}
                >
                  <Label>学校名称</Label>
                  <Input placeholder="例如：拾光中学" maxLength={50} />
                  {errors.schoolName ? <FieldError>{errors.schoolName}</FieldError> : null}
                </TextField>

                <TextField
                  name="graduationYear"
                  value={graduationYear}
                  onChange={(value) => {
                    setGraduationYear(value);
                    setErrors((current) => ({ ...current, graduationYear: '' }));
                  }}
                  isInvalid={Boolean(errors.graduationYear)}
                  isDisabled={saving}
                >
                  <Label>毕业年份</Label>
                  <Input type="number" min={1900} max={2100} placeholder="例如：2026" />
                  {errors.graduationYear ? (
                    <FieldError>{errors.graduationYear}</FieldError>
                  ) : null}
                </TextField>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">班级口号</h2>
              <p className="mt-0.5 text-xs text-muted">一句能代表这个班级的话。</p>
            </div>
            <TextField
              name="slogan"
              value={slogan}
              onChange={(value) => {
                setSlogan(value);
                setErrors((current) => ({ ...current, slogan: '' }));
              }}
              isInvalid={Boolean(errors.slogan)}
              isDisabled={saving}
            >
              <Label>口号</Label>
              <TextArea
                placeholder="例如：愿你走出半生，归来仍是少年。"
                rows={3}
                maxLength={100}
              />
              {errors.slogan ? <FieldError>{errors.slogan}</FieldError> : null}
            </TextField>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">默认主题</h2>
              <p className="mt-0.5 text-xs text-muted">
                新同学首次打开时使用这套配色；大家仍可在右上角随时切换。
              </p>
            </div>
            <ThemeDefaultPicker
              value={defaultTheme}
              onChange={setDefaultTheme}
              disabled={saving}
            />
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">图片上传</h2>
              <p className="mt-0.5 text-xs text-muted">
                超过阈值的图片会先在浏览器里压缩再上传，节省流量与等待时间。
              </p>
            </div>

            <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-accent)]"
                checked={imageCompressEnabled}
                onChange={(event) => setImageCompressEnabled(event.target.checked)}
                disabled={saving}
              />
              启用上传前自动压缩
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                name="imageThresholdKb"
                value={imageThresholdKb}
                onChange={setImageThresholdKb}
                isDisabled={saving || !imageCompressEnabled}
              >
                <Label>触发阈值（KB）</Label>
                <Input type="number" min={128} max={20480} placeholder="1024" />
              </TextField>
              <TextField
                name="imageMaxDimension"
                value={imageMaxDimension}
                onChange={setImageMaxDimension}
                isDisabled={saving || !imageCompressEnabled}
              >
                <Label>最大边长（px）</Label>
                <Input type="number" min={320} max={6000} placeholder="1920" />
              </TextField>
              <TextField
                name="imageQuality"
                value={imageQuality}
                onChange={setImageQuality}
                isDisabled={saving || !imageCompressEnabled}
              >
                <Label>压缩质量（%）</Label>
                <Input type="number" min={40} max={100} placeholder="82" />
              </TextField>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">首页封面</h2>
              <p className="mt-0.5 text-xs text-muted">
                建议使用横向照片，展示站首页会以整幅背景呈现。
              </p>
            </div>
            <ImageUploader
              value={heroImageUrl}
              onChange={setHeroImageUrl}
              label="封面图"
              hint="支持 JPG / PNG / WebP，大图会自动压缩；移除后展示站使用纯色背景。"
              disabled={saving}
            />
            {errors.heroImageUrl ? (
              <p className="mt-1 text-xs text-danger">{errors.heroImageUrl}</p>
            ) : null}
          </Card>

          <div className="flex justify-end xl:hidden">
            <Button type="submit" fullWidth isPending={saving}>
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  {isPending ? '正在保存…' : '保存设置'}
                </>
              )}
            </Button>
          </div>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium tracking-wide text-muted">展示站预览</h2>
            <span className="text-[10px] text-muted">保存后生效</span>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="relative aspect-[4/3] overflow-hidden bg-accent">
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt="首页封面预览"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-foreground/80" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                <p className="text-[10px] tracking-[0.3em] text-white/60">
                  {graduationYear ? `CLASS OF ${graduationYear}` : 'OUR CLASS'}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">
                  {className.trim() || '我们的班级'}
                </p>
                <p className="mt-1.5 text-xs text-white/75">
                  {[schoolName.trim(), graduationYear ? `${graduationYear} 届` : '']
                    .filter(Boolean)
                    .join(' · ') || '学校名称 · 毕业年份'}
                </p>
                {slogan.trim() ? (
                  <p className="mt-3 line-clamp-2 border-l-2 border-white/50 pl-2.5 text-xs leading-5 text-white/80">
                    {slogan.trim()}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-[11px] leading-5 text-muted">
                这是首页 Hero 区域的大致效果。实际展示会根据屏幕尺寸自适应。
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}
