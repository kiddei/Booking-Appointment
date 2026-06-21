import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SuperAdminService } from './superadmin.service'
import { CreateSuperAdminUserDto } from './dto/create-user.dto'
import { UpdateSuperAdminUserDto } from './dto/update-user.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('superadmin')
export class SuperAdminController {
  constructor(private superAdmin: SuperAdminService) {}

  // ── Stats ────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.superAdmin.getGlobalStats()
  }

  // ── Users ────────────────────────────────────────────────

  @Get('users')
  getUsers() {
    return this.superAdmin.findAllUsers()
  }

  @Post('users')
  createUser(@Body() dto: CreateSuperAdminUserDto) {
    return this.superAdmin.createUser(dto)
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSuperAdminUserDto,
  ) {
    return this.superAdmin.updateUser(id, dto)
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.superAdmin.deleteUser(id, user.id)
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: string,
    @CurrentUser() user: any,
  ) {
    return this.superAdmin.updateUserRole(id, role, user.id)
  }

  @Patch('users/:id/disable')
  disableUser(@Param('id', ParseIntPipe) id: number) {
    return this.superAdmin.toggleUserActive(id, false)
  }

  @Patch('users/:id/enable')
  enableUser(@Param('id', ParseIntPipe) id: number) {
    return this.superAdmin.toggleUserActive(id, true)
  }

  // ── Courts ───────────────────────────────────────────────

  @Get('courts')
  getAllCourts() {
    return this.superAdmin.findAllCourts()
  }

  // ── Bookings ─────────────────────────────────────────────

  @Get('bookings')
  getAllBookings() {
    return this.superAdmin.findAllBookings()
  }

  @Patch('bookings/:id/confirm')
  confirmBooking(@Param('id', ParseIntPipe) id: number) {
    return this.superAdmin.confirmBooking(id)
  }

  @Patch('bookings/:id/cancel')
  cancelBooking(@Param('id', ParseIntPipe) id: number) {
    return this.superAdmin.cancelBooking(id)
  }
}
