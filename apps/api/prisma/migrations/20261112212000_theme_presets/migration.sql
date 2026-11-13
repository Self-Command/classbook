-- Add per-user theme preference and site-wide default theme.
ALTER TABLE "User" ADD COLUMN "theme" TEXT;
ALTER TABLE "SiteSetting" ADD COLUMN "defaultTheme" TEXT NOT NULL DEFAULT 'paper';
