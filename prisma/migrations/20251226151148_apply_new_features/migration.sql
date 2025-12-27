/*
  Warnings:

  - You are about to drop the column `duration` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `parentResponse` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `requestText` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `respondedAt` on the `permissions` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `permissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "duration",
DROP COLUMN "parentResponse",
DROP COLUMN "requestText",
DROP COLUMN "respondedAt",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "returnDate" TIMESTAMP(3),
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'APPROVED';

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "hostel_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "hostel_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
