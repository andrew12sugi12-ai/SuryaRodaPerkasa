-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;
