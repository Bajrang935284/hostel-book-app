import express from 'express';
import {
  getStudentActivities,
  addBorrowedMoney,
  markBorrowedMoneyPaid,
  getBorrowedMoney,
  addFeePayment,
  getFeeRecords,
  getPaymentSummary,
  sendPermissionRequest,
  getPermissionRequests,
  sendAlert,
  getAlerts
} from '../controllers/activityController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';
import { requireHostelSelection } from '../middlewares/hostelMiddleware.js';

const router = express.Router();

// ============================================================================
// GLOBAL MIDDLEWARE FOR ACTIVITY ROUTES
// ============================================================================
// 1. Authenticate User
// 2. Ensure User is an Owner
// 3. Ensure a Hostel is Selected (x-hostel-id header)
router.use(authenticate, authorizeRole('owner'), requireHostelSelection);

// ============================================================================
// ROUTES
// ============================================================================

// All tab - Activities Timeline
router.get('/:studentId/activities', getStudentActivities);

// Payment tab - Borrowing
router.post('/:studentId/borrowed-money', addBorrowedMoney);
router.get('/:studentId/borrowed-money', getBorrowedMoney);
router.patch('/borrowed-money/:borrowingId/paid', markBorrowedMoneyPaid); // Note: param matches controller

// Payment tab - Fees
router.post('/:studentId/fee-payment', addFeePayment);
router.get('/:studentId/fee-records', getFeeRecords);
router.get('/:studentId/payment-summary', getPaymentSummary);

// Permission tab
router.post('/:studentId/permissions', sendPermissionRequest);
router.get('/:studentId/permissions', getPermissionRequests);

// Alert tab
router.post('/:studentId/alerts', sendAlert);
router.get('/:studentId/alerts', getAlerts);

export default router;