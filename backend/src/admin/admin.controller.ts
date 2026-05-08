import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
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
  getStats() {
    return this.admin.getStats()
  }

  // ── Courts ───────────────────────────────────────────────

  @Get('courts')
  getCourts() {
    return this.admin.findAllCourts()
  }

  @Post('courts')
  addCourt(@Body() dto: CreateCourtDto) {
    return this.admin.createCourt(dto)
  }

  @Patch('courts/:id')
  updateCourt(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourtDto) {
    return this.admin.updateCourt(id, dto)
  }

  @Patch('courts/:id/deactivate')
  deactivateCourt(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deactivateCourt(id)
  }

  @Patch('courts/:id/reactivate')
  reactivateCourt(@Param('id', ParseIntPipe) id: number) {
    return this.admin.reactivateCourt(id)
  }

  // ── Users ────────────────────────────────────────────────

  @Get('users')
  getUsers() {
    return this.admin.findAllUsers()
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: 'PLAYER' | 'ADMIN',
  ) {
    return this.admin.updateUserRole(id, role)
  }

  @Patch('users/:id/disable')
  disableUser(@Param('id', ParseIntPipe) id: number) {
    return this.admin.toggleUserActive(id, false)
  }

  @Patch('users/:id/enable')
  enableUser(@Param('id', ParseIntPipe) id: number) {
    return this.admin.toggleUserActive(id, true)
  }

  // ── Bookings ─────────────────────────────────────────────

  @Get('bookings')
  getAllBookings() {
    return this.admin.findAllBookings()
  }

  @Get('bookings/pending')
  getPendingBookings() {
    return this.admin.findPendingBookings()
  }

  @Patch('bookings/:id/confirm')
  confirmBooking(@Param('id', ParseIntPipe) id: number) {
    return this.admin.confirmBooking(id)
  }

  @Patch('bookings/:id/cancel')
  cancelBooking(@Param('id', ParseIntPipe) id: number) {
    return this.admin.cancelBooking(id)
  }
}
