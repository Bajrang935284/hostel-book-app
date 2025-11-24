import { prisma } from "../config/database.js";

import { hashPassword, comparePassword } from "../utils/passwordHelper.js";

import { generateToken } from "../utils/jwtHelper.js";

export const ownerRegister = async (req, res) => {
  try {
    const { name, phone, password, confirmPassword } = req.body;

    if (!name || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,

        message: "All fields are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,

        message: "Passwords do not match.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,

        message: "Password must be at least 6 characters long.",
      });
    }

    const existingOwner = await prisma.hostelOwner.findUnique({
      where: { phone },
    });

    if (existingOwner) {
      return res.status(400).json({
        success: false,

        message: "Phone number already registered.",
      });
    }

    const hashedPassword = await hashPassword(password);

    const owner = await prisma.hostelOwner.create({
      data: {
        name,

        phone,

        password: hashedPassword,
      },

      select: {
        id: true,

        name: true,

        phone: true,

        createdAt: true,
      },
    });

    const token = generateToken({
      id: owner.id,

      role: "owner",
    });

    res.status(201).json({
      success: true,

      message: "Registration successful",

      data: {
        token,

        user: {
          ...owner,

          role: "owner",
        },
      },
    });
  } catch (error) {
    console.error("Owner registration error:", error);

    res.status(500).json({
      success: false,

      message: "Registration failed. Please try again.",
    });
  }
};

export const ownerLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,

        message: "Phone and password are required.",
      });
    }

    const owner = await prisma.hostelOwner.findUnique({
      where: { phone },
    });

    if (!owner) {
      return res.status(401).json({
        success: false,

        message: "Invalid credentials.",
      });
    }

    const isPasswordValid = await comparePassword(password, owner.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,

        message: "Invalid credentials.",
      });
    }

    const token = generateToken({
      id: owner.id,

      role: "owner",
    });

    res.json({
      success: true,

      message: "Login successful",

      data: {
        token,

        user: {
          id: owner.id,

          name: owner.name,

          phone: owner.phone,

          role: "owner",
        },
      },
    });
  } catch (error) {
    console.error("Owner login error:", error);

    res.status(500).json({
      success: false,

      message: "Login failed. Please try again.",
    });
  }
};

export const getOwnerProfile = async (req, res) => {
  try {
    const owner = await prisma.hostelOwner.findUnique({
      where: { id: req.user.id },

      select: {
        id: true,

        name: true,

        phone: true,

        createdAt: true,

        _count: {
          select: {
            hostels: true,

            students: true,
          },
        },
      },
    });

    res.json({
      success: true,

      data: owner,
    });
  } catch (error) {
    console.error("Get owner profile error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch profile.",
    });
  }
};

// Register Hostel

export const registerHostel = async (req, res) => {
  try {
    const {
      name,

      ownerName,

      contactNumber,

      email,

      street,

      city,

      state,

      pinCode,

      hostelType,
    } = req.body;

    const ownerId = req.user.id;

    // Validation

    if (
      !name ||
      !ownerName ||
      !contactNumber ||
      !street ||
      !city ||
      !state ||
      !pinCode ||
      !hostelType
    ) {
      return res.status(400).json({
        success: false,

        message: "All required fields must be provided.",
      });
    }

    // Validate hostel type

    const validTypes = ["Boys", "Girls", "Co-ed"];

    if (!validTypes.includes(hostelType)) {
      return res.status(400).json({
        success: false,

        message: "Hostel type must be Boys, Girls, or Co-ed.",
      });
    }

    // Validate pin code

    if (!/^\d{6}$/.test(pinCode)) {
      return res.status(400).json({
        success: false,

        message: "Pin code must be 6 digits.",
      });
    }

    // Validate contact number

    if (!/^\d{10}$/.test(contactNumber)) {
      return res.status(400).json({
        success: false,

        message: "Contact number must be 10 digits.",
      });
    }

    // Validate email if provided

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,

        message: "Invalid email format.",
      });
    }

    const hostel = await prisma.hostel.create({
      data: {
        name,

        ownerName,

        contactNumber,

        email,

        street,

        city,

        state,

        pinCode,

        hostelType,

        ownerId,
      },
    });

    res.status(201).json({
      success: true,

      message: "Hostel registered successfully",

      data: hostel,
    });
  } catch (error) {
    console.error("Register hostel error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to register hostel.",
    });
  }
};

// Get all hostels of owner

export const getMyHostels = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const hostels = await prisma.hostel.findMany({
      where: { ownerId },

      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,

      data: hostels,
    });
  } catch (error) {
    console.error("Get hostels error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch hostels.",
    });
  }
};

// Get single hostel details

export const getHostelById = async (req, res) => {
  try {
    const { hostelId } = req.params;

    const ownerId = req.user.id;

    const hostel = await prisma.hostel.findFirst({
      where: {
        id: hostelId,

        ownerId,
      },

      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,

        message: "Hostel not found or access denied.",
      });
    }

    res.json({
      success: true,

      data: hostel,
    });
  } catch (error) {
    console.error("Get hostel error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch hostel details.",
    });
  }
};

