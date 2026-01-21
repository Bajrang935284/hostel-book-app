



import { prisma } from "../config/database.js";
import { hashPassword, comparePassword } from "../utils/passwordHelper.js";
import { generateToken } from "../utils/jwtHelper.js";
import { generateViewUrl } from '../services/s3Service.js';// ====================== AUTHENTICATION ======================




// Helper: Calculate Fee accurately
const calculateProratedFee = (year, month, monthlyFee, joinDate) => {
  // Month is 1-12 (Human), joinDate.getMonth() is 0-11 (JS)
  const isJoiningMonth = 
    joinDate.getMonth() === (month - 1) && 
    joinDate.getFullYear() === year;

  // If not joining month, full fee applies
  if (!isJoiningMonth) return monthlyFee;

  // If joined on the 1st, full fee applies
  if (joinDate.getDate() === 1) return monthlyFee;

  // Get total days in that specific month (e.g., Feb 2024 = 29)
  // new Date(year, month, 0) gives the last day of 'month'
  const daysInMonth = new Date(year, month, 0).getDate();
  const joiningDay = joinDate.getDate();
  
  // Calculate days to pay (Inclusive of joining day)
  const daysToStay = daysInMonth - joiningDay + 1;
  const dailyRate = monthlyFee / daysInMonth;

  return Math.round(dailyRate * daysToStay);
};

export const ownerRegister = async (req, res) => {
  try {
    const { name, phone, password, confirmPassword } = req.body;

    if (!name || !phone || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
    }

    const existingOwner = await prisma.hostelOwner.findUnique({
      where: { phone },
    });
    if (existingOwner) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number already registered." });
    }

    const hashedPassword = await hashPassword(password);
    const owner = await prisma.hostelOwner.create({
      data: { name, phone, password: hashedPassword },
      select: { id: true, name: true, phone: true, createdAt: true },
    });

    const token = generateToken({ id: owner.id, role: "owner" });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { token, user: { ...owner, role: "owner" } },
    });
  } catch (error) {
    console.error("Owner registration error:", error);
    res.status(500).json({ success: false, message: "Registration failed." });
  }
};

export const ownerLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Phone and password are required." });
    }

    const owner = await prisma.hostelOwner.findUnique({ where: { phone } });
    if (!owner) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const isPasswordValid = await comparePassword(password, owner.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const token = generateToken({ id: owner.id, role: "owner" });

    // create refresh token
    importRefresh: null;
    try {
      /* lazy import to avoid circular issues */
    } catch (e) {}
    const { default: refreshHelper } = await import(
      "../utils/refreshTokenHelper.js"
    );
    const { rawToken: refreshToken } = await refreshHelper.generateRefreshToken(
      owner.id,
      "owner"
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        refreshToken,
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
    res.status(500).json({ success: false, message: "Login failed." });
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
        _count: { select: { hostels: true, students: true } },
      },
    });
    res.json({ success: true, data: owner });
  } catch (error) {
    console.error("Get profile error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile." });
  }
};

// ====================== HOSTEL MANAGEMENT ======================

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
      return res
        .status(400)
        .json({
          success: false,
          message: "All required fields must be provided.",
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

    res
      .status(201)
      .json({
        success: true,
        message: "Hostel registered successfully",
        data: hostel,
      });
  } catch (error) {
    console.error("Register hostel error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to register hostel." });
  }
};

// export const getMyHostels = async (req, res) => {
//   try {
//     const ownerId = req.user.id;
//     const hostels = await prisma.hostel.findMany({
//       where: { ownerId },
//       include: { _count: { select: { students: true } } },
//       orderBy: { createdAt: "desc" },
//     });
//     res.json({ success: true, data: hostels });
//   } catch (error) {
//     console.error("Get hostels error:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to fetch hostels." });
//   }
// };


// src/controllers/ownerController.js

export const getMyHostels = async (req, res) => {
  try {
    let ownerId = req.user.id;

    // --- FIX FOR WARDEN: Return their assigned hostel ---
    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    
    if (userRole === 'WARDEN') {
        // Find the staff record and include the hostel details
        const staff = await prisma.staff.findUnique({
            where: { id: req.user.id },
            include: { hostel: true } 
        });

        if (!staff || !staff.hostel) {
            return res.json({ success: true, data: [] });
        }

        // Return it as a list so the frontend dropdown works automatically
        return res.json({ success: true, data: [staff.hostel] });
    }

    // --- NORMAL OWNER LOGIC ---
    const hostels = await prisma.hostel.findMany({
      where: { ownerId },
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: hostels });
  } catch (error) {
    console.error("Get hostels error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch hostels." });
  }
};
export const getHostelById = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const ownerId = req.user.id;

    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, ownerId },
      include: { _count: { select: { students: true } } },
    });

    if (!hostel)
      return res
        .status(404)
        .json({ success: false, message: "Hostel not found." });

    res.json({ success: true, data: hostel });
  } catch (error) {
    console.error("Get hostel error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch details." });
  }
};

// ====================== STUDENT MANAGEMENT ======================
export const registerStudent = async (req, res) => {
  try {
    const {
      name,
      parentName,
      parentPhone,
      parentEmail,
      secondaryPhone,     
      securityDeposit,    
      roomNumber,
      bedNumber,
      monthlyFee,
      feeDueDate,
      admissionDate,
      notes,
      hostelId,
    } = req.body;

    // --- FIX START: DETERMINE REAL OWNER ---
    let ownerId = req.user.id;

    // If the user is a WARDEN, look up the real Owner ID
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
        const staff = await prisma.staff.findUnique({ 
            where: { id: req.user.id } 
        });
        
        if (!staff) {
            return res.status(401).json({ success: false, message: "Unauthorized Staff." });
        }
        
        // Use the Owner's ID instead of the Warden's ID
        ownerId = staff.ownerId; 
    }
    // --- FIX END ---

    // -----------------------------
    // 1️⃣ REQUIRED FIELD VALIDATION
    // -----------------------------
    if (!name || !parentName || !parentPhone || !monthlyFee || !hostelId) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing.",
      });
    }

    // -----------------------------
    // 2️⃣ OPTIONAL FIELD VALIDATION
    // -----------------------------
    if (secondaryPhone && !/^\d{10}$/.test(secondaryPhone)) {
      return res.status(400).json({
        success: false,
        message: "Secondary phone must be 10 digits.",
      });
    }

    if (securityDeposit && isNaN(Number(securityDeposit))) {
      return res.status(400).json({
        success: false,
        message: "Security deposit must be a valid number.",
      });
    }

    const dueDateDay = feeDueDate ? parseInt(feeDueDate) : 1;

    // -----------------------------
    // 3️⃣ VERIFY HOSTEL OWNERSHIP
    // -----------------------------
    // This will now pass for Warden because 'ownerId' is swapped to the real Owner
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, ownerId },
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found.",
      });
    }

    // -----------------------------
    // 4️⃣ CREATE STUDENT
    // -----------------------------
    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail?.trim() || null,
        secondaryPhone: secondaryPhone?.trim() || null,
        securityDeposit: securityDeposit
          ? parseFloat(securityDeposit)
          : null,
        roomNumber: roomNumber?.trim() || null,
        bedNumber: bedNumber?.trim() || null,
        monthlyFee: parseFloat(monthlyFee),
        feeDueDate: dueDateDay,
        admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        notes: notes?.trim() || null,
        ownerId, // Stores the REAL Owner ID
        hostelId,
      },
    });

    // -----------------------------
    // CREATE PARENT CREDENTIALS
    // -----------------------------
    const cleanName = parentName
      .trim()
      .split(" ")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const randomDigits = Math.floor(100 + Math.random() * 900);
    const username = `${cleanName}@${randomDigits}`;

    const plainPassword = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const hashedPassword = await hashPassword(plainPassword);

    const parent = await prisma.parent.create({
      data: {
        username,
        password: hashedPassword,
        plainPassword,
        name: parentName,
        phone: parentPhone,
        email: parentEmail || null,
        studentId: student.id,
      },
    });

    // -----------------------------
    // 6️⃣ SUCCESS RESPONSE
    // -----------------------------
    return res.status(201).json({
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
    return res.status(500).json({
      success: false,
      message: "Failed to register student.",
    });
  }
};

// --- UPGRADED: Get Students with Pending Month Count ---
// export const getMyStudents = async (req, res) => {
//   try {
//     const ownerId = req.user.id;
//     const { hostelId } = req.query;
//     const where = { ownerId, ...(hostelId && { hostelId }) };

//     const students = await prisma.student.findMany({
//       where,
//       include: {
//         hostel: { select: { name: true } },
//         parent: { select: { username: true, phone: true } },
//         // Fetch all PAID records to calculate gaps
//         feeRecords: {
//           where: { status: "PAID" },
//           orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
//         },
//       },
//       orderBy: { roomNumber: "asc" },
//     });

//     const currentDate = new Date();

//     const processedStudents = students.map((student) => {
//       // Calculate how many months are pending since admission
//       const admission = new Date(student.admissionDate);
//       let pendingCount = 0;
//       let checkDate = new Date(
//         admission.getFullYear(),
//         admission.getMonth(),
//         1
//       );

//       // Loop from admission month until current month
//       while (
//         checkDate <
//         new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
//       ) {
//         const cMonth = checkDate.getMonth() + 1;
//         const cYear = checkDate.getFullYear();

//         // Is this specific month/year paid?
//         const isPaid = student.feeRecords.some(
//           (r) => r.billingMonth === cMonth && r.billingYear === cYear
//         );

//         if (!isPaid) {
//           // If it's the current month, only count it as pending if today > feeDueDate
//           if (
//             cMonth === currentDate.getMonth() + 1 &&
//             cYear === currentDate.getFullYear()
//           ) {
//             if (currentDate.getDate() > student.feeDueDate) {
//               pendingCount++;
//             }
//           } else {
//             pendingCount++;
//           }
//         }
//         checkDate.setMonth(checkDate.getMonth() + 1);
//       }

//       let status = "PAID";
//       let color = "green";
//       let message = "Up to date";

//       if (pendingCount > 0) {
//         status = "OVERDUE";
//         color = "red";
//         message = `${pendingCount} Month${pendingCount > 1 ? "s" : ""} Due`;
//       } else {
//         // Check if current month is upcoming
//         const today = currentDate.getDate();
//         if (today <= student.feeDueDate) {
//           status = "UPCOMING";
//           color = "orange";
//           message = "Due Soon";
//         }
//       }

//       return {
//         ...student,
//         feeStatus: { status, message, color, pendingCount },
//       };
//     });

//     res.json({ success: true, data: processedStudents });
//   } catch (error) {
//     console.error("Get students error:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to fetch students." });
//   }
// };

// --- UPGRADED: Get Students (Works for Owner AND Warden) ---
// src/controllers/ownerController.js

// export const getMyStudents = async (req, res) => {
//   try {
//     let ownerId = req.user.id;
//     const { hostelId } = req.query;

//     // --- FIX: DETECT WARDEN ROLE & SWAP ID ---
//     // We check both "WARDEN" and "warden" to be safe
//     const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    
//     if (userRole === 'WARDEN') {
//        // Find the staff record to get the real ownerId
//        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
//        if (!staff) return res.status(401).json({ message: "Unauthorized Staff" });
//        ownerId = staff.ownerId; // <--- Use the Owner's ID
//     }

//     const where = { ownerId, ...(hostelId && { hostelId }) };

//     // --- FETCH STUDENTS ---
//     const students = await prisma.student.findMany({
//       where,
//       include: {
//         hostel: { select: { name: true } },
//         parent: { select: { username: true, phone: true } },
//         feeRecords: {
//           where: { status: "PAID" },
//           orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
//         },
//       },
//       orderBy: { roomNumber: "asc" },
//     });

//     // --- CALCULATE DUES / STATUS ---
//     const currentDate = new Date();

//     const processedStudents = students.map((student) => {
//       const admission = new Date(student.admissionDate);
//       let pendingCount = 0;
//       let checkDate = new Date(admission.getFullYear(), admission.getMonth(), 1);

//       while (checkDate < new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)) {
//         const cMonth = checkDate.getMonth() + 1;
//         const cYear = checkDate.getFullYear();
//         const isPaid = student.feeRecords.some((r) => r.billingMonth === cMonth && r.billingYear === cYear);

//         if (!isPaid) {
//           if (cMonth === currentDate.getMonth() + 1 && cYear === currentDate.getFullYear()) {
//             if (currentDate.getDate() > student.feeDueDate) pendingCount++;
//           } else {
//             pendingCount++;
//           }
//         }
//         checkDate.setMonth(checkDate.getMonth() + 1);
//       }

//       let status = "PAID";
//       let color = "green";
//       let message = "Up to date";

