import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { OrganizationModulesService } from './organization-modules.service';
import { UpdateModuleVisibilityDto } from './dto/update-module-visibility.dto';
import { BatchUpdateModulesDto } from './dto/batch-update-modules.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('organization-modules')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class OrganizationModulesController {
    constructor(private readonly service: OrganizationModulesService) { }

    @Get()
    // @Permissions('*') - Removed to allow all authenticated users (PermissionsGuard treats '*' as a required permission)
    async getEnabledModules(@Request() req) {
        console.log(`[OrganizationModulesController] getEnabledModules - orgId: ${req.user.organization_id}`);
        const modules = await this.service.getEnabledModules(req.user.organization_id);
        console.log(`[OrganizationModulesController] getEnabledModules - Found ${modules.length} enabled modules`);
        return modules;
    }

    @Get('all')
    @Permissions('*') // For admin panel - Super Admin only
    async getAllModulesStatus(@Request() req) {
        // Additional check for Super Admin role
        const userRole = typeof req.user.roles === 'object'
            ? req.user.roles.name
            : req.user.roles;

        if (!userRole.includes('Super')) {
            throw new Error('Unauthorized: Super Admin access required');
        }

        return this.service.getAllModulesStatus(req.user.organization_id);
    }

    @Put(':moduleId')
    @Permissions('*') // For admin panel - Super Admin only
    async toggleModuleVisibility(
        @Request() req,
        @Param('moduleId') moduleId: string,
        @Body() dto: UpdateModuleVisibilityDto,
    ) {
        // Additional check for Super Admin role
        const userRole = typeof req.user.roles === 'object'
            ? req.user.roles.name
            : req.user.roles;

        if (!userRole.includes('Super')) {
            throw new Error('Unauthorized: Super Admin access required');
        }

        return this.service.toggleModuleVisibility(
            req.user.organization_id,
            moduleId, // Use path parameter instead of dto.moduleId
            dto.isEnabled,
        );
    }

    @Post('batch-update')
    @Permissions('*') // For admin panel - Super Admin only
    async batchUpdateModules(@Request() req, @Body() dto: BatchUpdateModulesDto) {
        // Additional check for Super Admin role
        const userRole = typeof req.user.roles === 'object'
            ? req.user.roles.name
            : req.user.roles;

        if (!userRole.includes('Super')) {
            throw new Error('Unauthorized: Super Admin access required');
        }

        return this.service.batchUpdateModules(
            req.user.organization_id,
            dto.modules,
        );
    }

    @Post('initialize')
    @Permissions('*') // For admin panel - Super Admin only
    async initializeDefaultModules(@Request() req, @Body() body: { moduleIds: string[] }) {
        // Additional check for Super Admin role
        const userRole = typeof req.user.roles === 'object'
            ? req.user.roles.name
            : req.user.roles;

        if (!userRole.includes('Super')) {
            throw new Error('Unauthorized: Super Admin access required');
        }

        return this.service.initializeDefaultModules(
            req.user.organization_id,
            body.moduleIds,
        );
    }
}
