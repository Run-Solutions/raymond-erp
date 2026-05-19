import { Controller, Get, Param, Query, Res, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { TallerR1Service } from './taller-r1.service';
import { Public } from '../../common/decorators/public.decorator';
import { Response } from 'express';
import axios from 'axios';

@Controller('taller-r1')
export class TallerR1Controller {
    constructor(private readonly tallerR1Service: TallerR1Service) { }

    @Public()
    @Get('proxy-image')
    async proxyImage(@Query('url') url: string, @Res() res: Response) {
        if (!url) {
            throw new BadRequestException('URL is required');
        }

        try {
            // Validar que la URL sea de confianza (ej: nuestro bucket de S3 o DigitalOcean Spaces)
            // Esto es crucial por seguridad (evitar SSRF)
            const allowedHost = 'digitaloceanspaces.com';
            if (!url.includes(allowedHost)) {
                throw new BadRequestException('Domain not allowed');
            }

            const response = await axios.get(url, { responseType: 'stream' });
            const contentType = response.headers['content-type'];
            res.setHeader('Content-Type', contentType);
            response.data.pipe(res);
        } catch (error: any) {
            console.error(`[ProxyImage] Error fetching ${url}:`, error.message);
            throw new InternalServerErrorException('Error fetching image');
        }
    }

    @Get('equipos')
    async getAllEquipos() {
        return this.tallerR1Service.getAllEquipos();
    }

    @Get('equipos/clase/:clase')
    async getEquiposByClase(@Param('clase') clase: string) {
        return this.tallerR1Service.getEquiposByClase(clase);
    }

    @Get('ubicaciones')
    async getAllUbicaciones() {
        return this.tallerR1Service.getAllUbicaciones();
    }

    @Get('entradas')
    async getAllEntradas() {
        return this.tallerR1Service.getAllEntradas();
    }

    @Get('salidas')
    async getAllSalidas() {
        return this.tallerR1Service.getAllSalidas();
    }

    @Get('search')
    async search(@Query('q') q: string) {
        return this.tallerR1Service.search(q);
    }
}
