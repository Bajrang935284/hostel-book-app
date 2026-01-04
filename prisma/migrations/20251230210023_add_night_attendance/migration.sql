-- CreateTable
CREATE TABLE "NightAttendance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NightAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NightAttendance_studentId_date_key" ON "NightAttendance"("studentId", "date");

-- AddForeignKey
ALTER TABLE "NightAttendance" ADD CONSTRAINT "NightAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
