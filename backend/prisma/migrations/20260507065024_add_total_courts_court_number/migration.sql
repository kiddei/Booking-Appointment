-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "courtNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Court" ADD COLUMN     "totalCourts" INTEGER NOT NULL DEFAULT 1;
