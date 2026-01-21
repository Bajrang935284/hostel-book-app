// src/services/s3Service.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid'; // Use 'v4 as' syntax for ES modules

// 1. Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generates a temporary URL for uploading a file directly to S3.
 * @param {string} folder - 'students', 'expenses', etc.
 * @param {string} fileType - 'image/jpeg', 'image/png', etc.
 */
export async function generateUploadUrl(folder, fileType) {
  // Create a unique filename: students/random-id.jpg
  const extension = fileType.split('/')[1];
  const key = `${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  // URL valid for 60 seconds
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

  return { uploadUrl, key };
}

/**
 * Generates a temporary URL for VIEWING a private file.
 * @param {string} key - The file path stored in your DB
 */
export async function generateViewUrl(key) {
  if (!key) return null;
  
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  // URL valid for 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}