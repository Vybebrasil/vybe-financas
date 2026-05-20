import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDTO } from '../dto/create-category.dto';

@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) { }

    async create(createDto: CreateCategoryDTO): Promise<Category> {
        const category = this.categoryRepository.create(createDto);
        return this.categoryRepository.save(category);
    }

    async findAll(companyId?: string): Promise<Category[]> {
        if (companyId) {
            return this.categoryRepository.find({ where: { companyId } });
        }
        return this.categoryRepository.find();
    }

    async findOne(id: string): Promise<Category> {
        const category = await this.categoryRepository.findOne({ where: { id } });
        if (!category) {
            throw new NotFoundException(`Category with ID "${id}" not found`);
        }
        return category;
    }

    async update(id: string, updateData: Partial<CreateCategoryDTO>): Promise<Category> {
        await this.findOne(id);
        await this.categoryRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const result = await this.categoryRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Category with ID "${id}" not found`);
        }
    }
}
