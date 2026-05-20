import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BankAccountService } from '../services/bank-account.service';
import { CreateBankAccountDTO } from '../dto/create-bank-account.dto';

@Controller('api/v1/bank-accounts')
export class BankAccountController {
    constructor(private readonly bankAccountService: BankAccountService) { }

    @Post()
    create(@Body() createDto: CreateBankAccountDTO) {
        return this.bankAccountService.create(createDto);
    }

    @Get()
    findAll(@Query('companyId') companyId?: string) {
        return this.bankAccountService.findAll(companyId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.bankAccountService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Partial<CreateBankAccountDTO>) {
        return this.bankAccountService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.bankAccountService.remove(id);
    }
}
