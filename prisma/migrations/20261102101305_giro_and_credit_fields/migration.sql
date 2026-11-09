-- CreateEnum
CREATE TYPE "GiroType" AS ENUM ('GIRO', 'CEK');

-- CreateEnum
CREATE TYPE "GiroStatus" AS ENUM ('RECEIVED', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'REPLACED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "cashOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salesman" TEXT,
ADD COLUMN     "termDays" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Giro" (
    "id" TEXT NOT NULL,
    "type" "GiroType" NOT NULL DEFAULT 'GIRO',
    "giroNumber" TEXT NOT NULL,
    "issuingBank" TEXT NOT NULL,
    "accountHolder" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "receivedBy" TEXT,
    "depositBankId" TEXT,
    "photoUrl" TEXT,
    "invoiceNote" TEXT,
    "status" "GiroStatus" NOT NULL DEFAULT 'RECEIVED',
    "bounceReason" TEXT,
    "replacedById" TEXT,
    "receiveJournalEntryId" TEXT,
    "clearJournalEntryId" TEXT,
    "bounceJournalEntryId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Giro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Giro_customerId_idx" ON "Giro"("customerId");

-- CreateIndex
CREATE INDEX "Giro_status_idx" ON "Giro"("status");

-- CreateIndex
CREATE INDEX "Giro_effectiveDate_idx" ON "Giro"("effectiveDate");

-- AddForeignKey
ALTER TABLE "Giro" ADD CONSTRAINT "Giro_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
