import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function checkUserPermission(userRole: string | null, requiredRole: string | string[]): boolean {
  if (!userRole) return false;
  
  const roles = typeof requiredRole === 'string' ? [requiredRole] : requiredRole;
  
  // Admin can access everything
  if (userRole === 'admin') return true;
  
  return roles.includes(userRole);
}

export function getRoleLabel(role: string | null): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'teacher':
      return 'Guru';
    case 'student':
      return 'Siswa';
    default:
      return 'Pengguna';
  }
}
