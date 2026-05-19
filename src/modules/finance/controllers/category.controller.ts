import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDTO } from '../dto/create-category.dto';

@Controller('api/v1/categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    @Post()
    create(@Body() createDto: CreateCategoryDTO) {
        return this.categoryService.create(createDto);
    }

    @Get()
    findAll(@Query('companyId') companyId?: string) {
        return this.categoryService.findAll(companyId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.categoryService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Partial<CreateCategoryDTO>) {
        return this.categoryService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.categoryService.remove(id);
    }
}
