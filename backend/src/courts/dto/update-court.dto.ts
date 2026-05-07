import {
  IsBoolean, IsNumber, IsOptional, IsPositive, IsString, Max, Min,
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

  @IsBoolean()
  @IsOptional()
  active?: boolean
}
