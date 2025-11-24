import { prisma } from "../config/database.js";
import { comparePassword, hashPassword } from "../utils/passwordHelper.js";
import { generateToken } from "../utils/jwtHelper.js";

export const parentLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    const parent = await prisma.parent.findUnique({
      where: { username },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            parentPhone: true, // Fixed: changed from 'phone' to 'parentPhone'
            parentName: true,
            parentEmail: true,
            roomNumber: true,
            bedNumber: true,
            monthlyFee: true,
            hostel: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true,
                state: true,
                pinCode: true,
              },
            },
          },
        },
      },
    });

    if (!parent) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const isPasswordValid = await comparePassword(password, parent.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const token = generateToken({
      id: parent.id,
      role: "parent",
      studentId: parent.studentId,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: parent.id,
          username: parent.username,
          role: "parent",
          isFirstLogin: parent.isFirstLogin,
          student: parent.student,
        },
      },
    });
  } catch (error) {
    console.error("Parent login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const parentId = req.user.id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
    });

    const isPasswordValid = await comparePassword(
      currentPassword,
      parent.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.parent.update({
      where: { id: parentId },
      data: {
        password: hashedPassword,
        isFirstLogin: false,
      },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password.",
    });
  }
};

export const getParentProfile = async (req, res) => {
  try {
    const parent = await prisma.parent.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        phone: true,
        name: true,
        email: true,
        isFirstLogin: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            name: true,
            parentPhone: true, // Fixed: changed from 'phone' to 'parentPhone'
            parentName: true,
            parentEmail: true,
            roomNumber: true,
            bedNumber: true,
            monthlyFee: true,
            hostel: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true,
                state: true,
                pinCode: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: parent,
    });
  } catch (error) {
    console.error("Get parent profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile.",
    });
  }
};

// ============= DASHBOARD / ALL ACTIVITIES =============

export const getDashboard = async (req, res) => {
  try {
    const parentId = req.user.id;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    const studentId = parent.studentId;

    // Get all activities
    const activities = await prisma.activity.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get pending permissions count
    const pendingPermissions = await prisma.permission.count({
      where: {
        studentId,
        status: "PENDING",
      },
    });

    // Get unread alerts count
    const unreadAlerts = await prisma.alert.count({
      where: {
        studentId,
        isRead: false,
      },
    });

    // Get payment summary
    const [feeRecords, borrowedMoney] = await Promise.all([
      prisma.feeRecord.findMany({
        where: { studentId },
      }),
      prisma.borrowedMoney.findMany({
        where: { studentId, status: "PENDING" },
      }),
    ]);

    const totalFeePaid = feeRecords
      .filter((f) => f.status === "PAID")
      .reduce((sum, f) => sum + f.amount, 0);

    const totalFeePending = feeRecords
      .filter((f) => f.status === "PENDING" || f.status === "OVERDUE")
      .reduce((sum, f) => sum + f.amount, 0);

    const totalBorrowed = borrowedMoney.reduce((sum, b) => sum + b.amount, 0);

    res.json({
      success: true,
      data: {
        activities,
        summary: {
          pendingPermissions,
          unreadAlerts,
          totalFeePaid,
          totalFeePending,
          totalBorrowed,
        },
      },
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard.",
    });
  }
};

export const getAllActivities = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { type } = req.query;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    const where = { studentId: parent.studentId };
    if (type) {
      where.type = type;
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

// ============= PAYMENT / FEE STATUS =============

export const getFeeStatus = async (req, res) => {
  try {
    const parentId = req.user.id;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            monthlyFee: true,
            feeDueDate: true,
          },
        },
      },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    const studentId = parent.student.id;

    // Get all fee records
    const feeRecords = await prisma.feeRecord.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary
    const totalPaid = feeRecords
      .filter((f) => f.status === "PAID")
      .reduce((sum, f) => sum + f.amount, 0);

    const totalPending = feeRecords
      .filter((f) => f.status === "PENDING")
      .reduce((sum, f) => sum + f.amount, 0);

    const totalOverdue = feeRecords
      .filter((f) => f.status === "OVERDUE")
      .reduce((sum, f) => sum + f.amount, 0);

    // Get last payment
    const lastPayment = feeRecords.find((f) => f.status === "PAID");

    res.json({
      success: true,
      data: {
        student: parent.student,
        summary: {
          monthlyFee: parent.student.monthlyFee,
          feeDueDate: parent.student.feeDueDate,
          totalPaid,
          totalPending,
          totalOverdue,
          lastPayment,
        },
        feeRecords,
      },
    });
  } catch (error) {
    console.error("Get fee status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fee status.",
    });
  }
};

