import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { CourtsModule } from './courts/courts.module'
import { BookingsModule } from './bookings/bookings.module'
import { AdminModule } from './admin/admin.module'

@Module({
  imports: [PrismaModule, AuthModule, CourtsModule, BookingsModule, AdminModule],
})
export class AppModule {}
