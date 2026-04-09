import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaDynamicService } from '../../database/prisma-dynamic.service';
import { LoginTallerDto } from './dto/login-taller.dto';
import { SolicitarAccesoTallerDto } from './dto/solicitar-acceso-taller.dto';

@Injectable()
export class AuthTallerService {
    constructor(
        private prisma: PrismaDynamicService,
        private jwtService: JwtService
    ) { }

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

        // Check status
        if (user.Status === 'PENDING') {
            throw new UnauthorizedException('Tu cuenta está pendiente de aprobación por un administrador');
        }
        if (user.Status === 'REJECTED') {
            throw new UnauthorizedException('Tu solicitud de acceso ha sido rechazada');
        }

        // Direct string comparison as per requirements/image showing plain text
        if (user.ContrasenaUsuario !== dto.password) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Generate standard JWT token for Taller user
        const tokenPayload = {
            sub: user.IDUsuarios,
            email: user.Correo,
            roles: user.Rol,
            sitio: user.sitio || 'R1',
            isTaller: true
        };
        const token = this.jwtService.sign(tokenPayload);

        // Return user info.
        return {
            id: user.IDUsuarios,
            username: user.Usuario,
            email: user.Correo,
            role: user.Rol,
            sitio: user.sitio || 'R1',
            message: 'Login successful',
            token
        };
    }

    async register(dto: SolicitarAccesoTallerDto) {
        const r1 = await this.prisma.getR1();
        
        // Check if user already exists
        const existingUser = await r1.usuarios.findFirst({
            where: {
                OR: [
                    { Correo: dto.email },
                    { Usuario: dto.username }
                ]
            }
        });

        if (existingUser) {
            throw new UnauthorizedException('El correo o usuario ya se encuentra registrado');
        }

        // Create user with PENDING status
        const newUser = await r1.usuarios.create({
            data: {
                IDUsuarios: require('crypto').randomBytes(4).toString('hex').substring(0, 7),
                Correo: dto.email,
                Usuario: dto.username,
                ContrasenaUsuario: dto.password,
                UsuarioBloqueado: true, // Blocked by default
                Rol: 'Visitante', // Default restricted role
                sitio: dto.sitio,
                Status: 'PENDING'
            } as any
        });

        return {
            message: 'Solicitud enviada con éxito. Un administrador revisará tu acceso pronto.',
            id: newUser.IDUsuarios
        };
    }
}
