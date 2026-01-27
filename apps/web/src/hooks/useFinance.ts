import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useOrganizationStore } from "@/store/organization.store";

// Types
export interface AccountReceivable {
    id: string;
    concepto: string;
    monto: number;
    montoPagado: number;
    montoRestante: number;
    fechaVencimiento: string;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    client?: { id: string; nombre: string };
    project?: { id: string; name: string };
}

export interface AccountPayable {
    id: string;
    concepto: string;
    monto: number;
    montoPagado: number;
    montoRestante: number;
    fechaVencimiento: string;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    supplierId?: string;
    supplier?: { id: string; nombre: string };
    categoryId?: string;
    category?: { nombre: string; color?: string };
    notas?: string;
    autorizado?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface Category {
    id: string;
    nombre: string;
    descripcion?: string;
    color?: string;
    organizationId: string;
}

export interface FixedCost {
    id: string;
    title: string;
    amount: number;
    dayOfMonth: number;
    categoryId?: string;
    category?: { id: string; nombre: string; color?: string };
    isActive: boolean;
    description?: string;
}

export interface Quote {
    id: string;
    number: string;
    clientId?: string;
    client?: { id: string; nombre: string };
    date: string;
    validUntil: string;
    status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
    amount: number;
    items?: Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number }>;
    notes?: string;
}

export interface Invoice {
    id: string;
    number: string;
    amount: number;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    issueDate: string;
    dueDate: string;
    clientId?: string;
    client?: { id: string; nombre: string };
    items?: Array<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    notes?: string;
}

export interface PaymentComplement {
    id: string;
    number?: string;
    invoiceId?: string;
    invoice?: { number: string; client?: { nombre: string } };
    date?: string;
    amount?: number;
    paymentMethod?: string;
    transactionId?: string;
    notes?: string;
    // Campos del backend
    fechaPago?: string;
    monto?: number;
    formaPago?: string;
    accountReceivableId?: string;
    accountPayableId?: string;
    accountReceivable?: {
        id: string;
        concepto: string;
        client?: {
            id: string;
            nombre: string;
        };
        project?: {
            id: string;
            name: string;
        };
    };
    accountPayable?: {
        id: string;
        concepto: string;
        supplier?: {
            id: string;
            nombre: string;
        };
    };
}

// Transform functions for snake_case (backend) to camelCase (frontend)
function transformAccountReceivable(ar: any): AccountReceivable {
    return {
        id: ar.id,
        concepto: ar.concepto,
        monto: ar.monto,
        montoPagado: ar.monto_pagado ?? ar.montoPagado ?? 0,
        montoRestante: ar.monto_restante ?? ar.montoRestante ?? ar.monto,
        fechaVencimiento: ar.fecha_vencimiento ?? ar.fechaVencimiento,
        status: ar.status,
        client: ar.clients || ar.client, // Backend may return 'clients' (plural)
        project: ar.projects || ar.project, // Backend may return 'projects' (plural)
    };
}

function transformAccountPayable(ap: any): AccountPayable {
    return {
        id: ap.id,
        concepto: ap.concepto,
        monto: ap.monto,
        montoPagado: ap.monto_pagado ?? ap.montoPagado ?? 0,
        montoRestante: ap.monto_restante ?? ap.montoRestante ?? ap.monto,
        fechaVencimiento: ap.fecha_vencimiento ?? ap.fechaVencimiento,
        status: ap.status,
        supplierId: ap.supplier_id ?? ap.supplierId,
        supplier: ap.suppliers || ap.supplier, // Backend may return 'suppliers' (plural)
        categoryId: ap.category_id ?? ap.categoryId,
        category: ap.category,
        notas: ap.notas,
        autorizado: ap.autorizado,
        createdAt: ap.created_at ?? ap.createdAt,
        updatedAt: ap.updated_at ?? ap.updatedAt,
    };
}

function transformPaymentComplement(pc: any): PaymentComplement {
    return {
        id: pc.id,
        monto: pc.monto,
        fechaPago: pc.fecha_pago ?? pc.fechaPago,
        formaPago: pc.forma_pago ?? pc.formaPago,
        notes: pc.notas,
        accountReceivableId: pc.account_receivable_id ?? pc.accountReceivableId,
        accountPayableId: pc.account_payable_id ?? pc.accountPayableId,
        // Transform nested relations if they exist
        accountReceivable: pc.accountReceivable,
        accountPayable: pc.accounts_payable || pc.accountPayable, // Backend returns 'accounts_payable' (plural)
    };
}