//       if (pendingCount > 0) {
//         status = "OVERDUE";
//         color = "red";
//         message = `${pendingCount} Month${pendingCount > 1 ? "s" : ""} Due`;
//       } else {
//         const today = currentDate.getDate();
//         if (today <= student.feeDueDate) {
//           status = "UPCOMING";
//           color = "orange";
//           message = "Due Soon";
//         }
//       }

//       return {
//         ...student,
//         feeStatus: { status, message, color, pendingCount },
//       };
//     });

//     res.json({ success: true, data: processedStudents });

//   } catch (error) {
//     console.error("Get students error:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch students." });
//   }
// };

// src/controllers/ownerController.js


// Add this to your ownerController.js

// ====================== UPDATE STUDENT ======================
export const updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      name,
      parentName,
      parentPhone,
      parentEmail,
      secondaryPhone,
      securityDeposit,
      roomNumber,
      bedNumber,
      monthlyFee,
      feeDueDate,
      admissionDate,
      notes,
    } = req.body;

    // --- DETERMINE REAL OWNER (SAME AS REGISTER) ---
    let ownerId = req.user.id;

    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
      const staff = await prisma.staff.findUnique({ 
        where: { id: req.user.id } 
      });
      
      if (!staff) {
        return res.status(401).json({ success: false, message: "Unauthorized Staff." });
      }
      
      ownerId = staff.ownerId;
    }

    // --- VALIDATION ---
    if (!name || !parentName || !parentPhone || !monthlyFee) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing.",
      });
    }

    // Validate phone numbers
    if (!/^\d{10}$/.test(parentPhone)) {
      return res.status(400).json({
        success: false,
        message: "Primary phone must be 10 digits.",
      });
    }

    if (secondaryPhone && !/^\d{10}$/.test(secondaryPhone)) {
      return res.status(400).json({
        success: false,
        message: "Secondary phone must be 10 digits.",
      });
    }

    // Validate security deposit
    if (securityDeposit && isNaN(Number(securityDeposit))) {
      return res.status(400).json({
        success: false,
        message: "Security deposit must be a valid number.",
      });
    }

    // --- VERIFY STUDENT OWNERSHIP ---
    const existingStudent = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied.",
      });
    }

    // --- UPDATE STUDENT ---
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        name: name.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail?.trim() || null,
        secondaryPhone: secondaryPhone?.trim() || null,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : null,
        roomNumber: roomNumber?.trim() || null,
        bedNumber: bedNumber?.trim() || null,
        monthlyFee: parseFloat(monthlyFee),
        feeDueDate: feeDueDate ? parseInt(feeDueDate) : 1,
        admissionDate: admissionDate ? new Date(admissionDate) : existingStudent.admissionDate,
        notes: notes?.trim() || null,
        updatedAt: new Date(),
      },
      include: {
        hostel: { select: { name: true } },
        parent: { select: { username: true, phone: true } },
      },
    });

    // --- OPTIONAL: Update Parent Record Too ---
    if (existingStudent.parent) {
      await prisma.parent.update({
        where: { studentId },
        data: {
          name: parentName.trim(),
          phone: parentPhone.trim(),
          email: parentEmail?.trim() || null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });

  } catch (error) {
    console.error("Update student error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update student.",
    });
  }
};

// export const getMyStudents = async (req, res) => {
//   try {
//     let ownerId = req.user.id;
//     const { hostelId } = req.query; // Frontend sends this now!

//     // --- FIX: DETECT WARDEN & SWAP ID ---
//     const userRole = req.user.role ? req.user.role.toUpperCase() : '';

//     if (userRole === 'WARDEN') {
//        // 1. Get real Owner ID
//        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
//        if (!staff) return res.status(401).json({ message: "Unauthorized Staff" });
//        ownerId = staff.ownerId; 
       
//        // 2. SAFETY CHECK: Ensure Warden only sees THEIR hostel
//        // If the frontend didn't send a hostelId, force it to the Warden's assigned hostel
//        if (!hostelId) {
//          // This forces the query to use the Warden's specific hostel
//          // But usually, Step 2 (getMyHostels) fixes the frontend so hostelId is passed correctly.
//        }
//     }

//     // Prepare Query
//     const where = { ownerId, ...(hostelId && { hostelId }) };

//     // --- FETCH STUDENTS ---
//     const students = await prisma.student.findMany({
//       where,
//       include: {
//         hostel: { select: { name: true } },
//         parent: { select: { username: true, phone: true } },
//         feeRecords: {
//           where: { status: "PAID" },
//           orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
//         },
//       },
//       orderBy: { roomNumber: "asc" },
//     });

//     // --- CALCULATE DUES/STATUS (Your existing logic) ---
//     const currentDate = new Date();
//     const processedStudents = students.map((student) => {
//       const admission = new Date(student.admissionDate);
//       let pendingCount = 0;
//       let checkDate = new Date(admission.getFullYear(), admission.getMonth(), 1);

//       while (checkDate < new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)) {
//         const cMonth = checkDate.getMonth() + 1;
//         const cYear = checkDate.getFullYear();
//         const isPaid = student.feeRecords.some((r) => r.billingMonth === cMonth && r.billingYear === cYear);

//         if (!isPaid) {
//           if (cMonth === currentDate.getMonth() + 1 && cYear === currentDate.getFullYear()) {
//             if (currentDate.getDate() > student.feeDueDate) pendingCount++;
//           } else {
//             pendingCount++;
//           }
//         }
//         checkDate.setMonth(checkDate.getMonth() + 1);
//       }

//       let status = "PAID";
//       let color = "green";
//       let message = "Up to date";

//       if (pendingCount > 0) {
//         status = "OVERDUE";
//         color = "red";
//         message = `${pendingCount} Month${pendingCount > 1 ? "s" : ""} Due`;
//       } else {
//         const today = currentDate.getDate();
//         if (today <= student.feeDueDate) {
//           status = "UPCOMING";
//           color = "orange";
//           message = "Due Soon";
//         }
//       }

//       return {
//         ...student,
//         feeStatus: { status, message, color, pendingCount },
//       };
//     });

//     res.json({ success: true, data: processedStudents });

//   } catch (error) {
//     console.error("Get students error:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch students." });
//   }
// };


export const getMyStudents = async (req, res) => {
  try {
    let ownerId = req.user.id;
    const { hostelId, includeInactive } = req.query; // Add includeInactive param

    // --- DETECT WARDEN & SWAP ID ---
    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    if (userRole === 'WARDEN') {
       const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
       if (!staff) return res.status(401).json({ message: "Unauthorized Staff" });
       ownerId = staff.ownerId; 
    }

    // Prepare Query - ONLY ACTIVE STUDENTS BY DEFAULT
    const where = { 
      ownerId, 
      ...(hostelId && { hostelId }),
      // Only show ACTIVE students unless explicitly requested
      ...(includeInactive !== 'true' && { status: 'ACTIVE' })
    };

    // --- FETCH STUDENTS ---
    const students = await prisma.student.findMany({
      where,
      include: {
        hostel: { select: { name: true } },
        parent: { select: { username: true, phone: true } },
        feeRecords: {
          where: { status: "PAID" },
          orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
        },
      },
      orderBy: { roomNumber: "asc" },
    });

    // --- CALCULATE DUES/STATUS (Your existing logic) ---
    const currentDate = new Date();
    const processedStudents = students.map((student) => {
      const admission = new Date(student.admissionDate);
      let pendingCount = 0;
      let checkDate = new Date(admission.getFullYear(), admission.getMonth(), 1);

      while (checkDate < new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)) {
        const cMonth = checkDate.getMonth() + 1;
        const cYear = checkDate.getFullYear();
        const isPaid = student.feeRecords.some((r) => r.billingMonth === cMonth && r.billingYear === cYear);

        if (!isPaid) {
          if (cMonth === currentDate.getMonth() + 1 && cYear === currentDate.getFullYear()) {
            if (currentDate.getDate() > student.feeDueDate) pendingCount++;
          } else {
            pendingCount++;
          }
        }
        checkDate.setMonth(checkDate.getMonth() + 1);
      }

      let status = "PAID";
      let color = "green";
      let message = "Up to date";

      if (pendingCount > 0) {
        status = "OVERDUE";
        color = "red";
        message = `${pendingCount} Month${pendingCount > 1 ? "s" : ""} Due`;
      } else {
        const today = currentDate.getDate();
        if (today <= student.feeDueDate) {
          status = "UPCOMING";
          color = "orange";
          message = "Due Soon";
        }
      }

      return {
        ...student,
        feeStatus: { status, message, color, pendingCount },
      };
    });

    res.json({ success: true, data: processedStudents });

  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch students." });
  }
};

// export const getStudentById = async (req, res) => {
//   try {
//     const { studentId } = req.params;
//     const ownerId = req.user.id;

//     const student = await prisma.student.findFirst({
//       where: { id: studentId, ownerId },
//       include: {
//         hostel: { select: { id: true, name: true, hostelType: true } },
//         parent: true,
//       },
//     });

//     if (!student)
//       return res
//         .status(404)
//         .json({ success: false, message: "Student not found." });
//     res.json({ success: true, data: student });
//   } catch (error) {
//     console.error("Get student error:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to fetch student." });
//   }
// };

// ====================== GET DUES REPORT ======================
export const getDuesReport = async (req, res) => {
  try {
    let ownerId = req.user.id;
    const { year } = req.query;
    
    // Handle Warden
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
      const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
      if (!staff) return res.status(401).json({ message: "Unauthorized Staff" });
      ownerId = staff.ownerId;
    }

    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Fetch all ACTIVE students
    const students = await prisma.student.findMany({
      where: { 
        ownerId,
        status: 'ACTIVE' // Only active students have pending dues
      },
      include: {
        feeRecords: {
          where: { status: "PAID" },
        },
      },
    });

    // Calculate dues by month
    const monthlyDues = Array(12).fill(0).map((_, monthIndex) => ({
      month: monthIndex + 1,
      totalDue: 0,
      studentCount: 0
    }));

    const currentDate = new Date();
    
    students.forEach((student) => {
      const admissionDate = new Date(student.admissionDate);
      
      // Check each month of the target year
      for (let month = 1; month <= 12; month++) {
        const checkDate = new Date(targetYear, month - 1, 1);
        
        // Only check if:
        // 1. Month is after admission date
        // 2. Month is not in the future (for current year)
        if (checkDate < admissionDate) continue;
        if (targetYear === currentDate.getFullYear() && month > currentDate.getMonth() + 1) continue;
        
        // Check if this month is paid
        const isPaid = student.feeRecords.some(
          (r) => r.billingMonth === month && r.billingYear === targetYear
        );
        
        if (!isPaid) {
          // For current month, only count as due if past due date
          if (targetYear === currentDate.getFullYear() && month === currentDate.getMonth() + 1) {
            if (currentDate.getDate() > student.feeDueDate) {
              monthlyDues[month - 1].totalDue += student.monthlyFee;
              monthlyDues[month - 1].studentCount += 1;
            }
          } else if (checkDate < currentDate) {
            // Past months that are unpaid
            monthlyDues[month - 1].totalDue += student.monthlyFee;
            monthlyDues[month - 1].studentCount += 1;
          }
        }
      }
    });

    const totalDues = monthlyDues.reduce((sum, m) => sum + m.totalDue, 0);

    res.json({
      success: true,
      data: {
        year: targetYear,
        monthlyDues,
        totalDues,
        totalStudents: students.length
      }
    });

  } catch (error) {
    console.error("Get dues report error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dues report." });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    let ownerId = req.user.id;

    // --- FIX: Swap ID for Warden ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (staff) ownerId = staff.ownerId;
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId }, // Now checks Real Owner ID
      include: {
        hostel: { select: { id: true, name: true, hostelType: true } },
        parent: true,
      },
    });

    if (!student)
      return res.status(404).json({ success: false, message: "Student not found." });
    
    res.json({ success: true, data: student });
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch student." });
  }
};


export const updateStudentStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, reason, exitDate } = req.body;

    // --- DETERMINE REAL OWNER ---
    let ownerId = req.user.id;
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (!staff) return res.status(401).json({ success: false, message: "Unauthorized Staff." });
        ownerId = staff.ownerId; 
    }

    // Verify student exists and ownership
    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or unauthorized.",
      });
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'ALUMNI'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be ACTIVE, SUSPENDED, or ALUMNI.",
      });
    }

    // Update student status
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        status,
        exitDate: exitDate ? new Date(exitDate) : null,
        notes: reason ? `${student.notes ? student.notes + '\n\n' : ''}Status changed to ${status}: ${reason}` : student.notes,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        studentId,
        type: "STATUS_CHANGE",
        title: `Status Changed to ${status}`,
        description: reason || `Student status updated to ${status}`,
        status: "Completed",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Student status updated successfully",
      data: updatedStudent,
    });

  } catch (error) {
    console.error("Update student status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update student status.",
    });
  }
};


