import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { CreateBankAccountDTO } from '../dto/create-bank-account.dto';

@Injectable()
export class BankAccountService {
    constructor(
        @InjectRepository(BankAccount)
        private readonly bankAccountRepository: Repository<BankAccount>,
    ) { }

    async create(createDto: CreateBankAccountDTO): Promise<BankAccount> {
        const bankAccount = this.bankAccountRepository.create(createDto);
        return this.bankAccountRepository.save(bankAccount);
    }

    async findAll(companyId?: string): Promise<BankAccount[]> {
        if (companyId) {
            return this.bankAccountRepository.find({ where: { companyId } });
        }
        return this.bankAccountRepository.find();
    }

    async findOne(id: string): Promise<BankAccount> {
        const bankAccount = await this.bankAccountRepository.findOne({ where: { id } });
        if (!bankAccount) {
            throw new NotFoundException(`BankAccount with ID "${id}" not found`);
        }
        return bankAccount;
    }

    async update(id: string, updateData: Partial<CreateBankAccountDTO>): Promise<BankAccount> {
        await this.findOne(id);
        await this.bankAccountRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const result = await this.bankAccountRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`BankAccount with ID "${id}" not found`);
        }
    }
}
