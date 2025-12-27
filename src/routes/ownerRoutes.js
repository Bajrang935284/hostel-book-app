// import express from 'express';
// import { 
//   // Auth & Global
//   ownerRegister, 
//   ownerLogin, 
//   getOwnerProfile,
//   registerHostel,
//   getMyHostels,
//   getHostelById,

//   // Student Management
//   registerStudent,
//   getMyStudents,
//   getStudentById,
//   collectStudentFee,

//   // Staff Management
//   registerStaff,
//   getMyStaff,
//   getStaffById,
//   updateStaff,
//   deleteStaff,
//   updateStaffSalary,
//   getStaffStats,

//   // Expense Management
//   addExpense,
//   getExpenses,
//   updateExpense,
//   deleteExpense,

//   // Salary Payments
//   recordSalaryPayment,
//   getSalaryPayments,

//   // Borrowing/Loans
//   recordStudentBorrowing,
//   getStudentBorrowings,
//   updateBorrowingStatus,

//   // Accounting & Reports
//   getMonthlyAccountingReport,
//   getYearlyAccountingReport,
//   getDashboardSummary,
  
//   // Activities
//   // getHostelActivities
// } from '../controllers/ownerController.js';

// import { authenticate } from '../middlewares/authMiddleware.js';
// import { authorizeRole } from '../middlewares/roleMiddleware.js';
// import { requireHostelSelection } from '../middlewares/hostelMiddleware.js';

// const router = express.Router();

// // ============================================================================
// // 1. GLOBAL ROUTES 
// // (No Hostel Selection Required - These help the user log in and pick a hostel)
// // ============================================================================

// // Authentication
// router.post('/register', ownerRegister);
// router.post('/login', ownerLogin);
// router.get('/profile', authenticate, authorizeRole('owner'), getOwnerProfile);

// // Hostel Creation & Listing
// // Note: getMyHostels is what populates your "Switch Hostel" dropdown
// router.post('/hostels', authenticate, authorizeRole('owner'), registerHostel);
// router.get('/hostels', authenticate, authorizeRole('owner'), getMyHostels);
// router.get('/hostels/:hostelId', authenticate, authorizeRole('owner'), getHostelById);

// // ============================================================================
// // 2. SCOPED ROUTES 
// // (Require 'x-hostel-id' Header & requireHostelSelection Middleware)
// // ============================================================================

// // Apply middleware to all routes defined BELOW this line
// // This ensures every subsequent route checks if the owner owns the specific hostel
// router.use(authenticate, authorizeRole('owner'), requireHostelSelection);

// // --- DASHBOARD & TIMELINE ---
// router.get('/dashboard', getDashboardSummary);
// // router.get('/activities', getHostelActivities);

// // --- STUDENT MANAGEMENT ---
// router.post('/students', registerStudent);
// router.get('/students', getMyStudents);
// router.get('/students/:studentId', getStudentById);
// router.post('/collect-fee', collectStudentFee);

// // --- STAFF MANAGEMENT ---
// router.post('/staff', registerStaff);
// router.get('/staff', getMyStaff);
// router.get('/staff/stats', getStaffStats);
// router.get('/staff/:staffId', getStaffById);
// router.put('/staff/:staffId', updateStaff);
// router.patch('/staff/:staffId/salary', updateStaffSalary);
// router.delete('/staff/:staffId', deleteStaff);

// // --- EXPENSE MANAGEMENT ---
// router.post('/expenses', addExpense);
// router.get('/expenses', getExpenses);
// router.put('/expenses/:expenseId', updateExpense);
// router.delete('/expenses/:expenseId', deleteExpense);

// // --- SALARY PAYMENTS ---
// router.post('/salary-payments', recordSalaryPayment);
// router.get('/salary-payments', getSalaryPayments);

// // --- STUDENT BORROWING ---
// router.post('/borrowings', recordStudentBorrowing);
// router.get('/borrowings', getStudentBorrowings);
// router.patch('/borrowings/:borrowingId', updateBorrowingStatus);

// // --- ACCOUNTING REPORTS ---
// router.get('/accounting/monthly', getMonthlyAccountingReport);
// router.get('/accounting/yearly', getYearlyAccountingReport);

