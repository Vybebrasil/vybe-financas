import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { TransactionType } from '../enums/transaction.enums';

export class CreateCategoryDTO {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(TransactionType)
    @IsNotEmpty()
    type: TransactionType;

    @IsUUID()
    @IsNotEmpty()
    companyId: string;
}
