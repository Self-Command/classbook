import { Router } from 'express';
import { prisma } from '../db';
import { toSiteSettingsDto } from '../lib/serialize';

export const settingsRouter = Router();

settingsRouter.get('/public', async (_req, res) => {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  res.status(200).json(toSiteSettingsDto(settings));
});
