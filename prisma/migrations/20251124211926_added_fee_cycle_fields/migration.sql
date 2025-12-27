/*
  Warnings:

  - A unique constraint covering the columns `[studentId,billingMonth,billingYear]` on the table `fee_records` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billingMonth` to the `fee_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billingYear` to the `fee_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fee_records" ADD COLUMN     "billingMonth" INTEGER NOT NULL,
ADD COLUMN     "billingYear" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "parents" ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "fee_records_studentId_billingMonth_billingYear_key" ON "fee_records"("studentId", "billingMonth", "billingYear");
