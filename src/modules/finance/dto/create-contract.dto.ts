import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractDTO {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(0.01)
    amount: number;

    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    recurrenceMonths: number;

    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    @Max(31)
    dayOfMonthDue: number;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    endDate?: Date;

    @IsUUID()
    @IsNotEmpty()
    companyId: string;

    @IsUUID()
    @IsNotEmpty()
    entityId: string;
}
