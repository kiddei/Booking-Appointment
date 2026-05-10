import {
  IsBoolean, IsNumber, IsOptional, IsPositive, IsString,
  Matches, Max, Min,
} from 'class-validator'

export class UpdateCourtDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  location?: string

  @IsString()
  @IsOptional()
  ownerName?: string

  @IsString()
  @IsOptional()
  contactNumber?: string

  @IsString()
  @IsOptional()
  gcashQrCode?: string

  @IsBoolean()
  @IsOptional()
  indoor?: boolean

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  totalCourts?: number

  @IsNumber()
  @IsPositive()
  @IsOptional()
  hourlyRate?: number

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  @IsOptional()
  openTime?: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  @IsOptional()
  closeTime?: string

  @IsBoolean()
  @IsOptional()
  active?: boolean
}