// Register Student

// Register Student

export const registerStudent = async (req, res) => {
  try {
    const {
      name,

      parentName,

      parentPhone,

      parentEmail,

      roomNumber,

      bedNumber,

      monthlyFee,

      feeDueDate,

      notes,

      hostelId,
    } = req.body;

    const ownerId = req.user.id;

    // Validation

    if (!name || !parentName || !parentPhone || !monthlyFee || !hostelId) {
      return res.status(400).json({
        success: false,

        message:
          "Name, parent name, parent phone, monthly fee, and hostel are required.",
      });
    }

    // Validate parent phone (10 digits)

    if (!/^\d{10}$/.test(parentPhone)) {
      return res.status(400).json({
        success: false,

        message: "Parent phone must be 10 digits.",
      });
    }

    // Validate parent email if provided

    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      return res.status(400).json({
        success: false,

        message: "Invalid email format.",
      });
    }

    // Validate monthly fee

    if (monthlyFee <= 0) {
      return res.status(400).json({
        success: false,

        message: "Monthly fee must be greater than 0.",
      });
    }

    // Validate fee due date (1-31)

    const dueDate = feeDueDate || 1;

    if (dueDate < 1 || dueDate > 31) {
      return res.status(400).json({
        success: false,

        message: "Fee due date must be between 1 and 31.",
      });
    }

    // Verify hostel belongs to owner

    const hostel = await prisma.hostel.findFirst({
      where: {
        id: hostelId,

        ownerId,
      },
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,

        message: "Hostel not found or access denied.",
      });
    }

    // Create student
const student = await prisma.student.create({
      data: {
        name,
        parentName,
        parentPhone,
        parentEmail,
        roomNumber,
        bedNumber,
        monthlyFee: parseFloat(monthlyFee),
        feeDueDate: dueDate,
        notes,
        ownerId,
        hostelId,
      },
      include: {
        hostel: {
          select: {
            name: true,
          },
        },
      },
    });

    // --- NEW CREDENTIAL GENERATION LOGIC ---

    // 1. Generate Username: ParentFirstName + @ + 3 Random Digits (e.g. rahul@492)
    const cleanName = parentName.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomDigits = Math.floor(100 + Math.random() * 900); 
    const username = `${cleanName}@${randomDigits}`;

    // 2. Generate Password: Simple 6-digit number (e.g. 582910)
    const plainPassword = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedPassword = await hashPassword(plainPassword);

    // ---------------------------------------

    const parent = await prisma.parent.create({
      data: {
        username,
        password: hashedPassword,
        plainPassword: plainPassword, // Store plain password permanently
        name: parentName,
        phone: parentPhone,
        email: parentEmail,
        studentId: student.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      data: {
        student,
        parentCredentials: {
          username: parent.username,
          password: plainPassword,
        },
      },
    });
  } catch (error) {
    console.error("Register student error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register student.",
    });
  }
};
// Get all students
export const getMyStudents = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { hostelId } = req.query;

    const where = { ownerId };
    if (hostelId) {
      where.hostelId = hostelId;
    }

    // Get current month and year to check fee status
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JS months are 0-11
    const currentYear = now.getFullYear();

    const students = await prisma.student.findMany({
      where,
      include: {
        hostel: {
          select: {
            name: true,
          },
        },
        parent: {
          select: {
            username: true,
            phone: true,
            isFirstLogin: true,
          },
        },
        // NEW: Check if fee is paid for the current month
        feePayments: {
          where: {
            paymentMonth: currentMonth,
            paymentYear: currentYear,
            status: "Completed",
          },
          select: {
            id: true,
            amount: true,
            paymentDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students.",
    });
  }
};

// ====================== FEE COLLECTION (THE FIX) ======================

export const collectStudentFee = async (req, res) => {
  try {
    const {
      studentId,

      amount,

      paymentDate,

      paymentMonth, // 1-12

      paymentYear,

      paymentMethod, // Cash, UPI, etc.

      notes,
    } = req.body;

    const ownerId = req.user.id;

    // 1. Basic Validation

    if (!studentId || !amount || !paymentMonth || !paymentYear) {
      return res.status(400).json({
        success: false,

        message: "Student ID, amount, month, and year are required.",
      });
    }

    // 2. Verify Student Ownership

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },

      include: { hostel: true },
    });

    if (!student) {
      return res.status(404).json({
        success: false,

        message: "Student not found or access denied.",
      });
    }

    const actualPaymentDate = paymentDate ? new Date(paymentDate) : new Date();

    // 3. EXECUTE TRANSACTION (Ensures FeePayment and FeeRecord are always in sync)

    const result = await prisma.$transaction(async (prisma) => {
      // A. Create the Accounting Entry (This fixes your Dashboard Income being 0)

      const newPayment = await prisma.feePayment.create({
        data: {
          amount: parseFloat(amount),

          paymentDate: actualPaymentDate,

          paymentMonth: parseInt(paymentMonth),

          paymentYear: parseInt(paymentYear),

          paymentMethod: paymentMethod || "Cash",

          notes,

          status: "Completed",

          studentId,

          ownerId,

          hostelId: student.hostelId,
        },
      });

      // B. Update or Create the Student's Fee Record (The Invoice)

      // We check if a pending record exists for this month/year to mark it paid

      // Or we create a new record saying "Paid"

      // Note: Your schema doesn't strictly link FeeRecord to a month,

      // so we typically find the oldest PENDING record or create a new receipt.

      // Strategy: Create a generic Receipt Record for history

      await prisma.feeRecord.create({
        data: {
          studentId,

          amount: parseFloat(amount),

          dueDate: actualPaymentDate, // Paid on spot

          paidDate: actualPaymentDate,

          status: "PAID",

          paymentMethod: paymentMethod || "Cash",

          notes: `Fee collected for ${paymentMonth}/${paymentYear}`,
        },
      });

      // C. Create Activity Log (For the Dashboard feed)

      await prisma.activity.create({
        data: {
          studentId,

          type: "PAYMENT",

          title: "Fee Collected",

          description: `Received ₹${amount} via ${paymentMethod || "Cash"}`,

          amount: parseFloat(amount),

          status: "Completed",
        },
      });

      return newPayment;
    });

    res.status(201).json({
      success: true,

      message: "Fee collected and accounting updated successfully.",

      data: result,
    });
  } catch (error) {
    console.error("Collect fee error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to collect fee.",
    });
  }
};

