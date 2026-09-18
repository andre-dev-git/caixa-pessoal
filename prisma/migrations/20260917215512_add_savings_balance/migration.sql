-- CreateTable
CREATE TABLE "SavingsBalance" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
