-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `skills` JSON NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Employee_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobDescription` (
    `id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `mustHave` JSON NOT NULL,
    `goodToHave` JSON NOT NULL,
    `futureProof` JSON NOT NULL,
    `teamGap` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Candidate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `skills` JSON NOT NULL,
    `experience` INTEGER NULL,
    `education` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `resumeUrl` VARCHAR(191) NULL,
    `matchScore` INTEGER NULL,
    `authenticity` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'APPLIED',
    `githubUrl` VARCHAR(191) NULL,
    `linkedInUrl` VARCHAR(191) NULL,
    `kaggleUrl` VARCHAR(191) NULL,
    `kekaUuid` VARCHAR(191) NULL,
    `futureProofScore` DOUBLE NULL DEFAULT 0,
    `jdId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Candidate_email_key`(`email`),
    UNIQUE INDEX `Candidate_kekaUuid_key`(`kekaUuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Interview` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'video',
    `status` VARCHAR(191) NOT NULL DEFAULT 'scheduled',
    `meetingLink` VARCHAR(191) NULL,
    `aiScore` DOUBLE NULL,
    `aiFeedback` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProctoringLog` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `severity` VARCHAR(191) NOT NULL DEFAULT 'low',
    `metadata` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketTrend` (
    `id` VARCHAR(191) NOT NULL,
    `skillName` VARCHAR(191) NOT NULL,
    `demand` DOUBLE NOT NULL,
    `growth` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MarketTrend_skillName_key`(`skillName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivationToken` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ActivationToken_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_jdId_fkey` FOREIGN KEY (`jdId`) REFERENCES `JobDescription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProctoringLog` ADD CONSTRAINT `ProctoringLog_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivationToken` ADD CONSTRAINT `ActivationToken_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
