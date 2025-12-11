import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Clean up
    await prisma.match.deleteMany()
    await prisma.teamMember.deleteMany()
    await prisma.team.deleteMany()
    await prisma.user.deleteMany()

    // Create Users
    const user1 = await prisma.user.create({
        data: {
            email: 'messi@versus.com',
            name: 'Lionel Messi',
            position: 'FW',
            tier: 'GOAT',
            region: 'Miami',
        },
    })

    const user2 = await prisma.user.create({
        data: {
            email: 'ronaldo@versus.com',
            name: 'Cristiano Ronaldo',
            position: 'FW',
            tier: 'GOAT',
            region: 'Riyadh',
        },
    })

    const user3 = await prisma.user.create({
        data: {
            email: 'son@versus.com',
            name: 'Heung-min Son',
            position: 'LW',
            tier: 'World Class',
            region: 'London',
        },
    })

    // Create Teams
    const team1 = await prisma.team.create({
        data: {
            name: 'Inter Miami CF',
            region: 'Miami',
            tier: 'Pro',
            leaderId: user1.id,
            uniformColor: 'Pink',
            members: {
                create: {
                    userId: user1.id,
                    role: 'LEADER',
                },
            },
            hostedMatches: {
                create: {
                    type: 'TVT',
                    status: 'PENDING',
                    date: new Date('2025-12-25'),
                    location: 'Chase Stadium',
                    description: 'Christmas Special Match',
                }
            }
        },
    })

    const team2 = await prisma.team.create({
        data: {
            name: 'Al Nassr',
            region: 'Riyadh',
            tier: 'Pro',
            leaderId: user2.id,
            uniformColor: 'Yellow',
            members: {
                create: {
                    userId: user2.id,
                    role: 'LEADER',
                },
            },
        },
    })

    // Create Individual Match (PvP)
    await prisma.match.create({
        data: {
            type: 'PVP',
            status: 'MATCHED',
            hostUserId: user1.id,
            guestUserId: user2.id,
            date: new Date('2026-06-01'),
            location: 'Neutral Ground',
            description: 'The Last Dance',
        },
    })

    console.log({ user1, user2, team1, team2 })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
