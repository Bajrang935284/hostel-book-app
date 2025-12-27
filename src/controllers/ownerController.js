// import { prisma } from "../config/database.js";

// import { hashPassword, comparePassword } from "../utils/passwordHelper.js";

// import { generateToken } from "../utils/jwtHelper.js";

// export const ownerRegister = async (req, res) => {
//   try {
//     const { name, phone, password, confirmPassword } = req.body;

//     if (!name || !phone || !password || !confirmPassword) {
//       return res.status(400).json({
//         success: false,

//         message: "All fields are required.",
//       });
//     }

//     if (password !== confirmPassword) {
//       return res.status(400).json({
//         success: false,

//         message: "Passwords do not match.",
//       });
//     }

//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,

//         message: "Password must be at least 6 characters long.",
//       });
//     }

//     const existingOwner = await prisma.hostelOwner.findUnique({
//       where: { phone },
//     });

//     if (existingOwner) {
//       return res.status(400).json({
//         success: false,

//         message: "Phone number already registered.",
//       });
//     }

//     const hashedPassword = await hashPassword(password);

//     const owner = await prisma.hostelOwner.create({
//       data: {
//         name,

//         phone,

//         password: hashedPassword,
//       },

//       select: {
//         id: true,

//         name: true,

//         phone: true,

//         createdAt: true,
//       },
//     });

//     const token = generateToken({
//       id: owner.id,

//       role: "owner",
//     });

//     res.status(201).json({
//       success: true,

//       message: "Registration successful",

//       data: {
//         token,

//         user: {
//           ...owner,

//           role: "owner",
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Owner registration error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Registration failed. Please try again.",
//     });
//   }
// };

// export const ownerLogin = async (req, res) => {
//   try {
//     const { phone, password } = req.body;

//     if (!phone || !password) {
//       return res.status(400).json({
//         success: false,

//         message: "Phone and password are required.",
//       });
//     }

//     const owner = await prisma.hostelOwner.findUnique({
//       where: { phone },
//     });

//     if (!owner) {
//       return res.status(401).json({
//         success: false,

//         message: "Invalid credentials.",
//       });
//     }

//     const isPasswordValid = await comparePassword(password, owner.password);

//     if (!isPasswordValid) {
//       return res.status(401).json({
//         success: false,

//         message: "Invalid credentials.",
//       });
//     }

//     const token = generateToken({
//       id: owner.id,

//       role: "owner",
//     });

//     res.json({
//       success: true,

//       message: "Login successful",

//       data: {
//         token,

//         user: {
//           id: owner.id,

//           name: owner.name,

//           phone: owner.phone,

//           role: "owner",
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Owner login error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Login failed. Please try again.",
//     });
//   }
// };

// export const getOwnerProfile = async (req, res) => {
//   try {
//     const owner = await prisma.hostelOwner.findUnique({
//       where: { id: req.user.id },

//       select: {
//         id: true,

//         name: true,

//         phone: true,

//         createdAt: true,

//         _count: {
//           select: {
//             hostels: true,

//             students: true,
//           },
//         },
//       },
//     });

//     res.json({
//       success: true,

//       data: owner,
//     });
//   } catch (error) {
//     console.error("Get owner profile error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch profile.",
//     });
//   }
// };

// // Register Hostel

// export const registerHostel = async (req, res) => {
//   try {
//     const {
//       name,

//       ownerName,

//       contactNumber,

//       email,

//       street,

//       city,

//       state,

//       pinCode,

//       hostelType,
//     } = req.body;

//     const ownerId = req.user.id;

//     // Validation

//     if (
//       !name ||
//       !ownerName ||
//       !contactNumber ||
//       !street ||
//       !city ||
//       !state ||
//       !pinCode ||
//       !hostelType
//     ) {
//       return res.status(400).json({
//         success: false,

//         message: "All required fields must be provided.",
//       });
//     }

//     // Validate hostel type

//     const validTypes = ["Boys", "Girls", "Co-ed"];

//     if (!validTypes.includes(hostelType)) {
//       return res.status(400).json({
//         success: false,

//         message: "Hostel type must be Boys, Girls, or Co-ed.",
//       });
//     }

//     // Validate pin code

//     if (!/^\d{6}$/.test(pinCode)) {
//       return res.status(400).json({
//         success: false,

//         message: "Pin code must be 6 digits.",
//       });
//     }

//     // Validate contact number

//     if (!/^\d{10}$/.test(contactNumber)) {
//       return res.status(400).json({
//         success: false,

//         message: "Contact number must be 10 digits.",
//       });
//     }

//     // Validate email if provided

//     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid email format.",
//       });
//     }

//     const hostel = await prisma.hostel.create({
//       data: {
//         name,

//         ownerName,

//         contactNumber,

//         email,

//         street,

//         city,

//         state,

//         pinCode,

//         hostelType,

//         ownerId,
//       },
//     });

//     res.status(201).json({
//       success: true,

//       message: "Hostel registered successfully",

//       data: hostel,
//     });
//   } catch (error) {
//     console.error("Register hostel error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to register hostel.",
//     });
//   }
// };

// // Get all hostels of owner

// export const getMyHostels = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     const hostels = await prisma.hostel.findMany({
//       where: { ownerId },

//       include: {
//         _count: {
//           select: {
//             students: true,
//           },
//         },
//       },

//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     res.json({
//       success: true,

//       data: hostels,
//     });
//   } catch (error) {
//     console.error("Get hostels error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch hostels.",
//     });
//   }
// };

// // Get single hostel details

// export const getHostelById = async (req, res) => {
//   try {
//     const { hostelId } = req.params;

//     const ownerId = req.user.id;

//     const hostel = await prisma.hostel.findFirst({
//       where: {
//         id: hostelId,

//         ownerId,
//       },

//       include: {
//         _count: {
//           select: {
//             students: true,
//           },
//         },
//       },
//     });

//     if (!hostel) {
//       return res.status(404).json({
//         success: false,

//         message: "Hostel not found or access denied.",
//       });
//     }

//     res.json({
//       success: true,

//       data: hostel,
//     });
//   } catch (error) {
//     console.error("Get hostel error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch hostel details.",
//     });
//   }
// };

// // Register Student

// // Register Student
// // Register Student
// export const registerStudent = async (req, res) => {
//   try {
//     const {
//       name,
//       parentName,
//       parentPhone,
//       parentEmail,
//       roomNumber,
//       bedNumber,
//       monthlyFee,
//       feeDueDate, // e.g., 15 (The day of the month)
//       admissionDate, // NEW: e.g., "2025-11-20"
//       notes,
//       hostelId,
//     } = req.body;

//     const ownerId = req.user.id;

//     // Validation
//     if (!name || !parentName || !parentPhone || !monthlyFee || !hostelId) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, parent name, parent phone, monthly fee, and hostel are required.",
//       });
//     }

//     if (!/^\d{10}$/.test(parentPhone)) {
//       return res.status(400).json({
//         success: false,
//         message: "Parent phone must be 10 digits.",
//       });
//     }

//     if (monthlyFee <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Monthly fee must be greater than 0.",
//       });
//     }

//     // Validate fee due date (1-31)
//     const dueDateDay = feeDueDate ? parseInt(feeDueDate) : 1;
//     if (dueDateDay < 1 || dueDateDay > 31) {
//       return res.status(400).json({
//         success: false,
//         message: "Fee due date must be between 1 and 31.",
//       });
//     }

//     // Verify hostel
//     const hostel = await prisma.hostel.findFirst({
//       where: { id: hostelId, ownerId },
//     });

//     if (!hostel) {
//       return res.status(404).json({
//         success: false,
//         message: "Hostel not found or access denied.",
//       });
//     }

