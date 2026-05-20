import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { CreateCompanyDTO } from '../dto/create-company.dto';

@Injectable()
export class CompanyService {
    constructor(
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
    ) { }

    async create(createCompanyDto: CreateCompanyDTO): Promise<Company> {
        const company = this.companyRepository.create(createCompanyDto);
        return this.companyRepository.save(company);
    }

    async findAll(): Promise<Company[]> {
        return this.companyRepository.find();
    }

    async findOne(id: string): Promise<Company> {
        const company = await this.companyRepository.findOne({ where: { id } });
        if (!company) {
            throw new NotFoundException(`Company with ID "${id}" not found`);
        }
        return company;
    }

    async update(id: string, updateData: Partial<CreateCompanyDTO>): Promise<Company> {
        await this.findOne(id); // Ensure exists
        await this.companyRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const result = await this.companyRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Company with ID "${id}" not found`);
        }
    }
}
