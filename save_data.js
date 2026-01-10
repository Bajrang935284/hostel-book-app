// backend/save_data.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Starting manual migration to save data...");

  try {
    // 1. Rename 'amount' to 'paidAmount' (Preserves the money values)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "fee_records" RENAME COLUMN "amount" TO "paidAmount";
    `);
    console.log("✅ Renamed 'amount' to 'paidAmount'");

    // 2. Rename 'paidDate' to 'lastPaymentDate' (Preserves the dates)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "fee_records" RENAME COLUMN "paidDate" TO "lastPaymentDate";
    `);
    console.log("✅ Renamed 'paidDate' to 'lastPaymentDate'");

    // 3. Add the new 'totalAmount' and 'remainingAmount' columns
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "fee_records" ADD COLUMN "totalAmount" DOUBLE PRECISION DEFAULT 0;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "fee_records" ADD COLUMN "remainingAmount" DOUBLE PRECISION DEFAULT 0;
    `);
    console.log("✅ Added new columns");

    // 4. Fill the new columns with data
    // We assume the old 'amount' was the full fee, so we copy it to 'totalAmount'
    await prisma.$executeRawUnsafe(`
      UPDATE "fee_records" SET "totalAmount" = "paidAmount";
    `);
    console.log("✅ Data backfilled successfully");

  } catch (error) {
    console.error("❌ Error during migration:", error.message);
    console.log("Note: If the error says 'column does not exist', you might have already updated it.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });