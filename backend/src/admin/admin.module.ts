import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { CourtsModule } from '../courts/courts.module'

@Module({
  imports: [CourtsModule],
  controllers: [AdminController],
})
export class AdminModule {}
