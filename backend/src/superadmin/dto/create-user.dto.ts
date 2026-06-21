import { IsString, IsEmail, IsOptional, IsIn, MinLength } from 'class-validator'

export class CreateSuperAdminUserDto {
  @IsString()
  username: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsOptional()
  @IsIn(['PLAYER', 'ADMIN', 'SUPER_ADMIN'])
  role?: string
}
