/*
  Warnings:

  - You are about to drop the column `openingDueDate` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `openingDueDate` on the `Supplier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "openingDueDate";

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "openingDueDate";
