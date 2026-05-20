import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessEntity } from '../entities/business-entity.entity';
import { CreateBusinessEntityDTO } from '../dto/create-business-entity.dto';

@Injectable()
export class BusinessEntityService {
    constructor(
        @InjectRepository(BusinessEntity)
        private readonly entityRepository: Repository<BusinessEntity>,
    ) { }

    async create(createDto: CreateBusinessEntityDTO): Promise<BusinessEntity> {
        const entity = this.entityRepository.create(createDto);
        return this.entityRepository.save(entity);
    }

    async findAll(): Promise<BusinessEntity[]> {
        return this.entityRepository.find();
    }

    async findAllByCompany(companyId: string): Promise<BusinessEntity[]> {
        return this.entityRepository.find({ where: { companyId } });
    }

    async findOne(id: string): Promise<BusinessEntity> {
        const entity = await this.entityRepository.findOne({ where: { id } });
        if (!entity) {
            throw new NotFoundException(`BusinessEntity with ID "${id}" not found`);
        }
        return entity;
    }

    async update(id: string, updateData: Partial<CreateBusinessEntityDTO>): Promise<BusinessEntity> {
        await this.findOne(id); // Ensure exists
        await this.entityRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const result = await this.entityRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`BusinessEntity with ID "${id}" not found`);
        }
    }
}