export const getAlumniStudents = async (req, res) => {
  try {
    let ownerId = req.user.id;
    const { hostelId } = req.query;

    // --- DETECT WARDEN & SWAP ID ---
    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    if (userRole === 'WARDEN') {
       const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
       if (!staff) return res.status(401).json({ message: "Unauthorized Staff" });
       ownerId = staff.ownerId; 
    }

    const where = { 
      ownerId, 
      status: 'ALUMNI',
      ...(hostelId && { hostelId })
    };

    const alumniStudents = await prisma.student.findMany({
      where,
      include: {
        hostel: { select: { name: true } },
        parent: { select: { username: true, phone: true } },
      },
      orderBy: { exitDate: 'desc' },
    });

    res.json({ success: true, data: alumniStudents });

  } catch (error) {
    console.error("Get alumni error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch alumni students." });
  }
};
// ====================== FEE MANAGEMENT (UPDATED) ======================

// --- NEW: Get Details for Fee Collection Dropdown ---
// export const getStudentFeeDetails = async (req, res) => {
//   try {
//     const { studentId } = req.params;
//     const ownerId = req.user.id;

//     const student = await prisma.student.findFirst({
//       where: { id: studentId, ownerId },
//       include: {
//         feeRecords: {
//           orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
//         },
//       },
//     });

//     if (!student)
//       return res
//         .status(404)
//         .json({ success: false, message: "Student not found" });

//     const pendingCycles = [];
//     const admissionDate = new Date(student.admissionDate);
//     const currentDate = new Date();

//     // Normalize start date to first of admission month
//     let checkDate = new Date(
//       admissionDate.getFullYear(),
//       admissionDate.getMonth(),
//       1
//     );

//     const getMonthName = (d) => d.toLocaleString("default", { month: "long" });

//     // Loop through all months since admission
//     while (checkDate <= currentDate) {
//       const checkMonth = checkDate.getMonth() + 1;
//       const checkYear = checkDate.getFullYear();

//       // Check if PAID record exists
//       const isPaid = student.feeRecords.some(
//         (r) =>
//           r.billingMonth === checkMonth &&
//           r.billingYear === checkYear &&
//           r.status === "PAID"
//       );

//       if (!isPaid) {
//         pendingCycles.push({
//           month: checkMonth,
//           year: checkYear,
//           label: `${getMonthName(checkDate)} ${checkYear}`,
//           amount: student.monthlyFee,
//           isCurrentMonth:
//             checkMonth === currentDate.getMonth() + 1 &&
//             checkYear === currentDate.getFullYear(),
//         });
//       }
//       checkDate.setMonth(checkDate.getMonth() + 1);
//     }

//     res.json({
//       success: true,
//       data: {
//         studentDetails: {
//           name: student.name,
//           monthlyFee: student.monthlyFee,
//           parentName: student.parentName,
//           roomNumber: student.roomNumber,
//         },
//         pendingMonths: pendingCycles, // UI uses this for the Dropdown
//         history: student.feeRecords,
//       },
//     });
//   } catch (error) {
//     console.error("Get fee details error:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to fetch fee details" });
//   }
// };


// export const getStudentFeeDetails = async (req, res) => {
//   try {
//     const { studentId } = req.params;
//     const ownerId = req.user.id;

//     const student = await prisma.student.findFirst({
//       where: { id: studentId, ownerId },
//       include: {
//         feeRecords: {
//           orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
//         },
//       },
//     });

//     if (!student)
//       return res
//         .status(404)
//         .json({ success: false, message: "Student not found" });

//     const pendingCycles = [];
//     const admissionDate = new Date(student.admissionDate);
//     const currentDate = new Date();

//     // Normalize start date to first of admission month
//     let checkDate = new Date(
//       admissionDate.getFullYear(),
//       admissionDate.getMonth(),
//       1
//     );

//     const getMonthName = (d) => d.toLocaleString("default", { month: "long" });

//     // Loop through all months since admission
//     while (checkDate <= currentDate) {
//       const checkMonth = checkDate.getMonth() + 1;
//       const checkYear = checkDate.getFullYear();

//       // 1. Find if a record exists for this specific month
//       const record = student.feeRecords.find(
//         (r) => r.billingMonth === checkMonth && r.billingYear === checkYear
//       );

//       // 2. Calculate Due Amount
//       let dueAmount = student.monthlyFee; // Default: Full Fee is due

//       if (record) {
//         if (record.status === "PAID") {
//           dueAmount = 0; // Nothing due
//         } else {
//           // If PARTIAL or PENDING, subtract what has already been paid
//           // We use 'paidAmount' from your schema
//           const paidSoFar = record.paidAmount || 0;
//           dueAmount = Math.max(0, student.monthlyFee - paidSoFar);
//         }
//       }

//       // 3. If there is money left to pay, add to list
//       if (dueAmount > 0) {
//         pendingCycles.push({
//           month: checkMonth,
//           year: checkYear,
//           label: `${getMonthName(checkDate)} ${checkYear}`,
//           amount: dueAmount, // <--- Sends REMAINING amount (e.g., 4000) instead of full fee
//           isCurrentMonth:
//             checkMonth === currentDate.getMonth() + 1 &&
//             checkYear === currentDate.getFullYear(),
//         });
//       }
      
//       checkDate.setMonth(checkDate.getMonth() + 1);
//     }

//     res.json({
//       success: true,
//       data: {
//         studentDetails: {
//           name: student.name,
//           monthlyFee: student.monthlyFee,
//           parentName: student.parentName,
//           roomNumber: student.roomNumber,
//         },
//         pendingMonths: pendingCycles, 
//         history: student.feeRecords,
//       },
//     });
//   } catch (error) {
//     console.error("Get fee details error:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to fetch fee details" });
//   }
// };

// Replace the existing getStudentFeeDetails function in ownerController.js

// export const getStudentFeeDetails = async (req, res) => {
//   try {
//     const { studentId } = req.params;
//     const ownerId = req.user.id;

//     const student = await prisma.student.findFirst({
//       where: { id: studentId, ownerId },
//       include: {
//         feeRecords: {
//           orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
//         },
//       },
//     });

//     if (!student)
//       return res.status(404).json({ success: false, message: "Student not found" });

//     const pendingCycles = [];
//     const admissionDate = new Date(student.admissionDate);
//     const currentDate = new Date();

//     let checkDate = new Date(
//       admissionDate.getFullYear(),
//       admissionDate.getMonth(),
//       1
//     );

//     const getMonthName = (d) => d.toLocaleString("default", { month: "long" });

//     // Helper: Only used if NO record exists (for future/unpaid months)
//     const calculateProratedFee = (year, month, monthlyFee, joinDate) => {
//       const isJoiningMonth = 
//         joinDate.getMonth() === (month - 1) && 
//         joinDate.getFullYear() === year;
      
//       if (!isJoiningMonth) return monthlyFee;
      
//       const daysInMonth = new Date(year, month, 0).getDate();
//       const joiningDay = joinDate.getDate();
//       const daysToStay = daysInMonth - joiningDay + 1;
//       const dailyRate = monthlyFee / daysInMonth;
      
//       return Math.round(dailyRate * daysToStay);
//     };

//     while (checkDate <= currentDate) {
//       const checkMonth = checkDate.getMonth() + 1;
//       const checkYear = checkDate.getFullYear();

//       const record = student.feeRecords.find(
//         (r) => r.billingMonth === checkMonth && r.billingYear === checkYear
//       );

//       // ============================================================
//       // CRITICAL FIX: Snapshot Logic
//       // ============================================================
//       let fullFeeForCycle;

//       if (record) {
//           // 1. If a record exists (Paid or Partial), use the HISTORICAL fee.
//           // This prevents current fee changes from affecting past records.
//           fullFeeForCycle = record.totalAmount; 
//       } else {
//           // 2. If no record exists (Unpaid), use the CURRENT fee.
//           fullFeeForCycle = calculateProratedFee(
//             checkYear, 
//             checkMonth, 
//             student.monthlyFee, 
//             admissionDate
//           );
//       }
//       // ============================================================
      
//       let dueAmount = fullFeeForCycle; 

//       if (record) {
//         if (record.status === "PAID") {
//           dueAmount = 0; 
//         } else {
//           const paidSoFar = record.paidAmount || 0;
//           dueAmount = Math.max(0, fullFeeForCycle - paidSoFar);
//         }
//       }

//       if (dueAmount > 0) {
//         pendingCycles.push({
//           month: checkMonth,
//           year: checkYear,
//           label: `${getMonthName(checkDate)} ${checkYear}`,
//           amount: dueAmount,
//           totalAmount: fullFeeForCycle, // Send this to frontend for label logic
//           isCurrentMonth:
//             checkMonth === currentDate.getMonth() + 1 &&
//             checkYear === currentDate.getFullYear(),
//         });
//       }
      
//       checkDate.setMonth(checkDate.getMonth() + 1);
//     }

//     res.json({
//       success: true,
//       data: {
//         studentDetails: {
//           name: student.name,
//           monthlyFee: student.monthlyFee,
//           parentName: student.parentName,
//           roomNumber: student.roomNumber,
//         },
//         pendingMonths: pendingCycles, 
//         history: student.feeRecords,
//       },
//     });
//   } catch (error) {
//     console.error("Get fee details error:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch fee details" });
//   }
// };

// export const getStudentFeeDetails = async (req, res) => {
//   try {
//     const { studentId } = req.params;
//     const ownerId = req.user.id;

//     const student = await prisma.student.findFirst({
//       where: { id: studentId, ownerId },
//       include: {
//         feeRecords: {
//           orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
//         },
//       },
//     });

//     if (!student)
//       return res.status(404).json({ success: false, message: "Student not found" });

//     const pendingCycles = [];
//     const admissionDate = new Date(student.admissionDate);
//     const currentDate = new Date();

//     let checkDate = new Date(
//       admissionDate.getFullYear(),
//       admissionDate.getMonth(),
//       1
//     );

//     const getMonthName = (d) => d.toLocaleString("default", { month: "long" });

//     const calculateProratedFee = (year, month, monthlyFee, joinDate) => {
//       const isJoiningMonth = 
//         joinDate.getMonth() === (month - 1) && 
//         joinDate.getFullYear() === year;
      
//       if (!isJoiningMonth) return monthlyFee;
      
//       const daysInMonth = new Date(year, month, 0).getDate();
//       const joiningDay = joinDate.getDate();
//       const daysToStay = daysInMonth - joiningDay + 1;
//       const dailyRate = monthlyFee / daysInMonth;
      
//       return Math.round(dailyRate * daysToStay);
//     };

//     while (checkDate <= currentDate) {
//       const checkMonth = checkDate.getMonth() + 1;
//       const checkYear = checkDate.getFullYear();

//       const record = student.feeRecords.find(
//         (r) => r.billingMonth === checkMonth && r.billingYear === checkYear
//       );

//       let fullFeeForCycle;

//       if (record) {
//           fullFeeForCycle = record.totalAmount; 
//       } else {
//           fullFeeForCycle = calculateProratedFee(
//             checkYear, 
//             checkMonth, 
//             student.monthlyFee, 
//             admissionDate
//           );
//       }
      
//       let dueAmount = fullFeeForCycle; 

//       if (record) {
//         if (record.status === "PAID") {
//           dueAmount = 0; 
//         } else {
//           const paidSoFar = record.paidAmount || 0;
//           dueAmount = Math.max(0, fullFeeForCycle - paidSoFar);
//         }
//       }

//       if (dueAmount > 0) {
//         pendingCycles.push({
//           month: checkMonth,
//           year: checkYear,
//           label: `${getMonthName(checkDate)} ${checkYear}`,
//           amount: dueAmount,
//           totalAmount: fullFeeForCycle,
//           isCurrentMonth:
//             checkMonth === currentDate.getMonth() + 1 &&
//             checkYear === currentDate.getFullYear(),
//         });
//       }
      
//       checkDate.setMonth(checkDate.getMonth() + 1);
//     }

//     // ✅ GENERATE SIGNED URLs FOR HISTORY PROOFS
//     const historyWithUrls = await Promise.all(
//       student.feeRecords.map(async (record) => {
//         let proofUrls = [];
        
//         if (record.proofImageKeys && record.proofImageKeys.length > 0) {
//           try {
//             proofUrls = await Promise.all(
//               record.proofImageKeys.map(key => generateViewUrl(key))
//             );
//           } catch (error) {
//             console.error(`Failed to generate URLs for record ${record.id}:`, error);
//           }
//         }
        
//         return {
//           ...record,
//           proofUrls // ✅ Frontend will use this array
//         };
//       })
//     );

//     res.json({
//       success: true,
//       data: {
//         studentDetails: {
//           name: student.name,
//           monthlyFee: student.monthlyFee,
//           parentName: student.parentName,
//           roomNumber: student.roomNumber,
//         },
//         pendingMonths: pendingCycles, 
//         history: historyWithUrls, // ✅ Send history with signed URLs
//       },
//     });
//   } catch (error) {
//     console.error("Get fee details error:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch fee details" });
//   }
// };

