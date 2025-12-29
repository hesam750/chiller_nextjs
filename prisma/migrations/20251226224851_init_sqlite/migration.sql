-- CreateTable
CREATE TABLE "Chiller" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PowerLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "at" DATETIME NOT NULL,
    "user" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Timer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chillerId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "targetAt" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Timer_chillerId_fkey" FOREIGN KEY ("chillerId") REFERENCES "Chiller" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