// Get single student details (with parent credentials if not logged in yet)

// Get single student details with parent credentials

export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;

    const ownerId = req.user.id;

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,

        ownerId,
      },

      include: {
        hostel: {
          select: {
            id: true,

            name: true,

            hostelType: true,
          },
        },

        parent: {
          select: {
            username: true,

            plainPassword: true, // Show plain password to owner

            name: true,

            phone: true,

            email: true,

            isFirstLogin: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,

        message: "Student not found or access denied.",
      });
    }

    res.json({
      success: true,

      data: student,
    });
  } catch (error) {
    console.error("Get student error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch student details.",
    });
  }
};

// Add these staff management controllers to your ownerController.js

// Register/Add Staff

export const registerStaff = async (req, res) => {
  try {
    const {
      name,

      phone,

      email,

      role,

      salary,

      joiningDate,

      address,

      idProofType,

      idProofNumber,

      emergencyContact,

      emergencyContactName,

      hostelId,
    } = req.body;

    const ownerId = req.user.id;

    // Validation

    if (!name || !phone || !role || !salary || !hostelId) {
      return res.status(400).json({
        success: false,

        message: "Name, phone, role, salary, and hostel are required.",
      });
    }

    // Validate phone (10 digits)

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,

        message: "Phone number must be 10 digits.",
      });
    }

    // Validate email if provided

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,

        message: "Invalid email format.",
      });
    }

    // Validate salary

    if (salary <= 0) {
      return res.status(400).json({
        success: false,

        message: "Salary must be greater than 0.",
      });
    }

    // Valid staff roles

    const validRoles = [
      "Manager",
      "Warden",
      "Cook",
      "Cleaner",
      "Security",
      "Maintenance",
      "Other",
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,

        message: "Invalid staff role.",
      });
    }

    // Verify hostel belongs to owner

    const hostel = await prisma.hostel.findFirst({
      where: {
        id: hostelId,

        ownerId,
      },
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,

        message: "Hostel not found or access denied.",
      });
    }

    // Check if phone already exists for this owner

    const existingStaff = await prisma.staff.findFirst({
      where: {
        phone,

        ownerId,
      },
    });

    if (existingStaff) {
      return res.status(400).json({
        success: false,

        message: "Staff with this phone number already exists.",
      });
    }

    // Create staff

    const staff = await prisma.staff.create({
      data: {
        name,

        phone,

        email,

        role,

        salary: parseFloat(salary),

        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),

        address,

        idProofType,

        idProofNumber,

        emergencyContact,

        emergencyContactName,

        isActive: true,

        ownerId,

        hostelId,
      },

      include: {
        hostel: {
          select: {
            name: true,

            city: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,

      message: "Staff registered successfully",

      data: staff,
    });
  } catch (error) {
    console.error("Register staff error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to register staff.",
    });
  }
};

// Get all staff members

export const getMyStaff = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const { hostelId, role, isActive } = req.query;

    const where = { ownerId };

    if (hostelId) {
      where.hostelId = hostelId;
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const staff = await prisma.staff.findMany({
      where,

      include: {
        hostel: {
          select: {
            id: true,

            name: true,

            city: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,

      data: staff,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch staff.",
    });
  }
};

// Get single staff details

export const getStaffById = async (req, res) => {
  try {
    const { staffId } = req.params;

    const ownerId = req.user.id;

    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,

        ownerId,
      },

      include: {
        hostel: {
          select: {
            id: true,

            name: true,

            city: true,

            hostelType: true,
          },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,

        message: "Staff not found or access denied.",
      });
    }

    res.json({
      success: true,

      data: staff,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch staff details.",
    });
  }
};

// Update staff details

export const updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const ownerId = req.user.id;

    const {
      name,

      phone,

      email,

      role,

      salary,

      address,

      idProofType,

      idProofNumber,

      emergencyContact,

      emergencyContactName,

      isActive,
    } = req.body;

    // Verify staff belongs to owner

    const existingStaff = await prisma.staff.findFirst({
      where: {
        id: staffId,

        ownerId,
      },
    });

    if (!existingStaff) {
      return res.status(404).json({
        success: false,

        message: "Staff not found or access denied.",
      });
    }

    // Validate phone if provided

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,

        message: "Phone number must be 10 digits.",
      });
    }

    // Validate email if provided

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,

        message: "Invalid email format.",
      });
    }

    // Validate salary if provided

    if (salary !== undefined && salary <= 0) {
      return res.status(400).json({
        success: false,

        message: "Salary must be greater than 0.",
      });
    }

    // Validate role if provided

    if (role) {
      const validRoles = [
        "Manager",
        "Warden",
        "Cook",
        "Cleaner",
        "Security",
        "Maintenance",
        "Other",
      ];

      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,

          message: "Invalid staff role.",
        });
      }
    }

    // Check if phone is being changed and already exists

    if (phone && phone !== existingStaff.phone) {
      const phoneExists = await prisma.staff.findFirst({
        where: {
          phone,

          ownerId,

          id: { not: staffId },
        },
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,

          message: "Phone number already exists for another staff member.",
        });
      }
    }

    // Update staff

    const updatedData = {};

    if (name !== undefined) updatedData.name = name;

    if (phone !== undefined) updatedData.phone = phone;

    if (email !== undefined) updatedData.email = email;

    if (role !== undefined) updatedData.role = role;

    if (salary !== undefined) updatedData.salary = parseFloat(salary);

    if (address !== undefined) updatedData.address = address;

    if (idProofType !== undefined) updatedData.idProofType = idProofType;

    if (idProofNumber !== undefined) updatedData.idProofNumber = idProofNumber;

    if (emergencyContact !== undefined)
      updatedData.emergencyContact = emergencyContact;

    if (emergencyContactName !== undefined)
      updatedData.emergencyContactName = emergencyContactName;

    if (isActive !== undefined) updatedData.isActive = isActive;

    const staff = await prisma.staff.update({
      where: { id: staffId },

      data: updatedData,

      include: {
        hostel: {
          select: {
            name: true,

            city: true,
          },
        },
      },
    });

    res.json({
      success: true,

      message: "Staff updated successfully",

      data: staff,
    });
  } catch (error) {
    console.error("Update staff error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to update staff.",
    });
  }
};

// Delete staff (soft delete by setting isActive to false)

export const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const ownerId = req.user.id;

    const { permanent } = req.query; // ?permanent=true for hard delete

    // Verify staff belongs to owner

    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,

        ownerId,
      },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,

        message: "Staff not found or access denied.",
      });
    }

    if (permanent === "true") {
      // Hard delete

      await prisma.staff.delete({
        where: { id: staffId },
      });

      return res.json({
        success: true,

        message: "Staff permanently deleted.",
      });
    } else {
      // Soft delete

      await prisma.staff.update({
        where: { id: staffId },

        data: { isActive: false },
      });

      return res.json({
        success: true,

        message: "Staff deactivated successfully.",
      });
    }
  } catch (error) {
    console.error("Delete staff error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to delete staff.",
    });
  }
};

// Update staff salary

export const updateStaffSalary = async (req, res) => {
  try {
    const { staffId } = req.params;

    const { salary, effectiveDate } = req.body;

    const ownerId = req.user.id;

    if (!salary || salary <= 0) {
      return res.status(400).json({
        success: false,

        message: "Valid salary amount is required.",
      });
    }

    // Verify staff belongs to owner

    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,

        ownerId,
      },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,

        message: "Staff not found or access denied.",
      });
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },

      data: {
        salary: parseFloat(salary),
      },
    });

    res.json({
      success: true,

      message: "Salary updated successfully",

      data: updatedStaff,
    });
  } catch (error) {
    console.error("Update salary error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to update salary.",
    });
  }
};

// Get staff statistics

export const getStaffStats = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const { hostelId } = req.query;

    const where = { ownerId };

    if (hostelId) {
      where.hostelId = hostelId;
    }

    const [totalStaff, activeStaff, inactiveStaff, staffByRole] =
      await Promise.all([
        prisma.staff.count({ where }),

        prisma.staff.count({ where: { ...where, isActive: true } }),

        prisma.staff.count({ where: { ...where, isActive: false } }),

        prisma.staff.groupBy({
          by: ["role"],

          where,

          _count: true,
        }),
      ]);

    const totalSalary = await prisma.staff.aggregate({
      where: { ...where, isActive: true },

      _sum: {
        salary: true,
      },
    });

    res.json({
      success: true,

      data: {
        totalStaff,

        activeStaff,

        inactiveStaff,

        totalMonthlySalary: totalSalary._sum.salary || 0,

        staffByRole: staffByRole.map((item) => ({
          role: item.role,

          count: item._count,
        })),
      },
    });
  } catch (error) {
    console.error("Get staff stats error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch staff statistics.",
    });
  }
};

