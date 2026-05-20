import { Controller, Get } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';

@Controller('api/v1/dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('summary')
    getSummary() {
        return this.dashboardService.getSummary();
    }

    @Get('history')
    getHistory() {
        return this.dashboardService.getFinancialHistory();
    }
}
