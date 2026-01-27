/**
 * Maps notification links to actual application routes
 */
export function getNotificationRoute(link: string | null | undefined, metadata?: Record<string, any> | null): string | null {
    if (!link) {
        // Try to extract from metadata if no link
        if (metadata) {
            if (metadata.task_id) return `/tasks?task=${metadata.task_id}`;
            if (metadata.project_id) return `/projects/${metadata.project_id}`;
            if (metadata.dispatch_id) return `/command-center?dispatch=${metadata.dispatch_id}`;
            if (metadata.expense_id) return `/expenses/${metadata.expense_id}`;
            if (metadata.time_entry_id) return `/time-tracking?entry=${metadata.time_entry_id}`;
            if (metadata.account_payable_id) return `/finance/ap/${metadata.account_payable_id}`;
            if (metadata.account_receivable_id) return `/finance/ar/${metadata.account_receivable_id}`;
            if (metadata.purchase_order_id) return `/finance/purchase-orders?po=${metadata.purchase_order_id}`;
            if (metadata.invoice_id) return `/finance/invoices/${metadata.invoice_id}`;
            if (metadata.fixed_cost_id) return `/finance/fixed-costs/${metadata.fixed_cost_id}`;
            if (metadata.recovery_id) return `/finance/flow-recoveries?recovery=${metadata.recovery_id}`;
        }
        return null;
    }

    // Remove leading slash if present
    const cleanLink = link.startsWith('/') ? link.slice(1) : link;

    // Extract ID from link patterns like /tasks/123 or /projects/456/tasks/789
    const idMatch = cleanLink.match(/\/([^/]+)\/([a-f0-9-]{36})/i) || cleanLink.match(/\/([^/]+)\/([^/]+)$/);
    if (idMatch) {
        const [, resource, id] = idMatch;
        
        // Map resource names to routes
        const resourceMap: Record<string, (id: string) => string> = {
            'tasks': (id) => `/tasks?task=${id}`,
            'projects': (id) => `/projects/${id}`,
            'dispatches': (id) => `/command-center?dispatch=${id}`,
            'expenses': (id) => `/expenses/${id}`,
            'time-entries': (id) => `/time-tracking?entry=${id}`,
            'accounts-payable': (id) => `/finance/ap/${id}`,
            'accounts-receivable': (id) => `/finance/ar/${id}`,
            'purchase-orders': (id) => `/finance/purchase-orders?po=${id}`,
            'invoices': (id) => `/finance/invoices/${id}`,
            'fixed-costs': (id) => `/finance/fixed-costs/${id}`,
            'flow-recoveries': (id) => `/finance/flow-recoveries?recovery=${id}`,
        };
        
        if (resourceMap[resource]) {
            return resourceMap[resource](id);
        }
    }

    // Map common notification link patterns to actual routes
    const routeMap: Record<string, (id?: string) => string> = {
        // Tasks
        'tasks': (id) => id ? `/tasks?task=${id}` : '/tasks',
        'projects': (id) => id ? `/projects/${id}` : '/projects',
        'dispatches': (id) => id ? `/command-center?dispatch=${id}` : '/command-center',
        'expenses': (id) => id ? `/expenses/${id}` : '/expenses',
        'time-entries': (id) => id ? `/time-tracking?entry=${id}` : '/time-tracking',
        
        // Finance routes
        'finance/accounts-payable': (id) => id ? `/finance/ap/${id}` : '/finance/ap',
        'finance/accounts-receivable': (id) => id ? `/finance/ar/${id}` : '/finance/ar',
        'finance/purchase-orders': (id) => id ? `/finance/purchase-orders?po=${id}` : '/finance/purchase-orders',
        'finance/invoices': (id) => id ? `/finance/invoices/${id}` : '/finance/invoices',
        'finance/fixed-costs': (id) => id ? `/finance/fixed-costs/${id}` : '/finance/fixed-costs',
        'finance/flow-recoveries': (id) => id ? `/finance/flow-recoveries?recovery=${id}` : '/finance/flow-recoveries',
    };

    // Try to match exact route
    if (routeMap[cleanLink]) {
        const id = metadata?.task_id || metadata?.project_id || metadata?.dispatch_id || 
                  metadata?.expense_id || metadata?.time_entry_id || 
                  metadata?.account_payable_id || metadata?.account_receivable_id ||
                  metadata?.purchase_order_id || metadata?.invoice_id ||
                  metadata?.fixed_cost_id || metadata?.recovery_id;
        return routeMap[cleanLink](id);
    }

    // Try to extract from metadata as fallback
    if (metadata) {
        if (metadata.task_id) return `/tasks?task=${metadata.task_id}`;
        if (metadata.project_id) return `/projects/${metadata.project_id}`;
        if (metadata.dispatch_id) return `/command-center?dispatch=${metadata.dispatch_id}`;
        if (metadata.expense_id) return `/expenses/${metadata.expense_id}`;
        if (metadata.time_entry_id) return `/time-tracking?entry=${metadata.time_entry_id}`;
        if (metadata.account_payable_id) return `/finance/ap/${metadata.account_payable_id}`;
        if (metadata.account_receivable_id) return `/finance/ar/${metadata.account_receivable_id}`;
        if (metadata.purchase_order_id) return `/finance/purchase-orders?po=${metadata.purchase_order_id}`;
        if (metadata.invoice_id) return `/finance/invoices/${metadata.invoice_id}`;
        if (metadata.fixed_cost_id) return `/finance/fixed-costs/${metadata.fixed_cost_id}`;
        if (metadata.recovery_id) return `/finance/flow-recoveries?recovery=${metadata.recovery_id}`;
    }

    // If link starts with /, check if it's a valid route pattern
    if (link.startsWith('/')) {
        // Allow routes that start with /dashboard, /tasks, /projects, /finance, /command-center, etc.
        const validPrefixes = ['/dashboard', '/tasks', '/projects', '/finance', '/command-center', '/expenses', '/time-tracking', '/notifications']
        if (validPrefixes.some(prefix => link.startsWith(prefix))) {
            return link
        }
    }

    // Default: return null to prevent 404
    return null
}