// Add these expense management controllers to your ownerController.js

// ====================== EXPENSE MANAGEMENT ======================

// Add General Expense

export const addExpense = async (req, res) => {
  try {
    const {
      title,

      amount,

      category,

      expenseDate,

      description,

      paymentMethod,

      hostelId,
    } = req.body;

    const ownerId = req.user.id;

    // Validation

    if (!title || !amount || !category || !hostelId) {
      return res.status(400).json({
        success: false,

        message: "Title, amount, category, and hostel are required.",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,

        message: "Amount must be greater than 0.",
      });
    }

    // Valid expense categories

    const validCategories = [
      "Electricity",

      "Water",

      "Gas",

      "Internet",

      "Maintenance",

      "Groceries",

      "Cleaning Supplies",

      "Furniture",

      "Repairs",

      "Salary",

      "Rent",

      "Security",

      "Other",
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,

        message: "Invalid expense category.",
      });
    }

    // Verify hostel belongs to owner

    const hostel = await prisma.hostel.findFirst({
      where: {
        id: hostelId,

        ownerId,
      },
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,

        message: "Hostel not found or access denied.",
      });
    }

    const expense = await prisma.expense.create({
      data: {
        title,

        amount: parseFloat(amount),

        category,

        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),

        description,

        paymentMethod: paymentMethod || "Cash",

        ownerId,

        hostelId,
      },

      include: {
        hostel: {
          select: {
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,

      message: "Expense added successfully",

      data: expense,
    });
  } catch (error) {
    console.error("Add expense error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to add expense.",
    });
  }
};

// Get All Expenses

export const getExpenses = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const {
      hostelId,

      category,

      startDate,

      endDate,

      month,

      year,
    } = req.query;

    const where = { ownerId };

    if (hostelId) {
      where.hostelId = hostelId;
    }

    if (category) {
      where.category = category;
    }

    // Date filtering

    if (startDate || endDate || month || year) {
      where.expenseDate = {};

      if (month && year) {
        // Filter by specific month and year

        const startOfMonth = new Date(year, month - 1, 1);

        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        where.expenseDate.gte = startOfMonth;

        where.expenseDate.lte = endOfMonth;
      } else if (year && !month) {
        // Filter by entire year

        const startOfYear = new Date(year, 0, 1);

        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

        where.expenseDate.gte = startOfYear;

        where.expenseDate.lte = endOfYear;
      } else {
        // Custom date range

        if (startDate) {
          where.expenseDate.gte = new Date(startDate);
        }

        if (endDate) {
          where.expenseDate.lte = new Date(endDate);
        }
      }
    }

    const expenses = await prisma.expense.findMany({
      where,

      include: {
        hostel: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        expenseDate: "desc",
      },
    });

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      success: true,

      data: {
        expenses,

        totalAmount,

        count: expenses.length,
      },
    });
  } catch (error) {
    console.error("Get expenses error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch expenses.",
    });
  }
};

// Update Expense

export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const ownerId = req.user.id;

    const {
      title,

      amount,

      category,

      expenseDate,

      description,

      paymentMethod,
    } = req.body;

    // Verify expense belongs to owner

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,

        ownerId,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,

        message: "Expense not found or access denied.",
      });
    }

    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({
        success: false,

        message: "Amount must be greater than 0.",
      });
    }

    const updatedData = {};

    if (title !== undefined) updatedData.title = title;

    if (amount !== undefined) updatedData.amount = parseFloat(amount);

    if (category !== undefined) updatedData.category = category;

    if (expenseDate !== undefined)
      updatedData.expenseDate = new Date(expenseDate);

    if (description !== undefined) updatedData.description = description;

    if (paymentMethod !== undefined) updatedData.paymentMethod = paymentMethod;

    const expense = await prisma.expense.update({
      where: { id: expenseId },

      data: updatedData,

      include: {
        hostel: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,

      message: "Expense updated successfully",

      data: expense,
    });
  } catch (error) {
    console.error("Update expense error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to update expense.",
    });
  }
};

// Delete Expense

export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const ownerId = req.user.id;

    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,

        ownerId,
      },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,

        message: "Expense not found or access denied.",
      });
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    res.json({
      success: true,

      message: "Expense deleted successfully.",
    });
  } catch (error) {
    console.error("Delete expense error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to delete expense.",
    });
  }
};

// ====================== SALARY PAYMENTS ======================

// Record Salary Payment

