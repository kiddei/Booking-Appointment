-- AlterTable
ALTER TABLE "Court" ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
ADD COLUMN     "indoor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "maxPlayers" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "ownerName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
