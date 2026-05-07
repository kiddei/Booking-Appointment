import { IsInt, IsPositive, IsString, Matches, Min } from 'class-validator'

export class CreateBookingDto {
  @IsInt()
  @IsPositive()
  courtId: number

  @IsInt()
  @Min(1)
  courtNumber: number

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'bookingDate must be YYYY-MM-DD' })
  bookingDate: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime: string
}
