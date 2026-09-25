-- CreateTable
CREATE TABLE IF NOT EXISTS "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Unit_name_key" ON "Unit"("name");

-- Seed defaults
INSERT INTO "Unit" ("id", "name")
VALUES
    (gen_random_uuid()::text, 'Piece'),
    (gen_random_uuid()::text, 'Pack')
ON CONFLICT ("name") DO NOTHING;
