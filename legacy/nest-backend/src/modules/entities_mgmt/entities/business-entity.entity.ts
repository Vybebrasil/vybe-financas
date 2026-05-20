import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { FinancialTransaction } from '../../finance/entities/financial-transaction.entity';
import { Contract } from '../../finance/entities/contract.entity';

export enum EntityType {
    CLIENT = 'CLIENT',
    SUPPLIER = 'SUPPLIER',
    EMPLOYEE = 'EMPLOYEE',
}

@Entity('business_entities')
export class BusinessEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    document: string; // CPF or CNPJ

    @Column({
        type: 'enum',
        enum: EntityType,
    })
    type: EntityType;

    @Column({ name: 'company_id' })
    companyId: string;

    @ManyToOne(() => Company, (company) => company.entities)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => FinancialTransaction, (transaction) => transaction.entity)
    transactions: FinancialTransaction[];

    @OneToMany(() => Contract, (contract) => contract.entity)
    contracts: Contract[];
}
