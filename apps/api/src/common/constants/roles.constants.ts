/**
 * Sistema de Roles y Jerarquía - RAYMOND ERP
 * 
 * Este archivo define la estructura jerárquica de roles del sistema.
 * Los roles están organizados por niveles de acceso y responsabilidad.
 */

/**
 * Nivel 1: Super Administrador
 * Acceso total al sistema sin restricciones
 */
export const SUPERADMIN_ROLES = [
    'SUPERADMIN',
    'SUPER_ADMIN',
    'SUPERADMINISTRATOR',
    'SUPER ADMIN',
    'SUPER ADMINISTRATOR',
    'ADMINISTRATOR',
    'ADMIN',
];

/**
 * Nivel 2: Ejecutivos C-Level
 * Acceso ejecutivo a todas las áreas del sistema
 * Pueden acceder al Command Center y tomar decisiones estratégicas
 * Nota: Project Managers también tienen acceso al Command Center
 */
export const EXECUTIVE_C_LEVEL_ROLES = [
    'CEO',
    'CFO',
    'CTO',
    'COO',
    'CCO', // Chief Commercial Officer
];

/**
 * Nivel 3: Roles Financieros
 * Acceso especializado al módulo financiero
 */
export const FINANCIAL_ROLES = [
    'CONTADOR',
    'CONTADOR SENIOR',
    'ACCOUNTANT',
    'FINANCIAL MANAGER',
    'GERENTE FINANCIERO',
];

/**
 * Nivel 4: Gestión de Proyectos
 * Acceso a gestión de proyectos, tareas y sprints
 */
export const PROJECT_MANAGEMENT_ROLES = [
    'PROJECT MANAGER',
    'PROJECT MANAGER',
    'PM',
    'SCRUM MASTER',
    'PRODUCT OWNER',
];

/**
 * Nivel 5: Desarrollo
 * Acceso a proyectos y tareas asignadas
 */
export const DEVELOPMENT_ROLES = [
    'DEVELOPER',
    'DEV',
    'PROGRAMMER',
    'SOFTWARE ENGINEER',
    'ENGINEER',
];

/**
 * Nivel 6: Operaciones
 * Acceso básico a operaciones y tareas asignadas
 */
export const OPERATIONS_ROLES = [
    'OPERARIO',
    'OPERATOR',
    'EMPLOYEE',
    'WORKER',
];

/**
 * Roles Ejecutivos (para Command Center y funciones ejecutivas)
 * Incluye Superadmin y C-Level
 */
export const EXECUTIVE_ROLES = [
    ...SUPERADMIN_ROLES,
    ...EXECUTIVE_C_LEVEL_ROLES,
];

/**
 * Roles con Acceso al Command Center
 * Incluye ejecutivos y project managers
 */
export const COMMAND_CENTER_ACCESS_ROLES = [
    ...EXECUTIVE_ROLES,
    ...PROJECT_MANAGEMENT_ROLES,
];

/**
 * Roles con Acceso Financiero
 * Incluye ejecutivos y roles financieros especializados
 */
export const FINANCIAL_ACCESS_ROLES = [
    ...EXECUTIVE_ROLES,
    ...FINANCIAL_ROLES,
];

/**
 * Roles con Gestión de Proyectos
 * Incluye ejecutivos y project managers
 */
export const PROJECT_MANAGEMENT_ACCESS_ROLES = [
    ...EXECUTIVE_ROLES,
    ...PROJECT_MANAGEMENT_ROLES,
];

/**
 * Todos los roles del sistema
 */
export const ALL_ROLES = [
    ...SUPERADMIN_ROLES,
    ...EXECUTIVE_C_LEVEL_ROLES,
    ...FINANCIAL_ROLES,
    ...PROJECT_MANAGEMENT_ROLES,
    ...DEVELOPMENT_ROLES,
    ...OPERATIONS_ROLES,
];

/**
 * Niveles de jerarquía de roles (mayor número = mayor privilegio)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
    // Nivel 1: Super Administrador
    SUPERADMIN: 100,
    SUPER_ADMIN: 100,
    SUPERADMINISTRATOR: 100,
    ADMINISTRATOR: 100,
    ADMIN: 100,

    // Nivel 2: C-Level
    CEO: 90,
    CFO: 90,
    CTO: 90,
    COO: 90,
    CCO: 90,

    // Nivel 3: Financieros
    CONTADOR: 70,
    CONTADOR_SENIOR: 75,
    ACCOUNTANT: 70,
    FINANCIAL_MANAGER: 80,
    GERENTE_FINANCIERO: 80,

    // Nivel 4: Gestión
    PROJECT_MANAGER: 60,
    PM: 60,
    SCRUM_MASTER: 55,
    PRODUCT_OWNER: 55,
    MANAGER: 50,
    GERENTE: 50,
    GERENTE_OPERACIONES: 50,

    // Nivel 5: Desarrollo
    DEVELOPER: 40,
    DEV: 40,
    PROGRAMMER: 40,
    SOFTWARE_ENGINEER: 40,
    ENGINEER: 40,

    // Nivel 6: Operaciones
    OPERARIO: 20,
    OPERATOR: 20,
    EMPLOYEE: 20,
    WORKER: 20,
    SUPERVISOR: 25,
};

/**
 * Obtiene el nivel de jerarquía de un rol
 */
export function getRoleLevel(roleName: string): number {
    const normalized = roleName.toUpperCase().replace(/\s+/g, '_');
    return ROLE_HIERARCHY[normalized] || 0;
}

/**
 * Verifica si un rol tiene un nivel mínimo
 */
export function hasMinimumRoleLevel(roleName: string, minimumLevel: number): boolean {
    return getRoleLevel(roleName) >= minimumLevel;
}

/**
 * Verifica si un rol es ejecutivo
 */
export function isExecutiveRole(roleName: string): boolean {
    const normalized = roleName.toUpperCase().trim();
    return EXECUTIVE_ROLES.some(role => role.toUpperCase() === normalized);
}

/**
 * Verifica si un rol tiene acceso financiero
 */
export function hasFinancialAccess(roleName: string): boolean {
    const normalized = roleName.toUpperCase().trim();
    return FINANCIAL_ACCESS_ROLES.some(role => role.toUpperCase() === normalized);
}

/**
 * Verifica si un rol tiene acceso a gestión de proyectos
 */
export function hasProjectManagementAccess(roleName: string): boolean {
    const normalized = roleName.toUpperCase().trim();
    return PROJECT_MANAGEMENT_ACCESS_ROLES.some(role => role.toUpperCase() === normalized);
}

/**
 * Verifica si un rol tiene acceso al Command Center
 */
export function hasCommandCenterAccess(roleName: string): boolean {
    const normalized = roleName.toUpperCase().trim();
    return COMMAND_CENTER_ACCESS_ROLES.some(role => role.toUpperCase() === normalized);
}