//     // Create student
//     const student = await prisma.student.create({
//       data: {
//         name,
//         parentName,
//         parentPhone,
//         parentEmail,
//         roomNumber,
//         bedNumber,
//         monthlyFee: parseFloat(monthlyFee),
//         feeDueDate: dueDateDay,
//         admissionDate: admissionDate ? new Date(admissionDate) : new Date(), // Set admission date
//         notes,
//         ownerId,
//         hostelId,
//       },
//       include: {
//         hostel: { select: { name: true } },
//       },
//     });

//     // --- CREDENTIAL GENERATION ---
//     const cleanName = parentName.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
//     const randomDigits = Math.floor(100 + Math.random() * 900);
//     const username = `${cleanName}@${randomDigits}`;
//     const plainPassword = Math.floor(100000 + Math.random() * 900000).toString();
//     const hashedPassword = await hashPassword(plainPassword);

//     const parent = await prisma.parent.create({
//       data: {
//         username,
//         password: hashedPassword,
//         plainPassword: plainPassword,
//         name: parentName,
//         phone: parentPhone,
//         email: parentEmail,
//         studentId: student.id,
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Student registered successfully",
//       data: {
//         student,
//         parentCredentials: {
//           username: parent.username,
//           password: plainPassword,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Register student error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to register student.",
//     });
//   }
// };
// // Get all students with Calculated Fee Status
// export const getMyStudents = async (req, res) => {
//   try {
//     const ownerId = req.user.id;
//     const { hostelId } = req.query;

//     const where = { ownerId };
//     if (hostelId) {
//       where.hostelId = hostelId;
//     }

//     // Current Date Context
//     const today = new Date();
//     const currentMonth = today.getMonth() + 1; // 1-12
//     const currentYear = today.getFullYear();

//     const students = await prisma.student.findMany({
//       where,
//       include: {
//         hostel: {
//           select: { name: true },
//         },
//         parent: {
//           select: { username: true, phone: true, isFirstLogin: true },
//         },
//         // Fetch the FeeRecord SPECIFICALLY for this month to check if paid
//         feeRecords: {
//           where: {
//             billingMonth: currentMonth,
//             billingYear: currentYear,
//           },
//         },
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     // --- CALCULATE STATUS LOGIC ---
//     const studentsWithStatus = students.map((student) => {
//       // 1. Check if already paid for this cycle
//       const currentMonthRecord = student.feeRecords[0]; // Since we filtered by month/year, there is only 0 or 1
//       const isPaid = currentMonthRecord && currentMonthRecord.status === "PAID";

//       let status = "PENDING";
//       let message = "";
//       let color = "gray"; // default

//       if (isPaid) {
//         status = "PAID";
//         message = "Fee Paid";
//         color = "green";
//       } else {
//         // 2. Calculate Due Date for THIS month
//         // We create a date object for the current month using the student's specific feeDueDate day
//         const dueObj = new Date(currentYear, currentMonth - 1, student.feeDueDate);

//         // Calculate difference in milliseconds
//         const diffTime = dueObj - today;
//         // Convert to days (Math.ceil covers partial days)
//         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

//         if (diffDays < 0) {
//           // --- OVERDUE ---
//           const overdueDays = Math.abs(diffDays);
//           status = "OVERDUE";
//           message = `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`;
//           color = "red";
//         } else if (diffDays === 0) {
//           // --- DUE TODAY ---
//           status = "DUE_TODAY";
//           message = "Fee Due Today";
//           color = "orange";
//         } else if (diffDays <= 5) {
//           // --- COUNTDOWN (5 Days remaining) ---
//           status = "UPCOMING";
//           message = `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
//           color = "#FFC107"; // Amber/Yellow
//         } else {
//           // --- NORMAL FUTURE DATE ---
//           status = "NORMAL";
//           message = `Due on ${dueObj.toLocaleDateString()}`;
//           color = "blue";
//         }
//       }

//       return {
//         ...student,
//         feeStatus: {
//           status,
//           message,
//           color,
//           dueDate: `${student.feeDueDate}/${currentMonth}/${currentYear}`
//         }
//       };
//     });

//     res.json({
//       success: true,
//       data: studentsWithStatus,
//     });
//   } catch (error) {
//     console.error("Get students error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch students.",
//     });
//   }
// };

// // ====================== FEE COLLECTION (THE FIX) ======================
// // Collect Fee and Update Monthly Cycle Status
// export const collectStudentFee = async (req, res) => {
//   try {
//     const {
//       studentId,
//       amount,
//       paymentDate,
//       paymentMonth, // The billing cycle month (e.g., 11 for Nov)
//       paymentYear,  // The billing cycle year (e.g., 2025)
//       paymentMethod,
//       notes,
//     } = req.body;

//     const ownerId = req.user.id;

//     if (!studentId || !amount || !paymentMonth || !paymentYear) {
//       return res.status(400).json({
//         success: false,
//         message: "Student ID, amount, billing month, and year are required.",
//       });
//     }

//     const student = await prisma.student.findFirst({
//       where: { id: studentId, ownerId },
//       include: { hostel: true },
//     });

//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: "Student not found or access denied.",
//       });
//     }

//     const actualPaymentDate = paymentDate ? new Date(paymentDate) : new Date();

//     // Calculate the Due Date timestamp based on student's cycle day and the billing month
//     // Example: If billing month is Nov (11) and feeDueDate is 15 -> Nov 15th
//     const cycleDueDate = new Date(paymentYear, paymentMonth - 1, student.feeDueDate);

//     const result = await prisma.$transaction(async (prisma) => {
//       // A. Create Receipt (FeePayment)
//       const newPayment = await prisma.feePayment.create({
//         data: {
//           amount: parseFloat(amount),
//           paymentDate: actualPaymentDate,
//           paymentMonth: parseInt(paymentMonth),
//           paymentYear: parseInt(paymentYear),
//           paymentMethod: paymentMethod || "Cash",
//           notes,
//           status: "Completed",
//           studentId,
//           ownerId,
//           hostelId: student.hostelId,
//         },
//       });

//       // B. Upsert FeeRecord (The Bill)
//       // If a bill exists for this month, update it to PAID.
//       // If not, create it as PAID.
//       await prisma.feeRecord.upsert({
//         where: {
//           studentId_billingMonth_billingYear: {
//             studentId,
//             billingMonth: parseInt(paymentMonth),
//             billingYear: parseInt(paymentYear),
//           }
//         },
//         update: {
//           status: "PAID",
//           amount: parseFloat(amount),
//           paidDate: actualPaymentDate,
//           paymentMethod: paymentMethod || "Cash",
//         },
//         create: {
//           studentId,
//           amount: parseFloat(amount),
//           billingMonth: parseInt(paymentMonth),
//           billingYear: parseInt(paymentYear),
//           dueDate: cycleDueDate, // Sets the specific due date for this cycle
//           status: "PAID",
//           paidDate: actualPaymentDate,
//           paymentMethod: paymentMethod || "Cash",
//           notes: `Fee collected for ${paymentMonth}/${paymentYear}`,
//         },
//       });

//       // C. Activity Log
//       await prisma.activity.create({
//         data: {
//           studentId,
//           type: "PAYMENT",
//           title: "Fee Collected",
//           description: `Received ₹${amount} for ${paymentMonth}/${paymentYear}`,
//           amount: parseFloat(amount),
//           status: "Completed",
//         },
//       });

//       return newPayment;
//     });

//     res.status(201).json({
//       success: true,
//       message: "Fee collected successfully.",
//       data: result,
//     });
//   } catch (error) {
//     console.error("Collect fee error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to collect fee.",
//     });
//   }
// };

// // Get single student details (with parent credentials if not logged in yet)

// // Get single student details with parent credentials

// export const getStudentById = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const ownerId = req.user.id;

//     const student = await prisma.student.findFirst({
//       where: {
//         id: studentId,

//         ownerId,
//       },

//       include: {
//         hostel: {
//           select: {
//             id: true,

//             name: true,