// Hooks


export function useAccountsReceivable(params?: { status?: string; search?: string }) {
    return useQuery({
        queryKey: ["accounts-receivable", params],
        queryFn: async () => {
            const response = await api.get("/finance/ar", { params });
            const body = response.data;

            // Handle nested response structure and transform data
            if (body?.data?.data && Array.isArray(body.data.data)) {
                return body.data.data.map(transformAccountReceivable);
            }
            if (body?.data && Array.isArray(body.data)) {
                return body.data.map(transformAccountReceivable);
            }
            if (Array.isArray(body)) {
                return body.map(transformAccountReceivable);
            }
            return [];
        }
    });
}

export function useAccountReceivable(id: string) {
    return useQuery({
        queryKey: ["accounts-receivable", id],
        queryFn: async () => {
            const response = await api.get(`/finance/ar/${id}`);
            const ar = response.data.data || response.data;
            if (!ar) return null;
            return transformAccountReceivable(ar);
        },
        enabled: !!id,
    });
}

export function useCreateAccountReceivable() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            // Transform camelCase to snake_case before sending to API
            const transformedData = {
                concepto: data.concepto,
                monto: data.monto,
                fecha_vencimiento: data.fechaVencimiento || data.fecha_vencimiento,
                status: data.status,
                client_id: data.clientId || data.client_id,
                project_id: data.projectId || data.project_id,
                notas: data.notas,
            };
            const response = await api.post("/finance/ar", transformedData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
        },
    });
}

export function useUpdateAccountReceivable() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            // Transform camelCase to snake_case before sending to API
            const transformedData: any = {};
            if (data.concepto !== undefined) transformedData.concepto = data.concepto;
            if (data.monto !== undefined) transformedData.monto = data.monto;
            if (data.fechaVencimiento !== undefined) transformedData.fecha_vencimiento = data.fechaVencimiento;
            if (data.fecha_vencimiento !== undefined) transformedData.fecha_vencimiento = data.fecha_vencimiento;
            if (data.status !== undefined) transformedData.status = data.status;
            if (data.clientId !== undefined) transformedData.client_id = data.clientId;
            if (data.client_id !== undefined) transformedData.client_id = data.client_id;
            if (data.projectId !== undefined) transformedData.project_id = data.projectId;
            if (data.project_id !== undefined) transformedData.project_id = data.project_id;
            if (data.notas !== undefined) transformedData.notas = data.notas;

            const response = await api.patch(`/finance/ar/${id}`, transformedData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
        },
    });
}

export function useDeleteAccountReceivable() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/finance/ar/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
        },
    });
}

export function useAccountsPayable(params?: { status?: string; search?: string }) {
    return useQuery({
        queryKey: ["accounts-payable", params],
        queryFn: async () => {
            const response = await api.get("/finance/ap", { params });
            const body = response.data;

            // Handle nested response structure and transform data
            if (body?.data?.data && Array.isArray(body.data.data)) {
                return body.data.data.map(transformAccountPayable);
            }
            if (body?.data && Array.isArray(body.data)) {
                return body.data.map(transformAccountPayable);
            }
            if (Array.isArray(body)) {
                return body.map(transformAccountPayable);
            }
            return [];
        }
    });
}

export function useAccountPayable(id: string) {
    return useQuery({
        queryKey: ["accounts-payable", id],
        queryFn: async () => {
            const response = await api.get(`/finance/ap/${id}`);
            const ap = response.data.data || response.data;
            if (!ap) return null;
            return transformAccountPayable(ap);
        },
        enabled: !!id,
    });
}

export function useCreateAccountPayable() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            // Transform camelCase to snake_case before sending to API
            const transformedData = {
                concepto: data.concepto,
                monto: data.monto,
                fecha_vencimiento: data.fechaVencimiento || data.fecha_vencimiento,
                status: data.status,
                supplier_id: data.supplierId || data.supplier_id,
                category_id: data.categoryId || data.category_id,
                notas: data.notas,
                autorizado: data.autorizado,
            };
            const response = await api.post("/finance/ap", transformedData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
        },
    });
}

