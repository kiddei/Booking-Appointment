import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common'
import { CourtsService } from './courts.service'

@Controller('courts')
export class CourtsController {
  constructor(private courts: CourtsService) {}

  @Get()
  findAll() {
    return this.courts.findActive()
  }

  @Get(':id/availability')
  availability(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
    @Query('courtNumber') courtNumber?: string,
  ) {
    return this.courts.getAvailability(id, date, courtNumber ? Number(courtNumber) : 1)
  }

  @Get(':id/courts-status')
  courtsStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
  ) {
    return this.courts.getCourtsStatus(id, date)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courts.findOne(id)
  }
}
