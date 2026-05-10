import {
  IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString,
  Matches, Max, Min,
} from 'class-validator'

export class CreateCourtDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  location: string

  @IsString()
  @IsNotEmpty()
  ownerName: string

  @IsString()
  @IsNotEmpty()
  contactNumber: string

  @IsNumber()
  @IsPositive()
  hourlyRate: number

  @IsNumber()
  @Min(1)
  @Max(20)
  totalCourts: number

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  openTime: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  closeTime: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  gcashQrCode?: string

  @IsBoolean()
  @IsOptional()
  indoor?: boolean

  @IsNumber()
  @IsOptional()
  maxPlayers?: number
}
