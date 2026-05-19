import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { EntityType } from '../entities/business-entity.entity';

export class CreateBusinessEntityDTO {
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    name: string;

    @IsString()
    @IsOptional()
    @Length(1, 20) // CPF/CNPJ usually max 14 but give some room
    document?: string;

    @IsEnum(EntityType)
    @IsNotEmpty()
    type: EntityType;

    @IsUUID()
    @IsNotEmpty()
    companyId: string;
}
