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
    {
      name: 'PicklePro Indoor Complex', description: 'Climate-controlled indoor courts with pro-grade surfaces',
      location: '123 Pickle Ave, Makati City, Metro Manila', ownerName: 'PicklePro Management',
      contactNumber: '+63 917 100 0001', indoor: true, totalCourts: 4, maxPlayers: 4, hourlyRate: 300.0,
      openTime: '07:00', closeTime: '22:00',
    },
    {
      name: 'PicklePro Outdoor Courts', description: 'Open-air hardcourts with floodlights for evening play',
      location: '456 Sports Drive, BGC, Taguig City', ownerName: 'PicklePro Management',
      contactNumber: '+63 917 100 0002', indoor: false, totalCourts: 6, maxPlayers: 4, hourlyRate: 200.0,
      openTime: '06:00', closeTime: '21:00',
    },
    {
      name: 'PicklePro VIP Club', description: 'Premium courts with spectator seating and lounge access',
      location: '789 Elite Blvd, Bonifacio Global City, Taguig', ownerName: 'PicklePro Management',
      contactNumber: '+63 917 100 0003', indoor: true, totalCourts: 2, maxPlayers: 6, hourlyRate: 500.0,
      openTime: '08:00', closeTime: '23:00',
    },
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
