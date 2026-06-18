import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCourtDto } from '../courts/dto/create-court.dto'
import { UpdateCourtDto } from '../courts/dto/update-court.dto'

const USER_SELECT = {
  id: true, username: true, email: true, role: true, active: true, createdAt: true,
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── Stats (scoped to admin's courts) ─────────────────────

  async getStats(adminId: number) {
    const adminCourtIds = await this.getAdminCourtIds(adminId)

    const [totalCourts, activeCourts, totalUsers, totalBookings, pendingBookings, revenue] =
      await Promise.all([
        this.prisma.court.count({ where: { createdByAdminId: adminId } }),
        this.prisma.court.count({ where: { createdByAdminId: adminId, active: true } }),
        this.prisma.user.count(),
        this.prisma.booking.count({
          where: { status: 'CONFIRMED', courtId: { in: adminCourtIds } },
        }),
        this.prisma.booking.count({
          where: { status: 'PENDING', courtId: { in: adminCourtIds } },
        }),
        this.prisma.booking.findMany({
          where: { status: 'CONFIRMED', courtId: { in: adminCourtIds } },
          include: { court: { select: { hourlyRate: true } } },
        }),
      ])

    const totalRevenue = revenue.reduce((sum, b) => {
      const hours =
        (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / (1000 * 60 * 60)
      return sum + hours * b.court.hourlyRate
    }, 0)

    return {
      totalCourts,
      activeCourts,
      totalUsers,
      totalBookings,
      pendingBookings,
      totalRevenue: totalRevenue.toFixed(2),
    }
  }

  // ── Courts ───────────────────────────────────────────────

  findAllCourts(adminId: number) {
    return this.prisma.court.findMany({
      where: { createdByAdminId: adminId },
      orderBy: { createdAt: 'asc' },
    })
  }

  createCourt(dto: CreateCourtDto, adminId: number) {
    return this.prisma.court.create({ data: { ...dto, createdByAdminId: adminId } })
  }

  async updateCourt(id: number, dto: UpdateCourtDto, adminId: number) {
    await this.requireOwnedCourt(id, adminId)
    return this.prisma.court.update({ where: { id }, data: dto })
  }

  async deactivateCourt(id: number, adminId: number) {
    await this.requireOwnedCourt(id, adminId)
    return this.prisma.court.update({ where: { id }, data: { active: false } })
  }

  async reactivateCourt(id: number, adminId: number) {
    await this.requireOwnedCourt(id, adminId)
    return this.prisma.court.update({ where: { id }, data: { active: true } })
  }

  // ── Users (global — all admins can view all users) ───────

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

  // ── Bookings (scoped to admin's courts) ──────────────────

  async findAllBookings(adminId: number) {
    const adminCourtIds = await this.getAdminCourtIds(adminId)
    const rows = await this.prisma.booking.findMany({
      where:   { courtId: { in: adminCourtIds } },
      include: {
        user:  { select: { id: true, username: true, email: true } },
        court: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(this.formatBooking)
  }

  async findPendingBookings(adminId: number) {
    const adminCourtIds = await this.getAdminCourtIds(adminId)
    const rows = await this.prisma.booking.findMany({
      where: { status: 'PENDING', courtId: { in: adminCourtIds } },
      include: {
        user:  { select: { id: true, username: true, email: true } },
        court: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(this.formatBooking)
  }

  async confirmBooking(id: number, adminId: number) {
    const booking = await this.prisma.booking.findUnique({
      where:   { id },
      include: {
        court: true,
        user:  { select: { id: true, username: true, email: true } },
      },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.court.createdByAdminId !== adminId)
      throw new ForbiddenException('You can only manage bookings on your own courts')
    if (booking.status === 'CONFIRMED')
      throw new BadRequestException('Booking is already confirmed')
    if (booking.status === 'CANCELLED')
      throw new BadRequestException('Cannot confirm a cancelled booking')

    const updated = await this.prisma.booking.update({
      where:   { id },
      data:    { status: 'CONFIRMED' },
      include: {
        court: true,
        user:  { select: { id: true, username: true, email: true } },
      },
    })
    return this.formatBooking(updated)
  }

  async cancelBooking(id: number, adminId: number) {
    const booking = await this.prisma.booking.findUnique({
      where:   { id },
      include: {
        court: true,
        user:  { select: { id: true, username: true, email: true } },
      },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.court.createdByAdminId !== adminId)
      throw new ForbiddenException('You can only manage bookings on your own courts')
    if (booking.status === 'CANCELLED')
      throw new BadRequestException('Booking already cancelled')

    const updated = await this.prisma.booking.update({
      where:   { id },
      data:    { status: 'CANCELLED' },
      include: {
        court: true,
        user:  { select: { id: true, username: true, email: true } },
      },
    })
    return this.formatBooking(updated)
  }

  // ── Private helpers ──────────────────────────────────────

  private async getAdminCourtIds(adminId: number): Promise<number[]> {
    const courts = await this.prisma.court.findMany({
      where:  { createdByAdminId: adminId },
      select: { id: true },
    })
    return courts.map(c => c.id)
  }

  private async requireOwnedCourt(id: number, adminId: number) {
    const court = await this.prisma.court.findUnique({ where: { id } })
    if (!court) throw new NotFoundException('Court not found')
    if (court.createdByAdminId !== adminId)
      throw new ForbiddenException('You can only manage courts you created')
    return court
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
      id:             booking.id,
      status:         booking.status,
      bookingDate:    `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      startTime:      `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime:        `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      totalAmount:    (hours * booking.court.hourlyRate).toFixed(2),
      courtName:      booking.court.name,
      courtIndoor:    booking.court.indoor,
      courtNumber:    booking.courtNumber,
      paymentReceipt: booking.paymentReceipt ?? null,
      username:       booking.user?.username ?? '—',
      userEmail:      booking.user?.email    ?? '—',
      userId:         booking.userId,
      courtId:        booking.courtId,
      createdAt:      booking.createdAt,
    }
  }
}
