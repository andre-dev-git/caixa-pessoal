-- CreateTable
CREATE TABLE "SavingsMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "deltaCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SavingsMovement_date_idx" ON "SavingsMovement"("date");
