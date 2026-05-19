import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransaction } from '../entities/financial-transaction.entity';
import { BankAccount } from '../entities/bank-account.entity';
import { TransactionStatus, TransactionType } from '../enums/transaction.enums';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(FinancialTransaction)
        private readonly transactionRepository: Repository<FinancialTransaction>,
        @InjectRepository(BankAccount)
        private readonly bankAccountRepository: Repository<BankAccount>,
    ) { }

    async getSummary() {
        // 1. Total Balance across all accounts
        const { totalBalance } = await this.bankAccountRepository
            .createQueryBuilder('account')
            .select('SUM(account.balance)', 'totalBalance')
            .getRawOne();

        // 2. Total Receivables (Pending)
        const { totalReceivable } = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('SUM(transaction.netValue)', 'totalReceivable')
            .where('transaction.type = :type', { type: TransactionType.RECEIVABLE })
            .andWhere('transaction.status = :status', { status: TransactionStatus.PENDING })
            .getRawOne();

        // 3. Total Payables (Pending)
        const { totalPayable } = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('SUM(transaction.netValue)', 'totalPayable')
            .where('transaction.type = :type', { type: TransactionType.PAYABLE })
            .andWhere('transaction.status = :status', { status: TransactionStatus.PENDING })
            .getRawOne();

        // 4. Overdue Count
        const overdueCount = await this.transactionRepository.count({
            where: {
                status: TransactionStatus.OVERDUE
            }
        });

        return {
            totalBalance: parseFloat(totalBalance || '0'),
            totalReceivable: parseFloat(totalReceivable || '0'),
            totalPayable: parseFloat(totalPayable || '0'),
            overdueCount
        };
    }

    async getFinancialHistory() {
        // Simple aggregation by month for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const rawData = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select("TO_CHAR(transaction.dueDate, 'YYYY-MM')", 'month') // Postgres specific
            .addSelect('transaction.type', 'type')
            .addSelect('SUM(transaction.netValue)', 'total')
            .where('transaction.dueDate >= :date', { date: sixMonthsAgo })
            .groupBy("TO_CHAR(transaction.dueDate, 'YYYY-MM')")
            .addGroupBy('transaction.type')
            .orderBy('month', 'ASC')
            .getRawMany();

        // Process data to return friendly format: [{ month: '2023-01', income: 100, expense: 50 }]
        const historyMap = new Map<string, { month: string, income: number, expense: number }>();

        rawData.forEach(row => {
            if (!historyMap.has(row.month)) {
                historyMap.set(row.month, { month: row.month, income: 0, expense: 0 });
            }
            const entry = historyMap.get(row.month);
            if (row.type === TransactionType.RECEIVABLE) {
                entry.income = parseFloat(row.total);
            } else {
                entry.expense = parseFloat(row.total);
            }
        });

        return Array.from(historyMap.values());
    }
}