//             hostelType: true,
//           },
//         },

//         parent: {
//           select: {
//             username: true,

//             plainPassword: true, // Show plain password to owner

//             name: true,

//             phone: true,

//             email: true,

//             isFirstLogin: true,
//           },
//         },
//       },
//     });

//     if (!student) {
//       return res.status(404).json({
//         success: false,

//         message: "Student not found or access denied.",
//       });
//     }

//     res.json({
//       success: true,

//       data: student,
//     });
//   } catch (error) {
//     console.error("Get student error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch student details.",
//     });
//   }
// };

// // Add these staff management controllers to your ownerController.js

// // Register/Add Staff

// export const registerStaff = async (req, res) => {
//   try {
//     const {
//       name,

//       phone,

//       email,

//       role,

//       salary,

//       joiningDate,

//       address,

//       idProofType,

//       idProofNumber,

//       emergencyContact,

//       emergencyContactName,

//       hostelId,
//     } = req.body;

//     const ownerId = req.user.id;

//     // Validation

//     if (!name || !phone || !role || !salary || !hostelId) {
//       return res.status(400).json({
//         success: false,

//         message: "Name, phone, role, salary, and hostel are required.",
//       });
//     }

//     // Validate phone (10 digits)

//     if (!/^\d{10}$/.test(phone)) {
//       return res.status(400).json({
//         success: false,

//         message: "Phone number must be 10 digits.",
//       });
//     }

//     // Validate email if provided

//     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid email format.",
//       });
//     }

//     // Validate salary

//     if (salary <= 0) {
//       return res.status(400).json({
//         success: false,

//         message: "Salary must be greater than 0.",
//       });
//     }

//     // Valid staff roles

//     const validRoles = [
//       "Manager",
//       "Warden",
//       "Cook",
//       "Cleaner",
//       "Security",
//       "Maintenance",
//       "Other",
//     ];

//     if (!validRoles.includes(role)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid staff role.",
//       });
//     }

//     // Verify hostel belongs to owner

//     const hostel = await prisma.hostel.findFirst({
//       where: {
//         id: hostelId,

//         ownerId,
//       },
//     });

//     if (!hostel) {
//       return res.status(404).json({
//         success: false,

//         message: "Hostel not found or access denied.",
//       });
//     }

//     // Check if phone already exists for this owner

//     const existingStaff = await prisma.staff.findFirst({
//       where: {
//         phone,

//         ownerId,
//       },
//     });

//     if (existingStaff) {
//       return res.status(400).json({
//         success: false,

//         message: "Staff with this phone number already exists.",
//       });
//     }

//     // Create staff

//     const staff = await prisma.staff.create({
//       data: {
//         name,

//         phone,

//         email,

//         role,

//         salary: parseFloat(salary),

//         joiningDate: joiningDate ? new Date(joiningDate) : new Date(),

//         address,

//         idProofType,

//         idProofNumber,

//         emergencyContact,

//         emergencyContactName,

//         isActive: true,

//         ownerId,

//         hostelId,
//       },

//       include: {
//         hostel: {
//           select: {
//             name: true,

//             city: true,
//           },
//         },
//       },
//     });

//     res.status(201).json({
//       success: true,

//       message: "Staff registered successfully",

//       data: staff,
//     });
//   } catch (error) {
//     console.error("Register staff error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to register staff.",
//     });
//   }
// };

// // Get all staff members

// export const getMyStaff = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     const { hostelId, role, isActive } = req.query;

//     const where = { ownerId };

//     if (hostelId) {
//       where.hostelId = hostelId;
//     }

//     if (role) {
//       where.role = role;
//     }

//     if (isActive !== undefined) {
//       where.isActive = isActive === "true";
//     }

//     const staff = await prisma.staff.findMany({
//       where,

//       include: {
//         hostel: {
//           select: {
//             id: true,

//             name: true,

//             city: true,
//           },
//         },
//       },

//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     res.json({
//       success: true,

//       data: staff,
//     });
//   } catch (error) {
//     console.error("Get staff error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch staff.",
//     });
//   }
// };

// // Get single staff details

// export const getStaffById = async (req, res) => {
//   try {
//     const { staffId } = req.params;

//     const ownerId = req.user.id;

//     const staff = await prisma.staff.findFirst({
//       where: {
//         id: staffId,

//         ownerId,
//       },

//       include: {
//         hostel: {
//           select: {
//             id: true,

//             name: true,

//             city: true,

//             hostelType: true,
//           },
//         },
//       },
//     });

//     if (!staff) {
//       return res.status(404).json({
//         success: false,

//         message: "Staff not found or access denied.",
//       });
//     }

//     res.json({
//       success: true,

//       data: staff,
//     });
//   } catch (error) {
//     console.error("Get staff error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch staff details.",
//     });
//   }
// };

// // Update staff details

// export const updateStaff = async (req, res) => {
//   try {
//     const { staffId } = req.params;

//     const ownerId = req.user.id;

//     const {
//       name,

//       phone,

//       email,

//       role,

//       salary,

//       address,

//       idProofType,

//       idProofNumber,

//       emergencyContact,

//       emergencyContactName,

//       isActive,
//     } = req.body;

//     // Verify staff belongs to owner

//     const existingStaff = await prisma.staff.findFirst({
//       where: {
//         id: staffId,

//         ownerId,
//       },
//     });

//     if (!existingStaff) {
//       return res.status(404).json({
//         success: false,

//         message: "Staff not found or access denied.",
//       });
//     }

//     // Validate phone if provided

//     if (phone && !/^\d{10}$/.test(phone)) {
//       return res.status(400).json({
//         success: false,

//         message: "Phone number must be 10 digits.",
//       });
//     }

//     // Validate email if provided

//     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid email format.",
//       });
//     }

//     // Validate salary if provided

//     if (salary !== undefined && salary <= 0) {
//       return res.status(400).json({
//         success: false,

//         message: "Salary must be greater than 0.",
//       });
//     }

//     // Validate role if provided

//     if (role) {
//       const validRoles = [
//         "Manager",
//         "Warden",
//         "Cook",
//         "Cleaner",
//         "Security",
//         "Maintenance",
//         "Other",
//       ];

//       if (!validRoles.includes(role)) {
//         return res.status(400).json({
//           success: false,

//           message: "Invalid staff role.",
//         });
//       }
//     }

//     // Check if phone is being changed and already exists

//     if (phone && phone !== existingStaff.phone) {
//       const phoneExists = await prisma.staff.findFirst({
//         where: {
//           phone,

//           ownerId,

//           id: { not: staffId },
//         },
//       });

//       if (phoneExists) {
//         return res.status(400).json({
//           success: false,

//           message: "Phone number already exists for another staff member.",
//         });
//       }
//     }

//     // Update staff

//     const updatedData = {};

//     if (name !== undefined) updatedData.name = name;

//     if (phone !== undefined) updatedData.phone = phone;

//     if (email !== undefined) updatedData.email = email;

//     if (role !== undefined) updatedData.role = role;

//     if (salary !== undefined) updatedData.salary = parseFloat(salary);

//     if (address !== undefined) updatedData.address = address;

//     if (idProofType !== undefined) updatedData.idProofType = idProofType;

//     if (idProofNumber !== undefined) updatedData.idProofNumber = idProofNumber;

//     if (emergencyContact !== undefined)
//       updatedData.emergencyContact = emergencyContact;

//     if (emergencyContactName !== undefined)
//       updatedData.emergencyContactName = emergencyContactName;

//     if (isActive !== undefined) updatedData.isActive = isActive;

//     const staff = await prisma.staff.update({
//       where: { id: staffId },

//       data: updatedData,

//       include: {
//         hostel: {
//           select: {
//             name: true,

//             city: true,
//           },
//         },
//       },
//     });

//     res.json({
//       success: true,

//       message: "Staff updated successfully",

