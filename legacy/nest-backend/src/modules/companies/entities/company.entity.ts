import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BusinessEntity } from '../../entities_mgmt/entities/business-entity.entity';
import { BankAccount } from '../../finance/entities/bank-account.entity';
import { FinancialTransaction } from '../../finance/entities/financial-transaction.entity';
import { Contract } from '../../finance/entities/contract.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'document_cnpj', length: 14, unique: true })
  documentCnpj: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => BusinessEntity, (entity) => entity.company)
  entities: BusinessEntity[];

  @OneToMany(() => BankAccount, (account) => account.company)
  bankAccounts: BankAccount[];

  @OneToMany(() => FinancialTransaction, (transaction) => transaction.company)
  transactions: FinancialTransaction[];

  @OneToMany(() => Contract, (contract) => contract.company)
  contracts: Contract[];
}
