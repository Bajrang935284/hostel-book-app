// seedAdmin.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const adminsToCreate = [
  {
    username: "Bajrang@8764",
    password: "Bana@887529", 
  },
  {
    username: "Ramsita@18",
    password: "Bana@478875", 
  },
];

async function main() {
  console.log("🚀 Starting Admin Seeding...");

  for (const admin of adminsToCreate) {
    // 1. Check if username already exists
    const existing = await prisma.admin.findUnique({
      where: { username: admin.username },
    });

    if (existing) {
      console.log(`⚠️  Admin "${admin.username}" already exists. Skipping.`);
      continue; // Skip to next admin
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin.password, salt);

    // 3. Create the admin
    await prisma.admin.create({
      data: {
        username: admin.username,
        password: hashedPassword,
      },
    });

    console.log(`✅ Created admin: ${admin.username}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });