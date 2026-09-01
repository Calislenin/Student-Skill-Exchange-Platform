-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "department" VARCHAR(100),
    "studyYear" INTEGER,
    "bio" VARCHAR(500),
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "level" VARCHAR(30) NOT NULL,
    "lessonCount" INTEGER NOT NULL DEFAULT 1,
    "creatorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_lessons" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "videoUrl" VARCHAR(500) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    "skillId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_requests" (
    "id" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "message" VARCHAR(500) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "meetingUrl" VARCHAR(500),
    "meetingAddedAt" TIMESTAMP(3),
    "requesterId" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "storedName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploaderId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "skills_creatorId_idx" ON "skills"("creatorId");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "skills_createdAt_idx" ON "skills"("createdAt");

-- CreateIndex
CREATE INDEX "skill_lessons_skillId_position_idx" ON "skill_lessons"("skillId", "position");

-- CreateIndex
CREATE INDEX "session_requests_requesterId_idx" ON "session_requests"("requesterId");

-- CreateIndex
CREATE INDEX "session_requests_hostId_idx" ON "session_requests"("hostId");

-- CreateIndex
CREATE INDEX "session_requests_skillId_idx" ON "session_requests"("skillId");

-- CreateIndex
CREATE INDEX "session_requests_scheduledAt_idx" ON "session_requests"("scheduledAt");

-- CreateIndex
CREATE INDEX "session_requests_status_idx" ON "session_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notes_storedName_key" ON "notes"("storedName");

-- CreateIndex
CREATE INDEX "notes_uploaderId_idx" ON "notes"("uploaderId");

-- CreateIndex
CREATE INDEX "notes_subject_idx" ON "notes"("subject");

-- CreateIndex
CREATE INDEX "notes_createdAt_idx" ON "notes"("createdAt");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lessons" ADD CONSTRAINT "skill_lessons_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
