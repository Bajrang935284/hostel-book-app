/*
  Warnings:

  - You are about to drop the column `address` on the `hostels` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `parents` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `students` table. All the data in the column will be lost.
  - Added the required column `city` to the `hostels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactNumber` to the `hostels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hostelType` to the `hostels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerName` to the `hostels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pinCode` to the `hostels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `hostels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `hostels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `parents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plainPassword` to the `parents` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `parents` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `monthlyFee` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentName` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentPhone` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."parents" DROP CONSTRAINT "parents_ownerId_fkey";

-- AlterTable
ALTER TABLE "hostels" DROP COLUMN "address",
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "contactNumber" TEXT NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "hostelType" TEXT NOT NULL,
ADD COLUMN     "ownerName" TEXT NOT NULL,
ADD COLUMN     "pinCode" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "street" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "parents" DROP COLUMN "ownerId",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "plainPassword" TEXT NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "phone",
ADD COLUMN     "bedNumber" TEXT,
ADD COLUMN     "feeDueDate" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "monthlyFee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "parentEmail" TEXT,
ADD COLUMN     "parentName" TEXT NOT NULL,
ADD COLUMN     "parentPhone" TEXT NOT NULL,
ADD COLUMN     "roomNumber" TEXT;
