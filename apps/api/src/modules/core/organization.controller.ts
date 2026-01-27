import { Controller, Get, Patch, Body, UseGuards, Request, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Organization')
@Controller('organization')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class OrganizationController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    @Permissions('organizations:read')
    @ApiOperation({ summary: 'Get organization details' })
    @ApiResponse({ status: 200, description: 'Organization details retrieved successfully' })
    async getOrganization(@Request() req) {
        // CRITICAL: SuperAdmin users have organization_id = null (global access)
        // They need to select an organization first or access the SuperAdmin panel
        if (!req.user.organization_id) {
            // SuperAdmin without organization context
            return {
                success: true,
                data: null,
                message: 'SuperAdmin - No organization context. Please select an organization or use the SuperAdmin panel.',
                isSuperadmin: true,
            };
        }

        const organization = await this.prisma.organizations.findUnique({
            where: { id: req.user.organization_id },
            select: {
                id: true,
                name: true,
                slug: true,
                is_active: true,
                logo_url: true, // NEW: Organization logo
                logo_zoom: true, // NEW: Logo zoom/scale
                primary_color: true, // NEW: Primary brand color
                secondary_color: true, // NEW: Secondary brand color
                accent_color: true, // NEW: Accent brand color
                created_at: true, // Fixed: snake_case
                updated_at: true, // Fixed: snake_case
            },
        });

        // Ensure consistent response format
        return {
            success: true,
            data: organization,
        };
    }

    @Patch()
    @Permissions('organizations:update')
    @ApiOperation({ summary: 'Update organization details and branding' })
    @ApiResponse({ status: 200, description: 'Organization updated successfully' })
    async updateOrganization(
        @Request() req,
        @Body() updateData: {
            name?: string;
            slug?: string;
            logo_url?: string | null;
            logo_zoom?: number | null;
            primary_color?: string | null;
            secondary_color?: string | null;
            accent_color?: string | null;
        }
    ) {
        // Validate base64 image size if logo_url is provided
        if (updateData.logo_url && updateData.logo_url.startsWith('data:image')) {
            const base64Size = (updateData.logo_url.length * 3) / 4;
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (base64Size > maxSize) {
                throw new ForbiddenException('Logo image size exceeds 5MB limit');
            }
        }

        // Validate logo_zoom range
        if (updateData.logo_zoom !== undefined && updateData.logo_zoom !== null) {
            if (updateData.logo_zoom < 0.5 || updateData.logo_zoom > 2.0) {
                throw new ForbiddenException('Logo zoom must be between 0.5 and 2.0');
            }
        }

        // Validate hex colors
        const hexColorRegex = /^#[0-9A-F]{6}$/i;
        if (updateData.primary_color && !hexColorRegex.test(updateData.primary_color)) {
            throw new ForbiddenException('Primary color must be a valid hex color (e.g., #2563eb)');
        }
        if (updateData.secondary_color && !hexColorRegex.test(updateData.secondary_color)) {
            throw new ForbiddenException('Secondary color must be a valid hex color (e.g., #3b82f6)');
        }
        if (updateData.accent_color && !hexColorRegex.test(updateData.accent_color)) {
            throw new ForbiddenException('Accent color must be a valid hex color (e.g., #60a5fa)');
        }

        const organization = await this.prisma.organizations.update({
            where: { id: req.user.organization_id },
            data: updateData,
            select: {
                id: true,
                name: true,
                slug: true,
                is_active: true,
                logo_url: true,
                logo_zoom: true,
                primary_color: true,
                secondary_color: true,
                accent_color: true,
                created_at: true,
                updated_at: true,
            },
        });

        return organization;
    }

    @Get('stats')
    @Permissions('organizations:read')
    @ApiOperation({ summary: 'Get organization statistics' })
    @ApiQuery({ name: 'organizationId', required: false, description: 'Organization ID (defaults to user\'s organization)' })
    @ApiResponse({ status: 200, description: 'Organization statistics retrieved successfully' })
    async getOrganizationStats(@Request() req, @Query('organizationId') organizationId?: string) {
        const targetOrgId = organizationId || req.user.organization_id;

        // CRITICAL: SuperAdmin without organization context
        if (!targetOrgId) {
            return {
                success: true,
                data: null,
                message: 'SuperAdmin - No organization context',
                isSuperadmin: true,
            };
        }

        // SuperAdmin can access any organization's stats
        const isSuperadmin = req.user.isSuperadmin === true || req.user.roles === 'Superadmin';

        // Verify user has access to this organization
        if (!isSuperadmin && targetOrgId !== req.user.organization_id) {
            // Regular users can only access their own organization
            throw new ForbiddenException('Access denied to this organization');
        }

        // CRITICAL: Ensure tenant context is set for Prisma extension
        // This is needed for the extension to work correctly
        const { TenantContext } = await import('../../common/context/tenant.context');
        const currentTenant = TenantContext.getTenantId();
        
        // Set tenant context if not already set (for SuperAdmin switching orgs)
        if (!currentTenant && targetOrgId) {
            TenantContext.setTenantId(targetOrgId);
        }

        try {
            // Get all statistics in parallel for better performance
            const [
                usersCount,
                projectsCount,
                tasksCount,
                clientsCount,
                suppliersCount,
            ] = await Promise.all([
                // Users count
                this.prisma.users.count({
                    where: {
                        organization_id: targetOrgId,
                        is_active: true,
                        deleted_at: null, // Fixed: snake_case
                    },
                }),
                // Projects count
                this.prisma.projects.count({
                    where: {
                        organization_id: targetOrgId,
                        deleted_at: null, // Fixed: snake_case
                    },
                }),
                // Tasks count
                this.prisma.tasks.count({
                    where: {
                        organization_id: targetOrgId,
                    },
                }),
                // Clients count
                this.prisma.clients.count({
                    where: {
                        organization_id: targetOrgId,
                        is_active: true,
                    },
                }),
                // Suppliers count
                this.prisma.suppliers.count({
                    where: {
                        organization_id: targetOrgId,
                        is_active: true,
                    },
                }),
            ]);

            return {
                success: true,
                data: {
                    users: usersCount,
                    projects: projectsCount,
                    tasks: tasksCount,
                    clients: clientsCount,
                    suppliers: suppliersCount,
                },
            };
        } catch (error) {
            console.error('[OrganizationController.getOrganizationStats] Error fetching stats:', error);
            throw error;
        }
    }
}

