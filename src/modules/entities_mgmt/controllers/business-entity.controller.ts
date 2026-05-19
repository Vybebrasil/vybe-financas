import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BusinessEntityService } from '../services/business-entity.service';
import { CreateBusinessEntityDTO } from '../dto/create-business-entity.dto';

@Controller('api/v1/business-entities')
export class BusinessEntityController {
    constructor(private readonly entityService: BusinessEntityService) { }

    @Post()
    create(@Body() createDto: CreateBusinessEntityDTO) {
        return this.entityService.create(createDto);
    }

    @Get()
    findAll(@Query('companyId') companyId?: string) {
        if (companyId) {
            return this.entityService.findAllByCompany(companyId);
        }
        return this.entityService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.entityService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Partial<CreateBusinessEntityDTO>) {
        return this.entityService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.entityService.remove(id);
    }
}
