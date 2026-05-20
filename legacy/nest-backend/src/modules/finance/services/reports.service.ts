import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { FinancialTransaction } from '../entities/financial-transaction.entity';
import { TransactionType } from '../enums/transaction.enums';

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(FinancialTransaction)
        private readonly transactionRepository: Repository<FinancialTransaction>,
    ) { }

    async generateTransactionsExcel(): Promise<ExcelJS.Buffer> {
        const transactions = await this.transactionRepository.find({
            relations: ['company', 'entity', 'bankAccount', 'category', 'contract'],
            order: { dueDate: 'DESC' }
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Transações');

        // Headers
        sheet.columns = [
            { header: 'Data Vencimento', key: 'dueDate', width: 15 },
            { header: 'Tipo', key: 'type', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Descrição', key: 'description', width: 30 },
            { header: 'Valor Bruto', key: 'grossValue', width: 15 },
            { header: 'Valor Líquido', key: 'netValue', width: 15 },
            { header: 'Entidade', key: 'entity', width: 25 },
            { header: 'Categoria', key: 'category', width: 20 },
            { header: 'Conta Bancária', key: 'bankAccount', width: 20 },
            { header: 'Data Pagamento', key: 'paymentDate', width: 15 },
        ];

        // Rows
        transactions.forEach(tx => {
            sheet.addRow({
                dueDate: tx.dueDate,
                type: tx.type === TransactionType.RECEIVABLE ? 'Receita' : 'Despesa',
                status: tx.status,
                description: tx.description,
                grossValue: Number(tx.grossValue),
                netValue: Number(tx.netValue),
                entity: tx.entity?.name || '',
                category: tx.category?.name || '',
                bankAccount: tx.bankAccount?.bankName || '',
                paymentDate: tx.paymentDate || ''
            });
        });

        // Styling (Optional simple bold header)
        sheet.getRow(1).font = { bold: true };

        return workbook.xlsx.writeBuffer();
    }
}
