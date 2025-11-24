import express from 'express';
import { adminLogin, getAdminProfile } from '../controllers/adminController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.post('/login', adminLogin);
router.get('/profile', authenticate, authorizeRole('admin'), getAdminProfile);

export default router;