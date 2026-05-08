-- Add PENDING value to BookingStatus enum
-- Must be committed before the value can be used as a column default
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING';