// Replace your existing getStudentFeeDetails with this one
export const getStudentFeeDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId }, // Checks REAL Owner ID (handled by middleware/logic)
      include: {
        feeRecords: {
          orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
        },
      },
    });

    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    const pendingCycles = [];
    const admissionDate = new Date(student.admissionDate);
    const currentDate = new Date();

    // Start checking from the 1st of admission month
    let checkDate = new Date(
      admissionDate.getFullYear(),
      admissionDate.getMonth(),
      1
    );

    const getMonthName = (d) => d.toLocaleString("default", { month: "long" });

    // --- REUSE THE SAME HELPER FROM THE FIXES ---
    const calculateProratedFee = (year, month, monthlyFee, joinDate) => {
        const isJoiningMonth = 
          joinDate.getMonth() === (month - 1) && 
          joinDate.getFullYear() === year;
      
        if (!isJoiningMonth) return monthlyFee;
        if (joinDate.getDate() === 1) return monthlyFee;
      
        const daysInMonth = new Date(year, month, 0).getDate();
        const joiningDay = joinDate.getDate();
        const daysToStay = daysInMonth - joiningDay + 1;
        const dailyRate = monthlyFee / daysInMonth;
      
        return Math.round(dailyRate * daysToStay);
    };
    // --------------------------------------------

    while (checkDate <= currentDate) {
      const checkMonth = checkDate.getMonth() + 1;
      const checkYear = checkDate.getFullYear();

      const record = student.feeRecords.find(
        (r) => r.billingMonth === checkMonth && r.billingYear === checkYear
      );

      // ============================================================
      // 🔒 CONSISTENT FEE LOGIC
      // ============================================================
      let fullFeeForCycle;

      if (record) {
          // If record exists, trust the historical locked amount
          fullFeeForCycle = record.totalAmount; 
      } else {
          // If no record, calculate exactly like collectAdvanceFee does
          fullFeeForCycle = calculateProratedFee(
            checkYear, 
            checkMonth, 
            student.monthlyFee, 
            admissionDate
          );
      }
      // ============================================================
      
      let dueAmount = fullFeeForCycle; 

      if (record) {
        if (record.status === "PAID") {
          dueAmount = 0; 
        } else {
          const paidSoFar = record.paidAmount || 0;
          dueAmount = Math.max(0, fullFeeForCycle - paidSoFar);
        }
      }

      if (dueAmount > 0) {
        pendingCycles.push({
          month: checkMonth,
          year: checkYear,
          label: `${getMonthName(checkDate)} ${checkYear}`,
          amount: dueAmount,
          totalAmount: fullFeeForCycle, 
          isCurrentMonth:
            checkMonth === currentDate.getMonth() + 1 &&
            checkYear === currentDate.getFullYear(),
        });
      }
      
      checkDate.setMonth(checkDate.getMonth() + 1);
    }

    // ✅ Generate signed URLs for history proofs
    const historyWithUrls = await Promise.all(
      student.feeRecords.map(async (record) => {
        let proofUrls = [];
        
        if (record.proofImageKeys && record.proofImageKeys.length > 0) {
          try {
            proofUrls = await Promise.all(
              record.proofImageKeys.map(key => generateViewUrl(key))
            );
          } catch (error) {
            console.error(`Failed to generate URLs for record ${record.id}:`, error);
          }
        }
        
        return {
          ...record,
          proofUrls
        };
      })
    );

    res.json({
      success: true,
      data: {
        studentDetails: {
          name: student.name,
          monthlyFee: student.monthlyFee,
          parentName: student.parentName,
          roomNumber: student.roomNumber,
        },
        pendingMonths: pendingCycles, 
        history: historyWithUrls,
      },
    });
  } catch (error) {
    console.error("Get fee details error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch fee details" });
  }
};


export const collectStudentFee = async (req, res) => {
  try {
    const {
      studentId,
      amount,
      securityDeduction = 0,
      paymentDate,
      paymentMonth,
      paymentYear,
      paymentMethod,
      notes,
      borrowingIds,
      proofImageKeys = [] // ✅ Expecting Array of Strings
    } = req.body;
    
    const ownerId = req.user.id;

    // ... (Your validation logic remains the same) ...
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Check existing record
    const existingRecord = await prisma.feeRecord.findUnique({
        where: {
            studentId_billingMonth_billingYear: {
                studentId,
                billingMonth: parseInt(paymentMonth),
                billingYear: parseInt(paymentYear)
            }
        }
    });

    // --- FEE CALCULATION LOGIC (Same as before) ---
    let totalDueForCycle;
    if (existingRecord) {
        totalDueForCycle = existingRecord.totalAmount;
    } else {
        const admissionDate = new Date(student.admissionDate);
        totalDueForCycle = calculateProratedFee(
            parseInt(paymentYear), 
            parseInt(paymentMonth), 
            student.monthlyFee, 
            admissionDate
        );
    }

    const previousPaid = existingRecord ? existingRecord.paidAmount : 0;
    const newTotalPaid = previousPaid + parseFloat(amount);
    const remaining = totalDueForCycle - newTotalPaid;

    let status = "PAID";
    if (remaining > 10) {
        status = "PARTIAL";
    }

    const actualDate = paymentDate ? new Date(paymentDate) : new Date();

    const result = await prisma.$transaction(async (prisma) => {
      
      // 1. Create Receipt
      const newPayment = await prisma.feePayment.create({
        data: {
          amount: parseFloat(amount),
          paymentDate: actualDate,
          paymentMonth: parseInt(paymentMonth),
          paymentYear: parseInt(paymentYear),
          paymentMethod: paymentMethod || "Cash",
          notes: notes || (status === "PARTIAL" ? "Partial Payment" : "Fee Payment"),
          status: "Completed",
          proofImageKeys: proofImageKeys, // ✅ Save S3 Keys to Receipt
          studentId,
          ownerId,
          hostelId: student.hostelId,
        },
      });

      // 2. Update/Create Fee Ledger
      await prisma.feeRecord.upsert({
        where: {
          studentId_billingMonth_billingYear: {
            studentId,
            billingMonth: parseInt(paymentMonth),
            billingYear: parseInt(paymentYear),
          },
        },
        update: { 
            status: status, 
            paidAmount: newTotalPaid,
            remainingAmount: remaining > 0 ? remaining : 0,
            lastPaymentDate: actualDate,
            paymentMethod,
            proofImageKeys: {
                push: proofImageKeys // ✅ Append keys to existing record
            }
        },
        create: {
          studentId,
          totalAmount: totalDueForCycle,
          paidAmount: parseFloat(amount),
          remainingAmount: remaining > 0 ? remaining : 0,
          billingMonth: parseInt(paymentMonth),
          billingYear: parseInt(paymentYear),
          status: status,
          lastPaymentDate: actualDate,
          paymentMethod,
          notes: "Collected via App",
          proofImageKeys: proofImageKeys, // ✅ Save keys to new record
        },
      });

      // 3. Mark Borrowings
      if (borrowingIds && borrowingIds.length > 0) {
        await prisma.studentBorrowing.updateMany({
          where: { id: { in: borrowingIds } },
          data: { status: "Repaid" },
        });
      }

      return newPayment;
    }, { timeout: 20000 });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to collect fee" });
  }
};

// --- UPDATED: Collect Fee with Transaction ---

// // --- 3. UPDATED: Collect Fee (Handles Borrowing Inclusion) ---
// export const collectStudentFee = async (req, res) => {
//   try {
//     const {
//       studentId,
//       amount, // Total Amount (Fee + Borrowing)
//       paymentDate,
//       paymentMonth,
//       paymentYear,
//       paymentMethod,
//       notes,
//       borrowingIds, // Array of borrowing IDs to mark as repaid
//     } = req.body;
//     const ownerId = req.user.id;

//     if (!studentId || !amount || !paymentMonth || !paymentYear) {
//       return res.status(400).json({ success: false, message: "Missing required fields." });
//     }

//     const student = await prisma.student.findUnique({ where: { id: studentId } });
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     const actualDate = paymentDate ? new Date(paymentDate) : new Date();
    
//     // Cycle Logic: Due date is based on the Billing Month + Student's Fee Due Day
//     // e.g., If Billing Month is Jan (1) and Due Day is 5, Due Date = Jan 5th.
//     const cycleDueDate = new Date(paymentYear, paymentMonth - 1, student.feeDueDate);

//     const result = await prisma.$transaction(async (prisma) => {
//       // A. Create Fee Payment Receipt (Records the TOTAL amount paid)
//       const newPayment = await prisma.feePayment.create({
//         data: {
//           amount: parseFloat(amount),
//           paymentDate: actualDate,
//           paymentMonth: parseInt(paymentMonth),
//           paymentYear: parseInt(paymentYear),
//           paymentMethod: paymentMethod || "Cash",
//           notes: notes || (borrowingIds?.length > 0 ? "Fee + Borrowing Repayment" : "Monthly Fee"),
//           status: "Completed",
//           studentId,
//           ownerId,
//           hostelId: student.hostelId,
//         },
//       });

//       // B. Update Fee Record (Ledger)
//       // We record the TOTAL amount here so the ledger shows the full money received for this cycle
//       await prisma.feeRecord.upsert({
//         where: {
//           studentId_billingMonth_billingYear: {
//             studentId,
//             billingMonth: parseInt(paymentMonth),
//             billingYear: parseInt(paymentYear),
//           },
//         },
//         update: { 
//             status: "PAID", 
//             amount: parseFloat(amount), // Update with total paid
//             paidDate: actualDate, 
//             paymentMethod 
//         },
//         create: {
//           studentId,
//           amount: parseFloat(amount), // Record total paid
//           billingMonth: parseInt(paymentMonth),
//           billingYear: parseInt(paymentYear),
//           dueDate: cycleDueDate,
//           status: "PAID",
//           paidDate: actualDate,
//           paymentMethod,
//           notes: "Collected via App",
//         },
//       });

//       // C. Mark Borrowings as Repaid (CRITICAL STEP)
//       if (borrowingIds && borrowingIds.length > 0) {
//         await prisma.studentBorrowing.updateMany({
//           where: { id: { in: borrowingIds } },
//           data: { status: "Repaid" },
//         });
//       }

//       // D. Activity Log
//       await prisma.activity.create({
//         data: {
//           studentId,
//           type: "PAYMENT",
//           title: "Payment Received",
//           description: `Received ₹${amount} for ${paymentMonth}/${paymentYear}`,
//           amount: parseFloat(amount),
//           status: "Completed",
//         },
//       });

//       return newPayment;
//     },
//   {
//       maxWait: 5000,
//       timeout: 20000 
//     });

//     res.status(201).json({ success: true, data: result });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Failed to collect fee" });
//   }
// };

// src/controllers/ownerController.js

// 1. UPDATE EXISTING: collectStudentFee (Handle Partial Logic)
// export const collectStudentFee = async (req, res) => {
//   try {
//     const {
//       studentId,
//       amount,
//       paymentDate,
//       paymentMonth,
//       paymentYear,
//       paymentMethod,
//       notes,
//       borrowingIds,
//     } = req.body;
//     const ownerId = req.user.id;

//     const student = await prisma.student.findUnique({ where: { id: studentId } });
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     // --- LOGIC FOR PARTIAL VS FULL ---
//     // Get existing record to check total due, or calculate from student.monthlyFee
//     const existingRecord = await prisma.feeRecord.findUnique({
//         where: {
//             studentId_billingMonth_billingYear: {
//                 studentId,
//                 billingMonth: parseInt(paymentMonth),
//                 billingYear: parseInt(paymentYear)
//             }
//         }
//     });

//     const totalDueForCycle = existingRecord ? existingRecord.totalAmount : student.monthlyFee;
//     const previousPaid = existingRecord ? existingRecord.paidAmount : 0;
    
//     // New total paid for this cycle
//     const newTotalPaid = previousPaid + parseFloat(amount);
//     const remaining = totalDueForCycle - newTotalPaid;

//     // Determine Status
//     let status = "PAID";
//     if (remaining > 10) { // Tolerance of 10rs
//         status = "PARTIAL";
//     }

//     const actualDate = paymentDate ? new Date(paymentDate) : new Date();

//     const result = await prisma.$transaction(async (prisma) => {
//       // 1. Create Receipt
//       const newPayment = await prisma.feePayment.create({
//         data: {
//           amount: parseFloat(amount),
//           paymentDate: actualDate,
//           paymentMonth: parseInt(paymentMonth),
//           paymentYear: parseInt(paymentYear),
//           paymentMethod: paymentMethod || "Cash",
//           notes: notes || (status === "PARTIAL" ? "Partial Payment" : "Fee Payment"),
//           status: "Completed",
//           studentId,
//           ownerId,
//           hostelId: student.hostelId,
//         },
//       });

