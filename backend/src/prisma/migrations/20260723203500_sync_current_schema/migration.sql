-- Product boutique fields
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "size" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;

-- Customer support
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_phone_key" ON "Customer"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_key" ON "Customer"("email");

-- Sale fields added after the initial migration
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "discountType" TEXT NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "salesChannel" TEXT NOT NULL DEFAULT 'In-Store';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Sale_customerId_fkey'
    ) THEN
        ALTER TABLE "Sale"
        ADD CONSTRAINT "Sale_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
