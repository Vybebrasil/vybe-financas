import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { BusinessEntity } from '../../entities_mgmt/entities/business-entity.entity';
import { BankAccount } from './bank-account.entity';
import { Contract } from './contract.entity';
import { Category } from './category.entity';
import { TransactionType, TransactionStatus } from '../enums/transaction.enums';

@Entity('financial_transactions')
export class FinancialTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: TransactionType,
    })
    type: TransactionType;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    status: TransactionStatus;

    @Column('decimal', { name: 'gross_value', precision: 15, scale: 2 })
    grossValue: number;

    @Column('decimal', { name: 'net_value', precision: 15, scale: 2 })
    netValue: number;

    @Column({ name: 'due_date' })
    dueDate: Date;

    @Column({ name: 'payment_date', nullable: true })
    paymentDate: Date;

    @Column({ name: 'category_id', nullable: true })
    categoryId: string;

    @ManyToOne(() => Category, (category) => category.transactions)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>; // Flexible field for extra data

    // Relationships

    @Column({ name: 'company_id' })
    companyId: string;

    @ManyToOne(() => Company, (company) => company.transactions)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @Column({ name: 'entity_id' })
    entityId: string;

    @ManyToOne(() => BusinessEntity, (entity) => entity.transactions)
    @JoinColumn({ name: 'entity_id' })
    entity: BusinessEntity;

    @Column({ name: 'bank_account_id', nullable: true })
    bankAccountId: string;

    @ManyToOne(() => BankAccount, (account) => account.transactions)
    @JoinColumn({ name: 'bank_account_id' })
    bankAccount: BankAccount;

    @Column({ name: 'contract_id', nullable: true })
    contractId: string;

    @ManyToOne(() => Contract, (contract) => contract.transactions)
    @JoinColumn({ name: 'contract_id' })
    contract: Contract;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date; // Soft Delete enforced
}
