import path from 'node:path'
import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

config({ path: path.join(import.meta.dirname, '.env') })

export default defineConfig({
  schema: path.join(import.meta.dirname, 'src/prisma/schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
})
