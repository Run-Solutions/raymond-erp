import { Controller, Get } from '@nestjs/common';
import { InventarioService } from './inventario.service';

@Controller('taller-r1/inventario')
export class InventarioController {
    constructor(private readonly inventarioService: InventarioService) { }

    @Get()
    async getInventario() {
        return this.inventarioService.getInventario();
    }
}