export function useUpdateAccountPayable() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            // Transform camelCase to snake_case before sending to API
            const transformedData: any = {};
            if (data.concepto !== undefined) transformedData.concepto = data.concepto;
            if (data.monto !== undefined) transformedData.monto = data.monto;
            if (data.fechaVencimiento !== undefined) transformedData.fecha_vencimiento = data.fechaVencimiento;
            if (data.fecha_vencimiento !== undefined) transformedData.fecha_vencimiento = data.fecha_vencimiento;
            if (data.status !== undefined) transformedData.status = data.status;
            if (data.supplierId !== undefined) transformedData.supplier_id = data.supplierId;
            if (data.supplier_id !== undefined) transformedData.supplier_id = data.supplier_id;
            if (data.categoryId !== undefined) transformedData.category_id = data.categoryId;
            if (data.category_id !== undefined) transformedData.category_id = data.category_id;
            if (data.notas !== undefined) transformedData.notas = data.notas;
            if (data.autorizado !== undefined) transformedData.autorizado = data.autorizado;

            const response = await api.patch(`/finance/ap/${id}`, transformedData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
        },
    });
}

export function useDeleteAccountPayable() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/finance/ap/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
        },
    });
}

export function useFixedCosts(params?: { search?: string }) {
    return useQuery({
        queryKey: ["fixed-costs", params],
        queryFn: async () => {
            const response = await api.get("/finance/fixed-costs", { params });
            const body = response.data;
            if (body?.data?.data && Array.isArray(body.data.data)) return body.data.data;
            if (body?.data && Array.isArray(body.data)) return body.data;
            return [];
        }
    });
}

export function useFixedCost(id: string) {
    return useQuery({
        queryKey: ["fixed-costs", id],
        queryFn: async () => {
            const response = await api.get(`/finance/fixed-costs/${id}`);
            return response.data.data || response.data;
        },
        enabled: !!id,
    });
}

export function useCreateFixedCost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post("/finance/fixed-costs", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fixed-costs"] });
        },
    });
}

export function useUpdateFixedCost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.patch(`/finance/fixed-costs/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fixed-costs"] });
        },
    });
}

export function useDeleteFixedCost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/finance/fixed-costs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fixed-costs"] });
        },
    });
}

export function useInvoices(params?: { status?: string; search?: string }) {
    return useQuery({
        queryKey: ["invoices", params],
        queryFn: async () => {
            const response = await api.get("/finance/invoices", { params });
            const body = response.data;
            if (body?.data?.data && Array.isArray(body.data.data)) return body.data.data;
            if (body?.data && Array.isArray(body.data)) return body.data;
            return [];
        }
    });
}

export function useQuotes(params?: { status?: string; search?: string }) {
    return useQuery({
        queryKey: ["quotes", params],
        queryFn: async () => {
            const response = await api.get("/finance/quotes", { params });
            const body = response.data;
            if (body?.data?.data && Array.isArray(body.data.data)) return body.data.data;
            if (body?.data && Array.isArray(body.data)) return body.data;
            return [];
        },
    });
}

export function useQuote(id: string) {
    return useQuery({
        queryKey: ["quotes", id],
        queryFn: async () => {
            const response = await api.get(`/finance/quotes/${id}`);
            return response.data.data || response.data;
        },
        enabled: !!id,
    });
}

export function useCreateQuote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post("/finance/quotes", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
    });
}

export function useUpdateQuote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.patch(`/finance/quotes/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
    });
}

export function useDeleteQuote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/finance/quotes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
    });
}

export function usePaymentComplements(params?: { search?: string }) {
    return useQuery({
        queryKey: ["payment-complements", params],
        queryFn: async () => {
            const response = await api.get("/finance/payment-complements", { params });
            const body = response.data;

            // Handle nested response structure and transform data
            if (body?.data?.data && Array.isArray(body.data.data)) {
                return body.data.data.map(transformPaymentComplement);
            }
            if (body?.data && Array.isArray(body.data)) {
                return body.data.map(transformPaymentComplement);
            }
            if (Array.isArray(body)) {
                return body.map(transformPaymentComplement);
            }
            return [];
        },
    });
}

export function usePaymentComplementsByAR(arId: string) {
    return useQuery({
        queryKey: ["payment-complements", "ar", arId],
        queryFn: async () => {
            const response = await api.get(`/finance/payment-complements/ar/${arId}`);
            const body = response.data;

            // Transform data from snake_case to camelCase
            if (Array.isArray(body)) {
                return body.map(transformPaymentComplement);
            }
            if (body?.data && Array.isArray(body.data)) {
                return body.data.map(transformPaymentComplement);
            }
            return [];
        },
        enabled: !!arId,
    });
}

