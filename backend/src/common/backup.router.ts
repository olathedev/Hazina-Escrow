import { Router, Request, Response } from 'express';
import { BackupScheduler } from './backup.scheduler';

let backupScheduler: BackupScheduler | null = null;

export function setBackupScheduler(scheduler: BackupScheduler): void {
  backupScheduler = scheduler;
}

export const backupRouter = Router();

/**
 * @swagger
 * /api/backups:
 *   get:
 *     summary: List all available backups
 *     tags: [Backups]
 *     responses:
 *       200:
 *         description: List of backups
 */
backupRouter.get('/backups', (_req: Request, res: Response) => {
  if (!backupScheduler) {
    return res.status(503).json({ error: 'Backup service not initialized' });
  }

  try {
    const backups = backupScheduler.getBackupService().listBackups();
    res.json({ backups });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @swagger
 * /api/backups/stats:
 *   get:
 *     summary: Get backup statistics
 *     tags: [Backups]
 *     responses:
 *       200:
 *         description: Backup statistics
 */
backupRouter.get('/backups/stats', (_req: Request, res: Response) => {
  if (!backupScheduler) {
    return res.status(503).json({ error: 'Backup service not initialized' });
  }

  try {
    const stats = backupScheduler.getBackupService().getBackupStats();
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @swagger
 * /api/backups/create:
 *   post:
 *     summary: Create a manual backup
 *     tags: [Backups]
 *     responses:
 *       200:
 *         description: Backup created successfully
 */
backupRouter.post('/backups/create', async (_req: Request, res: Response) => {
  if (!backupScheduler) {
    return res.status(503).json({ error: 'Backup service not initialized' });
  }

  try {
    const metadata = await backupScheduler.getBackupService().createBackup();
    res.json({ 
      success: true, 
      message: 'Backup created successfully',
      metadata 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @swagger
 * /api/backups/restore:
 *   post:
 *     summary: Restore from a backup
 *     tags: [Backups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *     responses:
 *       200:
 *         description: Backup restored successfully
 */
backupRouter.post('/backups/restore', async (req: Request, res: Response) => {
  if (!backupScheduler) {
    return res.status(503).json({ error: 'Backup service not initialized' });
  }

  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  try {
    await backupScheduler.getBackupService().restoreBackup(filename);
    res.json({ 
      success: true, 
      message: `Backup restored successfully from ${filename}` 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
