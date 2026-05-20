import { Controller, Post, Body, Param, Get, Patch, Delete, Query } from '@nestjs/common';
import { ContractService } from '../services/contract.service';
import { CreateContractDTO } from '../dto/create-contract.dto';

@Controller('api/v1/contracts')
export class ContractController {
    constructor(private readonly contractService: ContractService) { }

    @Post()
    create(@Body() createDto: CreateContractDTO) {
        return this.contractService.create(createDto);
    }

    @Get()
    findAll(@Query('companyId') companyId?: string) {
        return this.contractService.findAll(companyId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.contractService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Partial<CreateContractDTO>) {
        return this.contractService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.contractService.remove(id);
    }

    @Post(':id/generate-installments')
    async generateInstallments(@Param('id') id: string) {
        return this.contractService.processContract(id);
    }
}