//       // 2. Update/Create Fee Ledger
//       await prisma.feeRecord.upsert({
//         where: {
//           studentId_billingMonth_billingYear: {
//             studentId,
//             billingMonth: parseInt(paymentMonth),
//             billingYear: parseInt(paymentYear),
//           },
//         },
//         update: { 
//             status: status, 
//             paidAmount: newTotalPaid,
//             remainingAmount: remaining > 0 ? remaining : 0,
//             lastPaymentDate: actualDate,
//             paymentMethod 
//         },
//         create: {
//           studentId,
//           totalAmount: totalDueForCycle, 
//           paidAmount: parseFloat(amount),
//           remainingAmount: remaining > 0 ? remaining : 0,
//           billingMonth: parseInt(paymentMonth),
//           billingYear: parseInt(paymentYear),
//           status: status,
//           lastPaymentDate: actualDate,
//           paymentMethod,
//           notes: "Collected via App",
//         },
//       });

//       // 3. Mark Borrowings
//       if (borrowingIds && borrowingIds.length > 0) {
//         await prisma.studentBorrowing.updateMany({
//           where: { id: { in: borrowingIds } },
//           data: { status: "Repaid" },
//         });
//       }

//       return newPayment;
//     }, { timeout: 20000 });

//     res.status(201).json({ success: true, data: result });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Failed to collect fee" });
//   }
// };

// export const collectStudentFee = async (req, res) => {
//   try {
//     const {
//       studentId,
//       amount,
//       securityDeduction = 0, // ✅ ADD THIS
//       paymentDate,
//       paymentMonth,
//       paymentYear,
//       paymentMethod,
//       notes,
//       borrowingIds,
//       proofImageKeys = [] // ✅ ADD THIS
//     } = req.body;
//     const ownerId = req.user.id;

//     const student = await prisma.student.findUnique({ where: { id: studentId } });
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     const existingRecord = await prisma.feeRecord.findUnique({
//         where: {
//             studentId_billingMonth_billingYear: {
//                 studentId,
//                 billingMonth: parseInt(paymentMonth),
//                 billingYear: parseInt(paymentYear)
//             }
//         }
//     });

//     const totalDueForCycle = existingRecord ? existingRecord.totalAmount : student.monthlyFee;
//     const previousPaid = existingRecord ? existingRecord.paidAmount : 0;
    
//     const newTotalPaid = previousPaid + parseFloat(amount);
//     const remaining = totalDueForCycle - newTotalPaid;

//     let status = "PAID";
//     if (remaining > 10) {
//         status = "PARTIAL";
//     }

//     const actualDate = paymentDate ? new Date(paymentDate) : new Date();

//     const result = await prisma.$transaction(async (prisma) => {
//       // 1. Create Receipt WITH PROOF KEYS
//       const newPayment = await prisma.feePayment.create({
//         data: {
//           amount: parseFloat(amount),
//           paymentDate: actualDate,
//           paymentMonth: parseInt(paymentMonth),
//           paymentYear: parseInt(paymentYear),
//           paymentMethod: paymentMethod || "Cash",
//           notes: notes || (status === "PARTIAL" ? "Partial Payment" : "Fee Payment"),
//           status: "Completed",
//           proofImageKeys: proofImageKeys, // ✅ STORE S3 KEYS
//           studentId,
//           ownerId,
//           hostelId: student.hostelId,
//         },
//       });

//       // 2. Update/Create Fee Ledger WITH PROOF KEYS
//       await prisma.feeRecord.upsert({
//         where: {
//           studentId_billingMonth_billingYear: {
//             studentId,
//             billingMonth: parseInt(paymentMonth),
//             billingYear: parseInt(paymentYear),
//           },
//         },
//         update: { 
//             status: status, 
//             paidAmount: newTotalPaid,
//             remainingAmount: remaining > 0 ? remaining : 0,
//             lastPaymentDate: actualDate,
//             paymentMethod,
//             proofImageKeys: { // ✅ APPEND NEW KEYS
//               push: proofImageKeys
//             }
//         },
//         create: {
//           studentId,
//           totalAmount: totalDueForCycle, 
//           paidAmount: parseFloat(amount),
//           remainingAmount: remaining > 0 ? remaining : 0,
//           billingMonth: parseInt(paymentMonth),
//           billingYear: parseInt(paymentYear),
//           status: status,
//           lastPaymentDate: actualDate,
//           paymentMethod,
//           notes: "Collected via App",
//           proofImageKeys: proofImageKeys, // ✅ STORE KEYS
//         },
//       });

//       // 3. Mark Borrowings
//       if (borrowingIds && borrowingIds.length > 0) {
//         await prisma.studentBorrowing.updateMany({
//           where: { id: { in: borrowingIds } },
//           data: { status: "Repaid" },
//         });
//       }

//       return newPayment;
//     }, { timeout: 20000 });

//     res.status(201).json({ success: true, data: result });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Failed to collect fee" });
//   }
// };

// export const collectStudentFee = async (req, res) => {
//   try {
//     const {
//       studentId,
//       amount,
//       securityDeduction = 0,
//       paymentDate,
//       paymentMonth,
//       paymentYear,
//       paymentMethod,
//       notes,
//       borrowingIds,
//       proofImageKeys = []
//     } = req.body;
//     const ownerId = req.user.id;

//     const student = await prisma.student.findUnique({ where: { id: studentId } });
//     if (!student) return res.status(404).json({ message: "Student not found" });

//     // Check if record already exists
//     const existingRecord = await prisma.feeRecord.findUnique({
//         where: {
//             studentId_billingMonth_billingYear: {
//                 studentId,
//                 billingMonth: parseInt(paymentMonth),
//                 billingYear: parseInt(paymentYear)
//             }
//         }
//     });

//     // ============================================================
//     // 🔒 CALCULATE LOCKED TOTAL AMOUNT
//     // This value should NEVER change once set
//     // ============================================================
//     let totalDueForCycle;

//     if (existingRecord) {
//         // Record exists - use the historical totalAmount
//         totalDueForCycle = existingRecord.totalAmount;
//     } else {
//         // New record - calculate using CURRENT fee and lock it
//         const admissionDate = new Date(student.admissionDate);
//         const isJoiningMonth = 
//           admissionDate.getMonth() === (parseInt(paymentMonth) - 1) && 
//           admissionDate.getFullYear() === parseInt(paymentYear);
        
//         if (!isJoiningMonth || admissionDate.getDate() === 1) {
//           totalDueForCycle = student.monthlyFee;
//         } else {
//           // Prorated calculation for joining month
//           const daysInMonth = new Date(parseInt(paymentYear), parseInt(paymentMonth), 0).getDate();
//           const joiningDay = admissionDate.getDate();
//           const daysToStay = daysInMonth - joiningDay + 1;
//           const dailyRate = student.monthlyFee / daysInMonth;
//           totalDueForCycle = Math.round(dailyRate * daysToStay);
//         }
//     }
//     // ============================================================

//     const previousPaid = existingRecord ? existingRecord.paidAmount : 0;
//     const newTotalPaid = previousPaid + parseFloat(amount);
//     const remaining = totalDueForCycle - newTotalPaid;

//     let status = "PAID";
//     if (remaining > 10) {
//         status = "PARTIAL";
//     }

//     const actualDate = paymentDate ? new Date(paymentDate) : new Date();

//     const result = await prisma.$transaction(async (prisma) => {
//       // 1. Create Receipt
//       const newPayment = await prisma.feePayment.create({
//         data: {
//           amount: parseFloat(amount),
//           paymentDate: actualDate,
//           paymentMonth: parseInt(paymentMonth),
//           paymentYear: parseInt(paymentYear),
//           paymentMethod: paymentMethod || "Cash",
//           notes: notes || (status === "PARTIAL" ? "Partial Payment" : "Fee Payment"),
//           status: "Completed",
//           proofImageKeys: proofImageKeys,
//           studentId,
//           ownerId,
//           hostelId: student.hostelId,
//         },
//       });

//       // 2. Update/Create Fee Ledger with LOCKED totalAmount
//       await prisma.feeRecord.upsert({
//         where: {
//           studentId_billingMonth_billingYear: {
//             studentId,
//             billingMonth: parseInt(paymentMonth),
//             billingYear: parseInt(paymentYear),
//           },
//         },
//         update: { 
//             status: status, 
//             paidAmount: newTotalPaid,
//             remainingAmount: remaining > 0 ? remaining : 0,
//             lastPaymentDate: actualDate,
//             paymentMethod,
//             proofImageKeys: { 
//               push: proofImageKeys
//             }
//             // 🔒 NOTE: We do NOT update totalAmount here
//         },
//         create: {
//           studentId,
//           totalAmount: totalDueForCycle, // 🔒 LOCK the fee forever
//           paidAmount: parseFloat(amount),
//           remainingAmount: remaining > 0 ? remaining : 0,
//           billingMonth: parseInt(paymentMonth),
//           billingYear: parseInt(paymentYear),
//           status: status,
//           lastPaymentDate: actualDate,
//           paymentMethod,
//           notes: "Collected via App",
//           proofImageKeys: proofImageKeys,
//         },
//       });

//       // 3. Mark Borrowings
//       if (borrowingIds && borrowingIds.length > 0) {
//         await prisma.studentBorrowing.updateMany({
//           where: { id: { in: borrowingIds } },
//           data: { status: "Repaid" },
//         });
//       }

//       return newPayment;
//     }, { timeout: 20000 });

//     res.status(201).json({ success: true, data: result });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Failed to collect fee" });
//   }
// };



// ============================================================
// FIX: collectAdvanceFee - Lock totalAmount for each cycle
// ============================================================

export const collectAdvanceFee = async (req, res) => {
  try {
    const { 
      studentId, 
      totalAmount, 
      paymentMethod, 
      notes, 
      proofImageKeys = [] // Array of S3 keys from frontend
    } = req.body;
    
    const ownerId = req.user.id;

    // 1. FETCH DATA (Read only - No transaction yet)
    const student = await prisma.student.findUnique({ 
      where: { id: studentId },
      include: { 
        feeRecords: { 
          orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }] 
        } 
      }
    });

    if (!student) return res.status(404).json({ message: "Student not found" });

    // ---------------------------------------------------------
    // PHASE 1: CALCULATION (In Memory - Fast)
    // ---------------------------------------------------------
    const admissionDate = new Date(student.admissionDate);
    const currentDate = new Date();
    
    // We will calculate exact operations to perform in DB
    let moneyLeft = parseFloat(totalAmount);
    const operations = []; // Stores { month, year, amountToPay, fullFee, isNewRecord }
    const paidCycles = []; // For response

    // Start checking from Admission Month
    let checkDate = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1);
    
    // Safety break: Don't calculate more than 5 years into future to prevent infinite loops
    const maxFutureDate = new Date(currentDate.getFullYear() + 5, 11, 31); 

    while (moneyLeft > 0 && checkDate < maxFutureDate) {
      const checkMonth = checkDate.getMonth() + 1; // 1-12
      const checkYear = checkDate.getFullYear();

      // Find if record exists in the data we already fetched
      const existingRecord = student.feeRecords.find(
        r => r.billingMonth === checkMonth && r.billingYear === checkYear
      );

      let fullFeeForCycle;
      let alreadyPaid = 0;
      let isNewRecord = false;

      // A. DETERMINE TOTAL FEE FOR THIS CYCLE
      if (existingRecord) {
        // use historical locked amount
        fullFeeForCycle = existingRecord.totalAmount;
        alreadyPaid = existingRecord.paidAmount || 0;
      } else {
        // calculate prorated or full fee
        fullFeeForCycle = calculateProratedFee(
          checkYear, 
          checkMonth, 
          student.monthlyFee, 
          admissionDate
        );
        isNewRecord = true;
      }

      // B. CALCULATE HOW MUCH IS OWED
      const pendingForCycle = Math.max(0, fullFeeForCycle - alreadyPaid);

      // C. IF MONEY IS OWED, TRY TO PAY IT
      if (pendingForCycle > 0) {
        const paymentForCycle = Math.min(moneyLeft, pendingForCycle);
        
        // Add to operations queue
        operations.push({
          month: checkMonth,
          year: checkYear,
          existingRecordId: existingRecord ? existingRecord.id : null,
          fullFee: fullFeeForCycle,
          previousPaid: alreadyPaid,
          paymentAmount: paymentForCycle,
          isNew: isNewRecord
        });

        moneyLeft -= paymentForCycle;
        paidCycles.push({ month: checkMonth, year: checkYear });
      } else if (checkDate > currentDate && moneyLeft > 0) {
        // If it's a future month with 0 pending (likely fully paid already), 
        // we skip it and move to next month. 
        // If it was past/present fully paid, we just continue loop.
      }

      // Move to next month
      checkDate.setMonth(checkDate.getMonth() + 1);
    }

    // ---------------------------------------------------------
    // PHASE 2: EXECUTION (Database Transaction)
    // ---------------------------------------------------------
    await prisma.$transaction(async (prisma) => {
      
      // 1. Create One Main Receipt for the Bulk Amount
      const mainReceipt = await prisma.feePayment.create({
        data: {
          amount: parseFloat(totalAmount),
          paymentDate: new Date(),
          // Store range in months just for reference
          paymentMonth: paidCycles.length > 0 ? paidCycles[0].month : currentDate.getMonth() + 1,
          paymentYear: paidCycles.length > 0 ? paidCycles[0].year : currentDate.getFullYear(),
          paymentMethod: paymentMethod || "Cash",
          notes: notes || "Bulk Advance Payment",
          status: "Completed",
          proofImageKeys: proofImageKeys, // ✅ Save Array of S3 Keys
          studentId,
          ownerId,
          hostelId: student.hostelId,
        }
      });

      // 2. Execute Updates/Creates for Fee Records
      for (const op of operations) {
        const newTotalPaid = op.previousPaid + op.paymentAmount;
        const newRemaining = op.fullFee - newTotalPaid;
        // Tolerance of 10 for float math
        const newStatus = newRemaining <= 10 ? "PAID" : "PARTIAL";

        if (op.isNew) {
          // CREATE NEW RECORD
          await prisma.feeRecord.create({
            data: {
              studentId,
              totalAmount: op.fullFee, // 🔒 Locked Fee
              paidAmount: op.paymentAmount,
              remainingAmount: newRemaining > 0 ? newRemaining : 0,
              billingMonth: op.month,
              billingYear: op.year,
              status: newStatus,
              lastPaymentDate: new Date(),
              paymentMethod,
              notes: "Advance Fee",
              proofImageKeys: proofImageKeys // Optional: Attach proofs to individual records too
            }
          });
        } else {
          // UPDATE EXISTING RECORD
          await prisma.feeRecord.update({
            where: { id: op.existingRecordId },
            data: {
              status: newStatus,
              paidAmount: newTotalPaid,
              remainingAmount: newRemaining > 0 ? newRemaining : 0,
              lastPaymentDate: new Date(),
              proofImageKeys: {
                push: proofImageKeys // ✅ Append new images to existing array
              }
            }
          });
        }
      }

      // 3. Log Activity
      await prisma.activity.create({
        data: {
          studentId,
          type: "PAYMENT",
          title: "Bulk Payment Collected",
          description: `Collected ₹${totalAmount} covering ${paidCycles.length} month(s)`,
          amount: parseFloat(totalAmount),
          status: "Completed",
        },
      });

    }, { timeout: 20000 }); // Increase timeout to 20s just in case

    res.json({ 
      success: true, 
      message: "Payment collected successfully",
      data: { paidCycles } 
    });

  } catch (error) {
    console.error("Advance Fee Error:", error);
    res.status(500).json({ success: false, message: "Failed to collect fee" });
  }
};

