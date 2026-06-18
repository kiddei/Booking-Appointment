import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { CourtsModule } from './courts/courts.module'
import { BookingsModule } from './bookings/bookings.module'
import { AdminModule } from './admin/admin.module'
import { MailModule } from './mail/mail.module'

@Module({
  imports: [PrismaModule, MailModule, AuthModule, CourtsModule, BookingsModule, AdminModule],
})
export class AppModule {}
