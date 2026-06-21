import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, ConflictException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { CreateSuperAdminUserDto } from './dto/create-user.dto'
import { UpdateSuperAdminUserDto } from './dto/update-user.dto'

const USER_SELECT = {
  id: true, username: true, email: true, role: true, active: true, createdAt: true,
  _count: { select: { bookings: true, courtsCreated: true } },
}

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name)

  constructor(
    private prisma: PrismaService,
    private mail:   MailService,
  ) {}

  // ── Global Stats ─────────────────────────────────────────

  async getGlobalStats() {
    const [totalCourts, activeCourts, totalPlayers, totalAdmins, totalSuperAdmins,
           totalBookings, pendingBookings, confirmedRows] =
      await Promise.all([
        this.prisma.court.count(),
        this.prisma.court.count({ where: { active: true } }),
        this.prisma.user.count({ where: { role: 'PLAYER' } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
        this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
        this.prisma.booking.count({ where: { status: 'PENDING' } }),
        this.prisma.booking.findMany({
          where:   { status: 'CONFIRMED' },
          include: { court: { select: { hourlyRate: true } } },
        }),
      ])

    const totalRevenue = confirmedRows.reduce((sum, b) => {
      const hours = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / (1000 * 60 * 60)
      return sum + hours * b.court.hourlyRate
    }, 0)

    return {
      totalCourts, activeCourts,
      totalPlayers, totalAdmins, totalSuperAdmins,
      totalUsers: totalPlayers + totalAdmins + totalSuperAdmins,
      totalBookings, pendingBookings,
      totalRevenue: totalRevenue.toFixed(2),
    }
  }

  // ── Users (full CRUD) ─────────────────────────────────────

  findAllUsers() {
    return this.prisma.user.findMany({
      select:  USER_SELECT,
      orderBy: { createdAt: 'asc' },
    })
  }

  async createUser(dto: CreateSuperAdminUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    })
    if (exists) throw new ConflictException('Username or email already taken')
    const passwordHash = await bcrypt.hash(dto.password, 10)
    return this.prisma.user.create({
      data: {
        username: dto.username,
        email:    dto.email,
        passwordHash,
        role:     (dto.role ?? 'PLAYER') as any,
      },
      select: USER_SELECT,
    })
  }

  async updateUser(id: number, dto: UpdateSuperAdminUserDto) {
    await this.requireUser(id)
    const data: any = {}
    if (dto.username !== undefined) data.username = dto.username
    if (dto.email    !== undefined) data.email    = dto.email
    if (dto.role     !== undefined) data.role     = dto.role
    if (dto.active   !== undefined) data.active   = dto.active
    if (dto.password)               data.passwordHash = await bcrypt.hash(dto.password, 10)
    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT })
  }

  async deleteUser(id: number, requesterId: number) {
    const user = await this.requireUser(id)
    if (user.id === requesterId)
      throw new ForbiddenException('Cannot delete your own account')
    if (user.role === 'SUPER_ADMIN') {
      const count = await this.prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
      if (count <= 1) throw new ForbiddenException('Cannot delete the last Super Admin account')
    }
    await this.prisma.user.delete({ where: { id } })
    return { message: 'User deleted successfully' }
  }

  async updateUserRole(id: number, role: string, requesterId: number) {
    const user = await this.requireUser(id)
    if (user.id === requesterId && role !== 'SUPER_ADMIN')
      throw new ForbiddenException('Cannot demote your own Super Admin account')
    return this.prisma.user.update({
      where:  { id },
      data:   { role: role as any },
      select: USER_SELECT,
    })
  }

  async toggleUserActive(id: number, active: boolean) {
    await this.requireUser(id)
    return this.prisma.user.update({ where: { id }, data: { active }, select: USER_SELECT })
  }

  // ── Courts (global — all admins) ──────────────────────────

  findAllCourts() {
    return this.prisma.court.findMany({
      include: {
        createdByAdmin: { select: { id: true, username: true, email: true } },
        _count:         { select: { bookings: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  // ── Bookings (global — all courts) ───────────────────────

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

  async confirmBooking(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where:   { id },
      include: { court: true, user: { select: { id: true, username: true, email: true } } },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.status === 'CONFIRMED') throw new BadRequestException('Booking already confirmed')
    if (booking.status === 'CANCELLED') throw new BadRequestException('Cannot confirm a cancelled booking')

    const updated = await this.prisma.booking.update({
      where:   { id },
      data:    { status: 'CONFIRMED' },
      include: { court: true, user: { select: { id: true, username: true, email: true } } },
    })

    try {
      if (updated.user?.email) {
        const f = this.formatBooking(updated)
        await this.mail.sendBookingConfirmation({
          bookingId:     updated.id,
          courtName:     updated.court.name,
          courtLocation: updated.court.location      ?? '',
          courtContact:  updated.court.contactNumber ?? '',
          courtIndoor:   updated.court.indoor,
          courtNumber:   updated.courtNumber,
          bookingDate:   f.bookingDate,
          startTime:     f.startTime,
          endTime:       f.endTime,
          totalAmount:   f.totalAmount,
          status:        'CONFIRMED',
          username:      updated.user.username,
          email:         updated.user.email,
          appUrl:        process.env.APP_URL ?? 'http://localhost:5173',
        })
      }
    } catch (err) {
      this.logger.warn(`Confirmation email failed: ${(err as Error).message}`)
    }

    return this.formatBooking(updated)
  }

  async cancelBooking(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where:   { id },
      include: { court: true, user: { select: { id: true, username: true, email: true } } },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.status === 'CANCELLED') throw new BadRequestException('Booking already cancelled')

    const updated = await this.prisma.booking.update({
      where:   { id },
      data:    { status: 'CANCELLED' },
      include: { court: true, user: { select: { id: true, username: true, email: true } } },
    })

    try {
      if (updated.user?.email) {
        const f = this.formatBooking(updated)
        await this.mail.sendBookingCancellation({
          bookingId:     updated.id,
          courtName:     updated.court.name,
          courtLocation: updated.court.location      ?? '',
          courtContact:  updated.court.contactNumber ?? '',
          courtIndoor:   updated.court.indoor,
          courtNumber:   updated.courtNumber,
          bookingDate:   f.bookingDate,
          startTime:     f.startTime,
          endTime:       f.endTime,
          totalAmount:   f.totalAmount,
          status:        'CANCELLED',
          username:      updated.user.username,
          email:         updated.user.email,
          appUrl:        process.env.APP_URL ?? 'http://localhost:5173',
        })
      }
    } catch (err) {
      this.logger.warn(`Cancellation email failed: ${(err as Error).message}`)
    }

    return this.formatBooking(updated)
  }

  // ── Private helpers ───────────────────────────────────────

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
      courtId:        booking.courtId,
      paymentReceipt: booking.paymentReceipt ?? null,
      username:       booking.user?.username ?? '—',
      userEmail:      booking.user?.email    ?? '—',
      userId:         booking.userId,
      createdAt:      booking.createdAt,
    }
  }
}