//       data: staff,
//     });
//   } catch (error) {
//     console.error("Update staff error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to update staff.",
//     });
//   }
// };

// // Delete staff (soft delete by setting isActive to false)

// export const deleteStaff = async (req, res) => {
//   try {
//     const { staffId } = req.params;

//     const ownerId = req.user.id;

//     const { permanent } = req.query; // ?permanent=true for hard delete

//     // Verify staff belongs to owner

//     const staff = await prisma.staff.findFirst({
//       where: {
//         id: staffId,

//         ownerId,
//       },
//     });

//     if (!staff) {
//       return res.status(404).json({
//         success: false,

//         message: "Staff not found or access denied.",
//       });
//     }

//     if (permanent === "true") {
//       // Hard delete

//       await prisma.staff.delete({
//         where: { id: staffId },
//       });

//       return res.json({
//         success: true,

//         message: "Staff permanently deleted.",
//       });
//     } else {
//       // Soft delete

//       await prisma.staff.update({
//         where: { id: staffId },

//         data: { isActive: false },
//       });

//       return res.json({
//         success: true,

//         message: "Staff deactivated successfully.",
//       });
//     }
//   } catch (error) {
//     console.error("Delete staff error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to delete staff.",
//     });
//   }
// };

// // Update staff salary

// export const updateStaffSalary = async (req, res) => {
//   try {
//     const { staffId } = req.params;

//     const { salary, effectiveDate } = req.body;

//     const ownerId = req.user.id;

//     if (!salary || salary <= 0) {
//       return res.status(400).json({
//         success: false,

//         message: "Valid salary amount is required.",
//       });
//     }

//     // Verify staff belongs to owner

//     const staff = await prisma.staff.findFirst({
//       where: {
//         id: staffId,

//         ownerId,
//       },
//     });

//     if (!staff) {
//       return res.status(404).json({
//         success: false,

//         message: "Staff not found or access denied.",
//       });
//     }

//     const updatedStaff = await prisma.staff.update({
//       where: { id: staffId },

//       data: {
//         salary: parseFloat(salary),
//       },
//     });

//     res.json({
//       success: true,

//       message: "Salary updated successfully",

//       data: updatedStaff,
//     });
//   } catch (error) {
//     console.error("Update salary error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to update salary.",
//     });
//   }
// };

// // Get staff statistics

// export const getStaffStats = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     const { hostelId } = req.query;

//     const where = { ownerId };

//     if (hostelId) {
//       where.hostelId = hostelId;
//     }

//     const [totalStaff, activeStaff, inactiveStaff, staffByRole] =
//       await Promise.all([
//         prisma.staff.count({ where }),

//         prisma.staff.count({ where: { ...where, isActive: true } }),

//         prisma.staff.count({ where: { ...where, isActive: false } }),

//         prisma.staff.groupBy({
//           by: ["role"],

//           where,

//           _count: true,
//         }),
//       ]);

//     const totalSalary = await prisma.staff.aggregate({
//       where: { ...where, isActive: true },

//       _sum: {
//         salary: true,
//       },
//     });

//     res.json({
//       success: true,

//       data: {
//         totalStaff,

//         activeStaff,

//         inactiveStaff,

//         totalMonthlySalary: totalSalary._sum.salary || 0,

//         staffByRole: staffByRole.map((item) => ({
//           role: item.role,

//           count: item._count,
//         })),
//       },
//     });
//   } catch (error) {
//     console.error("Get staff stats error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch staff statistics.",
//     });
//   }
// };

// // Add these expense management controllers to your ownerController.js

// // ====================== EXPENSE MANAGEMENT ======================

// // Add General Expense

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

//     // Validation

//     if (!title || !amount || !category || !hostelId) {
//       return res.status(400).json({
//         success: false,

//         message: "Title, amount, category, and hostel are required.",
//       });
//     }

//     if (amount <= 0) {
//       return res.status(400).json({
//         success: false,

//         message: "Amount must be greater than 0.",
//       });
//     }

//     // Valid expense categories

//     const validCategories = [
//       "Electricity",

//       "Water",

//       "Gas",

//       "Internet",

//       "Maintenance",

//       "Groceries",

//       "Cleaning Supplies",

//       "Furniture",

//       "Repairs",

//       "Salary",

//       "Rent",

//       "Security",

//       "Other",
//     ];

//     if (!validCategories.includes(category)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid expense category.",
//       });
//     }

//     // Verify hostel belongs to owner

//     const hostel = await prisma.hostel.findFirst({
//       where: {
//         id: hostelId,

//         ownerId,
//       },
//     });

//     if (!hostel) {
//       return res.status(404).json({
//         success: false,

//         message: "Hostel not found or access denied.",
//       });
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

//       include: {
//         hostel: {
//           select: {
//             name: true,
//           },
//         },
//       },
//     });

//     res.status(201).json({
//       success: true,

//       message: "Expense added successfully",

//       data: expense,
//     });
//   } catch (error) {
//     console.error("Add expense error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to add expense.",
//     });
//   }
// };

// // Get All Expenses

// export const getExpenses = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     const {
//       hostelId,

//       category,

//       startDate,

//       endDate,

//       month,

//       year,
//     } = req.query;

//     const where = { ownerId };

//     if (hostelId) {
//       where.hostelId = hostelId;
//     }

//     if (category) {
//       where.category = category;
//     }

//     // Date filtering

//     if (startDate || endDate || month || year) {
//       where.expenseDate = {};

//       if (month && year) {
//         // Filter by specific month and year

//         const startOfMonth = new Date(year, month - 1, 1);

//         const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

//         where.expenseDate.gte = startOfMonth;

//         where.expenseDate.lte = endOfMonth;
//       } else if (year && !month) {
//         // Filter by entire year

//         const startOfYear = new Date(year, 0, 1);

//         const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

//         where.expenseDate.gte = startOfYear;

//         where.expenseDate.lte = endOfYear;
//       } else {
//         // Custom date range

//         if (startDate) {
//           where.expenseDate.gte = new Date(startDate);
//         }

//         if (endDate) {
//           where.expenseDate.lte = new Date(endDate);
//         }
//       }
//     }

//     const expenses = await prisma.expense.findMany({
//       where,

//       include: {
//         hostel: {
//           select: {
//             name: true,
//           },
//         },
//       },

//       orderBy: {
//         expenseDate: "desc",
//       },
//     });

//     const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

//     res.json({
//       success: true,

//       data: {
//         expenses,

//         totalAmount,

//         count: expenses.length,
//       },
//     });
//   } catch (error) {
//     console.error("Get expenses error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch expenses.",
//     });
//   }
// };

// // Update Expense

// export const updateExpense = async (req, res) => {
//   try {
//     const { expenseId } = req.params;

//     const ownerId = req.user.id;

//     const {
//       title,

//       amount,

//       category,

//       expenseDate,

//       description,

//       paymentMethod,
//     } = req.body;

//     // Verify expense belongs to owner

//     const existingExpense = await prisma.expense.findFirst({
//       where: {
//         id: expenseId,

//         ownerId,
//       },
//     });

//     if (!existingExpense) {
//       return res.status(404).json({
//         success: false,

//         message: "Expense not found or access denied.",
//       });
//     }

//     if (amount !== undefined && amount <= 0) {
//       return res.status(400).json({
//         success: false,

//         message: "Amount must be greater than 0.",
//       });
//     }

//     const updatedData = {};

//     if (title !== undefined) updatedData.title = title;

//     if (amount !== undefined) updatedData.amount = parseFloat(amount);

//     if (category !== undefined) updatedData.category = category;

//     if (expenseDate !== undefined)
//       updatedData.expenseDate = new Date(expenseDate);

//     if (description !== undefined) updatedData.description = description;

//     if (paymentMethod !== undefined) updatedData.paymentMethod = paymentMethod;

