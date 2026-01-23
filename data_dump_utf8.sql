-- Data Migration Script (Generated from Local SQLite)

-- Users (2)
INSERT INTO "User" ("id", "email", "name", "position", "tier", "region", "weightClass", "createdAt") VALUES ('1e4613d8-168c-460b-ab8a-e37b6cae5a0c', 'messi@versus.com', 'Lionel Messi', 'FW', 'GOAT', 'Miami', NULL, '2025-12-11T01:32:38.020Z') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "email", "name", "position", "tier", "region", "weightClass", "createdAt") VALUES ('6e94b0cb-0502-425c-a002-eb283cd7bc7d', 'ronaldo@versus.com', 'Cristiano Ronaldo', 'FW', 'GOAT', 'Riyadh', NULL, '2025-12-11T01:32:38.021Z') ON CONFLICT ("id") DO NOTHING;

-- Teams (2)
INSERT INTO "Team" ("id", "name", "emblem", "region", "homeStadium", "avgAge", "tier", "uniformColor", "mannerScore", "createdAt", "leaderId") VALUES ('757c2e51-10b4-438b-9680-835573916a46', 'Inter Miami CF', NULL, 'Miami', false, NULL, 'Pro', 'Pink', 5, '2025-12-11T01:32:38.022Z', '1e4613d8-168c-460b-ab8a-e37b6cae5a0c') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Team" ("id", "name", "emblem", "region", "homeStadium", "avgAge", "tier", "uniformColor", "mannerScore", "createdAt", "leaderId") VALUES ('c007f97c-45e0-4026-8f90-e07d47806362', 'Al Nassr', NULL, 'Riyadh', false, NULL, 'Pro', 'Yellow', 5, '2025-12-11T01:32:38.024Z', '6e94b0cb-0502-425c-a002-eb283cd7bc7d') ON CONFLICT ("id") DO NOTHING;

-- TeamMembers (2)
INSERT INTO "TeamMember" ("id", "userId", "teamId", "role", "joinedAt") VALUES ('bf85d039-8ba0-4c70-882e-4b01cfc29f33', '1e4613d8-168c-460b-ab8a-e37b6cae5a0c', '757c2e51-10b4-438b-9680-835573916a46', 'LEADER', '2025-12-11T01:32:38.022Z') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "TeamMember" ("id", "userId", "teamId", "role", "joinedAt") VALUES ('5b82c4ff-681a-4671-97f1-6ddbcae29249', '6e94b0cb-0502-425c-a002-eb283cd7bc7d', 'c007f97c-45e0-4026-8f90-e07d47806362', 'LEADER', '2025-12-11T01:32:38.024Z') ON CONFLICT ("id") DO NOTHING;

-- Matches (2)
INSERT INTO "Match" ("id", "type", "mode", "sport", "attributes", "status", "date", "location", "description", "playerId", "hostUserId", "guestUserId", "hostTeamId", "guestTeamId", "createdAt") VALUES ('8bb1f9da-ef4a-4684-aff3-146a8e535e61', 'TVT', 'SOLO', 'BOXING', '{}', 'PENDING', '2025-12-25T00:00:00.000Z', 'Chase Stadium', 'Christmas Special Match', NULL, NULL, NULL, '757c2e51-10b4-438b-9680-835573916a46', NULL, '2025-12-11T01:32:38.022Z') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Match" ("id", "type", "mode", "sport", "attributes", "status", "date", "location", "description", "playerId", "hostUserId", "guestUserId", "hostTeamId", "guestTeamId", "createdAt") VALUES ('23df1fcc-657d-4c20-a773-e2cf204ae556', 'PVP', 'SOLO', 'BOXING', '{}', 'MATCHED', '2026-06-01T00:00:00.000Z', 'Neutral Ground', 'The Last Dance', NULL, '1e4613d8-168c-460b-ab8a-e37b6cae5a0c', '6e94b0cb-0502-425c-a002-eb283cd7bc7d', NULL, NULL, '2025-12-11T01:32:38.025Z') ON CONFLICT ("id") DO NOTHING;
