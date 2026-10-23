-- AlterTable
ALTER TABLE "Problem" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Keep the existing order (creation order) as the starting order
UPDATE "Problem" SET "position" = "id";