//     const expense = await prisma.expense.update({
//       where: { id: expenseId },

//       data: updatedData,

//       include: {
//         hostel: {
//           select: {
//             name: true,
//           },
//         },
//       },
//     });

//     res.json({
//       success: true,

//       message: "Expense updated successfully",

//       data: expense,
//     });
//   } catch (error) {
//     console.error("Update expense error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to update expense.",
//     });
//   }
// };

// // Delete Expense

// export const deleteExpense = async (req, res) => {
//   try {
//     const { expenseId } = req.params;

//     const ownerId = req.user.id;

//     const expense = await prisma.expense.findFirst({
//       where: {
//         id: expenseId,

//         ownerId,
//       },
//     });

//     if (!expense) {
//       return res.status(404).json({
//         success: false,

//         message: "Expense not found or access denied.",
//       });
//     }

//     await prisma.expense.delete({
//       where: { id: expenseId },
//     });

//     res.json({
//       success: true,

//       message: "Expense deleted successfully.",
//     });
//   } catch (error) {
//     console.error("Delete expense error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to delete expense.",
//     });
//   }
// };

// // ====================== SALARY PAYMENTS ======================

// // Record Salary Payment

// export const recordSalaryPayment = async (req, res) => {
//   try {
//     const {
//       staffId,

//       amount,

//       paymentDate,

//       paymentMonth,

//       paymentYear,

//       paymentMethod,

//       notes,
//     } = req.body;

//     const ownerId = req.user.id;

//     if (!staffId || !amount || !paymentMonth || !paymentYear) {
//       return res.status(400).json({
//         success: false,

//         message: "Staff, amount, payment month, and year are required.",
//       });
//     }

//     if (amount <= 0) {
//       return res.status(400).json({
//         success: false,

//         message: "Amount must be greater than 0.",
//       });
//     }

//     // Verify staff belongs to owner

//     const staff = await prisma.staff.findFirst({
//       where: {
//         id: staffId,

//         ownerId,
//       },
//     });

//     if (!staff) {
//       return res.status(404).json({
//         success: false,

//         message: "Staff not found or access denied.",
//       });
//     }

//     // Check if salary already paid for this month

//     const existingPayment = await prisma.salaryPayment.findFirst({
//       where: {
//         staffId,

//         paymentMonth,

//         paymentYear,
//       },
//     });

//     if (existingPayment) {
//       return res.status(400).json({
//         success: false,

//         message: "Salary already paid for this month.",
//       });
//     }

//     const salaryPayment = await prisma.salaryPayment.create({
//       data: {
//         staffId,

//         amount: parseFloat(amount),

//         paymentDate: paymentDate ? new Date(paymentDate) : new Date(),

//         paymentMonth,

//         paymentYear,

//         paymentMethod: paymentMethod || "Cash",

//         notes,

//         ownerId,

//         hostelId: staff.hostelId,
//       },

//       include: {
//         staff: {
//           select: {
//             name: true,

//             role: true,
//           },
//         },
//       },
//     });

//     res.status(201).json({
//       success: true,

//       message: "Salary payment recorded successfully",

//       data: salaryPayment,
//     });
//   } catch (error) {
//     console.error("Record salary payment error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to record salary payment.",
//     });
//   }
// };

// // Get Salary Payments

// export const getSalaryPayments = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     const {
//       hostelId,

//       staffId,

//       month,

//       year,

//       startDate,

//       endDate,
//     } = req.query;

//     const where = { ownerId };

//     if (hostelId) where.hostelId = hostelId;

//     if (staffId) where.staffId = staffId;

//     if (month) where.paymentMonth = parseInt(month);

//     if (year) where.paymentYear = parseInt(year);

//     // Date filtering

//     if (startDate || endDate) {
//       where.paymentDate = {};

//       if (startDate) where.paymentDate.gte = new Date(startDate);

//       if (endDate) where.paymentDate.lte = new Date(endDate);
//     }

//     const payments = await prisma.salaryPayment.findMany({
//       where,

//       include: {
//         staff: {
//           select: {
//             name: true,

//             role: true,

//             phone: true,
//           },
//         },

//         hostel: {
//           select: {
//             name: true,
//           },
//         },
//       },

//       orderBy: {
//         paymentDate: "desc",
//       },
//     });

//     const totalAmount = payments.reduce(
//       (sum, payment) => sum + payment.amount,
//       0
//     );

//     res.json({
//       success: true,

//       data: {
//         payments,

//         totalAmount,

//         count: payments.length,
//       },
//     });
//   } catch (error) {
//     console.error("Get salary payments error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch salary payments.",
//     });
//   }
// };

// // ====================== STUDENT BORROWING/LOANS ======================

// // Record Student Borrowing

// export const recordStudentBorrowing = async (req, res) => {
//   try {
//     const {
//       studentId,

//       amount,

//       borrowDate,

//       reason,

//       dueDate,

//       notes,
//     } = req.body;

//     const ownerId = req.user.id;

//     if (!studentId || !amount) {
//       return res.status(400).json({
//         success: false,

//         message: "Student and amount are required.",
//       });
//     }

//     if (amount <= 0) {
//       return res.status(400).json({
//         success: false,

//         message: "Amount must be greater than 0.",
//       });
//     }

//     // Verify student belongs to owner

//     const student = await prisma.student.findFirst({
//       where: {
//         id: studentId,

//         ownerId,
//       },
//     });

//     if (!student) {
//       return res.status(404).json({
//         success: false,

//         message: "Student not found or access denied.",
//       });
//     }

//     const borrowing = await prisma.studentBorrowing.create({
//       data: {
//         studentId,

//         amount: parseFloat(amount),

//         borrowDate: borrowDate ? new Date(borrowDate) : new Date(),

//         reason,

//         dueDate: dueDate ? new Date(dueDate) : null,

//         notes,

//         status: "Pending",

//         ownerId,

//         hostelId: student.hostelId,
//       },

//       include: {
//         student: {
//           select: {
//             name: true,

//             parentName: true,

//             parentPhone: true,
//           },
//         },
//       },
//     });

//     res.status(201).json({
//       success: true,

//       message: "Borrowing recorded successfully",

//       data: borrowing,
//     });
//   } catch (error) {
//     console.error("Record borrowing error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to record borrowing.",
//     });
//   }
// };

// // Get Student Borrowings

// export const getStudentBorrowings = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     const {
//       hostelId,

//       studentId,

//       status,

//       startDate,

//       endDate,
//     } = req.query;

//     const where = { ownerId };

//     if (hostelId) where.hostelId = hostelId;

//     if (studentId) where.studentId = studentId;

//     if (status) where.status = status;

//     // Date filtering

//     if (startDate || endDate) {
//       where.borrowDate = {};

//       if (startDate) where.borrowDate.gte = new Date(startDate);

//       if (endDate) where.borrowDate.lte = new Date(endDate);
//     }

//     const borrowings = await prisma.studentBorrowing.findMany({
//       where,

//       include: {
//         student: {
//           select: {
//             name: true,

//             parentName: true,

//             parentPhone: true,

//             roomNumber: true,
//           },
//         },

//         hostel: {
//           select: {
//             name: true,
//           },
//         },
//       },

//       orderBy: {
//         borrowDate: "desc",
//       },
//     });

//     const totalBorrowed = borrowings.reduce((sum, b) => sum + b.amount, 0);

//     const totalRepaid = borrowings

//       .filter((b) => b.status === "Repaid")

//       .reduce((sum, b) => sum + b.amount, 0);

//     const totalPending = borrowings

//       .filter((b) => b.status === "Pending")

//       .reduce((sum, b) => sum + b.amount, 0);

//     res.json({
//       success: true,

//       data: {
//         borrowings,

//         summary: {
//           totalBorrowed,

//           totalRepaid,

//           totalPending,

