-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "importId" TEXT,
    CONSTRAINT "Category_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "importId" TEXT,
    CONSTRAINT "Tag_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "importId" TEXT,
    "installmentPlanId" TEXT,
    "subscriptionId" TEXT,
    "recurrenceId" TEXT,
    "occurrenceNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Entry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Entry_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Entry_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Entry_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Entry_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "Recurrence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EntryTag" (
    "entryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("entryId", "tagId"),
    CONSTRAINT "EntryTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "installmentCents" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "totalInstallments" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "importId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstallmentPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InstallmentPlan_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstallmentPlanTag" (
    "installmentPlanId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("installmentPlanId", "tagId"),
    CONSTRAINT "InstallmentPlanTag_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InstallmentPlanTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "periodicity" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledAt" TEXT,
    "importId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriptionTag" (
    "subscriptionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("subscriptionId", "tagId"),
    CONSTRAINT "SubscriptionTag_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "periodicity" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledAt" TEXT,
    "importId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recurrence_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Recurrence_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurrenceTag" (
    "recurrenceId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("recurrenceId", "tagId"),
    CONSTRAINT "RecurrenceTag_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "Recurrence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurrenceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "format" TEXT NOT NULL,
    "fileName" TEXT,
    "totalRecords" INTEGER NOT NULL,
    "acceptedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "createdSummary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "revertedAt" DATETIME
);

-- CreateTable
CREATE TABLE "DashboardLayout" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "layout" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Entry_date_idx" ON "Entry"("date");

-- CreateIndex
CREATE INDEX "Entry_type_idx" ON "Entry"("type");

-- CreateIndex
CREATE INDEX "Entry_categoryId_idx" ON "Entry"("categoryId");

-- CreateIndex
CREATE INDEX "Entry_importId_idx" ON "Entry"("importId");

-- CreateIndex
CREATE INDEX "Entry_installmentPlanId_idx" ON "Entry"("installmentPlanId");

-- CreateIndex
CREATE INDEX "Entry_subscriptionId_idx" ON "Entry"("subscriptionId");

-- CreateIndex
CREATE INDEX "Entry_recurrenceId_idx" ON "Entry"("recurrenceId");