export const recordSalaryPayment = async (req, res) => {
  try {
    const {
      staffId,

      amount,

      paymentDate,

      paymentMonth,

      paymentYear,

      paymentMethod,

      notes,
    } = req.body;

    const ownerId = req.user.id;

    if (!staffId || !amount || !paymentMonth || !paymentYear) {
      return res.status(400).json({
        success: false,

        message: "Staff, amount, payment month, and year are required.",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,

        message: "Amount must be greater than 0.",
      });
    }

    // Verify staff belongs to owner

    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,

        ownerId,
      },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,

        message: "Staff not found or access denied.",
      });
    }

    // Check if salary already paid for this month

    const existingPayment = await prisma.salaryPayment.findFirst({
      where: {
        staffId,

        paymentMonth,

        paymentYear,
      },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,

        message: "Salary already paid for this month.",
      });
    }

    const salaryPayment = await prisma.salaryPayment.create({
      data: {
        staffId,

        amount: parseFloat(amount),

        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),

        paymentMonth,

        paymentYear,

        paymentMethod: paymentMethod || "Cash",

        notes,

        ownerId,

        hostelId: staff.hostelId,
      },

      include: {
        staff: {
          select: {
            name: true,

            role: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,

      message: "Salary payment recorded successfully",

      data: salaryPayment,
    });
  } catch (error) {
    console.error("Record salary payment error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to record salary payment.",
    });
  }
};

// Get Salary Payments

export const getSalaryPayments = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const {
      hostelId,

      staffId,

      month,

      year,

      startDate,

      endDate,
    } = req.query;

    const where = { ownerId };

    if (hostelId) where.hostelId = hostelId;

    if (staffId) where.staffId = staffId;

    if (month) where.paymentMonth = parseInt(month);

    if (year) where.paymentYear = parseInt(year);

    // Date filtering

    if (startDate || endDate) {
      where.paymentDate = {};

      if (startDate) where.paymentDate.gte = new Date(startDate);

      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const payments = await prisma.salaryPayment.findMany({
      where,

      include: {
        staff: {
          select: {
            name: true,

            role: true,

            phone: true,
          },
        },

        hostel: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        paymentDate: "desc",
      },
    });

    const totalAmount = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    res.json({
      success: true,

      data: {
        payments,

        totalAmount,

        count: payments.length,
      },
    });
  } catch (error) {
    console.error("Get salary payments error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch salary payments.",
    });
  }
};

// ====================== STUDENT BORROWING/LOANS ======================

// Record Student Borrowing

export const recordStudentBorrowing = async (req, res) => {
  try {
    const {
      studentId,

      amount,

      borrowDate,

      reason,

      dueDate,

      notes,
    } = req.body;

    const ownerId = req.user.id;

    if (!studentId || !amount) {
      return res.status(400).json({
        success: false,

        message: "Student and amount are required.",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,

        message: "Amount must be greater than 0.",
      });
    }

    // Verify student belongs to owner

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,

        ownerId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,

        message: "Student not found or access denied.",
      });
    }

    const borrowing = await prisma.studentBorrowing.create({
      data: {
        studentId,

        amount: parseFloat(amount),

        borrowDate: borrowDate ? new Date(borrowDate) : new Date(),

        reason,

        dueDate: dueDate ? new Date(dueDate) : null,

        notes,

        status: "Pending",

        ownerId,

        hostelId: student.hostelId,
      },

      include: {
        student: {
          select: {
            name: true,

            parentName: true,

            parentPhone: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,

      message: "Borrowing recorded successfully",

      data: borrowing,
    });
  } catch (error) {
    console.error("Record borrowing error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to record borrowing.",
    });
  }
};

// Get Student Borrowings

export const getStudentBorrowings = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const {
      hostelId,

      studentId,

      status,

      startDate,

      endDate,
    } = req.query;

    const where = { ownerId };

    if (hostelId) where.hostelId = hostelId;

    if (studentId) where.studentId = studentId;

    if (status) where.status = status;

    // Date filtering

    if (startDate || endDate) {
      where.borrowDate = {};

      if (startDate) where.borrowDate.gte = new Date(startDate);

      if (endDate) where.borrowDate.lte = new Date(endDate);
    }

    const borrowings = await prisma.studentBorrowing.findMany({
      where,

      include: {
        student: {
          select: {
            name: true,

            parentName: true,

            parentPhone: true,

            roomNumber: true,
          },
        },

        hostel: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        borrowDate: "desc",
      },
    });

    const totalBorrowed = borrowings.reduce((sum, b) => sum + b.amount, 0);

    const totalRepaid = borrowings

      .filter((b) => b.status === "Repaid")

      .reduce((sum, b) => sum + b.amount, 0);

    const totalPending = borrowings

      .filter((b) => b.status === "Pending")

      .reduce((sum, b) => sum + b.amount, 0);

    res.json({
      success: true,

      data: {
        borrowings,

        summary: {
          totalBorrowed,

          totalRepaid,

          totalPending,

          count: borrowings.length,
        },
      },
    });
  } catch (error) {
    console.error("Get borrowings error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch borrowings.",
    });
  }
};

// Update Borrowing Status (Mark as Repaid)

