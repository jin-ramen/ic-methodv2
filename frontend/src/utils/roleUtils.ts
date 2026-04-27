export const ROLE_STYLES: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-700',
    staff: 'bg-blue-100 text-blue-700',
    member: 'bg-wood-accent/10 text-wood-accent/60',
};

export function getRoleStyle(role: string): string {
    return ROLE_STYLES[role.toLowerCase()] ?? ROLE_STYLES.member;
}

export function toRoleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}
