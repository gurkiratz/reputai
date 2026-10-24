-- Phase II: audit log for WARN overrides

-- CreateTable
CREATE TABLE "ComplianceOverride" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "rules" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceOverride_replyId_idx" ON "ComplianceOverride"("replyId");

-- AddForeignKey
ALTER TABLE "ComplianceOverride" ADD CONSTRAINT "ComplianceOverride_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "Reply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceOverride" ADD CONSTRAINT "ComplianceOverride_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
