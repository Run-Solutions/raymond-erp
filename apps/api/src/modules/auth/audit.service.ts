import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Log an audit event
     * @param user_id - User ID (null for system events)
     * @param action - Action performed (e.g., CREATE, UPDATE, DELETE, LOGIN_SUCCESS)
     * @param resource - Resource affected (e.g., AUTH, USERS, PROJECTS)
     * @param details - Additional details (object will be stored as JSON)
     * @param ipAddress - IP address of the request
     * @param userAgent - User agent string
     * @param status - Status of the action (SUCCESS, FAILED) - defaults to SUCCESS
     * @returns Created audit log
     */
    async log(
        user_id: string | null,
        action: string,
        resource: string,
        details?: any,
        ipAddress?: string,
        userAgent?: string,
        status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
    ) {
        try {
            // Validate required fields
            if (!action || !resource) {
                this.logger.warn('Audit log missing required fields', { action, resource });
                return null;
            }

            // Truncate long strings to prevent database issues
            const truncatedAction = action.length > 100 ? action.substring(0, 100) : action;
            const truncatedResource = resource.length > 100 ? resource.substring(0, 100) : resource;
            const truncatedIpAddress = ipAddress && ipAddress.length > 45 ? ipAddress.substring(0, 45) : ipAddress;
            const truncatedUserAgent = userAgent && userAgent.length > 500 ? userAgent.substring(0, 500) : userAgent;

            // Validate user_id exists if provided
            if (user_id) {
                const userExists = await this.prisma.users.findUnique({
                    where: { id: user_id },
                    select: { id: true },
                });
                if (!userExists) {
                    this.logger.warn(`Audit log: User ID ${user_id} does not exist, logging as system event`);
                    user_id = null;
                }
            }

            const auditLog = await this.prisma.audit_logs.create({
                data: {
                    id: randomUUID(),
                    user_id,
                    action: truncatedAction,
                    resource: truncatedResource,
                    details: details ? (typeof details === 'object' ? details : { value: details }) : null,
                    ip_address: truncatedIpAddress,
                    user_agent: truncatedUserAgent,
                    status: status.toUpperCase(),
                },
            });

            return auditLog;
        } catch (error) {
            // Don't throw errors from audit logging - it should never break the main flow
            this.logger.error('Failed to create audit log', error);
            return null;
        }
    }

    /**
     * Log a failed action
     */
    async logFailure(
        user_id: string | null,
        action: string,
        resource: string,
        error: string | Error,
        details?: any,
        ipAddress?: string,
        userAgent?: string,
    ) {
        const errorMessage = error instanceof Error ? error.message : error;
        return this.log(
            user_id,
            action,
            resource,
            {
                ...details,
                error: errorMessage,
            },
            ipAddress,
            userAgent,
            'FAILED',
        );
    }

    /**
     * Log a successful action
     */
    async logSuccess(
        user_id: string | null,
        action: string,
        resource: string,
        details?: any,
        ipAddress?: string,
        userAgent?: string,
    ) {
        return this.log(user_id, action, resource, details, ipAddress, userAgent, 'SUCCESS');
    }
}
