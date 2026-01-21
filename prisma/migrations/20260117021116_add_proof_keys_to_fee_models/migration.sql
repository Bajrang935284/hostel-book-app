-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN     "proofImageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "fee_records" ADD COLUMN     "proofImageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
