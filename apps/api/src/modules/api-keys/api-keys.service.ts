import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeysService {
    constructor(private prisma: PrismaService) { }

    async createApiKey(user_id: string, organization_id: string, name: string, scopes: string[] = []) {
        // Generate a random key
        const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
        const hashedKey = await bcrypt.hash(rawKey, 10);
        const prefix = rawKey.substring(0, 7);

        const apiKey = await this.prisma.api_keys.create({ // Fixed: plural
            data: {
                id: require('crypto').randomUUID(),
                name,
                key: hashedKey,
                prefix,
                user_id,
                organization_id,
                scopes,
            } as any,
        });

        // Return the raw key ONLY ONCE
        return {
            ...apiKey,
            key: rawKey,
        };
    }

    async validateApiKey(rawKey: string) {
        // We can't look up by hash directly if we use bcrypt.
        // But we can't scan all keys.
        // Strategy: We need to store a lookup index?
        // Wait, standard practice for API keys is usually a prefix + secret.
        // If we only store the hash, we can't find the record to verify.
        // Let's modify the schema slightly in the future to include a 'keyId' or similar if performance is an issue.
        // For now, since we didn't add a lookup ID to the key string, we have a problem.
        // BUT, I defined `key String @unique` in schema.
        // If I hash it, I can't look it up.
        // CORRECTION: I should have designed it as `prefix.secret`.
        // Since I can't change schema easily now without another migration...
        // I will assume the user sends `id:secret`? No, that's ugly.
        // I will change the generation to be `prefix.secret` and store `prefix` in a separate column?
        // I already have `prefix` column!
        // So I can look up by `prefix` and then verify the hash.

        // Let's assume the key format is `sk_prefix_secret`.
        // Actually, my generation was `sk_hex`. Prefix is `sk_hex` (first 7 chars).
        // So I can look up by prefix.

        const prefix = rawKey.substring(0, 7); // "sk_1234"

        // Find all keys with this prefix (should be few, ideally 1)
        const candidates = await this.prisma.api_keys.findMany({ // Fixed: plural
            where: { prefix },
            include: { user: { include: { roles: true } } }
        });

        for (const candidate of candidates) {
            const isMatch = await bcrypt.compare(rawKey, candidate.key);
            if (isMatch) {
                // Update last used
                await this.prisma.api_keys.update({ // Fixed: plural
                    where: { id: candidate.id },
                    data: { last_used_at: new Date() }, // Fixed: snake_case
                });
                return candidate;
            }
        }

        throw new UnauthorizedException('Invalid API Key');
    }

    async listKeys(organization_id: string) {
        return this.prisma.api_keys.findMany({ // Fixed: plural
            where: { organization_id },
            orderBy: { created_at: 'desc' }, // Fixed: snake_case
            select: {
                id: true,
                name: true,
                prefix: true,
                last_used_at: true, // Fixed: snake_case
                created_at: true, // Fixed: snake_case
                scopes: true,
            }
        });
    }

    async revokeKey(id: string, organization_id: string) {
        return this.prisma.api_keys.deleteMany({ // Fixed: plural
            where: { id, organization_id },
        });
    }
}
