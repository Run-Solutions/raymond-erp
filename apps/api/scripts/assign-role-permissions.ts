import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs de los roles
const ROLES = {
  CEO: '044e1f72-bb26-45d8-a6b5-3ac7c5ae5b45',
  CFO: '399e564b-ee50-4340-8784-92ed5c98a369',
  CONTADOR_SENIOR: '7b9a0b91-3dfe-4c22-8365-1236090c026a',
  GERENTE_OPERACIONES: 'ef2448be-3c28-41c5-a219-7e7e550df39d',
  SUPERVISOR: '3ce0b66f-032d-49fe-bffe-df3d9541dd3b',
  PROJECT_MANAGER: 'e0950f2f-55ec-47cb-952d-736836ce4cda',
  DEVELOPER: '388c0db3-f3d0-48b8-b7b5-1fe9d6a6a500',
  OPERARIO: '348185fd-18c8-4273-95f6-0b071fb1a210',
};

// PERMISOS BÁSICOS - Todos los roles deben tener estos permisos
const BASIC_PERMISSIONS = {
  read: ['notifications', 'organizations', 'settings', 'command-center']
};

// Definición de permisos por rol
const PERMISSION_ASSIGNMENTS = {
  // CEO - Acceso completo a todo excepto recursos de sistema crítico
  CEO: {
    resources: [
      'analytics', 'audit-logs', 'clients', 'command-center', 'crm', 'dispatches',
      'documents', 'finance', 'finance.accounts', 'finance.budgets', 'finance.expenses',
      'finance.invoices', 'finance.journal-entries', 'finance.reports', 'inventory',
      'notifications', 'organizations', 'procurement', 'projects', 'prospects',
      'reports', 'roles', 'settings', 'sprints', 'suppliers', 'tasks',
      'time-tracking', 'users', 'webhooks'
    ],
    actions: ['admin', 'manage', 'approve', 'create', 'read', 'update', 'delete', 'export', 'assign', 'convert']
  },

  // CFO - Acceso completo a finanzas + visibilidad ejecutiva
  CFO: {
    fullAccess: [
      'finance', 'finance.accounts', 'finance.budgets', 'finance.expenses',
      'finance.invoices', 'finance.journal-entries', 'finance.reports'
    ],
    manage: [
      'analytics', 'reports', 'audit-logs', 'clients', 'suppliers',
      'projects', 'procurement', 'inventory', 'crm', 'prospects'
    ],
    read: [
      'tasks', 'sprints', 'users', 'organizations', 'dispatches',
      'command-center', 'time-tracking', 'documents', 'webhooks', 'roles'
    ]
  },

  // Contador Senior - Acceso contable + visibilidad financiera ejecutiva
  CONTADOR_SENIOR: {
    fullAccess: ['finance.invoices', 'finance.journal-entries', 'finance.accounts'],
    manage: [
      'finance.expenses', 'finance.budgets', 'finance.reports', 'finance',
      'clients', 'suppliers', 'procurement'
    ],
    approve: ['finance'],
    read: [
      'projects', 'analytics', 'reports', 'audit-logs', 'tasks', 'sprints',
      'users', 'organizations', 'dispatches', 'command-center', 'time-tracking',
      'inventory', 'crm', 'prospects', 'documents', 'roles'
    ]
  },

  // Gerente Operaciones - Gestión operativa + visibilidad ejecutiva completa
  GERENTE_OPERACIONES: {
    fullAccess: [
      'projects', 'tasks', 'clients', 'suppliers', 'inventory',
      'procurement', 'dispatches', 'sprints'
    ],
    manage: [
      'command-center', 'crm', 'prospects', 'time-tracking',
      'analytics', 'reports', 'documents'
    ],
    read: [
      'finance', 'finance.accounts', 'finance.budgets', 'finance.expenses',
      'finance.invoices', 'finance.journal-entries', 'finance.reports',
      'users', 'organizations', 'audit-logs', 'webhooks', 'roles'
    ]
  },

  // Supervisor - Supervisión de equipos + visibilidad operativa completa
  SUPERVISOR: {
    manage: [
      'projects', 'tasks', 'sprints', 'time-tracking', 'dispatches',
      'command-center'
    ],
    read: [
      'clients', 'suppliers', 'users', 'reports', 'analytics',
      'crm', 'prospects', 'inventory', 'procurement', 'documents',
      'finance.reports', 'finance', 'organizations', 'audit-logs', 'roles'
    ],
    create: ['tasks', 'sprints', 'time-tracking', 'documents']
  },

  // Project Manager - Gestión de proyectos asignados
  PROJECT_MANAGER: {
    manage: ['projects', 'tasks', 'sprints'],
    create: ['projects', 'tasks', 'sprints', 'time-tracking', 'documents'],
    read: [
      'clients', 'users', 'reports', 'analytics', 'suppliers',
      'crm', 'prospects', 'command-center', 'dispatches'
    ],
    update: ['projects', 'tasks', 'sprints', 'time-tracking']
  },

  // Developer - Trabajo en tareas asignadas
  DEVELOPER: {
    create: ['tasks', 'time-tracking', 'documents'],
    read: ['projects', 'sprints', 'tasks', 'clients', 'users'],
    update: ['tasks', 'time-tracking'],
    export: ['reports']
  },

  // Operario - Operaciones básicas
  OPERARIO: {
    create: ['time-tracking', 'tasks'],
    read: ['tasks', 'projects', 'clients', 'sprints', 'dispatches'],
    update: ['tasks', 'time-tracking']
  }
};

