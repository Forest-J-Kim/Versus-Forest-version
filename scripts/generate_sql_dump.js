
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function escapeString(str) {
    if (str === null || str === undefined) return 'NULL';
    return `'${str.replace(/'/g, "''")}'`;
}

function formatDate(date) {
    if (!date) return 'NULL';
    return `'${date.toISOString()}'`;
}


const fs = require('fs');

async function main() {
    console.log('Generating UTF-8 Dump...');
    let sql = '-- Data Migration Script (Generated from Local SQLite)\n\n';

    // 1. Users
    // Use raw query to avoid error if column is missing in DB but present in Schema
    const users = await prisma.$queryRawUnsafe('SELECT * FROM "User"');
    sql += `-- Users (${users.length})\n`;
    for (const u of users) {
        // Note: SQLite dates might be strings or numbers. Prisma raw returns them as is or Date objects? 
        // Usually raw query returns what driver gives. In SQLite, it's often milliseconds or string.
        // We'll wrap in new Date() to be safe if it's not null.
        const createdAt = u.createdAt ? new Date(u.createdAt) : new Date();

        sql += `INSERT INTO "User" ("id", "email", "name", "position", "tier", "region", "weightClass", "createdAt") VALUES (${escapeString(u.id)}, ${escapeString(u.email)}, ${escapeString(u.name)}, ${escapeString(u.position)}, ${escapeString(u.tier)}, ${escapeString(u.region)}, ${escapeString(u.weightClass || null)}, ${formatDate(createdAt)}) ON CONFLICT ("id") DO NOTHING;\n`;
    }

    // 2. Teams
    const teams = await prisma.$queryRawUnsafe('SELECT * FROM "Team"');
    sql += `\n-- Teams (${teams.length})\n`;
    for (const t of teams) {
        const createdAt = t.createdAt ? new Date(t.createdAt) : new Date();
        // homeStadium is 0 or 1 in SQLite. Postgres needs boolean 'true'/'false' or valid boolean conversion.
        // 't.homeStadium' might be 0/1. 
        const isHome = t.homeStadium ? 'true' : 'false';

        sql += `INSERT INTO "Team" ("id", "name", "emblem", "region", "homeStadium", "avgAge", "tier", "uniformColor", "mannerScore", "createdAt", "leaderId") VALUES (${escapeString(t.id)}, ${escapeString(t.name)}, ${escapeString(t.emblem)}, ${escapeString(t.region)}, ${isHome}, ${t.avgAge || 'NULL'}, ${escapeString(t.tier)}, ${escapeString(t.uniformColor)}, ${t.mannerScore}, ${formatDate(createdAt)}, ${escapeString(t.leaderId)}) ON CONFLICT ("id") DO NOTHING;\n`;
    }

    // 3. TeamMembers
    const members = await prisma.$queryRawUnsafe('SELECT * FROM "TeamMember"');
    sql += `\n-- TeamMembers (${members.length})\n`;
    for (const m of members) {
        const joinedAt = m.joinedAt ? new Date(m.joinedAt) : new Date();
        sql += `INSERT INTO "TeamMember" ("id", "userId", "teamId", "role", "joinedAt") VALUES (${escapeString(m.id)}, ${escapeString(m.userId)}, ${escapeString(m.teamId)}, ${escapeString(m.role)}, ${formatDate(joinedAt)}) ON CONFLICT ("id") DO NOTHING;\n`;
    }

    // 4. Matches
    // Optional: Matches table might not exist or be empty. Wrap in try/catch just in case.
    try {
        const matches = await prisma.$queryRawUnsafe('SELECT * FROM "Match"');
        sql += `\n-- Matches (${matches.length})\n`;
        for (const m of matches) {
            const date = m.date ? new Date(m.date) : null;
            const createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
            // datestep/timeslot not needed in schema? Attributes holds formData.
            // Schema checks: playerId might be missing in local DB.
            sql += `INSERT INTO "Match" ("id", "type", "mode", "sport", "attributes", "status", "date", "location", "description", "playerId", "hostUserId", "guestUserId", "hostTeamId", "guestTeamId", "createdAt") VALUES (${escapeString(m.id)}, ${escapeString(m.type)}, ${escapeString(m.mode)}, ${escapeString(m.sport)}, ${escapeString(m.attributes)}, ${escapeString(m.status)}, ${formatDate(date)}, ${escapeString(m.location)}, ${escapeString(m.description)}, ${escapeString(m.playerId || null)}, ${escapeString(m.hostUserId)}, ${escapeString(m.guestUserId)}, ${escapeString(m.hostTeamId)}, ${escapeString(m.guestTeamId)}, ${formatDate(createdAt)}) ON CONFLICT ("id") DO NOTHING;\n`;
        }
    } catch (e) {
        sql += '\n-- No Match table or error reading matches\n';
    }

    fs.writeFileSync('data_dump_utf8.sql', sql, 'utf8');
    console.log('Done.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
