import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { SubmitReceiptDto } from './dto/submit-receipt.dto'

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: number) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      include: { court: true },
      orderBy: { startTime: 'desc' },
    })
    return rows.map(this.format)
  }

  async findOne(id: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { court: true },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.userId !== userId) throw new ForbiddenException()
    return this.format(booking)
  }

  async create(dto: CreateBookingDto, userId: number) {
    const start = new Date(`${dto.bookingDate}T${dto.startTime}:00`)
    const end   = new Date(`${dto.bookingDate}T${dto.endTime}:00`)

    if (isNaN(start.getTime()) || isNaN(end.getTime()))
      throw new BadRequestException('Invalid date or time values')
    if (end <= start)
      throw new BadRequestException('End time must be after start time')
    if (start < new Date())
      throw new BadRequestException('Cannot book a slot in the past')

    // Block slots that are PENDING or CONFIRMED — avoids double-booking
    const conflict = await this.prisma.booking.findFirst({
      where: {
        courtId: dto.courtId,
        courtNumber: dto.courtNumber,
        status: { in: ['CONFIRMED', 'PENDING'] },
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
    })
    if (conflict) throw new BadRequestException('Court is not available for the requested time slot')

    const booking = await this.prisma.booking.create({
      data: { userId, courtId: dto.courtId, courtNumber: dto.courtNumber, startTime: start, endTime: end },
      include: { court: true },
    })
    return this.format(booking)
  }

  async submitReceipt(id: number, dto: SubmitReceiptDto, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { court: true },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.userId !== userId) throw new ForbiddenException()
    if (booking.status !== 'PENDING')
      throw new BadRequestException('Only pending bookings can have a receipt submitted')

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { paymentReceipt: dto.paymentReceipt },
      include: { court: true },
    })
    return this.format(updated)
  }

  async cancel(id: number, userId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { court: true },
    })
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.userId !== userId) throw new ForbiddenException()
    if (booking.status === 'CANCELLED') throw new BadRequestException('Booking already cancelled')

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { court: true },
    })
    return this.format(updated)
  }

  private format(booking: any) {
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
      court:          booking.court,
      createdAt:      booking.createdAt,
      userId:         booking.userId,
      courtId:        booking.courtId,
    }
  }
}
