-- Phase I: Google Business Profile connection and LangGraph revise loop

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "googleLocationName" TEXT;

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN "revisionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GoogleConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "googleAccountEmail" TEXT,
    "accountName" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleConnection_organizationId_key" ON "GoogleConnection"("organizationId");

-- AddForeignKey
ALTER TABLE "GoogleConnection" ADD CONSTRAINT "GoogleConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
