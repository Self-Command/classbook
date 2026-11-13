-- Replace the initial six decorative presets with the native, high-contrast set.
ALTER TABLE "SiteSetting" ALTER COLUMN "defaultTheme" SET DEFAULT 'warm';

UPDATE "SiteSetting"
SET "defaultTheme" = 'warm'
WHERE "defaultTheme" NOT IN ('warm', 'noir', 'marine', 'forest');

UPDATE "User"
SET "theme" = NULL
WHERE "theme" IS NOT NULL
  AND "theme" NOT IN ('warm', 'noir', 'marine', 'forest');