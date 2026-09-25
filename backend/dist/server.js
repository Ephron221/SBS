import 'dotenv/config';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerProductRoutes } from './modules/products/routes.js';
import { registerSalesRoutes } from './modules/sales/routes.js';
import { registerFinanceRoutes } from './modules/finance/routes.js';
import { registerReportRoutes } from './modules/reports/routes.js';
import { registerNotificationRoutes } from './modules/notifications/routes.js';
import { registerAuditLogRoutes } from './modules/logs/routes.js';
import { registerCustomerRoutes } from './modules/customers/routes.js';
import { registerBusinessRoutes } from './modules/business/routes.js';
const app = express();
// Allow frontend domains (localhost + Vercel)
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
];
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith('.vercel.app')) {
            cb(null, true);
        }
        else {
            cb(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
}));
app.use(express.json());
// Request logger
app.use((req, _res, next) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${req.method} ${req.url}`);
    next();
});
app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        message: 'SBS backend is running.',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
    });
});
// Register all modules
registerAuthRoutes(app, null);
registerProductRoutes(app, null);
registerSalesRoutes(app, null);
registerFinanceRoutes(app, null);
registerReportRoutes(app, null);
registerNotificationRoutes(app, null);
registerAuditLogRoutes(app, null);
registerCustomerRoutes(app, null);
registerBusinessRoutes(app, null);
// Catch-all 404 for API
app.use(/^\/api(?:\/.*)?$/, (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('[Unhandled Server Error]', err);
    res.status(500).json({ success: false, message: 'Internal server error occurred.' });
});
// Export app for Vercel serverless — only listen when running locally
export default app;
if (process.env.VERCEL !== '1') {
    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
        console.log(`SBS backend listening on port ${port}`);
    });
}
