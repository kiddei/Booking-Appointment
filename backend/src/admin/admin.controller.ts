import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AdminService } from './admin.service'
import { CreateCourtDto } from '../courts/dto/create-court.dto'
import { UpdateCourtDto } from '../courts/dto/update-court.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  // ── Stats ────────────────────────────────────────────────

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.admin.getStats(user.id)
  }

  // ── Courts ───────────────────────────────────────────────

  @Get('courts')
  getCourts(@CurrentUser() user: any) {
    return this.admin.findAllCourts(user.id)
  }

  @Post('courts')
  addCourt(@Body() dto: CreateCourtDto, @CurrentUser() user: any) {
    return this.admin.createCourt(dto, user.id)
  }

  @Patch('courts/:id')
  updateCourt(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourtDto,
    @CurrentUser() user: any,
  ) {
    return this.admin.updateCourt(id, dto, user.id)
  }

  @Patch('courts/:id/deactivate')
  deactivateCourt(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.admin.deactivateCourt(id, user.id)
  }

  @Patch('courts/:id/reactivate')
  reactivateCourt(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.admin.reactivateCourt(id, user.id)
  }

  // ── Bookings ─────────────────────────────────────────────

  @Get('bookings')
  getAllBookings(@CurrentUser() user: any) {
    return this.admin.findAllBookings(user.id)
  }

  @Get('bookings/pending')
  getPendingBookings(@CurrentUser() user: any) {
    return this.admin.findPendingBookings(user.id)
  }

  @Patch('bookings/:id/confirm')
  confirmBooking(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.admin.confirmBooking(id, user.id)
  }

  @Patch('bookings/:id/cancel')
  cancelBooking(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.admin.cancelBooking(id, user.id)
  }
}
