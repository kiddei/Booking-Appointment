import { IsString, MinLength, MaxLength } from 'class-validator'

export class CompleteGoogleProfileDto {
  @IsString()
  pendingToken: string

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string

  @IsString()
  @MinLength(8)
  password: string
}
