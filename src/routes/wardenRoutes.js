import express from 'express';
import { addWarden, wardenLogin } from '../controllers/wardenController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';
import { requireHostelSelection } from '../middlewares/hostelMiddleware.js'; // 1. Import this

const router = express.Router();

// Owner adds a warden (Protected: Owner only)
// Route: POST /api/warden/add
// 2. Add 'requireHostelSelection' here so it reads the x-hostel-id header
router.post('/add', authenticate, authorizeRole('owner'), requireHostelSelection, addWarden);

// Warden Login (Public)
// Route: POST /api/warden/login
router.post('/login', wardenLogin);

export default router;