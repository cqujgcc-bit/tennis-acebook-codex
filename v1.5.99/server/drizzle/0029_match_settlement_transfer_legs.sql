CREATE TABLE IF NOT EXISTS `match_settlement_transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `matchId` int NOT NULL,
  `sequence` int NOT NULL,
  `attempt` int NOT NULL DEFAULT 1,
  `amountFen` int NOT NULL,
  `outBillNo` varchar(32) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'CREATED',
  `packageInfo` text NULL,
  `errorMessage` text NULL,
  `initiatedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `match_settlement_transfers_out_bill_no_unique` (`outBillNo`),
  UNIQUE KEY `match_settlement_transfers_match_sequence_attempt_unique` (`matchId`, `sequence`, `attempt`),
  KEY `match_settlement_transfers_match_id_idx` (`matchId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