export function usePaymentComplementsByAP(apId: string) {
    return useQuery({
        queryKey: ["payment-complements", "ap", apId],
        queryFn: async () => {
            const response = await api.get(`/finance/payment-complements/ap/${apId}`);
            const body = response.data;

            // Transform data from snake_case to camelCase
            if (Array.isArray(body)) {
                return body.map(transformPaymentComplement);
            }
            if (body?.data && Array.isArray(body.data)) {
                return body.data.map(transformPaymentComplement);
            }
            return [];
        },
        enabled: !!apId,
    });
}

export function usePaymentComplementsByClient(clientId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ["payment-complements", "client", clientId],
        queryFn: async () => {
            const response = await api.get(`/finance/payment-complements/client/${clientId}`);
            const body = response.data;

            // Transform data from snake_case to camelCase
            if (Array.isArray(body)) {
                return body.map(transformPaymentComplement);
            }
            if (body?.data && Array.isArray(body.data)) {
                return body.data.map(transformPaymentComplement);
            }
            return [];
        },
        enabled: options?.enabled !== undefined ? options.enabled : !!clientId,
    });
}

export function usePaymentComplementsBySupplier(supplierId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ["payment-complements", "supplier", supplierId],
        queryFn: async () => {
            const response = await api.get(`/finance/payment-complements/supplier/${supplierId}`);
            const body = response.data;

            // Transform data from snake_case to camelCase
            if (Array.isArray(body)) {
                return body.map(transformPaymentComplement);
            }
            if (body?.data && Array.isArray(body.data)) {
                return body.data.map(transformPaymentComplement);
            }
            return [];
        },
        enabled: options?.enabled !== undefined ? options.enabled : !!supplierId,
    });
}

export function useCreatePaymentComplement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post("/finance/payment-complements", data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            // Invalidate all payment complement queries (includes ar, ap, client, supplier)
            queryClient.invalidateQueries({ queryKey: ["payment-complements"] });
            
            // Invalidate AR-related queries
            if (variables.accountReceivableId) {
                queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
                queryClient.invalidateQueries({ queryKey: ["accounts-receivable", variables.accountReceivableId] });
                queryClient.invalidateQueries({ queryKey: ["payment-complements", "ar", variables.accountReceivableId] });
            }
            
            // Invalidate AP-related queries
            if (variables.accountPayableId) {
                queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
                queryClient.invalidateQueries({ queryKey: ["accounts-payable", variables.accountPayableId] });
                queryClient.invalidateQueries({ queryKey: ["payment-complements", "ap", variables.accountPayableId] });
            }
            
            // Force immediate refetch
            queryClient.refetchQueries({ queryKey: ["payment-complements"], type: 'active' });
        },
    });
}

export function useCategories() {
    return useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const response = await api.get("/finance/categories");
            const body = response.data;
            if (body?.data && Array.isArray(body.data)) return body.data;
            return [];
        },
    });
}

// Transform purchase order data from snake_case to camelCase
function transformPurchaseOrder(po: any) {
    return {
        id: po.id,
        folio: po.folio,
        description: po.description,
        amount: po.amount,
        includesVat: po.includes_vat ?? po.includesVat,
        subtotal: po.subtotal,
        vat: po.vat,
        total: po.total,
        comments: po.comments,
        supplierId: po.supplier_id ?? po.supplierId,
        projectId: po.project_id ?? po.projectId,
        status: po.status,
        createdById: po.created_by_id ?? po.createdById,
        authorizedById: po.authorized_by_id ?? po.authorizedById,
        authorizedAt: po.authorized_at ?? po.authorizedAt,
        minPaymentDate: po.min_payment_date ?? po.minPaymentDate,
        maxPaymentDate: po.max_payment_date ?? po.maxPaymentDate,
        pdfUrl: po.pdf_url ?? po.pdfUrl,
        organizationId: po.organization_id ?? po.organizationId,
        createdAt: po.created_at ?? po.createdAt,
        updatedAt: po.updated_at ?? po.updatedAt,
        supplier: po.suppliers || po.supplier,
        project: po.projects || po.project,
        createdBy: po.createdBy,
        authorizedBy: po.authorizedBy || po.users,
        organization: po.organizations || po.organization,
    };
}

