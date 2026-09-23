import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async generateTokens(payload: { sub: string, email: string, roles: string, sid: string, orgId: string | null }) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '8h',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: '30d',
            }),
        ]);

        return {
            accessToken,
            refreshToken,
            expiresIn: 28800, // 8 hours
        };
    }

    async verifyRefreshToken(token: string): Promise<any> {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async generateResetToken(userId: string): Promise<string> {
        return this.jwtService.signAsync(
            { sub: userId },
            {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: '1h',
            },
        );
    }

    async verifyResetToken(token: string): Promise<any> {
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired reset token');
        }
    }

    async generatePasswordSetupToken(payload: { email: string, roles: string, r4UserId: string }): Promise<string> {
        return this.jwtService.signAsync(
            { ...payload, mode: 'PASSWORD_SETUP' },
            {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn: this.configService.get<string>('PASSWORD_SETUP_EXPIRES_IN') || '30m',
            },
        );
    }

    async verifyPasswordSetupToken(token: string): Promise<any> {
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });
            if (!payload || payload.mode !== 'PASSWORD_SETUP') {
                throw new UnauthorizedException('Invalid password setup token');
            }
            return payload;
        } catch {
            throw new UnauthorizedException('Invalid or expired password setup token');
        }
    }
}
