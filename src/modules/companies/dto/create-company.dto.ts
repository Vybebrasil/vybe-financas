import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCompanyDTO {
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    name: string;

    @IsString()
    @IsNotEmpty()
    @Length(14, 14)
    documentCnpj: string;
}
