import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from '../services/reports.service';

@Controller('api/v1/reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('export/excel')
    async exportToExcel(@Res() res: Response) {
        const buffer = await this.reportsService.generateTransactionsExcel();

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=transacoes.xlsx',
            'Content-Length': buffer.byteLength,
        });

        res.send(Buffer.from(buffer));
    }
}
