import { Controller, Post, Res, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { clearR4Caches } from './cache.registry';

@Controller('r4/cache')
export class CacheController {
    @Post('clear')
    @UseGuards(JwtAuthGuard)
    async clear(@Req() req: any, @Res() res: Response) {
        try {
            clearR4Caches({ origen: `manual.sync:${req.user?.userId || req.user?.id || 'anon'}` });
            return res.status(HttpStatus.OK).json({ success: true });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
        }
    }
}
