import {
  Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CourtsService } from '../courts/courts.service'
import { CreateCourtDto } from '../courts/dto/create-court.dto'
import { PrismaService } from '../prisma/prisma.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private courts: CourtsService,
    private prisma: PrismaService,
  ) {}

  @Get('courts')
  getCourts() {
    return this.courts.findAll()
  }

  @Post('courts')
  addCourt(@Body() dto: CreateCourtDto) {
    return this.courts.create(dto)
  }

  @Delete('courts/:id')
  deactivateCourt(@Param('id', ParseIntPipe) id: number) {
    return this.courts.deactivate(id)
  }

  @Get('bookings')
  getAllBookings() {
    return this.prisma.booking.findMany({
      include: {
        user: { select: { id: true, username: true, email: true } },
        court: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