async function assignPermissions() {
  console.log('🚀 Iniciando asignación de permisos...\n');

  // Limpiar permisos existentes primero
  console.log('🧹 Limpiando permisos existentes...');
  await prisma.role_permissions.deleteMany({
    where: {
      role_id: {
        in: Object.values(ROLES)
      }
    }
  });
  console.log('✅ Permisos limpiados\n');

  // Obtener todos los permisos disponibles
  const allPermissions = await prisma.permissions.findMany();
  console.log(`📋 ${allPermissions.length} permisos disponibles\n`);

  // Asignar permisos para cada rol
  for (const [roleName, roleId] of Object.entries(ROLES)) {
    console.log(`\n📌 Asignando permisos para: ${roleName}`);
    const config = PERMISSION_ASSIGNMENTS[roleName];
    const permissionsToAssign = new Set<string>();

    // CRITICAL: Agregar permisos básicos a TODOS los roles
    BASIC_PERMISSIONS.read.forEach(resource => {
      const perms = allPermissions.filter(
        p => p.resource === resource && p.action === 'read'
      );
      perms.forEach(p => permissionsToAssign.add(p.id));
    });
    console.log(`  ✓ Permisos básicos agregados: ${BASIC_PERMISSIONS.read.join(', ')}`);


    if (config.fullAccess) {
      // Acceso completo (todas las acciones)
      config.fullAccess.forEach(resource => {
        const perms = allPermissions.filter(p => p.resource === resource);
        perms.forEach(p => permissionsToAssign.add(p.id));
        console.log(`  ✓ Full access: ${resource} (${perms.length} permisos)`);
      });
    }

    if (config.resources && config.actions) {
      // CEO: recursos específicos con todas las acciones
      config.resources.forEach(resource => {
        const perms = allPermissions.filter(
          p => p.resource === resource && config.actions.includes(p.action)
        );
        perms.forEach(p => permissionsToAssign.add(p.id));
      });
      console.log(`  ✓ Acceso a ${config.resources.length} recursos con ${config.actions.length} acciones`);
    }

    if (config.manage) {
      // Permisos de gestión
      config.manage.forEach(resource => {
        const perms = allPermissions.filter(
          p => p.resource === resource && ['manage', 'read', 'create', 'update', 'export'].includes(p.action)
        );
        perms.forEach(p => permissionsToAssign.add(p.id));
        console.log(`  ✓ Manage: ${resource} (${perms.length} permisos)`);
      });
    }

    if (config.approve) {
      // Permisos de aprobación
      config.approve.forEach(resource => {
        const perms = allPermissions.filter(
          p => p.resource === resource && ['approve', 'read', 'update'].includes(p.action)
        );
        perms.forEach(p => permissionsToAssign.add(p.id));
        console.log(`  ✓ Approve: ${resource} (${perms.length} permisos)`);
      });
    }

    if (config.read) {
      // Permisos de solo lectura
      config.read.forEach(resource => {
        const perms = allPermissions.filter(
          p => p.resource === resource && p.action === 'read'
        );
        perms.forEach(p => permissionsToAssign.add(p.id));
      });
      console.log(`  ✓ Read: ${config.read.length} recursos`);
    }

    if (config.create) {
      // Permisos de creación
      config.create.forEach(resource => {
        const perms = allPermissions.filter(
          p => p.resource === resource && ['create', 'read'].includes(p.action)
        );
        perms.forEach(p => permissionsToAssign.add(p.id));
      });
      console.log(`  ✓ Create: ${config.create.length} recursos`);
    }

    if (config.update) {
      // Permisos de actualización
      config.update.forEach(resource => {
        const perms = allPermissions.filter(
          p => p.resource === resource && ['update', 'read'].includes(p.action)
        );
        perms.forEach(p => permissionsToAssign.add(p.id));
      });
      console.log(`  ✓ Update: ${config.update.length} recursos`);
    }

    if (config.export) {
      // Permisos de exportación
      config.export.forEach(resource => {
        const perms = allPermissions.filter(
          p => p.resource === resource && ['export', 'read'].includes(p.action)
        );
        perms.forEach(p => permissionsToAssign.add(p.id));
      });
      console.log(`  ✓ Export: ${config.export.length} recursos`);
    }

    // Crear las asignaciones de permisos
    const permissionIds = Array.from(permissionsToAssign);
    if (permissionIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: permissionIds.map(permission_id => ({
          role_id: roleId,
          permission_id
        })),
        skipDuplicates: true
      });
      console.log(`  ✅ ${permissionIds.length} permisos asignados a ${roleName}`);
    }
  }

  console.log('\n✨ ¡Asignación de permisos completada!\n');

  // Resumen final
  console.log('📊 RESUMEN FINAL:');
  for (const [roleName, roleId] of Object.entries(ROLES)) {
    const count = await prisma.role_permissions.count({
      where: { role_id: roleId }
    });
    console.log(`  ${roleName}: ${count} permisos`);
  }
}

assignPermissions()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
