import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { FinancialTransaction } from '../entities/financial-transaction.entity';
import { TransactionStatus, TransactionType } from '../enums/transaction.enums';
import { CreateTransactionDTO } from '../dto/create-transaction.dto';
import { BankAccount } from '../entities/bank-account.entity';
import { BusinessEntity } from '../../entities_mgmt/entities/business-entity.entity';

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(FinancialTransaction)
        private readonly transactionRepository: Repository<FinancialTransaction>,
        @InjectRepository(BankAccount)
        private readonly bankAccountRepository: Repository<BankAccount>,
        private readonly dataSource: DataSource,
    ) { }

    async findAll(companyId?: string): Promise<FinancialTransaction[]> {
        if (companyId) {
            return this.transactionRepository.find({ where: { companyId }, relations: ['entity', 'bankAccount', 'contract'] });
        }
        return this.transactionRepository.find({ relations: ['entity', 'bankAccount', 'contract'] });
    }

    async findOne(id: string): Promise<FinancialTransaction> {
        const transaction = await this.transactionRepository.findOne({ where: { id }, relations: ['entity', 'bankAccount', 'contract'] });
        if (!transaction) {
            throw new NotFoundException(`Transaction with ID "${id}" not found`);
        }
        return transaction;
    }

    async update(id: string, updateData: Partial<CreateTransactionDTO>): Promise<FinancialTransaction> {
        await this.findOne(id);
        await this.transactionRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const result = await this.transactionRepository.softDelete(id); // Using soft delete as configured in entity
        if (result.affected === 0) {
            throw new NotFoundException(`Transaction with ID "${id}" not found`);
        }
    }

    /**
     * Creates a new financial transaction with validation.
     * Uses a transaction purely for demonstration of ACID safety if we were also updating balances.
     */
    async create(createTransactionDto: CreateTransactionDTO): Promise<FinancialTransaction> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Basic Validation
            if (createTransactionDto.grossValue <= 0) {
                throw new BadRequestException('Gross value must be greater than zero.');
            }

            // 2. Prepare the entity
            const transaction = new FinancialTransaction();
            transaction.companyId = createTransactionDto.companyId;
            transaction.type = createTransactionDto.type;
            transaction.grossValue = createTransactionDto.grossValue;
            transaction.netValue = createTransactionDto.grossValue; // Initial logic, can be adjusted for taxes/discounts
            transaction.dueDate = new Date(createTransactionDto.dueDate);
            transaction.entityId = createTransactionDto.entityId;
            transaction.categoryId = createTransactionDto.categoryId;
            transaction.status = TransactionStatus.PENDING;

            if (createTransactionDto.bankAccountId) {
                transaction.bankAccountId = createTransactionDto.bankAccountId;
            }

            // 3. Save within the transaction scope
            const savedTransaction = await queryRunner.manager.save(FinancialTransaction, transaction);

            // If we were auto-paying, we would update the bank balance here and fail if insufficient funds
            // e.g., if (transaction.status === TransactionStatus.PAID) { ... }

            await queryRunner.commitTransaction();
            return savedTransaction;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Example of specific business logic: Manual Reconciliation (Baixa Manual)
     */
    async manualReconcile(transactionId: string, bankAccountId: string, paymentDate: Date) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const transaction = await queryRunner.manager.findOne(FinancialTransaction, { where: { id: transactionId } });
            if (!transaction) throw new NotFoundException('Transaction not found');

            if (transaction.status === TransactionStatus.PAID) {
                throw new BadRequestException('Transaction already paid');
            }

            const bankAccount = await queryRunner.manager.findOne(BankAccount, { where: { id: bankAccountId } });
            if (!bankAccount) throw new NotFoundException('Bank Account not found');

            // Update Transaction
            transaction.status = TransactionStatus.PAID;
            transaction.paymentDate = paymentDate;
            transaction.bankAccountId = bankAccountId; // Bind to the account used

            // Update Bank Balance
            if (transaction.type === TransactionType.RECEIVABLE) {
                bankAccount.balance = Number(bankAccount.balance) + Number(transaction.netValue);
            } else {
                bankAccount.balance = Number(bankAccount.balance) - Number(transaction.netValue);
            }

            await queryRunner.manager.save(transaction);
            await queryRunner.manager.save(bankAccount);

            await queryRunner.commitTransaction();
            return transaction;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
