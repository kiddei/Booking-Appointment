import {
  Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common'
import { BookingsService } from './bookings.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.bookings.findByUser(user.id)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.bookings.findOne(id, user.id)
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: any) {
    return this.bookings.create(dto, user.id)
  }

  @Delete(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.bookings.cancel(id, user.id)
  }
}
