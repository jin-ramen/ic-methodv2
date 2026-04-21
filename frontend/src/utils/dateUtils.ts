export function toDateKey(value: string | Date): string {
    return new Date(value).toLocaleDateString('en-CA');
}

export function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function getDayLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-AU', { weekday: 'short' });
}
