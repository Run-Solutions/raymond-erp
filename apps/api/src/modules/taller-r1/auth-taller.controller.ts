import { Controller, Post, Body } from '@nestjs/common';
import { AuthTallerService } from './auth-taller.service';
import { LoginTallerDto } from './dto/login-taller.dto';
import { SolicitarAccesoTallerDto } from './dto/solicitar-acceso-taller.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('taller-r1/auth')
export class AuthTallerController {
    constructor(private readonly authService: AuthTallerService) { }

    @Post('login')
    async login(@Body() dto: LoginTallerDto) {
        return this.authService.login(dto);
    }

    @Post('register')
    async register(@Body() dto: SolicitarAccesoTallerDto) {
        return this.authService.register(dto);
    }
}