//           count: borrowings.length,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Get borrowings error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch borrowings.",
//     });
//   }
// };

// // Update Borrowing Status (Mark as Repaid)

// export const updateBorrowingStatus = async (req, res) => {
//   try {
//     const { borrowingId } = req.params;

//     const { status, repaymentDate, notes } = req.body;

//     const ownerId = req.user.id;

//     if (!status) {
//       return res.status(400).json({
//         success: false,

//         message: "Status is required.",
//       });
//     }

//     const validStatuses = ["Pending", "Repaid", "Cancelled"];

//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,

//         message: "Invalid status.",
//       });
//     }

//     const existingBorrowing = await prisma.studentBorrowing.findFirst({
//       where: {
//         id: borrowingId,

//         ownerId,
//       },
//     });

//     if (!existingBorrowing) {
//       return res.status(404).json({
//         success: false,

//         message: "Borrowing not found or access denied.",
//       });
//     }

//     const updatedData = { status };

//     if (status === "Repaid" && repaymentDate) {
//       updatedData.repaymentDate = new Date(repaymentDate);
//     }

//     if (notes) {
//       updatedData.notes = notes;
//     }

//     const borrowing = await prisma.studentBorrowing.update({
//       where: { id: borrowingId },

//       data: updatedData,

//       include: {
//         student: {
//           select: {
//             name: true,
//           },
//         },
//       },
//     });

//     res.json({
//       success: true,

//       message: "Borrowing status updated successfully",

//       data: borrowing,
//     });
//   } catch (error) {
//     console.error("Update borrowing status error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to update borrowing status.",
//     });
//   }
// };

// // ====================== ACCOUNTING REPORTS ======================

// // Get Monthly Accounting Report

// export const getMonthlyAccountingReport = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     const { month, year, hostelId } = req.query;

//     if (!month || !year) {
//       return res.status(400).json({
//         success: false,

//         message: "Month and year are required.",
//       });
//     }

//     const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);

//     const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

//     const where = {
//       ownerId,

//       ...(hostelId && { hostelId }),
//     };

//     // Get all expenses for the month

//     const expenses = await prisma.expense.findMany({
//       where: {
//         ...where,

//         expenseDate: {
//           gte: startOfMonth,

//           lte: endOfMonth,
//         },
//       },
//     });

//     // Get all salary payments for the month

//     const salaryPayments = await prisma.salaryPayment.findMany({
//       where: {
//         ...where,

//         paymentMonth: parseInt(month),

//         paymentYear: parseInt(year),
//       },
//     });

//     // Get all fee payments for the month

//     const feePayments = await prisma.feePayment.findMany({
//       where: {
//         ...where,

//         paymentDate: {
//           gte: startOfMonth,

//           lte: endOfMonth,
//         },

//         status: "Completed", // OPTIONAL: Add this if you have failed payments
//       },
//     });

//     // Get borrowings for the month

//     const borrowings = await prisma.studentBorrowing.findMany({
//       where: {
//         ...where,

//         borrowDate: {
//           gte: startOfMonth,

//           lte: endOfMonth,
//         },
//       },
//     });

//     // Calculate totals

//     const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

//     const totalSalaries = salaryPayments.reduce(
//       (sum, sal) => sum + sal.amount,
//       0
//     );

//     const totalFeeIncome = feePayments.reduce(
//       (sum, fee) => sum + fee.amount,
//       0
//     );

//     const totalBorrowings = borrowings.reduce((sum, b) => sum + b.amount, 0);

//     // Expense breakdown by category

//     const expensesByCategory = expenses.reduce((acc, exp) => {
//       acc[exp.category] = (acc[exp.category] || 0) + exp.amount;

//       return acc;
//     }, {});

//     const totalCosts = totalExpenses + totalSalaries;

//     const netIncome = totalFeeIncome - totalCosts;

//     res.json({
//       success: true,

//       data: {
//         period: {
//           month: parseInt(month),

//           year: parseInt(year),

//           monthName: new Date(year, month - 1).toLocaleString("default", {
//             month: "long",
//           }),
//         },

//         income: {
//           feePayments: totalFeeIncome,

//           studentBorrowings: totalBorrowings,

//           total: totalFeeIncome,
//         },

//         expenses: {
//           general: totalExpenses,

//           salaries: totalSalaries,

//           total: totalCosts,

//           breakdown: expensesByCategory,
//         },

//         summary: {
//           totalIncome: totalFeeIncome,

//           totalExpenses: totalCosts,

//           netIncome: netIncome,

//           profitMargin:
//             totalFeeIncome > 0
//               ? ((netIncome / totalFeeIncome) * 100).toFixed(2) + "%"
//               : "0%",
//         },

//         counts: {
//           totalExpenseEntries: expenses.length,

//           totalSalaryPayments: salaryPayments.length,

//           totalFeePayments: feePayments.length,

//           totalBorrowings: borrowings.length,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Monthly report error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to generate monthly report.",
//     });
//   }
// };

// // Get Yearly Accounting Report

// export const getYearlyAccountingReport = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     const { year, hostelId } = req.query;

//     if (!year) {
//       return res.status(400).json({
//         success: false,

//         message: "Year is required.",
//       });
//     }

//     const startOfYear = new Date(year, 0, 1);

//     const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

//     const where = {
//       ownerId,

//       ...(hostelId && { hostelId }),
//     };

//     // Get all expenses for the year

//     const expenses = await prisma.expense.findMany({
//       where: {
//         ...where,

//         expenseDate: {
//           gte: startOfYear,

//           lte: endOfYear,
//         },
//       },
//     });

//     // Get all salary payments for the year

//     const salaryPayments = await prisma.salaryPayment.findMany({
//       where: {
//         ...where,

//         paymentYear: parseInt(year),
//       },
//     });

//     // Get all fee payments for the year

//     const feePayments = await prisma.feePayment.findMany({
//       where: {
//         ...where,

//         paymentDate: {
//           gte: startOfYear,

//           lte: endOfYear,
//         },
//       },
//     });

//     // Get borrowings for the year

//     const borrowings = await prisma.studentBorrowing.findMany({
//       where: {
//         ...where,

//         borrowDate: {
//           gte: startOfYear,

//           lte: endOfYear,
//         },
//       },
//     });

//     // Calculate monthly breakdown

//     const monthlyData = Array.from({ length: 12 }, (_, i) => {
//       const month = i + 1;

//       const monthExpenses = expenses.filter(
//         (e) => new Date(e.expenseDate).getMonth() === i
//       );

//       const monthSalaries = salaryPayments.filter(
//         (s) => s.paymentMonth === month
//       );

//       const monthFees = feePayments.filter(
//         (f) => new Date(f.paymentDate).getMonth() === i
//       );

//       const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

//       const salaryTotal = monthSalaries.reduce((sum, s) => sum + s.amount, 0);

//       const feeTotal = monthFees.reduce((sum, f) => sum + f.amount, 0);

//       return {
//         month,

//         monthName: new Date(year, i).toLocaleString("default", {
//           month: "long",
//         }),

//         income: feeTotal,

//         expenses: expenseTotal + salaryTotal,

//         netIncome: feeTotal - (expenseTotal + salaryTotal),
//       };
//     });

//     // Calculate totals

//     const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

//     const totalSalaries = salaryPayments.reduce(
//       (sum, sal) => sum + sal.amount,
//       0
//     );

//     const totalFeeIncome = feePayments.reduce(
//       (sum, fee) => sum + fee.amount,
//       0
//     );

//     const totalBorrowings = borrowings.reduce((sum, b) => sum + b.amount, 0);

//     // Expense breakdown by category

//     const expensesByCategory = expenses.reduce((acc, exp) => {
//       acc[exp.category] = (acc[exp.category] || 0) + exp.amount;

//       return acc;
//     }, {});

//     const totalCosts = totalExpenses + totalSalaries;

//     const netIncome = totalFeeIncome - totalCosts;

