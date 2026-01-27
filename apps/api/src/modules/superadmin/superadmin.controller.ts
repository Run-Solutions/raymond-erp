import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperadminGuard } from '../../common/guards/superadmin.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { SeparateOrganizationDataDto } from './dto/separate-organization-data.dto';

@Controller('superadmin')
@UseGuards(JwtAuthGuard, SuperadminGuard) // CRITICAL: Protect ALL endpoints with SuperAdmin guard
export class SuperadminController {
    private readonly logger = new Logger(SuperadminController.name);

    constructor(private readonly superadminService: SuperadminService) {}

    /**
     * GET /superadmin/organizations
     * List all organizations in the system
     */
    @Get('organizations')
    async getAllOrganizations() {
        this.logger.log('[GET /superadmin/organizations] Fetching all organizations');
        const organizations = await this.superadminService.getAllOrganizations();
        return {
            success: true,
            data: organizations,
        };
    }

    /**
     * POST /superadmin/organizations/:id/separate-data
     * Separate organization data - assign shared data or create test data
     * This ensures organizations don't share clients, suppliers, etc.
     * CRITICAL: This route must be BEFORE 'organizations/:id' to avoid route conflicts
     */
    @Post('organizations/:id/separate-data')
    async separateOrganizationData(
        @Param('id') id: string,
        @Body() dto: SeparateOrganizationDataDto
    ) {
        try {
            this.logger.log(`[POST /superadmin/organizations/${id}/separate-data] Separating data for organization`);
            const result = await this.superadminService.separateOrganizationData(id, {
                createTestData: dto.createTestData ?? false,
                reassignSharedData: dto.reassignSharedData ?? true,
            });
            return {
                success: true,
                data: result,
                message: `Organization data separated successfully. ${result.stats.clientsReassigned} clients and ${result.stats.suppliersReassigned} suppliers reassigned. ${result.stats.testClientsCreated} test clients and ${result.stats.testSuppliersCreated} test suppliers created.`,
            };
        } catch (error: any) {
            this.logger.error(`[POST /superadmin/organizations/${id}/separate-data] Error:`, error);
            throw error;
        }
    }

    /**
     * GET /superadmin/organizations/:id
     * Get detailed information about a specific organization
     */
    @Get('organizations/:id')
    async getOrganizationDetails(@Param('id') id: string) {
        this.logger.log(`[GET /superadmin/organizations/${id}] Fetching organization details`);
        const organization = await this.superadminService.getOrganizationDetails(id);
        return {
            success: true,
            data: organization,
        };
    }

    /**
     * POST /superadmin/organizations
     * Create a new organization with an admin user
     */
    @Post('organizations')
    async createOrganization(@Body() dto: CreateOrganizationDto) {
        try {
            this.logger.log(`[POST /superadmin/organizations] Creating organization: ${dto.name}`);
            const result = await this.superadminService.createOrganization(dto);
            return {
                success: true,
                data: result,
                message: `Organization "${dto.name}" created successfully`,
            };
        } catch (error: any) {
            this.logger.error(`[POST /superadmin/organizations] Error creating organization:`, error);
            
            // Re-throw known exceptions as-is (they have proper HTTP status codes)
            if (error instanceof ConflictException || error instanceof NotFoundException) {
                throw error;
            }
            
            // Wrap unknown errors
            const errorMessage = error?.message || 'Unknown error occurred while creating organization';
            throw new Error(`Failed to create organization: ${errorMessage}`);
        }
    }

    /**
     * PATCH /superadmin/organizations/:id
     * Update an organization
     */
    @Patch('organizations/:id')
    async updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
        this.logger.log(`[PATCH /superadmin/organizations/${id}] Updating organization`);
        const organization = await this.superadminService.updateOrganization(id, dto);
        return {
            success: true,
            data: organization,
            message: 'Organization updated successfully',
        };
    }

    /**
     * DELETE /superadmin/organizations/:id
     * Delete an organization and all its related data
     * CRITICAL: This operation is irreversible
     */
    @Delete('organizations/:id')
    async deleteOrganization(@Param('id') id: string) {
        try {
            this.logger.log(`[DELETE /superadmin/organizations/${id}] Deleting organization`);
            const result = await this.superadminService.deleteOrganization(id);
            return {
                success: true,
                data: result,
            };
        } catch (error: any) {
            this.logger.error(`[DELETE /superadmin/organizations/${id}] Error:`, error);
            throw error;
        }
    }

    /**
     * GET /superadmin/analytics
     * Get global system analytics
     */
    @Get('analytics')
    async getGlobalAnalytics() {
        this.logger.log('[GET /superadmin/analytics] Fetching global analytics');
        const analytics = await this.superadminService.getGlobalAnalytics();
        return {
            success: true,
            data: analytics,
        };
    }
}
