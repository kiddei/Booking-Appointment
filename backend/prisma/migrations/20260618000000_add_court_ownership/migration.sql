-- AddColumn: createdByAdminId to Court for ownership tracking
ALTER TABLE "Court" ADD COLUMN "createdByAdminId" INTEGER;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_createdByAdminId_fkey"
  FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
