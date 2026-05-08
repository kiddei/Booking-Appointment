-- Add paymentReceipt column and change status default to PENDING
-- PENDING enum value was added in the previous migration (committed separately)
ALTER TABLE "Booking" ADD COLUMN "paymentReceipt" TEXT;
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