//     res.json({
//       success: true,

//       data: {
//         period: {
//           year: parseInt(year),
//         },

//         income: {
//           feePayments: totalFeeIncome,

//           studentBorrowings: totalBorrowings,

//           total: totalFeeIncome,
//         },

//         expenses: {
//           general: totalExpenses,

//           salaries: totalSalaries,

//           total: totalCosts,

//           breakdown: expensesByCategory,
//         },

//         summary: {
//           totalIncome: totalFeeIncome,

//           totalExpenses: totalCosts,

//           netIncome: netIncome,

//           profitMargin:
//             totalFeeIncome > 0
//               ? ((netIncome / totalFeeIncome) * 100).toFixed(2) + "%"
//               : "0%",

//           averageMonthlyIncome: (totalFeeIncome / 12).toFixed(2),

//           averageMonthlyExpense: (totalCosts / 12).toFixed(2),
//         },

//         monthlyBreakdown: monthlyData,

//         counts: {
//           totalExpenseEntries: expenses.length,

//           totalSalaryPayments: salaryPayments.length,

//           totalFeePayments: feePayments.length,

//           totalBorrowings: borrowings.length,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Yearly report error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to generate yearly report.",
//     });
//   }
// };

// // Get Dashboard Summary (Current Month Overview)
// export const getDashboardSummary = async (req, res) => {
//   try {
//     const ownerId = req.user.id;

//     // Prefer the middleware-verified hostel id. Fallback to query for safety.
//     const hostelId = req.hostelId ?? req.query.hostelId ?? null;

//     console.log('getDashboardSummary: ownerId=', ownerId, 'hostelId=', hostelId);

//     const now = new Date();

//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(
//       now.getFullYear(),
//       now.getMonth() + 1,
//       0,
//       23,
//       59,
//       59,
//       999
//     );

//     // Use the verified hostelId to scope queries. If null -> global view for owner.
//     const where = {
//       ownerId,
//       ...(hostelId ? { hostelId } : {}),
//     };

//     // ... rest of controller unchanged ...

//     // Current month data

//     const [
//       monthExpenses,

//       monthSalaries,

//       monthFees,

//       pendingBorrowings,

//       totalStudents,

//       totalStaff,
//     ] = await Promise.all([
//       prisma.expense.aggregate({
//         where: {
//           ...where,

//           expenseDate: { gte: startOfMonth, lte: endOfMonth },
//         },

//         _sum: { amount: true },

//         _count: true,
//       }),

//       prisma.salaryPayment.aggregate({
//         where: {
//           ...where,

//           paymentMonth: now.getMonth() + 1,

//           paymentYear: now.getFullYear(),
//         },

//         _sum: { amount: true },

//         _count: true,
//       }),

//       prisma.feePayment.aggregate({
//         where: {
//           ...where,

//           paymentDate: { gte: startOfMonth, lte: endOfMonth },
//         },

//         _sum: { amount: true },

//         _count: true,
//       }),

//       prisma.studentBorrowing.aggregate({
//         where: {
//           ...where,

//           status: "Pending",
//         },

//         _sum: { amount: true },

//         _count: true,
//       }),

//       prisma.student.count({ where }),

//       prisma.staff.count({ where: { ...where, isActive: true } }),
//     ]);

//     const totalIncome = monthFees._sum.amount || 0;

//     const totalExpensesAmount =
//       (monthExpenses._sum.amount || 0) + (monthSalaries._sum.amount || 0);

//     const netIncome = totalIncome - totalExpensesAmount;

//     res.json({
//       success: true,

//       data: {
//         currentMonth: {
//           month: now.toLocaleString("default", { month: "long" }),

//           year: now.getFullYear(),
//         },

//         income: {
//           totalFeeCollected: totalIncome,

//           feePaymentsCount: monthFees._count,
//         },

//         expenses: {
//           generalExpenses: monthExpenses._sum.amount || 0,

//           salaryExpenses: monthSalaries._sum.amount || 0,

//           totalExpenses: totalExpensesAmount,

//           expenseCount: monthExpenses._count + monthSalaries._count,
//         },

//         netIncome: {
//           amount: netIncome,

//           status: netIncome >= 0 ? "Profit" : "Loss",
//         },

//         borrowings: {
//           pendingAmount: pendingBorrowings._sum.amount || 0,

//           pendingCount: pendingBorrowings._count,
//         },

//         counts: {
//           totalStudents,

//           totalActiveStaff: totalStaff,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Dashboard summary error:", error);

//     res.status(500).json({
//       success: false,

//       message: "Failed to fetch dashboard summary.",
//     });
//   }
// };

import { prisma } from "../config/database.js";
import { hashPassword, comparePassword } from "../utils/passwordHelper.js";
import { generateToken } from "../utils/jwtHelper.js";

// ====================== AUTHENTICATION ======================

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

export const getMyHostels = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hostels = await prisma.hostel.findMany({
      where: { ownerId },
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: hostels });
  } catch (error) {
    console.error("Get hostels error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch hostels." });
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
      roomNumber,
      bedNumber,
      monthlyFee,
      feeDueDate,
      admissionDate,
      notes,
      hostelId,
    } = req.body;

    const ownerId = req.user.id;

    if (!name || !parentName || !parentPhone || !monthlyFee || !hostelId) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing." });
    }

    const dueDateDay = feeDueDate ? parseInt(feeDueDate) : 1;

    // Verify hostel
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, ownerId },
    });
    if (!hostel)
      return res
        .status(404)
        .json({ success: false, message: "Hostel not found." });

    const student = await prisma.student.create({
      data: {
        name,
        parentName,
        parentPhone,
        parentEmail,
        roomNumber,
        bedNumber,
        monthlyFee: parseFloat(monthlyFee),
        feeDueDate: dueDateDay,
        admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        notes,
        ownerId,
        hostelId,
      },
    });

    // Create Parent Credentials
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
        email: parentEmail,
        studentId: student.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Student registered",
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
    res
      .status(500)
      .json({ success: false, message: "Failed to register student." });
  }
};

// --- UPGRADED: Get Students with Pending Month Count ---
export const getMyStudents = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { hostelId } = req.query;
    const where = { ownerId, ...(hostelId && { hostelId }) };

    const students = await prisma.student.findMany({
      where,
      include: {
        hostel: { select: { name: true } },
        parent: { select: { username: true, phone: true } },
        // Fetch all PAID records to calculate gaps
        feeRecords: {
          where: { status: "PAID" },
          orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
        },
      },
      orderBy: { roomNumber: "asc" },
    });

    const currentDate = new Date();

    const processedStudents = students.map((student) => {
      // Calculate how many months are pending since admission
      const admission = new Date(student.admissionDate);
      let pendingCount = 0;
      let checkDate = new Date(
        admission.getFullYear(),
        admission.getMonth(),
        1
      );

      // Loop from admission month until current month
      while (
        checkDate <
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      ) {
        const cMonth = checkDate.getMonth() + 1;
        const cYear = checkDate.getFullYear();

        // Is this specific month/year paid?
        const isPaid = student.feeRecords.some(
          (r) => r.billingMonth === cMonth && r.billingYear === cYear
        );

        if (!isPaid) {
          // If it's the current month, only count it as pending if today > feeDueDate
          if (
            cMonth === currentDate.getMonth() + 1 &&
            cYear === currentDate.getFullYear()
          ) {
            if (currentDate.getDate() > student.feeDueDate) {
              pendingCount++;
            }
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
        // Check if current month is upcoming
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
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch students." });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
      include: {
        hostel: { select: { id: true, name: true, hostelType: true } },
        parent: true,
      },
    });

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found." });
    res.json({ success: true, data: student });
  } catch (error) {
    console.error("Get student error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch student." });
  }
};

// ====================== FEE MANAGEMENT (UPDATED) ======================

