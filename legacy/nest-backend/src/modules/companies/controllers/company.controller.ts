import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CompanyService } from '../services/company.service';
import { CreateCompanyDTO } from '../dto/create-company.dto';

@Controller('api/v1/companies')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) { }

    @Post()
    create(@Body() createCompanyDto: CreateCompanyDTO) {
        return this.companyService.create(createCompanyDto);
    }

    @Get()
    findAll() {
        return this.companyService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.companyService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCompanyDto: Partial<CreateCompanyDTO>) {
        return this.companyService.update(id, updateCompanyDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.companyService.remove(id);
    }
}
