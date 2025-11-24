// import express from 'express';
// import { 
//   parentLogin, 
//   changePassword,
//   getParentProfile,
//   getDashboard,
//   getAllActivities,
//   getFeeStatus,
//   getFeeHistory,
//   getBorrowedMoneyStatus,
//   getPermissions,
//   respondToPermission,
//   getAlerts,
//   markAlertAsRead,
//   markAllAlertsAsRead,
  
// } from '../controllers/parentController.js';
// import { authenticate } from '../middlewares/authMiddleware.js';
// import { authorizeRole } from '../middlewares/roleMiddleware.js';

// const router = express.Router();

// // Authentication
// router.post('/login', parentLogin);
// router.post('/change-password', authenticate, authorizeRole('parent'), changePassword);
// router.get('/profile', authenticate, authorizeRole('parent'), getParentProfile);

// // Dashboard & Activities
// router.get('/dashboard', authenticate, authorizeRole('parent'), getDashboard);
// router.get('/activities', authenticate, authorizeRole('parent'), getAllActivities);

// // Payment / Fee Status
// router.get('/fee-status', authenticate, authorizeRole('parent'), getFeeStatus);
// router.get('/fee-history', authenticate, authorizeRole('parent'), getFeeHistory);
// router.get('/borrowed-money', authenticate, authorizeRole('parent'), getBorrowedMoneyStatus);

// // Permissions
// router.get('/permissions', authenticate, authorizeRole('parent'), getPermissions);
// router.post('/permissions/:permissionId/respond', authenticate, authorizeRole('parent'), respondToPermission);

// // Alerts
// router.get('/alerts', authenticate, authorizeRole('parent'), getAlerts);
// router.patch('/alerts/:alertId/read', authenticate, authorizeRole('parent'), markAlertAsRead);
// router.patch('/alerts/read-all', authenticate, authorizeRole('parent'), markAllAlertsAsRead);

// export default router;

import express from 'express';
import { 
  parentLogin, 
  changePassword,
  getParentProfile,
  getDashboard,
  getAllActivities,
  getFeeStatus,
  getFeeHistory,
  getBorrowedMoneyStatus,
  getPermissions,
  respondToPermission,
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead
} from '../controllers/parentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Note: Parents DO NOT use 'requireHostelSelection' middleware.
// Their context is implicitly derived from their linked Student.

// Authentication
router.post('/login', parentLogin);

// Profile & Security
router.post('/change-password', authenticate, authorizeRole('parent'), changePassword);
router.get('/profile', authenticate, authorizeRole('parent'), getParentProfile);

// Dashboard & Activities
router.get('/dashboard', authenticate, authorizeRole('parent'), getDashboard);
router.get('/activities', authenticate, authorizeRole('parent'), getAllActivities);

// Payment / Fee Status
router.get('/fee-status', authenticate, authorizeRole('parent'), getFeeStatus);
router.get('/fee-history', authenticate, authorizeRole('parent'), getFeeHistory);
router.get('/borrowed-money', authenticate, authorizeRole('parent'), getBorrowedMoneyStatus);

// Permissions
router.get('/permissions', authenticate, authorizeRole('parent'), getPermissions);
router.post('/permissions/:permissionId/respond', authenticate, authorizeRole('parent'), respondToPermission);

// Alerts
router.get('/alerts', authenticate, authorizeRole('parent'), getAlerts);
router.patch('/alerts/:alertId/read', authenticate, authorizeRole('parent'), markAlertAsRead);
router.patch('/alerts/read-all', authenticate, authorizeRole('parent'), markAllAlertsAsRead);

export default router;