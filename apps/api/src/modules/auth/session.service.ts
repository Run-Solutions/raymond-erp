import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionService {
    constructor(private readonly prisma: PrismaService) { }

    async createSession(user_id: string, refreshToken: string, userAgent?: string, ipAddress?: string) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return this.prisma.sessions.create({
            data: {
                id: randomUUID(),
                user_id,
                refresh_token: refreshToken, // Fixed: snake_case
                user_agent: userAgent, // Fixed: snake_case
                ip_address: ipAddress, // Fixed: snake_case
                expires_at: expiresAt, // Fixed: snake_case
            },
        });
    }

    async updateSessionToken(sessionId: string, hashedRefreshToken: string) {
        return this.prisma.sessions.update({
            where: { id: sessionId },
            data: { refresh_token: hashedRefreshToken }, // Fixed: snake_case
        });
    }

    async findSessionById(sessionId: string) {
        return this.prisma.sessions.findUnique({
            where: { id: sessionId },
        });
    }

    async revokeSession(sessionId: string) {
        return this.prisma.sessions.update({
            where: { id: sessionId },
            data: { is_valid: false }, // Fixed: snake_case
        });
    }

    async revokeAllUserSessions(user_id: string) {
        return this.prisma.sessions.updateMany({
            where: { user_id, is_valid: true }, // Fixed: snake_case
            data: { is_valid: false }, // Fixed: snake_case
        });
    }
}
