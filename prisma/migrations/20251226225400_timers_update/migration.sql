/*
  Warnings:

  - You are about to drop the column `chillerId` on the `Timer` table. All the data in the column will be lost.
  - Added the required column `chillerIp` to the `Timer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chillerName` to the `Timer` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Timer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chillerName" TEXT NOT NULL,
    "chillerIp" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "targetAt" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Timer" ("active", "createdAt", "hours", "id", "mode", "targetAt", "updatedAt") SELECT "active", "createdAt", "hours", "id", "mode", "targetAt", "updatedAt" FROM "Timer";
DROP TABLE "Timer";
ALTER TABLE "new_Timer" RENAME TO "Timer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
