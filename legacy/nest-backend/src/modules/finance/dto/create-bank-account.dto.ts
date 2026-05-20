import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBankAccountDTO {
    @IsString()
    @IsNotEmpty()
    bankName: string;

    @IsString()
    @IsNotEmpty()
    agency: string;

    @IsString()
    @IsNotEmpty()
    accountNumber: string;

    @IsNumber()
    @IsOptional()
    balance?: number;

    @IsUUID()
    @IsNotEmpty()
    companyId: string;
}
