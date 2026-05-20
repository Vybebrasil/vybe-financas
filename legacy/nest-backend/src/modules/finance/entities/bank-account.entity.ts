import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { FinancialTransaction } from '../../finance/entities/financial-transaction.entity';

@Entity('bank_accounts')
export class BankAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'bank_name' })
    bankName: string;

    @Column()
    agency: string;

    @Column({ name: 'account_number' })
    accountNumber: string;

    @Column('decimal', { precision: 15, scale: 2, default: 0 })
    balance: number;

    @Column({ name: 'company_id' })
    companyId: string;

    @ManyToOne(() => Company, (company) => company.bankAccounts)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @OneToMany(() => FinancialTransaction, (transaction) => transaction.bankAccount)
    transactions: FinancialTransaction[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
