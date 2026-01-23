
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Data ---');

    // 1. List all users
    const users = await prisma.user.findMany();
    console.log(`Total Users: ${users.length}`);
    users.forEach(u => console.log(`- User: ${u.name} (${u.id})`));

    // 2. List all teams
    const teams = await prisma.team.findMany({
        include: {
            leader: true,
            members: {
                include: {
                    user: true
                }
            }
        }
    });

    console.log(`\nTotal Teams: ${teams.length}`);
    teams.forEach(t => {
        console.log(`- Team: ${t.name} (Leader: ${t.leader.name})`);
        console.log(`  Members: ${t.members.length}`);
        t.members.forEach(m => {
            console.log(`    -> ${m.user.name} (Role: ${m.role})`);
        });
    });

    console.log('--- End Verification ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
