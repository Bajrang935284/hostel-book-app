import { prisma } from "../config/database.js";

// 1. Mark Attendance
export const markAttendance = async (req, res) => {
  try {
    const { studentId, status, date } = req.body;
    const ownerId = req.user.id;

    // 1. Validate Input
    if (!studentId || !status || !date) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 2. Normalize Date (Midnight)
    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0);

    // 3. ROBUST FIX: Fetch the student to get the correct hostelId
    // (This fixes the 'hostelId: null' error if the header is missing)
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { hostelId: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const finalHostelId = student.hostelId; // Use the student's actual hostel

    // 4. Upsert (Create or Update)
    const record = await prisma.nightAttendance.upsert({
      where: {
        studentId_date: {
          studentId: studentId,
          date: recordDate,
        },
      },
      update: {
        status: status,
      },
      create: {
        studentId: studentId,
        date: recordDate,
        status: status,
        ownerId: ownerId,
        hostelId: finalHostelId, // Now this is guaranteed to be valid
      },
    });

    res.status(200).json({ success: true, data: record, message: `Marked as ${status}` });

  } catch (error) {
    console.error("Mark Attendance Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ... keep getStudentAttendance as it was ...
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    let dateFilter = {};

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      dateFilter = {
        gte: startDate,
        lte: endDate,
      };
    }

    const records = await prisma.nightAttendance.findMany({
      where: {
        studentId: studentId,
        ...(month && year ? { date: dateFilter } : {}),
      },
      orderBy: { date: "desc" },
    });

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error("Get Attendance Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};