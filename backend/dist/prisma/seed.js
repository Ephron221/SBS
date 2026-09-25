import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
const pool = new pg.Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
async function main() {
    const passwordHash = await bcrypt.hash('Diano21@Esron21%', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@sbs.rw' },
        update: {},
        create: { name: 'Diano Esron', email: 'admin@sbs.rw', username: 'admin', passwordHash, role: UserRole.SUPER_ADMIN },
    });
    const manager = await prisma.user.upsert({
        where: { email: 'manager@sbs.rw' },
        update: {},
        create: { name: 'Mutesi Aline', email: 'manager@sbs.rw', username: 'manager', passwordHash, role: UserRole.MANAGER },
    });
    await prisma.user.upsert({
        where: { email: 'seller@sbs.rw' },
        update: {},
        create: { name: 'Karekezi Jean', email: 'seller@sbs.rw', username: 'seller', passwordHash, role: UserRole.SELLER },
    });
    const categories = ['Food', 'Cleaning Materials', 'Cosmetics', 'Drinks', 'Household Goods', 'Personal Care', 'Stationery'];
    const catMap = {};
    for (const name of categories) {
        const cat = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
        catMap[name] = cat.id;
    }
    const products = [
        { name: 'Isabune', category: 'Cleaning Materials', description: 'Local soap bar', buyingPrice: 450, sellingPrice: 600, currentQuantity: 18, minimumStockLevel: 10, unit: 'Piece', supplier: 'Kigali Suppliers' },
        { name: 'Amavuta yo kwisiga', category: 'Cosmetics', description: 'Skin lotion', buyingPrice: 2800, sellingPrice: 3600, currentQuantity: 7, minimumStockLevel: 8, unit: 'Bottle', supplier: 'Kigali Suppliers' },
        { name: 'Buto', category: 'Food', description: 'Cooking oil', buyingPrice: 3200, sellingPrice: 4200, currentQuantity: 0, minimumStockLevel: 4, unit: 'Bottle', supplier: 'Musanze Wholesale' },
        { name: 'Milk', category: 'Drinks', description: 'Fresh milk', buyingPrice: 1400, sellingPrice: 1700, currentQuantity: 25, minimumStockLevel: 8, unit: 'Litre', supplier: 'Kayonza Dairy' },
    ];
    for (const p of products) {
        await prisma.product.upsert({
            where: { id: p.name }, // won't match — will always create on fresh DB
            update: {},
            create: { name: p.name, categoryId: catMap[p.category], description: p.description, buyingPrice: p.buyingPrice, sellingPrice: p.sellingPrice, currentQuantity: p.currentQuantity, minimumStockLevel: p.minimumStockLevel, unit: p.unit, supplier: p.supplier },
        }).catch(() => prisma.product.create({ data: { name: p.name, categoryId: catMap[p.category], description: p.description, buyingPrice: p.buyingPrice, sellingPrice: p.sellingPrice, currentQuantity: p.currentQuantity, minimumStockLevel: p.minimumStockLevel, unit: p.unit, supplier: p.supplier } }));
    }
    await prisma.expense.create({ data: { category: 'Electricity', amount: 35000, note: 'Demo utility charge', createdById: manager.id } });
    await prisma.businessProfile.upsert({ where: { id: 'singleton' }, update: {}, create: {} });
    await prisma.auditLog.create({ data: { userId: admin.id, action: 'System Initialized', target: 'system', details: 'Seed data loaded' } });
    await prisma.notification.create({ data: { title: 'System ready', message: 'SBS demo data loaded successfully.', type: 'system', role: UserRole.SUPER_ADMIN } });
    console.log('Seed complete.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