// ====================== STAFF MANAGEMENT ======================

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

    if (!name || !phone || !role || !salary || !hostelId) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing." });
    }

    const existingStaff = await prisma.staff.findFirst({
      where: { phone, ownerId },
    });
    if (existingStaff)
      return res
        .status(400)
        .json({ success: false, message: "Staff already exists." });

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
      include: { hostel: { select: { name: true, city: true } } },
    });

    res
      .status(201)
      .json({ success: true, message: "Staff registered", data: staff });
  } catch (error) {
    console.error("Register staff error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to register staff." });
  }
};

export const getMyStaff = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { hostelId, role, isActive } = req.query;
    const where = {
      ownerId,
      ...(hostelId && { hostelId }),
      ...(role && { role }),
    };
    if (isActive !== undefined) where.isActive = isActive === "true";

    const staff = await prisma.staff.findMany({
      where,
      include: { hostel: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch staff." });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const { staffId } = req.params;
    const ownerId = req.user.id;
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, ownerId },
      include: { hostel: true },
    });

    if (!staff)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching staff." });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const ownerId = req.user.id;
    const data = req.body;

    const existing = await prisma.staff.findFirst({
      where: { id: staffId, ownerId },
    });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });

    const updated = await prisma.staff.update({ where: { id: staffId }, data });
    res.json({ success: true, message: "Updated", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed." });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const ownerId = req.user.id;
    const { permanent } = req.query;

    const existing = await prisma.staff.findFirst({
      where: { id: staffId, ownerId },
    });
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });

    if (permanent === "true") {
      await prisma.staff.delete({ where: { id: staffId } });
      return res.json({ success: true, message: "Permanently deleted." });
    } else {
      await prisma.staff.update({
        where: { id: staffId },
        data: { isActive: false },
      });
      return res.json({ success: true, message: "Deactivated." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed." });
  }
};

export const updateStaffSalary = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { salary } = req.body;
    await prisma.staff.update({
      where: { id: staffId },
      data: { salary: parseFloat(salary) },
    });
    res.json({ success: true, message: "Salary updated." });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

export const getStaffStats = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const totalStaff = await prisma.staff.count({ where: { ownerId } });
    const activeStaff = await prisma.staff.count({
      where: { ownerId, isActive: true },
    });
    res.json({ success: true, data: { totalStaff, activeStaff } });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

// ====================== EXPENSE MANAGEMENT ======================

// export const addExpense = async (req, res) => {
//   try {
//     const {
//       title,
//       amount,
//       category,
//       expenseDate,
//       description,
//       paymentMethod,
//       hostelId,
//     } = req.body;
//     const ownerId = req.user.id;

//     if (!title || !amount || !category || !hostelId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Required fields missing." });
//     }

//     const expense = await prisma.expense.create({
//       data: {
//         title,
//         amount: parseFloat(amount),
//         category,
//         expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
//         description,
//         paymentMethod: paymentMethod || "Cash",
//         ownerId,
//         hostelId,
//       },
//     });

//     res
//       .status(201)
//       .json({ success: true, message: "Expense added", data: expense });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Failed to add expense." });
//   }
// };

// --- UPDATED: Add Expense (Handles Warden Requests) ---
// export const addExpense = async (req, res) => {
//   try {
//     const {
//       title,
//       amount,
//       category,
//       expenseDate,
//       description,
//       paymentMethod,
//       hostelId,
//     } = req.body;

//     let ownerId = req.user.id;
    
//     // Default status is APPROVED for Owners, PENDING for Wardens
//     let status = "APPROVED"; 

//     // FIX: Detect Role
//     if (req.user.role === 'WARDEN') {
//        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
//        if (!staff) return res.status(401).json({ message: "Unauthorized" });
//        ownerId = staff.ownerId; 
//        status = "PENDING"; // Warden adds -> Goes to Pending
//     }

//     if (!title || !amount || !category || !hostelId) {
//       return res.status(400).json({ success: false, message: "Required fields missing." });
//     }

//     const expense = await prisma.expense.create({
//       data: {
//         title,
//         amount: parseFloat(amount),
//         category,
//         expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
//         description,
//         paymentMethod: paymentMethod || "Cash",
//         ownerId,
//         hostelId,
//         status, // Save the status
//       },
//     });

//     const msg = status === "PENDING" ? "Expense request sent to Owner" : "Expense added successfully";
//     res.status(201).json({ success: true, message: msg, data: expense });

//   } catch (error) {
//     console.error("Add Expense Error", error);
//     res.status(500).json({ success: false, message: "Failed to add expense." });
//   }
// };
// src/controllers/ownerController.js

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
      proofImageKey, // 🆕 S3 key sent by frontend after upload
    } = req.body;

    let ownerId = req.user.id;
    let status = "APPROVED"; // Default: Owner adds → Approved immediately

    // --- WARDEN DETECTION ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
      const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
      
      if (!staff) {
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized Staff." 
        });
      }
      
      ownerId = staff.ownerId; // Use Owner's ID
      status = "PENDING";      // Warden expenses need approval
    }

    // --- VALIDATION ---
    if (!title || !amount || !category || !hostelId) {
      return res.status(400).json({ 
        success: false, 
        message: "Required fields missing." 
      });
    }

    // --- VERIFY HOSTEL OWNERSHIP ---
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, ownerId }
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found or access denied."
      });
    }

    // --- CREATE EXPENSE WITH S3 KEY ---
    const expense = await prisma.expense.create({
      data: {
        title,
        amount: parseFloat(amount),
        category,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        description: description || null,
        paymentMethod: paymentMethod || "Cash",
        proofImageKey: proofImageKey || null, // 🆕 Store S3 key
        status,
        ownerId,
        hostelId,
      },
      include: {
        hostel: {
          select: { name: true }
        }
      }
    });

    const message = status === "PENDING" 
      ? "Expense request sent to Owner for approval" 
      : "Expense added successfully";

    res.status(201).json({ 
      success: true, 
      message, 
      data: expense 
    });

  } catch (error) {
    console.error("Add Expense Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to add expense." 
    });
  }
};
// export const getExpenses = async (req, res) => {
//   try {
//     const ownerId = req.user.id;
//     const { hostelId, category, startDate, endDate } = req.query;
//     const where = {
//       ownerId,
//       ...(hostelId && { hostelId }),
//       ...(category && { category }),
//     };

//     if (startDate || endDate) {
//       where.expenseDate = {};
//       if (startDate) where.expenseDate.gte = new Date(startDate);
//       if (endDate) where.expenseDate.lte = new Date(endDate);
//     }

//     const expenses = await prisma.expense.findMany({
//       where,
//       include: { hostel: { select: { name: true } } },
//       orderBy: { expenseDate: "desc" },
//     });
//     const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

//     res.json({ success: true, data: { expenses, totalAmount } });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to fetch expenses." });
//   }
// };

export const getExpenses = async (req, res) => {
  try {
    let ownerId = req.user.id;
    const { hostelId, category, startDate, endDate, status: queryStatus } = req.query;

    // --- WARDEN DETECTION ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
      const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
      if (staff) ownerId = staff.ownerId;
    }

    // --- BUILD QUERY ---
    const where = {
      ownerId,
      ...(hostelId && { hostelId }),
      ...(category && { category }),
      ...(queryStatus && { status: queryStatus }), // Filter by status if provided
    };

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    // --- FETCH EXPENSES ---
    const expenses = await prisma.expense.findMany({
      where,
      include: { 
        hostel: { 
          select: { id: true, name: true } 
        } 
      },
      orderBy: { expenseDate: "desc" },
    });

    // 🔥 GENERATE TEMPORARY VIEW URLS FOR PROOFS
    const expensesWithProofUrls = await Promise.all(
      expenses.map(async (expense) => {
        let proofUrl = null;

        if (expense.proofImageKey) {
          try {
            proofUrl = await generateViewUrl(expense.proofImageKey);
          } catch (error) {
            console.error(`Failed to generate URL for ${expense.proofImageKey}:`, error);
            // Don't fail the request, just log the error
          }
        }

        return {
          ...expense,
          proofUrl, // 🆕 Frontend uses this temporary URL
        };
      })
    );

    // --- CALCULATE TOTALS ---
    const totalAmount = expensesWithProofUrls
      .filter(e => e.status !== 'REJECTED') // Don't count rejected expenses
      .reduce((sum, e) => sum + e.amount, 0);

    res.json({ 
      success: true, 
      data: { 
        expenses: expensesWithProofUrls, 
        totalAmount 
      } 
    });

  } catch (error) {
    console.error("Get Expenses Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch expenses." 
    });
  }
};

// export const updateExpense = async (req, res) => {
//   try {
//     const { expenseId } = req.params;
//     const updated = await prisma.expense.update({
//       where: { id: expenseId },
//       data: req.body,
//     });
//     res.json({ success: true, data: updated });
//   } catch (e) {
//     res.status(500).json({ success: false });
//   }
// };

export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { 
      title, 
      amount, 
      category, 
      description, 
      paymentMethod,
      proofImageKey // 🆕 New proof key if image was changed
    } = req.body;

    let ownerId = req.user.id;

    // --- WARDEN DETECTION ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
      const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
      if (staff) ownerId = staff.ownerId;
    }

    // --- VERIFY OWNERSHIP ---
    const existingExpense = await prisma.expense.findFirst({
      where: { id: expenseId, ownerId }
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found or access denied."
      });
    }

    // --- PREVENT EDITING REJECTED EXPENSES ---
    if (existingExpense.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: "Cannot edit rejected expenses."
      });
    }

    // --- BUILD UPDATE DATA ---
    const updateData = {
      ...(title && { title }),
      ...(amount && { amount: parseFloat(amount) }),
      ...(category && { category }),
      ...(description !== undefined && { description }), // Allow clearing description
      ...(paymentMethod && { paymentMethod }),
    };

    // 🔥 UPDATE PROOF KEY IF PROVIDED
    if (proofImageKey !== undefined) {
      updateData.proofImageKey = proofImageKey; // Can be null to remove proof
    }

    // --- UPDATE EXPENSE ---
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: {
        hostel: {
          select: { name: true }
        }
      }
    });

    res.json({ 
      success: true, 
      message: "Expense updated successfully",
      data: updatedExpense 
    });

  } catch (error) {
    console.error("Update Expense Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update expense." 
    });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    await prisma.expense.delete({ where: { id: expenseId } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};


// --- NEW: Approve or Reject Expense ---

// ====================== SALARY PAYMENTS ======================

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

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });

    const existing = await prisma.salaryPayment.findFirst({
      where: {
        staffId,
        paymentMonth: parseInt(paymentMonth),
        paymentYear: parseInt(paymentYear),
      },
    });
    if (existing)
      return res
        .status(400)
        .json({
          success: false,
          message: "Salary already paid for this month",
        });

    const payment = await prisma.salaryPayment.create({
      data: {
        staffId,
        amount: parseFloat(amount),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMonth: parseInt(paymentMonth),
        paymentYear: parseInt(paymentYear),
        paymentMethod: paymentMethod || "Cash",
        notes,
        ownerId,
        hostelId: staff.hostelId,
      },
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to record salary." });
  }
};

