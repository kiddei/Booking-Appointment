import { IsString, IsEmail, IsOptional, IsIn, IsBoolean, MinLength } from 'class-validator'

export class UpdateSuperAdminUserDto {
  @IsOptional()
  @IsString()
  username?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string

  @IsOptional()
  @IsIn(['PLAYER', 'ADMIN', 'SUPER_ADMIN'])
  role?: string

  @IsOptional()
  @IsBoolean()
  active?: boolean
}
