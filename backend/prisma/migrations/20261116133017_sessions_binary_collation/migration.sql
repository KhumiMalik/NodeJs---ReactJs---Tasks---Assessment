-- Session IDs are case-sensitive, so compare them with a binary collation
-- (matches express-mysql-session's schema.sql). Prisma cannot express column
-- collation in schema.prisma, so this migration is hand-written.
ALTER TABLE `sessions`
    MODIFY `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    MODIFY `data` MEDIUMTEXT COLLATE utf8mb4_bin NULL;