// export default router;



import express from 'express';
import { 
  // Auth & Global
  ownerRegister, 
  ownerLogin, 
  getOwnerProfile,
  registerHostel,
  getMyHostels,
  getHostelById,

  // Student Management
  registerStudent,
  getMyStudents,
  getStudentById,
  collectStudentFee,
  getStudentFeeDetails, // <--- 1. NEW IMPORT ADDED HERE

  // Staff Management
  registerStaff,
  getMyStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  updateStaffSalary,
  getStaffStats,

  // Expense Management
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,

  // Salary Payments
  recordSalaryPayment,
  getSalaryPayments,

  // Borrowing/Loans
  recordStudentBorrowing,
  getStudentBorrowings,
  updateBorrowingStatus,
deleteBorrowing,
  // Accounting & Reports
  getMonthlyAccountingReport,
  getYearlyAccountingReport,
  getDashboardSummary,

  createPermission,        // <-- ADD THIS
  getStudentPermissions,   // <-- ADD THIS
  createAlert,             // <-- ADD THIS
  getStudentAlerts         // <-- ADD THIS
} from '../controllers/ownerController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';
import { requireHostelSelection } from '../middlewares/hostelMiddleware.js';

const router = express.Router();

// ============================================================================
// 1. GLOBAL ROUTES 
// (No Hostel Selection Required)
// ============================================================================

// Authentication
router.post('/register', ownerRegister);
router.post('/login', ownerLogin);
router.get('/profile', authenticate, authorizeRole('owner'), getOwnerProfile);

// Hostel Creation & Listing
router.post('/hostels', authenticate, authorizeRole('owner'), registerHostel);
router.get('/hostels', authenticate, authorizeRole('owner'), getMyHostels);
router.get('/hostels/:hostelId', authenticate, authorizeRole('owner'), getHostelById);

// ============================================================================
// 2. SCOPED ROUTES 
// (Require 'x-hostel-id' Header & requireHostelSelection Middleware)
// ============================================================================

// Apply middleware to all routes defined BELOW this line
router.use(authenticate, authorizeRole('owner'), requireHostelSelection);

// --- DASHBOARD ---
router.get('/dashboard', getDashboardSummary);

// --- STUDENT MANAGEMENT ---
router.post('/students', registerStudent);
router.get('/students', getMyStudents);

// 2. NEW ROUTE ADDED HERE:
// This gets the pending months logic for the dropdown
router.get('/students/:studentId/fee-details', getStudentFeeDetails); 

router.get('/students/:studentId', getStudentById);
router.post('/collect-fee', collectStudentFee);

// --- STAFF MANAGEMENT ---
router.post('/staff', registerStaff);
router.get('/staff', getMyStaff);
router.get('/staff/stats', getStaffStats);
router.get('/staff/:staffId', getStaffById);
router.put('/staff/:staffId', updateStaff);
router.patch('/staff/:staffId/salary', updateStaffSalary);
router.delete('/staff/:staffId', deleteStaff);

// --- EXPENSE MANAGEMENT ---
router.post('/expenses', addExpense);
router.get('/expenses', getExpenses);
router.put('/expenses/:expenseId', updateExpense);
router.delete('/expenses/:expenseId', deleteExpense);

// --- SALARY PAYMENTS ---
router.post('/salary-payments', recordSalaryPayment);
router.get('/salary-payments', getSalaryPayments);

// --- STUDENT BORROWING ---
// ... existing routes
router.post('/borrowings', recordStudentBorrowing);
router.get('/borrowings', getStudentBorrowings); // Logic updated to handle ?studentId=
router.patch('/borrowings/:borrowingId', updateBorrowingStatus);
router.delete('/borrowings/:borrowingId', deleteBorrowing); // <--- ADD THIS
// ...
// --- ACCOUNTING REPORTS ---
router.get('/accounting/monthly', getMonthlyAccountingReport);
router.get('/accounting/yearly', getYearlyAccountingReport);
router.post('/permissions', createPermission);
router.get('/students/:studentId/permissions', getStudentPermissions);

// --- ALERTS ---
router.post('/alerts', createAlert);
router.get('/students/:studentId/alerts', getStudentAlerts);
export default router;