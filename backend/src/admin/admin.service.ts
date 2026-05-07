import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCourtDto } from '../courts/dto/create-court.dto'
import { UpdateCourtDto } from '../courts/dto/update-court.dto'

const USER_SELECT = { id: true, username: true, email: true, role: true, active: true, createdAt: true }

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── Stats ────────────────────────────────────────────────

  async getStats() {
    const [totalCourts, activeCourts, totalUsers, totalBookings, revenue] = await Promise.all([
      this.prisma.court.count(),
      this.prisma.court.count({ where: { active: true } }),
      this.prisma.user.count(),
      this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.booking.findMany({
        where: { status: 'CONFIRMED' },
        include: { court: { select: { hourlyRate: true } } },
      }),
    ])

    const totalRevenue = revenue.reduce((sum, b) => {
      const hours = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / (1000 * 60 * 60)
      return sum + hours * b.court.hourlyRate
    }, 0)

    return { totalCourts, activeCourts, totalUsers, totalBookings, totalRevenue: totalRevenue.toFixed(2) }
  }

  // ── Courts ───────────────────────────────────────────────

  findAllCourts() {
    return this.prisma.court.findMany({ orderBy: { createdAt: 'asc' } })
  }

  createCourt(dto: CreateCourtDto) {
    return this.prisma.court.create({ data: dto })
  }

  async updateCourt(id: number, dto: UpdateCourtDto) {
    await this.requireCourt(id)
    return this.prisma.court.update({ where: { id }, data: dto })
  }

  async deactivateCourt(id: number) {
    await this.requireCourt(id)
    return this.prisma.court.update({ where: { id }, data: { active: false } })
  }

  async reactivateCourt(id: number) {
    await this.requireCourt(id)
    return this.prisma.court.update({ where: { id }, data: { active: true } })
  }

  // ── Users ────────────────────────────────────────────────

  findAllUsers() {
    return this.prisma.user.findMany({
      select: { ...USER_SELECT, _count: { select: { bookings: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async updateUserRole(id: number, role: 'PLAYER' | 'ADMIN') {
    await this.requireUser(id)
    return this.prisma.user.update({ where: { id }, data: { role }, select: USER_SELECT })
  }

  async toggleUserActive(id: number, active: boolean) {
    await this.requireUser(id)
    return this.prisma.user.update({ where: { id }, data: { active }, select: USER_SELECT })
  }

  // ── Bookings ─────────────────────────────────────────────

  async findAllBookings() {
    const rows = await this.prisma.booking.findMany({
      include: {
        user:  { select: { id: true, username: true, email: true } },
        court: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(this.formatBooking)
  }

  async cancelBooking(id: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { court: true } })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.status === 'CANCELLED') throw new BadRequestException('Booking already cancelled')
    const updated = await this.prisma.booking.update({
      where: { id }, data: { status: 'CANCELLED' }, include: { court: true },
    })
    return this.formatBooking({ ...updated, user: (booking as any).user })
  }

  // ── Helpers ──────────────────────────────────────────────

  private async requireCourt(id: number) {
    const c = await this.prisma.court.findUnique({ where: { id } })
    if (!c) throw new NotFoundException('Court not found')
    return c
  }

  private async requireUser(id: number) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new NotFoundException('User not found')
    return u
  }

  private formatBooking(booking: any) {
    const start = new Date(booking.startTime)
    const end   = new Date(booking.endTime)
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const pad   = (n: number) => String(n).padStart(2, '0')
    return {
      id:          booking.id,
      status:      booking.status,
      bookingDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      startTime:   `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime:     `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      totalAmount: (hours * booking.court.hourlyRate).toFixed(2),
      courtName:   booking.court.name,
      courtIndoor: booking.court.indoor,
      username:    booking.user?.username ?? '—',
      userEmail:   booking.user?.email ?? '—',
      userId:      booking.userId,
      courtId:     booking.courtId,
      createdAt:   booking.createdAt,
    }
  }
}
