import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const adminHash  = await bcrypt.hash('admin1234', 10)
  const playerHash = await bcrypt.hash('player1234', 10)

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', email: 'admin@picklepro.local', passwordHash: adminHash, role: 'ADMIN' },
  })

  await prisma.user.upsert({
    where: { username: 'player1' },
    update: {},
    create: { username: 'player1', email: 'player1@picklepro.local', passwordHash: playerHash, role: 'PLAYER' },
  })

  const courts = [
    { name: 'Court 1 – Indoor', description: 'Climate-controlled indoor court', indoor: true,  maxPlayers: 4, hourlyRate: 30.0 },
    { name: 'Court 2 – Outdoor', description: 'Outdoor hardcourt with lighting',  indoor: false, maxPlayers: 4, hourlyRate: 20.0 },
    { name: 'Court 3 – VIP',     description: 'Premium court with spectator seating', indoor: true, maxPlayers: 6, hourlyRate: 50.0 },
  ]

  for (const court of courts) {
    const existing = await prisma.court.findFirst({ where: { name: court.name } })
    if (!existing) await prisma.court.create({ data: court })
  }

  console.log('Seed complete — admin/admin1234, player1/player1234')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
