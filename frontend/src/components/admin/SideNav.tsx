import { Link, useLocation } from 'react-router-dom';

export default function SideNav() {
    const { pathname } = useLocation();

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

    const links = [
        { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
        { to: '/schedule', label: 'Schedule', icon: CalendarIcon },
    ];

    return (
        <aside className="fixed top-0 left-0 h-[100dvh] w-16 md:w-64 bg-wood-light border-r border-wood-accent/20 flex flex-col items-center md:items-start py-8 px-3 md:px-6">
            <Link to="/dashboard" className="flex md:hidden text-left mb-12 font-cormorant text-3xl text-wood-accent">
                IC
            </Link>
            <Link to="/dashboard" className="hidden md:flex text-left mb-12 font-cormorant text-4xl text-wood-accent">
                IC Method
            </Link>
            <nav className="flex flex-col gap-2 w-full">
                {links.map(({ to, label, icon }) => {
                    const active = pathname === to;
                    return (
                        <Link
                            key={to}
                            to={to}
                            className={`flex items-center justify-center md:justify-start gap-3 font-didot text-base tracking-wide px-2 md:px-3 py-2 rounded transition-colors duration-300 hover:text-wood-dark ${active ? 'text-wood-dark bg-wood-accent/10' : 'text-wood-accent'}`}
                        >
                            {icon}
                            <span className="hidden md:inline">{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}