// --- NEW: Get Details for Fee Collection Dropdown ---
export const getStudentFeeDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const ownerId = req.user.id;

    const student = await prisma.student.findFirst({
      where: { id: studentId, ownerId },
      include: {
        feeRecords: {
          orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }],
        },
      },
    });

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const pendingCycles = [];
    const admissionDate = new Date(student.admissionDate);
    const currentDate = new Date();

    // Normalize start date to first of admission month
    let checkDate = new Date(
      admissionDate.getFullYear(),
      admissionDate.getMonth(),
      1
    );

    const getMonthName = (d) => d.toLocaleString("default", { month: "long" });

    // Loop through all months since admission
    while (checkDate <= currentDate) {
      const checkMonth = checkDate.getMonth() + 1;
      const checkYear = checkDate.getFullYear();

      // Check if PAID record exists
      const isPaid = student.feeRecords.some(
        (r) =>
          r.billingMonth === checkMonth &&
          r.billingYear === checkYear &&
          r.status === "PAID"
      );

      if (!isPaid) {
        pendingCycles.push({
          month: checkMonth,
          year: checkYear,
          label: `${getMonthName(checkDate)} ${checkYear}`,
          amount: student.monthlyFee,
          isCurrentMonth:
            checkMonth === currentDate.getMonth() + 1 &&
            checkYear === currentDate.getFullYear(),
        });
      }
      checkDate.setMonth(checkDate.getMonth() + 1);
    }

    res.json({
      success: true,
      data: {
        studentDetails: {
          name: student.name,
          monthlyFee: student.monthlyFee,
          parentName: student.parentName,
          roomNumber: student.roomNumber,
        },
        pendingMonths: pendingCycles, // UI uses this for the Dropdown
        history: student.feeRecords,
      },
    });
  } catch (error) {
    console.error("Get fee details error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch fee details" });
  }
};

// --- UPDATED: Collect Fee with Transaction ---

// --- 3. UPDATED: Collect Fee (Handles Borrowing Inclusion) ---
export const collectStudentFee = async (req, res) => {
  try {
    const {
      studentId,
      amount, // Total Amount (Fee + Borrowing)
      paymentDate,
      paymentMonth,
      paymentYear,
      paymentMethod,
      notes,
      borrowingIds, // Array of borrowing IDs to mark as repaid
    } = req.body;
    const ownerId = req.user.id;

    if (!studentId || !amount || !paymentMonth || !paymentYear) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const actualDate = paymentDate ? new Date(paymentDate) : new Date();
    
    // Cycle Logic: Due date is based on the Billing Month + Student's Fee Due Day
    // e.g., If Billing Month is Jan (1) and Due Day is 5, Due Date = Jan 5th.
    const cycleDueDate = new Date(paymentYear, paymentMonth - 1, student.feeDueDate);

    const result = await prisma.$transaction(async (prisma) => {
      // A. Create Fee Payment Receipt (Records the TOTAL amount paid)
      const newPayment = await prisma.feePayment.create({
        data: {
          amount: parseFloat(amount),
          paymentDate: actualDate,
          paymentMonth: parseInt(paymentMonth),
          paymentYear: parseInt(paymentYear),
          paymentMethod: paymentMethod || "Cash",
          notes: notes || (borrowingIds?.length > 0 ? "Fee + Borrowing Repayment" : "Monthly Fee"),
          status: "Completed",
          studentId,
          ownerId,
          hostelId: student.hostelId,
        },
      });

      // B. Update Fee Record (Ledger)
      // We record the TOTAL amount here so the ledger shows the full money received for this cycle
      await prisma.feeRecord.upsert({
        where: {
          studentId_billingMonth_billingYear: {
            studentId,
            billingMonth: parseInt(paymentMonth),
            billingYear: parseInt(paymentYear),
          },
        },
        update: { 
            status: "PAID", 
            amount: parseFloat(amount), // Update with total paid
            paidDate: actualDate, 
            paymentMethod 
        },
        create: {
          studentId,
          amount: parseFloat(amount), // Record total paid
          billingMonth: parseInt(paymentMonth),
          billingYear: parseInt(paymentYear),
          dueDate: cycleDueDate,
          status: "PAID",
          paidDate: actualDate,
          paymentMethod,
          notes: "Collected via App",
        },
      });

      // C. Mark Borrowings as Repaid (CRITICAL STEP)
      if (borrowingIds && borrowingIds.length > 0) {
        await prisma.studentBorrowing.updateMany({
          where: { id: { in: borrowingIds } },
          data: { status: "Repaid" },
        });
      }

      // D. Activity Log
      await prisma.activity.create({
        data: {
          studentId,
          type: "PAYMENT",
          title: "Payment Received",
          description: `Received ₹${amount} for ${paymentMonth}/${paymentYear}`,
          amount: parseFloat(amount),
          status: "Completed",
        },
      });

      return newPayment;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
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

    if (!title || !amount || !category || !hostelId) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing." });
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
    });

    res
      .status(201)
      .json({ success: true, message: "Expense added", data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add expense." });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { hostelId, category, startDate, endDate } = req.query;
    const where = {
      ownerId,
      ...(hostelId && { hostelId }),
      ...(category && { category }),
    };

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { hostel: { select: { name: true } } },
      orderBy: { expenseDate: "desc" },
    });
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({ success: true, data: { expenses, totalAmount } });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch expenses." });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false });
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

export const recordStudentBorrowing = async (req, res) => {
  try {
    const { studentId, amount, reason, dueDate, notes } = req.body;
    const ownerId = req.user.id;
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
        ownerId,
        hostelId: student.hostelId,
      },
    });
    res.status(201).json({ success: true, data: borrow });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to record borrowing." });
  }
};

export const getStudentBorrowings = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { studentId } = req.query; // Updated to support filter

    const where = { ownerId };
    if (studentId) where.studentId = studentId;

    const borrowings = await prisma.studentBorrowing.findMany({
      where,
      include: { student: { select: { name: true } } },
      orderBy: { borrowDate: "desc" },
    });
    res.json({ success: true, data: { borrowings } });
  } catch (e) {
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

export const createPermission = async (req, res) => {
  try {
    const { studentId, type, reason, returnDate } = req.body;
    const ownerId = req.user.id;

    if (!studentId || !type) {
      return res.status(400).json({ success: false, message: "Type is required" });
    }

    // 1. Create Permission Record
    const permission = await prisma.permission.create({
      data: {
        studentId,
        ownerId,
        type,
        reason: reason || "No reason provided",
        returnDate: returnDate ? new Date(returnDate) : null,
        status: "APPROVED", // Enum value from your schema
      },
    });

    // 2. Log Activity (Using your ActivityType Enum)
    await prisma.activity.create({
      data: {
        studentId,
        type: "PERMISSION", // Matches ActivityType enum
        title: `Permission Granted: ${type}`,
        description: reason,
        status: "Approved",
      },
    });

    res.status(201).json({ success: true, message: "Permission sent", data: permission });
  } catch (error) {
    console.error("Create permission error:", error);
    res.status(500).json({ success: false, message: "Failed to create permission" });
  }
};

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

export const createAlert = async (req, res) => {
  try {
    const { studentId, title, message, type } = req.body;
    const ownerId = req.user.id;

    if (!studentId || !title || !message) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // 1. Create Alert Record
    const alert = await prisma.alert.create({
      data: {
        studentId,
        ownerId,
        title,
        message,
        alertType: type || "INFO",
      },
    });

    // 2. Log Activity
    await prisma.activity.create({
      data: {
        studentId,
        type: "ALERT", // Matches ActivityType enum
        title: `Alert Sent: ${title}`,
        description: message,
        status: "Sent",
      },
    });

    res.status(201).json({ success: true, message: "Alert sent", data: alert });
  } catch (error) {
    console.error("Create alert error:", error);
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