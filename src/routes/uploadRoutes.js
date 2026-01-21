import express from "express";
import { getPresignedUrl } from "../controllers/uploadController.js";
import { authenticate } from "../middlewares/authMiddleware.js"; // Security: Only logged-in users can upload

const router = express.Router();

// Generate Presigned URL for S3 Upload
// Route: POST /api/upload/get-url
router.post('/get-url', authenticate, getPresignedUrl);

export default router;