export const getSalaryPayments = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const payments = await prisma.salaryPayment.findMany({
      where: { ownerId },
      include: { staff: { select: { name: true, role: true } } },
      orderBy: { paymentDate: "desc" },
    });
    res.json({ success: true, data: { payments } });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

// ====================== BORROWING ======================

// export const recordStudentBorrowing = async (req, res) => {
//   try {
//     const { studentId, amount, reason, dueDate, notes } = req.body;
//     const ownerId = req.user.id;
//     const student = await prisma.student.findUnique({
//       where: { id: studentId },
//     });

//     const borrow = await prisma.studentBorrowing.create({
//       data: {
//         studentId,
//         amount: parseFloat(amount),
//         reason,
//         dueDate: dueDate ? new Date(dueDate) : null,
//         notes,
//         status: "Pending",
//         ownerId,
//         hostelId: student.hostelId,
//       },
//     });
//     res.status(201).json({ success: true, data: borrow });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to record borrowing." });
//   }
// };

export const recordStudentBorrowing = async (req, res) => {
  try {
    const { studentId, amount, reason, dueDate, notes } = req.body;
    let ownerId = req.user.id;

    // --- FIX: Swap ID for Warden ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (staff) ownerId = staff.ownerId;
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    const borrow = await prisma.studentBorrowing.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        reason,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        status: "Pending",
        ownerId, // Now correctly saves under Owner
        hostelId: student.hostelId,
      },
    });
    res.status(201).json({ success: true, data: borrow });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to record borrowing." });
  }
};

// export const getStudentBorrowings = async (req, res) => {
//   try {
//     const ownerId = req.user.id;
//     const { studentId } = req.query; // Updated to support filter

//     const where = { ownerId };
//     if (studentId) where.studentId = studentId;

//     const borrowings = await prisma.studentBorrowing.findMany({
//       where,
//       include: { student: { select: { name: true } } },
//       orderBy: { borrowDate: "desc" },
//     });
//     res.json({ success: true, data: { borrowings } });
//   } catch (e) {
//     res.status(500).json({ success: false });
//   }
// };

export const getStudentBorrowings = async (req, res) => {
  try {
    let ownerId = req.user.id;
    const { studentId } = req.query;

    // --- FIX: Swap ID for Warden ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (staff) ownerId = staff.ownerId;
    }

    const where = { ownerId };
    if (studentId) where.studentId = studentId;

    const borrowings = await prisma.studentBorrowing.findMany({
      where,
      include: { student: { select: { name: true } } },
      orderBy: { borrowDate: "desc" },
    });
    
    res.json({ success: true, data: { borrowings } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
};

export const deleteBorrowing = async (req, res) => {
  try {
    const { borrowingId } = req.params;
    await prisma.studentBorrowing.delete({ where: { id: borrowingId } });
    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};
export const updateBorrowingStatus = async (req, res) => {
  try {
    const { borrowingId } = req.params;
    const { status } = req.body;
    const updated = await prisma.studentBorrowing.update({
      where: { id: borrowingId },
      data: { status },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

// ====================== REPORTS & DASHBOARD ======================

export const getDashboardSummary = async (req, res) => {
  try {
    const ownerId = req.user.id;
    // Fix 1: Read hostelId from headers if passed (since your frontend sends it in headers)
    const hostelId = req.headers["x-hostel-id"] || req.query.hostelId || null;

    // Fix 2: Read month/year from query params instead of using "now"
    const { month, year } = req.query;
    const currentDate = new Date();
    
    // Default to current date if params are missing
    const selectedYear = year ? parseInt(year) : currentDate.getFullYear();
    const selectedMonth = month ? parseInt(month) : currentDate.getMonth() + 1;

    // Calculate start/end based on SELECTED month, not current month
    const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

    const where = { ownerId, ...(hostelId && { hostelId }) };

    // Fix 3: Fetch Pending Borrowings (missing in your old code)
    const [monthExpenses, monthSalaries, monthFees, totalStudents, pendingBorrowings] =
      await Promise.all([
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
            paymentMonth: selectedMonth,
            paymentYear: selectedYear,
          },
          _sum: { amount: true },
        }),
        prisma.feePayment.aggregate({
          where: {
            ...where,
            paymentDate: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.student.count({ where }),
        prisma.studentBorrowing.aggregate({
          where: { ...where, status: "Pending" },
          _sum: { amount: true },
        }),
      ]);

    const totalIncome = monthFees._sum.amount || 0;
    const totalSalaries = monthSalaries._sum.amount || 0;
    const totalGenExpenses = monthExpenses._sum.amount || 0;
    const totalExpenses = totalGenExpenses + totalSalaries;
    const netIncome = totalIncome - totalExpenses;

    // Fix 4: Return the specific structure your frontend expects
    // Frontend expects: income.totalFeeCollected, expenses.totalExpenses, etc.
    res.json({
      success: true,
      data: {
        income: {
          totalFeeCollected: totalIncome,
          feePaymentsCount: monthFees._count || 0,
        },
        expenses: {
          totalExpenses: totalExpenses,
          expenseCount: monthExpenses._count || 0,
          salaryPaid: totalSalaries,
        },
        borrowings: {
          pendingAmount: pendingBorrowings._sum.amount || 0,
        },
        netIncome: {
          amount: netIncome,
          status: netIncome >= 0 ? "Profit" : "Loss",
        },
        totalStudents,
        month: startOfMonth.toLocaleString("default", { month: "long" }),
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch dashboard." });
  }
};
export const getMonthlyAccountingReport = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { month, year, hostelId } = req.query;

    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "Month and year are required." });
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const where = { ownerId, ...(hostelId && { hostelId }) };

    // 1. Fetch Expenses
    const expenses = await prisma.expense.findMany({
      where: { ...where, expenseDate: { gte: startOfMonth, lte: endOfMonth } },
    });

    // 2. Fetch Salaries
    const salaryPayments = await prisma.salaryPayment.findMany({
      where: {
        ...where,
        paymentMonth: parseInt(month),
        paymentYear: parseInt(year),
      },
    });

    // 3. Fetch Fee Income
    const feePayments = await prisma.feePayment.findMany({
      where: { ...where, paymentDate: { gte: startOfMonth, lte: endOfMonth } },
    });

    // --- Calculations ---
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSalaries = salaryPayments.reduce((sum, s) => sum + s.amount, 0);
    const totalFeeIncome = feePayments.reduce((sum, f) => sum + f.amount, 0);

    // Group Expenses by Category (for Pie Charts)
    const expensesByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const totalCosts = totalExpenses + totalSalaries;
    const netIncome = totalFeeIncome - totalCosts;

    res.json({
      success: true,
      data: {
        period: { month: parseInt(month), year: parseInt(year) },
        income: { total: totalFeeIncome, feePayments: totalFeeIncome },
        expenses: {
          general: totalExpenses,
          salaries: totalSalaries,
          total: totalCosts,
          breakdown: expensesByCategory, // Critical for UI Charts
        },
        summary: {
          netIncome,
          profitMargin:
            totalFeeIncome > 0
              ? ((netIncome / totalFeeIncome) * 100).toFixed(1) + "%"
              : "0%",
        },
      },
    });
  } catch (error) {
    console.error("Monthly report error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate report." });
  }
};

export const getYearlyAccountingReport = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { year, hostelId } = req.query;

    if (!year)
      return res
        .status(400)
        .json({ success: false, message: "Year is required." });

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    const where = { ownerId, ...(hostelId && { hostelId }) };

    // Fetch Data for the whole year
    const [expenses, salaries, fees] = await Promise.all([
      prisma.expense.findMany({
        where: { ...where, expenseDate: { gte: startOfYear, lte: endOfYear } },
      }),
      prisma.salaryPayment.findMany({
        where: { ...where, paymentYear: parseInt(year) },
      }),
      prisma.feePayment.findMany({
        where: { ...where, paymentDate: { gte: startOfYear, lte: endOfYear } },
      }),
    ]);

    // --- Monthly Breakdown Logic (For Bar Charts) ---
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthIndex = i;
      // Filter items for this specific month
      const mExpenses = expenses.filter(
        (e) => new Date(e.expenseDate).getMonth() === monthIndex
      );
      const mSalaries = salaries.filter(
        (s) => s.paymentMonth === monthIndex + 1
      );
      const mFees = fees.filter(
        (f) => new Date(f.paymentDate).getMonth() === monthIndex
      );

      const expTotal = mExpenses.reduce((sum, e) => sum + e.amount, 0);
      const salTotal = mSalaries.reduce((sum, s) => sum + s.amount, 0);
      const feeTotal = mFees.reduce((sum, f) => sum + f.amount, 0);

      return {
        month: monthIndex + 1,
        monthName: new Date(year, monthIndex).toLocaleString("default", {
          month: "short",
        }),
        income: feeTotal,
        expenses: expTotal + salTotal,
        netIncome: feeTotal - (expTotal + salTotal),
      };
    });

    // Yearly Totals
    const totalIncome = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalGenExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSalaries = salaries.reduce((sum, s) => sum + s.amount, 0);
    const totalCosts = totalGenExpense + totalSalaries;

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        summary: {
          totalIncome,
          totalExpenses: totalCosts,
          netIncome: totalIncome - totalCosts,
          averageMonthlyIncome: (totalIncome / 12).toFixed(0),
        },
        monthlyBreakdown: monthlyData, // Used for "Income vs Expense" Bar Chart
      },
    });
  } catch (error) {
    console.error("Yearly report error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate yearly report." });
  }
};


// ====================== PERMISSIONS & ALERTS ======================
// In src/controllers/ownerController.js

// export const createPermission = async (req, res) => {
//   try {
//     const { studentId, type, reason, returnDate } = req.body;
//     const ownerId = req.user.id;

//     if (!studentId || !type) {
//       return res.status(400).json({ success: false, message: "Type is required" });
//     }

//     // 1. Create Permission Record (CHANGED STATUS TO PENDING)
//     const permission = await prisma.permission.create({
//       data: {
//         studentId,
//         ownerId,
//         type,
//         reason: reason || "No reason provided",
//         returnDate: returnDate ? new Date(returnDate) : null,
//         status: "PENDING", // <--- CHANGED FROM "APPROVED" TO "PENDING"
//       },
//     });

//     // 2. Log Activity (UPDATED TITLE AND STATUS)
//     await prisma.activity.create({
//       data: {
//         studentId,
//         type: "PERMISSION",
//         title: `Permission Requested: ${type}`, // <--- Changed "Granted" to "Requested"
//         description: reason,
//         status: "Pending", // <--- Changed "Approved" to "Pending"
//       },
//     });

//     res.status(201).json({ 
//       success: true, 
//       message: "Permission request sent to parent", // <--- Updated message
//       data: permission 
//     });
    
//   } catch (error) {
//     console.error("Create permission error:", error);
//     res.status(500).json({ success: false, message: "Failed to create permission" });
//   }
// };

export const createPermission = async (req, res) => {
  try {
    // 1. Destructure status from body (Frontend sends "PENDING")
    const { studentId, type, reason, returnDate, status: bodyStatus } = req.body;
    let ownerId = req.user.id;

    // 2. FIX: Default to "PENDING" (or use what frontend sent)
    // Removed the hardcoded "APPROVED" logic
    let status = bodyStatus || "PENDING"; 

    // --- Logic to handle Warden creating permission ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (staff) ownerId = staff.ownerId;
        // Warden requests also default to PENDING (already covered above)
    }

    if (!studentId || !type) {
      return res.status(400).json({ success: false, message: "Type is required" });
    }

    // 3. Create the Permission Record
    const permission = await prisma.permission.create({
      data: {
        studentId,
        ownerId,
        type,
        reason: reason || "No reason provided",
        returnDate: returnDate ? new Date(returnDate) : null,
        status, // Will be "PENDING" now
      },
    });

    // 4. Log Activity
    await prisma.activity.create({
      data: {
        studentId,
        type: "PERMISSION",
        title: `Permission Requested: ${type}`,
        description: reason,
        status: "Pending", // Keep activity status consistent
      },
    });

    res.status(201).json({ success: true, data: permission });
  } catch (error) {
    console.error("Create permission error:", error);
    res.status(500).json({ success: false, message: "Failed to create permission" });
  }
};

