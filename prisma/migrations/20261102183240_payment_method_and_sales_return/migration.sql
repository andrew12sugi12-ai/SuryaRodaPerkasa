-- Drop the standalone Giro register (table + GiroType enum)
ALTER TABLE "Giro" DROP CONSTRAINT "Giro_customerId_fkey";
DROP TABLE "Giro";
DROP TYPE "GiroType";

-- Replace GiroStatus (old 6-state register enum) with the lean payment enum
DROP TYPE "GiroStatus";
CREATE TYPE "GiroStatus" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED');

-- Payment method enum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'GIRO', 'CEK');

-- New journal source type for returns
ALTER TYPE "JournalSourceType" ADD VALUE 'SALE_RETURN';

-- Payment: method + giro/cek detail
ALTER TABLE "Payment" ADD COLUMN     "bounceReason" TEXT,
ADD COLUMN     "clearJournalEntryId" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "giroStatus" "GiroStatus",
ADD COLUMN     "instrumentBank" TEXT,
ADD COLUMN     "instrumentNumber" TEXT,
ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER';

CREATE INDEX "Payment_giroStatus_idx" ON "Payment"("giroStatus");

-- SalesReturn / Nota Kredit
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "saleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reason" TEXT,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "totalCOGS" DECIMAL(18,2) NOT NULL,
    "restock" BOOLEAN NOT NULL DEFAULT true,
    "settledToAR" BOOLEAN NOT NULL DEFAULT false,
    "revenueJournalEntryId" TEXT NOT NULL,
    "cogsJournalEntryId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReturnLine" (
    "id" TEXT NOT NULL,
    "salesReturnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "lineCOGS" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SalesReturnLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesReturn_revenueJournalEntryId_key" ON "SalesReturn"("revenueJournalEntryId");
CREATE UNIQUE INDEX "SalesReturn_cogsJournalEntryId_key" ON "SalesReturn"("cogsJournalEntryId");
CREATE INDEX "SalesReturn_saleId_idx" ON "SalesReturn"("saleId");
CREATE INDEX "SalesReturn_customerId_idx" ON "SalesReturn"("customerId");
CREATE INDEX "SalesReturn_date_idx" ON "SalesReturn"("date");
CREATE INDEX "SalesReturnLine_productId_idx" ON "SalesReturnLine"("productId");

ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_revenueJournalEntryId_fkey" FOREIGN KEY ("revenueJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_cogsJournalEntryId_fkey" FOREIGN KEY ("cogsJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
