import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_COPY, SITE_COPY_FIELDS, siteCopySchema } from '@classbook/shared';

describe('全站文案定义', () => {
  it('每个文案键都有非空默认值且不超过最大长度', () => {
    for (const field of SITE_COPY_FIELDS) {
      const value = DEFAULT_SITE_COPY[field.key];
      expect(value.trim().length).toBeGreaterThan(0);
      expect(value.length).toBeLessThanOrEqual(field.max);
    }
  });

  it('校验接受部分合法文案', () => {
    const parsed = siteCopySchema.parse({ siteName: '三年二班', navPlaza: '广场' });
    expect(parsed).toEqual({ siteName: '三年二班', navPlaza: '广场' });
  });

  it('校验拒绝超过最大长度的文案', () => {
    const field = SITE_COPY_FIELDS.find((item) => item.key === 'siteName');
    expect(field).toBeDefined();
    const result = siteCopySchema.safeParse({
      siteName: '拾'.repeat((field?.max ?? 0) + 1),
    });
    expect(result.success).toBe(false);
  });
});
