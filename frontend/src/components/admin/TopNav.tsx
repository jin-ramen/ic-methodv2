import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAdminContext } from '../../layouts/AdminLayout';
import { formatDateShort } from '../../utils/dateUtils';
import Calendar from './modal/CalendarModalAdmin';

const titleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/schedule': 'Schedule',
    '/clients': 'Clients',
    '/staff': 'Staff',
    '/methods': 'Methods',
    '/profile': 'Profile',
};

const HomeIcon = (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
);

const CalendarIcon = (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
);

const PeopleIcon = (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
);

const MethodIcon = (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
);

const StaffIcon = (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);

const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { to: '/schedule', label: 'Schedule', icon: CalendarIcon },
    { to: '/clients', label: 'Clients', icon: PeopleIcon },
    { to: '/staff', label: 'Staff', icon: StaffIcon },
    { to: '/methods', label: 'Methods', icon: MethodIcon },
];

export default function TopNav() {
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const { selectedDate } = useAdminContext();
    const title = titleMap[pathname] ?? 'Admin';
    const [calOpen, setCalOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const dateLabel = formatDateShort(selectedDate);

    return (
        <>
            <header className="sticky top-0 z-10 bg-wood-light flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-b border-wood-accent/20">
                {/* Hamburger — mobile only */}
                <button
                    onClick={() => setMenuOpen(true)}
                    className="md:hidden flex flex-col gap-1.5 p-1 focus:outline-none"
                    aria-label="Open menu"
                >
                    <span className="block w-5 h-px bg-wood-accent" />
                    <span className="block w-5 h-px bg-wood-accent" />
                    <span className="block w-5 h-px bg-wood-accent" />
                </button>

                <h1 className="font-cormorant text-2xl md:text-3xl text-wood-dark">{title}</h1>

                <button
                    onClick={() => setCalOpen(true)}
                    className="flex items-center gap-2 font-didot text-xs md:text-sm tracking-wide text-wood-accent hover:text-wood-dark border border-wood-accent/30 hover:border-wood-accent/60 rounded px-3 py-1.5 transition-colors duration-300"
                >
                    {dateLabel}
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 1l4 4 4-4" />
                    </svg>
                </button>
            </header>

            {/* Mobile drawer */}
            {menuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
                    <div className="relative w-64 h-full bg-wood-light flex flex-col py-8 px-6 animate-slide-in-left">
                        <Link
                            to={{ pathname: '/dashboard', search: searchParams.toString() }}
                            className="mb-10 font-cormorant text-4xl text-wood-accent"
                            onClick={() => setMenuOpen(false)}
                        >
                            IC Method
                        </Link>
                        <nav className="flex flex-col gap-2">
                            {navLinks.map(({ to, label, icon }) => {
                                const active = pathname === to;
                                return (
                                    <Link
                                        key={to}
                                        to={{ pathname: to, search: searchParams.toString() }}
                                        onClick={() => setMenuOpen(false)}
                                        className={`flex items-center gap-3 font-didot text-base tracking-wide px-3 py-2 rounded transition-colors duration-300 hover:text-wood-dark ${active ? 'text-wood-dark bg-wood-accent/10' : 'text-wood-accent'}`}
                                    >
                                        {icon}
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            )}

            {calOpen && <Calendar onClose={() => setCalOpen(false)} />}
        </>
    );
}