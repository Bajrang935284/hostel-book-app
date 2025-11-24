// src/controllers/activityController.js

import { prisma } from "../config/database.js";

// ============= ACTIVITY / ALL TAB =============

export const getStudentActivities = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;
    const { type, page = 1, limit = 10 } = req.query;

    // Verify student belongs to owner
    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const where = { studentId };
    if (type) {
      where.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    });

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activities.",
    });
  }
};

// ============= PAYMENT TAB =============

export const addBorrowedMoney = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { amount, reason, dueDate } = req.body;
    const ownerId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required.",
      });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const borrowed = await prisma.borrowedMoney.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        reason,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "PENDING",
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        studentId,
        type: "PAYMENT",
        title: "Money Borrowed",
        description: `Borrowed ₹${amount}${reason ? ` - ${reason}` : ""}`,
        amount: parseFloat(amount),
        status: "PENDING",
      },
    });

    res.status(201).json({
      success: true,
      message: "Borrowed money recorded successfully",
      data: borrowed,
    });
  } catch (error) {
    console.error("Add borrowed money error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record borrowed money.",
    });
  }
};

export const markBorrowedMoneyPaid = async (req, res) => {
  try {
    const { borrowedId } = req.params;
    const ownerId = req.user.id;

    const borrowed = await prisma.borrowedMoney.findFirst({
      where: {
        id: borrowedId,
        student: { ownerId },
      },
      include: { student: true },
    });

    if (!borrowed) {
      return res.status(404).json({
        success: false,
        message: "Record not found or access denied.",
      });
    }

    const updated = await prisma.borrowedMoney.update({
      where: { id: borrowedId },
      data: {
        status: "PAID",
        paidDate: new Date(),
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        studentId: borrowed.studentId,
        type: "PAYMENT",
        title: "Borrowed Money Returned",
        description: `Returned ₹${borrowed.amount}`,
        amount: borrowed.amount,
        status: "COMPLETED",
      },
    });

    res.json({
      success: true,
      message: "Marked as paid",
      data: updated,
    });
  } catch (error) {
    console.error("Mark borrowed money paid error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update record.",
    });
  }
};

export const getBorrowedMoney = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const records = await prisma.borrowedMoney.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Get borrowed money error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch records.",
    });
  }
};

export const addFeePayment = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { amount, paidDate, paymentMethod, notes } = req.body;
    const ownerId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required.",
      });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const feeRecord = await prisma.feeRecord.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        dueDate: new Date(),
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        status: "PAID",
        paymentMethod,
        notes,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        studentId,
        type: "PAYMENT",
        title: "Fee Payment Received",
        description: `Hostel fees - ₹${amount}${notes ? ` (${notes})` : ""}`,
        amount: parseFloat(amount),
        status: "COMPLETED",
      },
    });

    res.status(201).json({
      success: true,
      message: "Fee payment recorded successfully",
      data: feeRecord,
    });
  } catch (error) {
    console.error("Add fee payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record payment.",
    });
  }
};

export const getFeeRecords = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;
    const { status } = req.query;

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const where = { studentId };
    if (status) {
      // Convert to enum value
      where.status = status.toUpperCase();
    }

    const records = await prisma.feeRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Get fee records error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fee records.",
    });
  }
};

export const getPaymentSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const [feeRecords, borrowedMoney] = await Promise.all([
      prisma.feeRecord.findMany({
        where: { studentId },
      }),
      prisma.borrowedMoney.findMany({
        where: { studentId },
      }),
    ]);

    const totalFeePaid = feeRecords
      .filter((f) => f.status === "PAID")
      .reduce((sum, f) => sum + Number(f.amount), 0);

    const totalFeePending = feeRecords
      .filter((f) => f.status === "PENDING" || f.status === "OVERDUE")
      .reduce((sum, f) => sum + Number(f.amount), 0);

    const totalBorrowed = borrowedMoney
      .filter((b) => b.status === "PENDING")
      .reduce((sum, b) => sum + Number(b.amount), 0);

    res.json({
      success: true,
      data: {
        totalFeePaid,
        totalFeePending,
        totalBorrowed,
        monthlyFee: student.monthlyFee,
      },
    });
  } catch (error) {
    console.error("Get payment summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment summary.",
    });
  }
};

// ============= PERMISSION TAB =============

export const sendPermissionRequest = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { requestText, duration, reason } = req.body;
    const ownerId = req.user.id;

    if (!requestText) {
      return res.status(400).json({
        success: false,
        message: "Request text is required.",
      });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const permission = await prisma.permission.create({
      data: {
        studentId,
        requestText,
        duration,
        reason,
        status: "PENDING",
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        studentId,
        type: "PERMISSION",
        title: "Permission Requested",
        description: requestText,
        status: "PENDING",
      },
    });

    res.status(201).json({
      success: true,
      message: "Permission request sent to parent",
      data: permission,
    });
  } catch (error) {
    console.error("Send permission request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send permission request.",
    });
  }
};

export const getPermissionRequests = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;
    const { status } = req.query;

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const where = { studentId };
    if (status) {
      // Convert to enum value
      where.status = status.toUpperCase();
    }

    const permissions = await prisma.permission.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error("Get permission requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permission requests.",
    });
  }
};

// ============= ALERT TAB =============

export const sendAlert = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { title, message, alertType } = req.body;
    const ownerId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required.",
      });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const alert = await prisma.alert.create({
      data: {
        studentId,
        title,
        message,
        alertType: alertType || "INFO",
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        studentId,
        type: "ALERT",
        title,
        description: message,
        status: "SENT",
      },
    });

    res.status(201).json({
      success: true,
      message: "Alert sent to parent",
      data: alert,
    });
  } catch (error) {
    console.error("Send alert error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send alert.",
    });
  }
};

export const getAlerts = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    const alerts = await prisma.alert.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts.",
    });
  }
};
