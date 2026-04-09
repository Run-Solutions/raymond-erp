import { Controller, Get, Post, Body, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { AdcService } from './adc.service';

@Controller('taller-r1/adc')
export class AdcController {
    constructor(private readonly adcService: AdcService) {}

    @Get()
    findAll() {
        return this.adcService.findAll();
    }

    @Post()
    create(@Body() data: { nombre: string }) {
        return this.adcService.create(data);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.adcService.remove(id);
    }
}
