import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { BusinessEntity } from '../../entities_mgmt/entities/business-entity.entity';
import { FinancialTransaction } from './financial-transaction.entity';

@Entity('contracts')
export class Contract {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    description: string;

    @Column('decimal', { precision: 15, scale: 2 })
    amount: number;

    @Column({ name: 'recurrence_months', default: 1 })
    recurrenceMonths: number;

    @Column({ name: 'day_of_month_due' })
    dayOfMonthDue: number;

    @Column({ name: 'start_date' })
    startDate: Date;

    @Column({ name: 'end_date', nullable: true })
    endDate: Date; // Optional: Indefinite contracts

    @Column({ name: 'company_id' })
    companyId: string;

    @ManyToOne(() => Company, (company) => company.contracts)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @Column({ name: 'entity_id' })
    entityId: string;

    @ManyToOne(() => BusinessEntity, (entity) => entity.contracts)
    @JoinColumn({ name: 'entity_id' })
    entity: BusinessEntity;

    @OneToMany(() => FinancialTransaction, (transaction) => transaction.contract)
    transactions: FinancialTransaction[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