export const getFeeHistory = async (req, res) => {
  try {
    const parentId = req.user.id;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    const feeRecords = await prisma.feeRecord.findMany({
      where: { studentId: parent.studentId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: feeRecords,
    });
  } catch (error) {
    console.error("Get fee history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fee history.",
    });
  }
};

export const getBorrowedMoneyStatus = async (req, res) => {
  try {
    const parentId = req.user.id;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    const borrowedRecords = await prisma.borrowedMoney.findMany({
      where: { studentId: parent.studentId },
      orderBy: { createdAt: "desc" },
    });

    const totalPending = borrowedRecords
      .filter((b) => b.status === "PENDING")
      .reduce((sum, b) => sum + b.amount, 0);

    const totalPaid = borrowedRecords
      .filter((b) => b.status === "PAID")
      .reduce((sum, b) => sum + b.amount, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalPending,
          totalPaid,
        },
        records: borrowedRecords,
      },
    });
  } catch (error) {
    console.error("Get borrowed money status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch borrowed money status.",
    });
  }
};

// ============= PERMISSIONS =============

export const getPermissions = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { status } = req.query;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    const where = { studentId: parent.studentId };
    if (status) {
      where.status = status;
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
    console.error("Get permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions.",
    });
  }
};

export const respondToPermission = async (req, res) => {
  try {
    const { permissionId } = req.params;
    const { response, parentResponse } = req.body; // response: 'APPROVED' or 'REJECTED'
    const parentId = req.user.id;

    if (!response || !["APPROVED", "REJECTED"].includes(response)) {
      return res.status(400).json({
        success: false,
        message: "Valid response (APPROVED or REJECTED) is required.",
      });
    }

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    // Check if permission belongs to parent's student
    const permission = await prisma.permission.findFirst({
      where: {
        id: permissionId,
        studentId: parent.studentId,
      },
    });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission request not found.",
      });
    }

    if (permission.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "This permission request has already been responded to.",
      });
    }

    // Update permission
    const updated = await prisma.permission.update({
      where: { id: permissionId },
      data: {
        status: response,
        parentResponse:
          parentResponse || `Permission ${response.toLowerCase()}`,
        respondedAt: new Date(),
      },
    });

    // Update activity
    await prisma.activity.updateMany({
      where: {
        studentId: parent.studentId,
        type: "PERMISSION",
        description: permission.requestText,
      },
      data: {
        status: response,
        description: `${permission.requestText} - ${response}`,
      },
    });

    // Create new activity for the response
    await prisma.activity.create({
      data: {
        studentId: parent.studentId,
        type: "PERMISSION",
        title: `Permission ${response === "APPROVED" ? "Granted" : "Rejected"}`,
        description: permission.requestText,
        status: response,
      },
    });

    res.json({
      success: true,
      message: `Permission ${response.toLowerCase()} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("Respond to permission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to respond to permission.",
    });
  }
};

// ============= ALERTS =============

export const getAlerts = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { alertType } = req.query;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    const where = { studentId: parent.studentId };
    if (alertType) {
      where.alertType = alertType;
    }

    const alerts = await prisma.alert.findMany({
      where,
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

export const markAlertAsRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const parentId = req.user.id;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    // Check if alert belongs to parent's student
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        studentId: parent.studentId,
      },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found.",
      });
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: "Alert marked as read",
      data: updated,
    });
  } catch (error) {
    console.error("Mark alert as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark alert as read.",
    });
  }
};

export const markAllAlertsAsRead = async (req, res) => {
  try {
    const parentId = req.user.id;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { studentId: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found.",
      });
    }

    await prisma.alert.updateMany({
      where: {
        studentId: parent.studentId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: "All alerts marked as read",
    });
  } catch (error) {
    console.error("Mark all alerts as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark alerts as read.",
    });
  }
};