// getStudentPermissions remains the same, it is correct.
export const getStudentPermissions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const permissions = await prisma.permission.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error("Get permissions error:", error);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// export const createAlert = async (req, res) => {
//   try {
//     const { studentId, title, message, type } = req.body;
//     const ownerId = req.user.id;

//     if (!studentId || !title || !message) {
//       return res.status(400).json({ success: false, message: "Missing fields" });
//     }

//     // 1. Create Alert Record
//     const alert = await prisma.alert.create({
//       data: {
//         studentId,
//         ownerId,
//         title,
//         message,
//         alertType: type || "INFO",
//       },
//     });

//     // 2. Log Activity
//     await prisma.activity.create({
//       data: {
//         studentId,
//         type: "ALERT", // Matches ActivityType enum
//         title: `Alert Sent: ${title}`,
//         description: message,
//         status: "Sent",
//       },
//     });

//     res.status(201).json({ success: true, message: "Alert sent", data: alert });
//   } catch (error) {
//     console.error("Create alert error:", error);
//     res.status(500).json({ success: false, message: "Failed to create alert" });
//   }
// };

export const createAlert = async (req, res) => {
  try {
    const { studentId, title, message, type } = req.body;
    let ownerId = req.user.id;

    // --- FIX: Swap ID for Warden ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (staff) ownerId = staff.ownerId;
    }

    if (!studentId || !title || !message) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const alert = await prisma.alert.create({
      data: {
        studentId,
        ownerId, // Now linked to Owner
        title,
        message,
        alertType: type || "INFO",
      },
    });

    await prisma.activity.create({
      data: {
        studentId,
        type: "ALERT",
        title: `Alert: ${title}`,
        description: message,
        status: "Sent",
      },
    });

    res.status(201).json({ success: true, message: "Alert sent", data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create alert" });
  }
};

export const getStudentAlerts = async (req, res) => {
  try {
    const { studentId } = req.params;
    const alerts = await prisma.alert.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};


// --- Get All Payments (For Reports) ---
// export const getMyPayments = async (req, res) => {
//   try {
//     const ownerId = req.user.id;
//     const { year } = req.query;

//     const where = { ownerId };
//     if (year) {
//       where.paymentYear = parseInt(year);
//     }

//     const payments = await prisma.feePayment.findMany({
//       where,
//       orderBy: { paymentDate: 'desc' },
//       select: {
//         id: true,
//         amount: true,
//         paymentDate: true,
//         paymentMonth: true,
//         paymentYear: true,
//       }
//     });

//     res.json({ success: true, data: payments });
//   } catch (error) {
//     console.error("Get payments error:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch payments", data: [] });
//   }
// };

// Add this to your ownerController.js in getMyPayments function

export const getMyPayments = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { year } = req.query;

    const where = { ownerId };
    if (year) {
      where.paymentYear = parseInt(year);
    }

    const payments = await prisma.feePayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMonth: true,
        paymentYear: true,
      }
    });

    // 🔍 DEBUG LOGGING
    console.log('=== BACKEND PAYMENTS DEBUG ===');
    console.log('Query year:', year);
    console.log('Total payments found:', payments.length);
    console.log('Sample payments:', JSON.stringify(payments.slice(0, 5), null, 2));
    
    // Group by month
    const byMonth = {};
    payments.forEach(p => {
      const key = `${p.paymentYear}-${String(p.paymentMonth).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    console.log('Payments by month:', byMonth);

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payments", data: [] });
  }
};

// ====================== NIGHT ATTENDANCE ======================
export const markNightAttendance = async (req, res) => {
  try {
    const { studentId, status, date } = req.body;
    let ownerId = req.user.id;

    // --- FIX: Swap ID for Warden ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
        const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
        if (staff) ownerId = staff.ownerId;
    }

    if (!studentId || !status || !date) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const record = await prisma.nightAttendance.upsert({
      where: {
        studentId_date: {
          studentId,
          date: attendanceDate,
        },
      },
      update: { status },
      create: {
        studentId,
        status,
        date: attendanceDate,
        ownerId, // Now linked to Owner
        hostelId: student.hostelId,
      },
    });

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to mark attendance" });
  }
};
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query; // Optional filters

    const where = { studentId };

    // If month/year provided, filter by range
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      where.date = { gte: startDate, lte: endDate };
    }

    const records = await prisma.nightAttendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: records });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch attendance" });
  }
};

// --- Add Warden & Generate Credentials ---
export const addWarden = async (req, res) => {
  try {
    const { name, phone, hostelId } = req.body;
    
    // 1. Validation
    if (!name || !phone || !hostelId) {
      return res.status(400).json({ success: false, message: "Name, Phone, and Hostel ID are required" });
    }

    // 2. Check if phone exists (Unique ID)
    const existing = await prisma.staff.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Staff with this phone already exists" });
    }

    // 3. GENERATE CREDENTIALS
    // Username = Phone Number
    // Password = Random 6-digit number
    const plainPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await hashPassword(plainPassword); // Helper function to hash

    // 4. Save to Database
    const newWarden = await prisma.staff.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        hostelId,
        role: "WARDEN"
      }
    });

    // 5. Return credentials so Owner can copy them
    res.status(201).json({
      success: true,
      message: "Warden created successfully",
      credentials: {
        name: newWarden.name,
        username: newWarden.phone,
        password: plainPassword // Sending plain text one last time for display
      }
    });

  } catch (error) {
    console.error("Add Warden Error:", error);
    res.status(500).json({ success: false, message: "Failed to add warden" });
  }
};

// src/controllers/ownerController.js

// --- NEW: Approve or Reject Expense ---
// export const updateExpenseStatus = async (req, res) => {
//   try {
//     const { expenseId } = req.params;
//     const { status } = req.body; // "APPROVED" or "REJECTED"
    
//     // Security: Only Owner can do this
//     if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
//         return res.status(403).json({ success: false, message: "Wardens cannot approve expenses." });
//     }

//     const updated = await prisma.expense.update({
//       where: { id: expenseId },
//       data: { status },
//     });

//     res.json({ success: true, message: `Expense ${status}`, data: updated });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ success: false, message: "Update failed" });
//   }
// };

export const updateExpenseStatus = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { status } = req.body;

    // --- SECURITY: ONLY OWNER CAN APPROVE/REJECT ---
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
      return res.status(403).json({ 
        success: false, 
        message: "Only owners can approve or reject expenses." 
      });
    }

    // --- VALIDATE STATUS ---
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be PENDING, APPROVED, or REJECTED."
      });
    }

    const ownerId = req.user.id;

    // --- VERIFY OWNERSHIP ---
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, ownerId }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found or access denied."
      });
    }

    // --- UPDATE STATUS ---
    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: { status },
      include: {
        hostel: {
          select: { name: true }
        }
      }
    });

    const message = status === 'APPROVED' 
      ? "Expense approved successfully" 
      : status === 'REJECTED'
        ? "Expense rejected"
        : "Expense status updated";

    res.json({ 
      success: true, 
      message, 
      data: updated 
    });

  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update status." 
    });
  }
};

// src/controllers/ownerController.js

export const updateStudentFeeRecord = async (req, res) => {
  try {
    const { 
      studentId, 
      billingMonth, 
      billingYear, 
      newPaidAmount, 
      paymentMethod, 
      notes, 
      proofImageKeys 
    } = req.body;
    
    const bMonth = parseInt(billingMonth);
    const bYear = parseInt(billingYear);

    // 1. Try to find the record
    let record = await prisma.feeRecord.findUnique({
      where: {
        studentId_billingMonth_billingYear: {
          studentId,
          billingMonth: bMonth,
          billingYear: bYear,
        },
      },
    });

    // 2. ✅ FIX: If Record Not Found (Prorated/Pending), Create it first!
    if (!record) {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student) return res.status(404).json({ message: "Student not found" });

        // --- Calculate what the total SHOULD be ---
        const calculateProratedFee = (year, month, monthlyFee, joinDate) => {
            const isJoiningMonth = 
              joinDate.getMonth() === (month - 1) && 
              joinDate.getFullYear() === year;
          
            if (!isJoiningMonth) return monthlyFee;
            if (joinDate.getDate() === 1) return monthlyFee;
          
            const daysInMonth = new Date(year, month, 0).getDate();
            const joiningDay = joinDate.getDate();
            const daysToStay = daysInMonth - joiningDay + 1;
            const dailyRate = monthlyFee / daysInMonth;
          
            return Math.round(dailyRate * daysToStay);
        };

        const totalAmount = calculateProratedFee(
            bYear, 
            bMonth, 
            student.monthlyFee, 
            new Date(student.admissionDate)
        );

        // Create the missing record
        record = await prisma.feeRecord.create({
            data: {
                studentId,
                billingMonth: bMonth,
                billingYear: bYear,
                totalAmount: totalAmount, // Lock it
                paidAmount: 0,
                remainingAmount: totalAmount,
                status: "PENDING",
                dueDate: new Date(),
                notes: "Initialized via Edit"
            }
        });
    }

    // 3. Continue with Update Logic
    const oldPaidAmount = record.paidAmount || 0;
    const difference = parseFloat(newPaidAmount) - oldPaidAmount;
    const newRemaining = record.totalAmount - parseFloat(newPaidAmount);
    
    let newStatus = "PARTIAL";
    if (newRemaining <= 10) newStatus = "PAID"; 
    if (parseFloat(newPaidAmount) === 0) newStatus = "PENDING"; 

    const result = await prisma.$transaction(async (prisma) => {
      // A. Update Fee Record
      const updateData = {
        paidAmount: parseFloat(newPaidAmount),
        remainingAmount: newRemaining > 0 ? newRemaining : 0,
        status: newStatus,
        paymentMethod: paymentMethod || record.paymentMethod,
        notes: notes || record.notes,
        lastPaymentDate: new Date()
      };

      if (proofImageKeys !== undefined) {
        if (Array.isArray(proofImageKeys) && proofImageKeys.length > 0) {
          updateData.proofImageKeys = { push: proofImageKeys };
        } else if (proofImageKeys === null) {
          updateData.proofImageKeys = [];
        }
      }

      const updatedRecord = await prisma.feeRecord.update({
        where: { id: record.id },
        data: updateData,
      });

      // B. Record Adjustment Transaction
      if (Math.abs(difference) > 0) {
        await prisma.feePayment.create({
          data: {
            amount: difference, 
            paymentDate: new Date(),
            paymentMonth: bMonth,
            paymentYear: bYear,
            paymentMethod: paymentMethod || "Adjustment",
            notes: `Correction: ${oldPaidAmount} -> ${newPaidAmount}`,
            status: "Completed",
            proofImageKeys: proofImageKeys || [],
            studentId,
            ownerId: req.user.id,
            hostelId: record.hostelId || (await prisma.student.findUnique({where:{id:studentId}, select:{hostelId:true}})).hostelId,
          },
        });
      }

      return updatedRecord;
    });

    res.json({ success: true, message: "Fee record updated successfully", data: result });

  } catch (error) {
    console.error("Update Fee Error:", error);
    res.status(500).json({ success: false, message: "Failed to update fee" });
  }
};


// Add this new endpoint to ownerController.js

export const getFeeRecords = async (req, res) => {
  try {
    let ownerId = req.user.id;
    const { year } = req.query;

    // Handle Warden role
    if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
      const staff = await prisma.staff.findUnique({ where: { id: req.user.id } });
      if (!staff) return res.status(401).json({ message: "Unauthorized Staff" });
      ownerId = staff.ownerId;
    }

    const where = {};
    
    // Filter by year if provided
    if (year) {
      where.billingYear = parseInt(year);
    }

    // Get all fee records for this owner's students
    const feeRecords = await prisma.feeRecord.findMany({
      where: {
        student: {
          ownerId: ownerId
        },
        ...where
      },
      select: {
        id: true,
        billingMonth: true,
        billingYear: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
      },
      orderBy: [
        { billingYear: 'desc' },
        { billingMonth: 'desc' }
      ]
    });

    // DEBUG LOGGING
    console.log('=== BACKEND FEE RECORDS DEBUG ===');
    console.log('Query year:', year);
    console.log('Total records found:', feeRecords.length);
    console.log('Sample records:', JSON.stringify(feeRecords.slice(0, 5), null, 2));
    
    // Group by month
    const byMonth = {};
    feeRecords.forEach(r => {
      const key = `${r.billingYear}-${String(r.billingMonth).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    console.log('Records by month:', byMonth);

    res.json({ success: true, data: feeRecords });
  } catch (error) {
    console.error("Get fee records error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch fee records",
      data: [] 
    });
  }
};