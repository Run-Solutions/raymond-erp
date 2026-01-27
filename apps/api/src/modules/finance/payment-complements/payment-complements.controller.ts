import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PaymentComplementsService } from './payment-complements.service';
import { CreatePaymentComplementDto } from './dto/create-payment-complement.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

@Controller('finance/payment-complements')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PaymentComplementsController {
    constructor(private readonly paymentComplementsService: PaymentComplementsService) { }

    @Post()
    create(@Request() req, @Body() createDto: CreatePaymentComplementDto) {
        return this.paymentComplementsService.create(req.user.organization_id, createDto);
    }

    @Get('ar/:arId')
    findAllByAr(@Request() req, @Param('arId') arId: string) {
        return this.paymentComplementsService.findAllByAr(req.user.organization_id, arId);
    }

    @Get('ap/:apId')
    findAllByAp(@Request() req, @Param('apId') apId: string) {
        return this.paymentComplementsService.findAllByAp(req.user.organization_id, apId);
    }

    @Get()
    findAll(@Request() req) {
        return this.paymentComplementsService.findAll(req.user.organization_id);
    }

    @Get('client/:client_id')
    findAllByClient(@Request() req, @Param('client_id') client_id: string) {
        return this.paymentComplementsService.findAllByClient(req.user.organization_id, client_id);
    }

    @Get('supplier/:supplier_id')
    findAllBySupplier(@Request() req, @Param('supplier_id') supplier_id: string) {
        return this.paymentComplementsService.findAllBySupplier(req.user.organization_id, supplier_id);
    }
}