export function usePurchaseOrders(params?: { status?: string; supplierId?: string; projectId?: string; search?: string }) {
    const { currentOrganization } = useOrganizationStore();
    // CRITICAL: Include organizationId in cache key to prevent cross-org cache pollution
    return useQuery({
        queryKey: ["purchase-orders", currentOrganization?.id, params],
        queryFn: async () => {
            // Filter out empty params
            const cleanParams = params ? Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
            ) : undefined;

            console.log('[usePurchaseOrders] Fetching with params:', cleanParams);
            const response = await api.get("/finance/purchase-orders", { params: cleanParams });
            const body = response.data;
            console.log('[usePurchaseOrders] Response structure:', {
                hasData: 'data' in body,
                hasMeta: 'meta' in body,
                dataType: typeof body.data,
                isArray: Array.isArray(body.data),
                dataLength: Array.isArray(body.data) ? body.data.length : 'N/A',
                fullResponse: body
            });
            if (body?.data?.data && Array.isArray(body.data.data)) {
                console.log('[usePurchaseOrders] Returning body.data.data (nested), length:', body.data.data.length);
                return body.data.data.map(transformPurchaseOrder);
            }
            if (body?.data && Array.isArray(body.data)) {
                console.log('[usePurchaseOrders] Returning body.data, length:', body.data.length);
                return body.data.map(transformPurchaseOrder);
            }
            console.log('[usePurchaseOrders] No data found, returning empty array');
            return [];
        },
    });
}

export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: ["purchase-orders", id],
        queryFn: async () => {
            const response = await api.get(`/finance/purchase-orders/${id}`);
            const data = response.data.data || response.data;
            return transformPurchaseOrder(data);
        },
        enabled: !!id,
    });
}

export function useCreatePurchaseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            // Transform camelCase to snake_case for API
            const transformedData = {
                folio: data.folio,
                description: data.description,
                amount: data.amount,
                includesVAT: data.includesVat || data.includesVAT,
                comments: data.comments,
                supplier_id: data.supplierId || data.supplier_id,
                project_id: data.projectId || data.project_id,
                minPaymentDate: data.minPaymentDate,
                maxPaymentDate: data.maxPaymentDate,
                status: data.status,
            };
            const response = await api.post("/finance/purchase-orders", transformedData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        },
    });
}

export function useUpdatePurchaseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            // Transform camelCase to snake_case for API
            const transformedData = {
                folio: data.folio,
                description: data.description,
                amount: data.amount,
                includesVAT: data.includesVat || data.includesVAT,
                comments: data.comments,
                supplier_id: data.supplierId || data.supplier_id,
                project_id: data.projectId || data.project_id,
                minPaymentDate: data.minPaymentDate,
                maxPaymentDate: data.maxPaymentDate,
                status: data.status,
            };
            const response = await api.patch(`/finance/purchase-orders/${id}`, transformedData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        },
    });
}

export function useDeletePurchaseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/finance/purchase-orders/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        },
    });
}

export function useSubmitPurchaseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/finance/purchase-orders/${id}/submit`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        },
    });
}

export function useApprovePurchaseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/finance/purchase-orders/${id}/approve`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        },
    });
}

export function useRejectPurchaseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/finance/purchase-orders/${id}/reject`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        },
    });
}

export function useMarkPurchaseOrderAsPaid() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post(`/finance/purchase-orders/${id}/mark-paid`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        },
    });
}

export interface FlowRecovery {
    id: string;
    periodo: string;
    montoInicial: number;
    recuperacionesReales: number;
    porcentajeRecuperado: number;
    notas?: string;
    clientId: string;
    client?: { nombre: string };
    createdAt: string;
    updatedAt: string;
}

export function useFlowRecoveries() {
    return useQuery({
        queryKey: ["flow-recoveries"],
        queryFn: async () => {
            const response = await api.get("/finance/flow-recoveries");
            const body = response.data;
            if (body && Array.isArray(body)) return body;
            if (body?.data && Array.isArray(body.data)) return body.data;
            return [];
        },
    });
}

export interface JournalEntry {
    id: string;
    date: string;
    description: string;
    reference?: string;
    status: 'DRAFT' | 'POSTED' | 'VOID';
    items: Array<{
        id: string;
        accountId: string;
        account?: { name: string; code: string };
        debit: number;
        credit: number;
        description?: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export function useJournalEntries() {
    return useQuery({
        queryKey: ["journal-entries"],
        queryFn: async () => {
            const response = await api.get("/finance/journal-entries");
            const body = response.data;
            if (body && Array.isArray(body)) return body;
            if (body?.data && Array.isArray(body.data)) return body.data;
            return [];
        },
    });
}
