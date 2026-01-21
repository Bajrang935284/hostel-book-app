-- Add missing proofImageKey column to Expense table
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "proofImageKey" TEXT;
