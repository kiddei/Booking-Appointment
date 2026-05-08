import { IsString, IsNotEmpty } from 'class-validator'

export class SubmitReceiptDto {
  @IsString()
  @IsNotEmpty()
  paymentReceipt: string
}
