import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller(':site/dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('stats')
    async getStats(@Param('site') site: string) {
        console.log(`[DashboardController] Getting stats for site: ${site}`);
        return this.dashboardService.getStats();
    }
}
