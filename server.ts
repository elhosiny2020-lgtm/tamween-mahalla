import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';
import {
  getAllBakeriesFromDb,
  upsertBakeryInDb,
  deleteBakeryFromDb,
  getAllDebtsFromDb,
  upsertDebtInDb,
  deleteDebtFromDb,
  getOrCreateUserInDb,
  recordAuditLog,
} from './src/db/queries.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database: 'Cloud SQL PostgreSQL',
      timestamp: new Date().toISOString(),
    });
  });

  // User Sync & Authentication Check Endpoint
  app.post('/api/user/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const fullName = req.body.fullName || user.email?.split('@')[0] || 'مستخدم منظومة';
      const role = req.body.role || 'inspector';

      const dbUser = await getOrCreateUserInDb(user.uid, user.email || '', fullName, role);
      await recordAuditLog(user.email || user.uid, 'USER_LOGIN', `تم تسجيل دخول المستخدم ${user.email} للمنظومة بنجاح`);

      res.json({ success: true, user: dbUser });
    } catch (error: any) {
      console.error('User sync error:', error);
      res.status(500).json({ error: error.message || 'User sync failed' });
    }
  });

  // GET all bakeries from Cloud SQL
  app.get('/api/bakeries', async (req, res) => {
    try {
      const data = await getAllBakeriesFromDb();
      res.json({ success: true, bakeries: data });
    } catch (error: any) {
      console.error('Fetch bakeries error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch bakeries' });
    }
  });

  // POST upsert bakery into Cloud SQL
  app.post('/api/bakeries', requireAuth, async (req: AuthRequest, res) => {
    try {
      const bakeryData = req.body;
      await upsertBakeryInDb(bakeryData);
      await recordAuditLog(req.user?.email || 'unknown', 'UPSERT_BAKERY', `حفظ/تعديل مخبز: ${bakeryData.bakeryOwnerName} (ماكينة: ${bakeryData.machineNumber})`);
      res.json({ success: true, message: 'تم حفظ المخبز في قاعدة بيانات Cloud SQL بنجاح' });
    } catch (error: any) {
      console.error('Upsert bakery error:', error);
      res.status(500).json({ error: error.message || 'Failed to save bakery' });
    }
  });

  // DELETE bakery from Cloud SQL
  app.delete('/api/bakeries/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const bakeryId = req.params.id;
      await deleteBakeryFromDb(bakeryId);
      await recordAuditLog(req.user?.email || 'unknown', 'DELETE_BAKERY', `حذف مخبز كود: ${bakeryId}`);
      res.json({ success: true, message: 'تم حذف المخبز من Cloud SQL بنجاح' });
    } catch (error: any) {
      console.error('Delete bakery error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete bakery' });
    }
  });

  // GET all debts from Cloud SQL
  app.get('/api/debts', async (req, res) => {
    try {
      const data = await getAllDebtsFromDb();
      res.json({ success: true, debts: data });
    } catch (error: any) {
      console.error('Fetch debts error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch debts' });
    }
  });

  // POST upsert debt into Cloud SQL
  app.post('/api/debts', requireAuth, async (req: AuthRequest, res) => {
    try {
      const debtData = req.body;
      await upsertDebtInDb(debtData);
      await recordAuditLog(req.user?.email || 'unknown', 'UPSERT_DEBT', `حفظ قيد مديونية للمخبز: ${debtData.bakeryOwnerName} بقيمة: ${debtData.netRemainingDebt}`);
      res.json({ success: true, message: 'تم تسديد/تسجيل المديونية في Cloud SQL بنجاح' });
    } catch (error: any) {
      console.error('Upsert debt error:', error);
      res.status(500).json({ error: error.message || 'Failed to save debt' });
    }
  });

  // DELETE debt from Cloud SQL
  app.delete('/api/debts/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const debtId = req.params.id;
      await deleteDebtFromDb(debtId);
      await recordAuditLog(req.user?.email || 'unknown', 'DELETE_DEBT', `حذف قيد مديونية كود: ${debtId}`);
      res.json({ success: true, message: 'تم حذف المديونية من Cloud SQL بنجاح' });
    } catch (error: any) {
      console.error('Delete debt error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete debt' });
    }
  });

  // Full Database Sync Endpoint
  app.post('/api/sync/full', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { bakeries: bList, debts: dList } = req.body;
      if (Array.isArray(bList)) {
        for (const b of bList) {
          await upsertBakeryInDb(b);
        }
      }
      if (Array.isArray(dList)) {
        for (const d of dList) {
          await upsertDebtInDb(d);
        }
      }
      await recordAuditLog(req.user?.email || 'unknown', 'FULL_SYNC', `مزامنة كاملة لقاعدة البيانات (${bList?.length || 0} مخبز, ${dList?.length || 0} مديونية)`);
      res.json({ success: true, message: 'تمت مزامنة كافة سجلات المنظومة مع قاعدة البيانات السحابية Cloud SQL بنجاح!' });
    } catch (error: any) {
      console.error('Full sync error:', error);
      res.status(500).json({ error: error.message || 'Sync failed' });
    }
  });

  // Vite development middleware vs Static Production files
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.K_SERVICE;
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = await vite.transformIndexHtml(url, `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>منظومة وزارة التموين</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Cloud SQL Tamween Server running on http://localhost:${PORT}`);
  });
}

startServer();
