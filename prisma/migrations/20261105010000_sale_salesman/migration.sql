-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "salesmanId" TEXT;

-- CreateIndex
CREATE INDEX "Sale_salesmanId_idx" ON "Sale"("salesmanId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "Salesman"("id") ON DELETE SET NULL ON UPDATE CASCADE;