export const updateBorrowingStatus = async (req, res) => {
  try {
    const { borrowingId } = req.params;

    const { status, repaymentDate, notes } = req.body;

    const ownerId = req.user.id;

    if (!status) {
      return res.status(400).json({
        success: false,

        message: "Status is required.",
      });
    }

    const validStatuses = ["Pending", "Repaid", "Cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,

        message: "Invalid status.",
      });
    }

    const existingBorrowing = await prisma.studentBorrowing.findFirst({
      where: {
        id: borrowingId,

        ownerId,
      },
    });

    if (!existingBorrowing) {
      return res.status(404).json({
        success: false,

        message: "Borrowing not found or access denied.",
      });
    }

    const updatedData = { status };

    if (status === "Repaid" && repaymentDate) {
      updatedData.repaymentDate = new Date(repaymentDate);
    }

    if (notes) {
      updatedData.notes = notes;
    }

    const borrowing = await prisma.studentBorrowing.update({
      where: { id: borrowingId },

      data: updatedData,

      include: {
        student: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,

      message: "Borrowing status updated successfully",

      data: borrowing,
    });
  } catch (error) {
    console.error("Update borrowing status error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to update borrowing status.",
    });
  }
};

// ====================== ACCOUNTING REPORTS ======================

// Get Monthly Accounting Report

export const getMonthlyAccountingReport = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const { month, year, hostelId } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,

        message: "Month and year are required.",
      });
    }

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);

    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const where = {
      ownerId,

      ...(hostelId && { hostelId }),
    };

    // Get all expenses for the month

    const expenses = await prisma.expense.findMany({
      where: {
        ...where,

        expenseDate: {
          gte: startOfMonth,

          lte: endOfMonth,
        },
      },
    });

    // Get all salary payments for the month

    const salaryPayments = await prisma.salaryPayment.findMany({
      where: {
        ...where,

        paymentMonth: parseInt(month),

        paymentYear: parseInt(year),
      },
    });

    // Get all fee payments for the month

    const feePayments = await prisma.feePayment.findMany({
      where: {
        ...where,

        paymentDate: {
          gte: startOfMonth,

          lte: endOfMonth,
        },

        status: "Completed", // OPTIONAL: Add this if you have failed payments
      },
    });

    // Get borrowings for the month

    const borrowings = await prisma.studentBorrowing.findMany({
      where: {
        ...where,

        borrowDate: {
          gte: startOfMonth,

          lte: endOfMonth,
        },
      },
    });

    // Calculate totals

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const totalSalaries = salaryPayments.reduce(
      (sum, sal) => sum + sal.amount,
      0
    );

    const totalFeeIncome = feePayments.reduce(
      (sum, fee) => sum + fee.amount,
      0
    );

    const totalBorrowings = borrowings.reduce((sum, b) => sum + b.amount, 0);

    // Expense breakdown by category

    const expensesByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;

      return acc;
    }, {});

    const totalCosts = totalExpenses + totalSalaries;

    const netIncome = totalFeeIncome - totalCosts;

    res.json({
      success: true,

      data: {
        period: {
          month: parseInt(month),

          year: parseInt(year),

          monthName: new Date(year, month - 1).toLocaleString("default", {
            month: "long",
          }),
        },

        income: {
          feePayments: totalFeeIncome,

          studentBorrowings: totalBorrowings,

          total: totalFeeIncome,
        },

        expenses: {
          general: totalExpenses,

          salaries: totalSalaries,

          total: totalCosts,

          breakdown: expensesByCategory,
        },

        summary: {
          totalIncome: totalFeeIncome,

          totalExpenses: totalCosts,

          netIncome: netIncome,

          profitMargin:
            totalFeeIncome > 0
              ? ((netIncome / totalFeeIncome) * 100).toFixed(2) + "%"
              : "0%",
        },

        counts: {
          totalExpenseEntries: expenses.length,

          totalSalaryPayments: salaryPayments.length,

          totalFeePayments: feePayments.length,

          totalBorrowings: borrowings.length,
        },
      },
    });
  } catch (error) {
    console.error("Monthly report error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to generate monthly report.",
    });
  }
};

// Get Yearly Accounting Report

