-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderLine" DROP CONSTRAINT "SalesOrderLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderLine" DROP CONSTRAINT "SalesOrderLine_salesOrderId_fkey";

-- DropTable
DROP TABLE "SalesOrder";

-- DropTable
DROP TABLE "SalesOrderLine";

-- DropEnum
DROP TYPE "SalesOrderStatus";

