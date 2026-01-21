// fix_drift.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🛠️ Fixing migration history...");
  try {
    // Delete all migration history so we can start fresh cleanly
    // (Ye aapka actual data delete nahi karega, bas history table clear karega)
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "_prisma_migrations";`);
    console.log("✅ History cleared. Now you can re-baseline.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();