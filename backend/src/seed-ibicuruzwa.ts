import 'dotenv/config'
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const db = new PrismaClient({ adapter: new PrismaPg(pool) })

// ─── Categories to ensure exist ─────────────────────────────────────────────
const CATEGORIES = [
  'Beers & Malts',
  'Energy Drinks',
  'Juices & Sodas',
  'Spirits & Liquors',
  'Water',
  'Tobacco',
  'Snacks & Food',
]

// ─── Products from IBICURUZWA list ────────────────────────────────────────────
const PRODUCTS = [
  // === BEERS ===
  { name: 'MITZIG',             buyingPrice: 1450, sellingPrice: 2000, unit: 'Bottle', category: 'Beers & Malts',     description: 'Mitzig beer 65cl', supplier: 'Bralirwa' },
  { name: 'PETIT MITZIG',       buyingPrice: 880,  sellingPrice: 1100, unit: 'Bottle', category: 'Beers & Malts',     description: 'Petit Mitzig beer 33cl', supplier: 'Bralirwa' },
  { name: 'PRIMUS',             buyingPrice: 1375, sellingPrice: 1800, unit: 'Bottle', category: 'Beers & Malts',     description: 'Primus beer 65cl', supplier: 'Bralirwa' },
  { name: 'KNOWLESS',           buyingPrice: 930,  sellingPrice: 1300, unit: 'Bottle', category: 'Beers & Malts',     description: 'Knowless beer', supplier: 'Bralirwa' },
  { name: 'AMSTEL',             buyingPrice: 917,  sellingPrice: 1200, unit: 'Bottle', category: 'Beers & Malts',     description: 'Amstel beer', supplier: 'Bralirwa' },
  { name: 'HEINICKEN',          buyingPrice: 1150, sellingPrice: 1500, unit: 'Bottle', category: 'Beers & Malts',     description: 'Heineken beer', supplier: 'Bralirwa' },
  { name: 'TURBO',              buyingPrice: 1130, sellingPrice: 1500, unit: 'Bottle', category: 'Beers & Malts',     description: 'Turbo King beer', supplier: 'Bralirwa' },
  { name: 'GATANU 65CL',        buyingPrice: 1384, sellingPrice: 1600, unit: 'Bottle', category: 'Beers & Malts',     description: 'Gatanu sorghum beer 65cl', supplier: 'Bralirwa' },
  { name: 'GATANU 50CL',        buyingPrice: 1040, sellingPrice: 1300, unit: 'Bottle', category: 'Beers & Malts',     description: 'Gatanu sorghum beer 50cl', supplier: 'Bralirwa' },
  { name: 'VILUNGA 65CL',       buyingPrice: 1400, sellingPrice: 1800, unit: 'Bottle', category: 'Beers & Malts',     description: 'Vilunga beer 65cl', supplier: 'Bralirwa' },
  { name: 'VILUNGA 50CL',       buyingPrice: 1180, sellingPrice: 1400, unit: 'Bottle', category: 'Beers & Malts',     description: 'Vilunga beer 50cl', supplier: 'Bralirwa' },
  // === ENERGY ===
  { name: 'ENERGY',             buyingPrice: 509,  sellingPrice: 700,  unit: 'Bottle', category: 'Energy Drinks',     description: 'Energy drink', supplier: 'Bralirwa' },
  { name: 'TWIST',              buyingPrice: 460,  sellingPrice: 600,  unit: 'Bottle', category: 'Energy Drinks',     description: 'Twist energy drink', supplier: 'Bralirwa' },
  // === JUICES & SODAS ===
  { name: 'FANTA IBIPIPIRI',    buyingPrice: 920,  sellingPrice: 1200, unit: 'Bottle', category: 'Juices & Sodas',    description: 'Fanta Ibipipiri 65cl', supplier: 'Coca-Cola Rwanda' },
  { name: 'FANTA IVIDE',        buyingPrice: 690,  sellingPrice: 1100, unit: 'Bottle', category: 'Juices & Sodas',    description: 'Fanta Ivide 65cl', supplier: 'Coca-Cola Rwanda' },
  { name: 'MIRINDA Juice',      buyingPrice: 750,  sellingPrice: 1000, unit: 'Bottle', category: 'Juices & Sodas',    description: 'Mirinda juice', supplier: 'Coca-Cola Rwanda' },
  { name: 'NOVIDA Juice',       buyingPrice: 795,  sellingPrice: 1000, unit: 'Bottle', category: 'Juices & Sodas',    description: 'Novida juice', supplier: 'Coca-Cola Rwanda' },
  { name: 'INYANGE Juice',      buyingPrice: 875,  sellingPrice: 1200, unit: 'Bottle', category: 'Juices & Sodas',    description: 'Inyange juice', supplier: 'Inyange Industries' },
  { name: 'Pop Juice',          buyingPrice: 400,  sellingPrice: 500,  unit: 'Bottle', category: 'Juices & Sodas',    description: 'Pop juice', supplier: 'General' },
  { name: 'Peaneple Juice',     buyingPrice: 400,  sellingPrice: 500,  unit: 'Bottle', category: 'Juices & Sodas',    description: 'Pineapple juice', supplier: 'General' },
  { name: 'TONIC Juice',        buyingPrice: 750,  sellingPrice: 1000, unit: 'Bottle', category: 'Juices & Sodas',    description: 'Tonic juice', supplier: 'General' },
  { name: 'PANACHI NINI',       buyingPrice: 1038, sellingPrice: 1300, unit: 'Bottle', category: 'Juices & Sodas',    description: 'Panachi large 65cl', supplier: 'General' },
  { name: 'PANACHI NTO',        buyingPrice: 596,  sellingPrice: 700,  unit: 'Bottle', category: 'Juices & Sodas',    description: 'Panachi small 33cl', supplier: 'General' },
  { name: 'FANTA IBIPIPIRI NINI', buyingPrice: 2420, sellingPrice: 3000, unit: 'Bottle', category: 'Juices & Sodas', description: 'Fanta Ibipipiri large 2L', supplier: 'Coca-Cola Rwanda' },
  // === SPIRITS ===
  { name: 'SMINOFF',            buyingPrice: 1625, sellingPrice: 2500, unit: 'Bottle', category: 'Spirits & Liquors', description: 'Smirnoff vodka', supplier: 'Premium Spirits' },
  { name: 'Jackson Blacker Liquor', buyingPrice: 2666, sellingPrice: 3500, unit: 'Bottle', category: 'Spirits & Liquors', description: 'Jackson Blacker liquor', supplier: 'Premium Spirits' },
  { name: 'CAPTAIN LIQUOR',     buyingPrice: 4722, sellingPrice: 6000, unit: 'Bottle', category: 'Spirits & Liquors', description: 'Captain Morgan liquor', supplier: 'Premium Spirits' },
  // === WATER ===
  { name: 'AMAZI MANINI',       buyingPrice: 917,  sellingPrice: 1200, unit: 'Bottle', category: 'Water',             description: 'Large water bottle 1.5L', supplier: 'Inyange Industries' },
  { name: 'AMAZI MATO',         buyingPrice: 335,  sellingPrice: 500,  unit: 'Bottle', category: 'Water',             description: 'Small water bottle 60cl', supplier: 'Inyange Industries' },
  // === TOBACCO ===
  { name: 'ITABI (Cigarettes)', buyingPrice: 83,   sellingPrice: 100,  unit: 'Piece',  category: 'Tobacco',           description: 'Cigarettes per stick', supplier: 'BAT Rwanda' },
  // === SNACKS & FOOD ===
  { name: 'UBUNYOBWA',          buyingPrice: 67,   sellingPrice: 100,  unit: 'Piece',  category: 'Snacks & Food',     description: 'Snack / Aliment', supplier: 'General' },
]

async function main() {
  console.log('=== Adding IBICURUZWA products to database ===\n')

  // 1. Ensure all categories exist
  console.log('Step 1: Creating/finding categories...')
  const catMap: Record<string, string> = {}
  for (const catName of CATEGORIES) {
    const cat = await db.category.upsert({
      where: { name: catName },
      create: { name: catName },
      update: {},
    })
    catMap[catName] = cat.id
    console.log(`  ✓ Category: ${catName} [${cat.id}]`)
  }

  // 2. Add/update all products
  console.log('\nStep 2: Creating products...')
  let created = 0
  let skipped = 0
  for (const p of PRODUCTS) {
    const categoryId = catMap[p.category]
    if (!categoryId) { console.warn(`  ⚠ No category for: ${p.name}`); continue }

    const existing = await db.product.findFirst({ where: { name: p.name } })
    if (existing) {
      // Update prices if changed
      await db.product.update({
        where: { id: existing.id },
        data: { buyingPrice: p.buyingPrice, sellingPrice: p.sellingPrice, unit: p.unit, categoryId, supplier: p.supplier, description: p.description }
      })
      console.log(`  ↻ Updated: ${p.name} | Buy: ${p.buyingPrice} | Sell: ${p.sellingPrice} RWF`)
      skipped++
    } else {
      await db.product.create({
        data: {
          name: p.name,
          description: p.description,
          buyingPrice: p.buyingPrice,
          sellingPrice: p.sellingPrice,
          currentQuantity: 0,
          minimumStockLevel: 10,
          unit: p.unit,
          supplier: p.supplier,
          categoryId,
          status: 'Active',
        }
      })
      console.log(`  ✅ Created: ${p.name} | Buy: ${p.buyingPrice} | Sell: ${p.sellingPrice} RWF`)
      created++
    }
  }

  console.log(`\n=== Done! Created: ${created} | Updated: ${skipped} | Total: ${PRODUCTS.length} ===`)
  
  // 3. Summary
  const total = await db.product.count()
  console.log(`\nTotal products now in database: ${total}`)
  await db.$disconnect()
  pool.end()
}

main().catch(err => {
  console.error('ERROR:', err)
  process.exit(1)
})
