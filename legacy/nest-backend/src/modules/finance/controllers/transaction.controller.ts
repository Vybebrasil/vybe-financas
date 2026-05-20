import { Controller, Post, Body, Patch, Param, Get, Query, Delete } from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';
import { CreateTransactionDTO } from '../dto/create-transaction.dto';

@Controller('api/v1/transactions')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) { }

    @Post()
    async create(@Body() createTransactionDto: CreateTransactionDTO) {
        return this.transactionService.create(createTransactionDto);
    }

    @Get()
    findAll(@Query('companyId') companyId?: string) {
        return this.transactionService.findAll(companyId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.transactionService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Partial<CreateTransactionDTO>) {
        return this.transactionService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.transactionService.remove(id);
    }

    @Patch(':id/reconcile')
    async reconcile(
        @Param('id') id: string,
        @Body('bankAccountId') bankAccountId: string,
        @Body('paymentDate') paymentDate: string,
    ) {
        return this.transactionService.manualReconcile(
            id,
            bankAccountId,
            new Date(paymentDate)
        );
    }
}
