import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialTransaction } from './entities/financial-transaction.entity';
import { Contract } from './entities/contract.entity';
import { BankAccount } from './entities/bank-account.entity';
import { Category } from './entities/category.entity';
import { TransactionService } from './services/transaction.service';
import { ContractService } from './services/contract.service';
import { BankAccountService } from './services/bank-account.service';
import { CategoryService } from './services/category.service';
import { TransactionController } from './controllers/transaction.controller';
import { ContractController } from './controllers/contract.controller';
import { BankAccountController } from './controllers/bank-account.controller';
import { CategoryController } from './controllers/category.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            FinancialTransaction,
            Contract,
            BankAccount,
            Category
        ])
    ],
    controllers: [TransactionController, ContractController, BankAccountController, CategoryController, DashboardController, ReportsController],
    providers: [TransactionService, ContractService, BankAccountService, CategoryService, DashboardService, ReportsService],
    exports: [TransactionService, ContractService, BankAccountService, CategoryService]
})
export class FinanceModule { }
