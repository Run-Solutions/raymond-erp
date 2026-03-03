import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { LoginTallerDto } from './dto/login-taller.dto';

@Injectable()
export class AuthTallerService {
    constructor(private prisma: PrismaDynamicService) { }

    async login(dto: LoginTallerDto) {
        const r1 = await this.prisma.getR1();
        const user = await r1.usuarios.findFirst({
            where: {
                OR: [
                    { Correo: dto.username },
                    { Usuario: dto.username }
                ]
            }
        });

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Assuming 1 might be blocked, or if boolean logic applies. Image shows 0.
        if (Number(user.UsuarioBloqueado) === 1) {
            throw new UnauthorizedException('Usuario bloqueado');
        }

        // Direct string comparison as per requirements/image showing plain text
        if (user.ContrasenaUsuario !== dto.password) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Return user info.
        return {
            id: user.IDUsuarios,
            username: user.Usuario,
            email: user.Correo,
            role: user.Rol,
            sitio: user.sitio || 'R1',
            message: 'Login successful'
        };
    }
}
