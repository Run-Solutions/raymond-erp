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
                expiresIn: '1h',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: '7d',
            }),
        ]);

        return {
            accessToken,
            refreshToken,
            expiresIn: 3600, // 1 hour
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
}