export const getYearlyAccountingReport = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const { year, hostelId } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,

        message: "Year is required.",
      });
    }

    const startOfYear = new Date(year, 0, 1);

    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const where = {
      ownerId,

      ...(hostelId && { hostelId }),
    };

    // Get all expenses for the year

    const expenses = await prisma.expense.findMany({
      where: {
        ...where,

        expenseDate: {
          gte: startOfYear,

          lte: endOfYear,
        },
      },
    });

    // Get all salary payments for the year

    const salaryPayments = await prisma.salaryPayment.findMany({
      where: {
        ...where,

        paymentYear: parseInt(year),
      },
    });

    // Get all fee payments for the year

    const feePayments = await prisma.feePayment.findMany({
      where: {
        ...where,

        paymentDate: {
          gte: startOfYear,

          lte: endOfYear,
        },
      },
    });

    // Get borrowings for the year

    const borrowings = await prisma.studentBorrowing.findMany({
      where: {
        ...where,

        borrowDate: {
          gte: startOfYear,

          lte: endOfYear,
        },
      },
    });

    // Calculate monthly breakdown

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;

      const monthExpenses = expenses.filter(
        (e) => new Date(e.expenseDate).getMonth() === i
      );

      const monthSalaries = salaryPayments.filter(
        (s) => s.paymentMonth === month
      );

      const monthFees = feePayments.filter(
        (f) => new Date(f.paymentDate).getMonth() === i
      );

      const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      const salaryTotal = monthSalaries.reduce((sum, s) => sum + s.amount, 0);

      const feeTotal = monthFees.reduce((sum, f) => sum + f.amount, 0);

      return {
        month,

        monthName: new Date(year, i).toLocaleString("default", {
          month: "long",
        }),

        income: feeTotal,

        expenses: expenseTotal + salaryTotal,

        netIncome: feeTotal - (expenseTotal + salaryTotal),
      };
    });

    // Calculate totals

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const totalSalaries = salaryPayments.reduce(
      (sum, sal) => sum + sal.amount,
      0
    );

    const totalFeeIncome = feePayments.reduce(
      (sum, fee) => sum + fee.amount,
      0
    );

    const totalBorrowings = borrowings.reduce((sum, b) => sum + b.amount, 0);

    // Expense breakdown by category

    const expensesByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;

      return acc;
    }, {});

    const totalCosts = totalExpenses + totalSalaries;

    const netIncome = totalFeeIncome - totalCosts;

    res.json({
      success: true,

      data: {
        period: {
          year: parseInt(year),
        },

        income: {
          feePayments: totalFeeIncome,

          studentBorrowings: totalBorrowings,

          total: totalFeeIncome,
        },

        expenses: {
          general: totalExpenses,

          salaries: totalSalaries,

          total: totalCosts,

          breakdown: expensesByCategory,
        },

        summary: {
          totalIncome: totalFeeIncome,

          totalExpenses: totalCosts,

          netIncome: netIncome,

          profitMargin:
            totalFeeIncome > 0
              ? ((netIncome / totalFeeIncome) * 100).toFixed(2) + "%"
              : "0%",

          averageMonthlyIncome: (totalFeeIncome / 12).toFixed(2),

          averageMonthlyExpense: (totalCosts / 12).toFixed(2),
        },

        monthlyBreakdown: monthlyData,

        counts: {
          totalExpenseEntries: expenses.length,

          totalSalaryPayments: salaryPayments.length,

          totalFeePayments: feePayments.length,

          totalBorrowings: borrowings.length,
        },
      },
    });
  } catch (error) {
    console.error("Yearly report error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to generate yearly report.",
    });
  }
};

// Get Dashboard Summary (Current Month Overview)
export const getDashboardSummary = async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Prefer the middleware-verified hostel id. Fallback to query for safety.
    const hostelId = req.hostelId ?? req.query.hostelId ?? null;

    console.log('getDashboardSummary: ownerId=', ownerId, 'hostelId=', hostelId);

    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Use the verified hostelId to scope queries. If null -> global view for owner.
    const where = {
      ownerId,
      ...(hostelId ? { hostelId } : {}),
    };

    // ... rest of controller unchanged ...


    // Current month data

    const [
      monthExpenses,

      monthSalaries,

      monthFees,

      pendingBorrowings,

      totalStudents,

      totalStaff,
    ] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          ...where,

          expenseDate: { gte: startOfMonth, lte: endOfMonth },
        },

        _sum: { amount: true },

        _count: true,
      }),

      prisma.salaryPayment.aggregate({
        where: {
          ...where,

          paymentMonth: now.getMonth() + 1,

          paymentYear: now.getFullYear(),
        },

        _sum: { amount: true },

        _count: true,
      }),

      prisma.feePayment.aggregate({
        where: {
          ...where,

          paymentDate: { gte: startOfMonth, lte: endOfMonth },
        },

        _sum: { amount: true },

        _count: true,
      }),

      prisma.studentBorrowing.aggregate({
        where: {
          ...where,

          status: "Pending",
        },

        _sum: { amount: true },

        _count: true,
      }),

      prisma.student.count({ where }),

      prisma.staff.count({ where: { ...where, isActive: true } }),
    ]);

    const totalIncome = monthFees._sum.amount || 0;

    const totalExpensesAmount =
      (monthExpenses._sum.amount || 0) + (monthSalaries._sum.amount || 0);

    const netIncome = totalIncome - totalExpensesAmount;

    res.json({
      success: true,

      data: {
        currentMonth: {
          month: now.toLocaleString("default", { month: "long" }),

          year: now.getFullYear(),
        },

        income: {
          totalFeeCollected: totalIncome,

          feePaymentsCount: monthFees._count,
        },

        expenses: {
          generalExpenses: monthExpenses._sum.amount || 0,

          salaryExpenses: monthSalaries._sum.amount || 0,

          totalExpenses: totalExpensesAmount,

          expenseCount: monthExpenses._count + monthSalaries._count,
        },

        netIncome: {
          amount: netIncome,

          status: netIncome >= 0 ? "Profit" : "Loss",
        },

        borrowings: {
          pendingAmount: pendingBorrowings._sum.amount || 0,

          pendingCount: pendingBorrowings._count,
        },

        counts: {
          totalStudents,

          totalActiveStaff: totalStaff,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch dashboard summary.",
    });
  }
};
