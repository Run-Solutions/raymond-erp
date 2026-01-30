import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaTallerR1Service } from '../../database/prisma-taller-r1.service';
import { LoginTallerDto } from './dto/login-taller.dto';

@Injectable()
export class AuthTallerService {
    constructor(private prisma: PrismaTallerR1Service) { }

    async login(dto: LoginTallerDto) {
        const user = await this.prisma.usuarios.findFirst({
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
            message: 'Login successful'
        };
    }
}
