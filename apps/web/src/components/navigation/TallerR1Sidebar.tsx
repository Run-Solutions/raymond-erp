'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Users, 
  Forklift,
  MapPin,
  Map,
  User,
  Box,
  Wrench,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  {
    label: 'Dashboards',
    icon: LayoutDashboard,
    href: '/es/taller-r1/dashboard',
  },
  {
    label: 'Entradas',
    icon: ArrowDownToLine,
    href: '/es/taller-r1/entradas',
  },
  {
    label: 'Salidas',
    icon: ArrowUpFromLine,
    href: '/es/taller-r1/salidas',
  },
  {
    label: 'Clientes',
    icon: Users,
    href: '/es/taller-r1/clientes',
  },
  {
    label: 'Equipos',
    icon: Forklift,
    href: '/es/taller-r1/equipos',
  },
  {
    label: 'Equipo Ubicación',
    icon: MapPin,
    href: '/es/taller-r1/equipo-ubicacion',
  },
  {
    label: 'Ubicaciones',
    icon: Map,
    href: '/es/taller-r1/ubicaciones',
  },
  {
    label: 'Usuarios',
    icon: User,
    href: '/es/taller-r1/usuarios',
  },
  {
    label: 'Modelos',
    icon: Box,
    href: '/es/taller-r1/modelos',
  },
  {
    label: 'Accesorios',
    icon: Wrench,
    href: '/es/taller-r1/accesorios',
  },
  {
    label: 'Cargue Masivo',
    icon: ArrowDownToLine,
    href: '/es/taller-r1/cargue-masivo',
  },
];

export default function TallerR1Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-gray-100 transition-all duration-300 z-50 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-red-600 font-brand tracking-tighter">RAYMOND</span>
            <span className="text-xl font-semibold text-gray-700">R1</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-red-50 text-red-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-red-600')} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer User Section */}
      <div className="mt-auto p-4 border-t border-gray-100 bg-white">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl transition-all h-12",
          !isCollapsed ? "hover:bg-gray-50" : "justify-center"
        )}>
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-lg border-2 border-white">
            AD
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 truncate leading-none">Admin Dev</p>
              <p className="text-[10px] text-red-600 font-black uppercase tracking-widest mt-1">Taller R1</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
