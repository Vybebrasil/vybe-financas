import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { CreateContractDTO } from '../dto/create-contract.dto';
import { FinancialTransaction } from '../entities/financial-transaction.entity';
import { TransactionStatus, TransactionType } from '../enums/transaction.enums';
// import { addMonths, setDate } from 'date-fns'; 

@Injectable()
export class ContractService {
    constructor(
        @InjectRepository(Contract)
        private readonly contractRepository: Repository<Contract>,
        private readonly dataSource: DataSource,
    ) { }

    async create(createDto: CreateContractDTO): Promise<Contract> {
        const contract = this.contractRepository.create(createDto);
        return this.contractRepository.save(contract);
    }

    async findAll(companyId?: string): Promise<Contract[]> {
        if (companyId) {
            return this.contractRepository.find({ where: { companyId }, relations: ['entity'] });
        }
        return this.contractRepository.find({ relations: ['entity'] });
    }

    async findOne(id: string): Promise<Contract> {
        const contract = await this.contractRepository.findOne({ where: { id }, relations: ['entity'] });
        if (!contract) {
            throw new Error('Contract not found');
        }
        return contract;
    }

    async update(id: string, updateData: Partial<CreateContractDTO>): Promise<Contract> {
        await this.contractRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        await this.contractRepository.delete(id);
    }

    /**
     * Generates future financial transactions based on a contract's recurrence parameters.
     * Ex: A 12-month contract generates 12 PENDING transactions.
     */
    async processContract(contractId: string): Promise<FinancialTransaction[]> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const contract = await queryRunner.manager.findOne(Contract, { where: { id: contractId } });
            if (!contract) {
                throw new Error('Contract not found');
            }

            const transactions: FinancialTransaction[] = [];
            const startDate = new Date(contract.startDate);

            for (let i = 0; i < contract.recurrenceMonths; i++) {
                const transaction = new FinancialTransaction();
                transaction.companyId = contract.companyId;
                transaction.entityId = contract.entityId;
                transaction.contractId = contract.id;
                transaction.type = TransactionType.RECEIVABLE; // Assuming contracts are mostly for revenue (fees)
                transaction.status = TransactionStatus.PENDING;
                transaction.grossValue = contract.amount;
                transaction.netValue = contract.amount; // Valid only if no tax logic yet

                // Calculate due date: Start Date Month + i, Day = dayOfMonthDue
                // Using simple JS Date logic for demonstration (production should use a lib like luxon/date-fns)
                let dueDate = new Date(startDate);
                dueDate.setMonth(startDate.getMonth() + i);
                dueDate.setDate(contract.dayOfMonthDue);

                transaction.dueDate = dueDate;
                transaction.description = `Invoice ${i + 1}/${contract.recurrenceMonths} - ${contract.description}`;

                transactions.push(transaction);
            }

            const savedTransactions = await queryRunner.manager.save(FinancialTransaction, transactions);

            await queryRunner.commitTransaction();
            return savedTransactions;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
