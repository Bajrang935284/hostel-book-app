import { generateUploadUrl } from '../services/s3Service.js';

// Controller to get the Presigned URL
export const getPresignedUrl = async (req, res) => {
  try {
    const { folder, fileType } = req.body; // e.g., { folder: 'students', fileType: 'image/jpeg' }
    
    // Basic validation
    if (!folder || !fileType) {
      return res.status(400).json({ error: "Folder and fileType are required" });
    }

    // Call the service
    const { uploadUrl, key } = await generateUploadUrl(folder, fileType);
    
    // Send back the URL (to upload) and the Key (to save in DB later)
    res.json({ uploadUrl, key });

  } catch (error) {
    console.error("S3 Controller Error:", error);
    res.status(500).json({ error: "Failed to generate upload link" });
  }
};