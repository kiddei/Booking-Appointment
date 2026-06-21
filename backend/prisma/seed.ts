import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const superAdminHash = await bcrypt.hash('superadmin1234', 10)
  const adminHash      = await bcrypt.hash('admin1234', 10)
  const playerHash     = await bcrypt.hash('player1234', 10)

  await prisma.user.upsert({
    where:  { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin', email: 'superadmin@picklepro.local',
      passwordHash: superAdminHash, role: 'SUPER_ADMIN',
    },
  })

  await prisma.user.upsert({
    where:  { username: 'admin' },
    update: {},
    create: { username: 'admin', email: 'admin@picklepro.local', passwordHash: adminHash, role: 'ADMIN' },
  })

  await prisma.user.upsert({
    where:  { username: 'player1' },
    update: {},
    create: { username: 'player1', email: 'player1@picklepro.local', passwordHash: playerHash, role: 'PLAYER' },
  })

  console.log('Seed complete — superadmin/superadmin1234 · admin/admin1234 · player1/player1234')
  console.log('No courts seeded — create them manually via the Admin Panel.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
