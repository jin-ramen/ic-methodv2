export function toDateKey(value: string | Date): string {
    return new Date(value).toLocaleDateString('en-CA');
}

export function formatTime(iso: Date): string {
    return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatTime24(iso: Date | string): string {
    return new Date(iso).toLocaleTimeString('en-Gb', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(iso: Date): string {
    return new Date(iso).toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatDateShort(d: Date): string {
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDay(d: Date): string {
    return toDateKey(d);
}

export function getTodayDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

export function getDate(n: number): Date {
    const date = getTodayDate();
    date.setDate(date.getDate() + n);
    return date;
}

export function getDayLabel(date: Date): string {
    const today = getTodayDate();
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-AU', { weekday: 'short' });
}