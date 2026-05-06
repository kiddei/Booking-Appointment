import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCourtDto } from './dto/create-court.dto'

@Injectable()
export class CourtsService {
  constructor(private prisma: PrismaService) {}

  findActive() {
    return this.prisma.court.findMany({ where: { active: true } })
  }

  findAll() {
    return this.prisma.court.findMany()
  }

  async findOne(id: number) {
    const court = await this.prisma.court.findUnique({ where: { id } })
    if (!court) throw new NotFoundException('Court not found')
    return court
  }

  create(dto: CreateCourtDto) {
    return this.prisma.court.create({ data: dto })
  }

  async deactivate(id: number) {
    await this.findOne(id)
    return this.prisma.court.update({ where: { id }, data: { active: false } })
  }

  async getAvailability(id: number, date: string) {
    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd   = new Date(`${date}T23:59:59`)

    const bookings = await this.prisma.booking.findMany({
      where: {
        courtId: id,
        status: 'CONFIRMED',
        startTime: { lt: dayEnd },
        endTime:   { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    })

    const pad = (n: number) => String(n).padStart(2, '0')
    return bookings.map(b => ({
      start: `${pad(new Date(b.startTime).getHours())}:${pad(new Date(b.startTime).getMinutes())}`,
      end:   `${pad(new Date(b.endTime).getHours())}:${pad(new Date(b.endTime).getMinutes())}`,
    }))
  }
}
