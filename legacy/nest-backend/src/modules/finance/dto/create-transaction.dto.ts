import { IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID, IsDateString, IsOptional } from 'class-validator';
import { TransactionType, TransactionStatus } from '../enums/transaction.enums';

export class CreateTransactionDTO {
    @IsEnum(TransactionType)
    @IsNotEmpty()
    type: TransactionType;

    @IsEnum(TransactionStatus)
    @IsNotEmpty()
    status: TransactionStatus;

    @IsNumber()
    @IsNotEmpty()
    grossValue: number;

    @IsNotEmpty()
    @IsDateString()
    dueDate: string;

    @IsOptional()
    @IsDateString()
    paymentDate?: string;

    @IsUUID()
    @IsNotEmpty()
    companyId: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsUUID()
    @IsOptional()
    entityId?: string;

    @IsUUID()
    @IsOptional()
    bankAccountId?: string;

    @IsUUID()
    @IsOptional()
    categoryId?: string;
}
