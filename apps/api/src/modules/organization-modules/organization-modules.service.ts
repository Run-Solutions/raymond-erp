import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateModuleVisibilityDto } from './dto/update-module-visibility.dto';

@Injectable()
export class OrganizationModulesService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get all enabled modules for an organization
     * If no modules are configured, return all available modules (default behavior)
     */
    async getEnabledModules(organization_id: string) {
        console.log(`[OrganizationModulesService] getEnabledModules - Querying for orgId: ${organization_id}`);
        
        const modules = await this.prisma.organization_modules.findMany({ // Fixed: plural
            where: {
                organization_id,
                is_enabled: true, // Fixed: snake_case
            },
            select: {
                module_id: true, // Fixed: snake_case
                is_enabled: true, // Fixed: snake_case
            },
        });

        console.log(`[OrganizationModulesService] getEnabledModules - Found ${modules.length} configured modules: ${modules.map(m => m.module_id).join(', ')}`);
        
        // If no modules are configured, return all available modules (default: all enabled)
        // This allows organizations to see all modules until they explicitly configure them
        if (modules.length === 0) {
            console.log(`[OrganizationModulesService] No modules configured for org ${organization_id}, returning all available modules`);
            
            // List of all available module IDs from the frontend constants
            const allModuleIds = [
                'dashboard', 'projects', 'tasks', 'sprints', 'time-tracking', 'expenses',
                'clients', 'suppliers', 'command-center',
                'finance-dashboard', 'finance-accounts', 'finance-journal', 'finance-ar',
                'finance-ap', 'finance-fixed-costs', 'finance-invoices', 'finance-purchase-orders',
                'finance-reports', 'finance-flow-recoveries',
                'users', 'roles', 'organization', 'audit', 'modules-management',
                'analytics', 'notifications', 'calendar', 'settings'
            ];
            
            // Return all modules as enabled by default
            const transformed = allModuleIds.map(moduleId => ({
                moduleId,
                isEnabled: true,
            }));
            
            console.log(`[OrganizationModulesService] Returning ${transformed.length} default modules (all enabled)`);
            return transformed;
        }
        
        // Transform to camelCase for frontend compatibility
        const transformed = modules.map(m => ({
            moduleId: m.module_id, // Transform to camelCase
            isEnabled: m.is_enabled, // Transform to camelCase
        }));
        
        console.log(`[OrganizationModulesService] Returning ${transformed.length} configured modules`);
        return transformed;
    }

    /**
     * Get all modules with their enabled status for an organization
     */
    async getAllModulesStatus(organization_id: string) {
        const modules = await this.prisma.organization_modules.findMany({ // Fixed: plural
            where: {
                organization_id,
            },
            select: {
                id: true,
                module_id: true, // Fixed: snake_case
                is_enabled: true, // Fixed: snake_case
                created_at: true, // Fixed: snake_case
                updated_at: true, // Fixed: snake_case
            },
            orderBy: {
                module_id: 'asc', // Fixed: snake_case
            },
        });

        // Transform to camelCase for frontend compatibility
        return modules.map(m => ({
            id: m.id,
            moduleId: m.module_id, // Transform to camelCase
            isEnabled: m.is_enabled, // Transform to camelCase
            createdAt: m.created_at.toISOString(), // Transform to camelCase and string
            updatedAt: m.updated_at.toISOString(), // Transform to camelCase and string
        }));
    }

    /**
     * Toggle a single module visibility
     */
    async toggleModuleVisibility(
        organization_id: string,
        moduleId: string,
        isEnabled: boolean,
    ) {
        const existingModule = await this.prisma.organization_modules.findUnique({ // Fixed: plural
            where: {
                organization_id_module_id: { // Fixed: snake_case
                    organization_id,
                    module_id: moduleId, // Fixed: snake_case
                },
            },
        });

        if (existingModule) {
            return await this.prisma.organization_modules.update({ // Fixed: plural
                where: {
                    organization_id_module_id: { // Fixed: snake_case
                        organization_id,
                        module_id: moduleId, // Fixed: snake_case
                    },
                },
                data: {
                    is_enabled: isEnabled, // Fixed: snake_case
                },
            });
        } else {
            return await this.prisma.organization_modules.create({ // Fixed: plural
                data: {
                    id: require('crypto').randomUUID(),
                    organization_id,
                    module_id: moduleId, // Fixed: snake_case
                    is_enabled: isEnabled, // Fixed: snake_case
                    updated_at: new Date(), // Required field
                } as any,
            });
        }
    }

    /**
     * Batch update modules visibility
     */
    async batchUpdateModules(
        organization_id: string,
        modules: UpdateModuleVisibilityDto[],
    ) {
        const operations = modules.map((module) =>
            this.toggleModuleVisibility(
                organization_id,
                module.moduleId,
                module.isEnabled,
            ),
        );

        await Promise.all(operations);

        return {
            success: true,
            updated: modules.length,
        };
    }

    /**
     * Initialize default modules for a new organization (all enabled by default)
     */
    async initializeDefaultModules(organization_id: string, moduleIds: string[]) {
        const modulesToCreate = moduleIds.map((moduleId) => ({
            id: require('crypto').randomUUID(),
            organization_id,
            module_id: moduleId, // Fixed: snake_case
            is_enabled: true, // Fixed: snake_case
        }));

        await this.prisma.organization_modules.createMany({ // Fixed: plural
            data: modulesToCreate as any,
            skipDuplicates: true,
        });

        return {
            success: true,
            initialized: modulesToCreate.length,
        };
    }
}
