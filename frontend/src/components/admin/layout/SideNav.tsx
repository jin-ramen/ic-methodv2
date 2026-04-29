import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAdminContext } from '../../../layouts/AdminLayout';
import { HomeIcon, CalendarIcon, PeopleIcon, StaffIcon, MethodIcon, BookingIcon, TransactionIcon, FinanceIcon } from '../AdminIcons';

export default function SideNav() {
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const { name, role } = useAdminContext();
    const initials = name.trim().split(' ').filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('');

    const links = [
        { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
        { to: '/schedule', label: 'Schedule', icon: CalendarIcon },
        { to: '/bookings', label: 'Bookings', icon: BookingIcon },
        { to: '/transactions', label: 'Transactions', icon: TransactionIcon },
        { to: '/finance', label: 'Finance', icon: FinanceIcon },
        { to: '/clients', label: 'Clients', icon: PeopleIcon },
        { to: '/staff', label: 'Staff', icon: StaffIcon },
        { to: '/methods', label: 'Methods', icon: MethodIcon },
    ];

    return (
        <aside className="hidden md:flex fixed top-0 left-0 h-[100dvh] w-64 bg-wood-light border-r border-wood-accent/20 flex-col items-start py-8 px-6">
            <Link to={{ pathname: '/dashboard', search: searchParams.toString() }} className="text-left mb-12 font-cormorant text-4xl text-wood-accent">
                IC Method
            </Link>
            <nav className="flex flex-col gap-2 w-full">
                {links.map(({ to, label, icon }) => {
                    const active = pathname === to;
                    return (
                        <Link
                            key={to}
                            to={{ pathname: to, search: searchParams.toString() }}
                            className={`flex items-center gap-3 font-didot text-base tracking-wide px-3 py-2 rounded transition-colors duration-300 hover:text-wood-dark ${active ? 'text-wood-dark bg-wood-accent/10' : 'text-wood-accent'}`}
                        >
                            {icon}
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <Link
                to={{ pathname: '/profile', search: searchParams.toString() }}
                className="mt-auto w-full border-t border-wood-accent/10 pt-4 flex items-center gap-3 group"
            >
                <div className="w-9 h-9 rounded-full bg-wood-accent/20 group-hover:bg-wood-accent/30 flex items-center justify-center shrink-0 transition-colors duration-200">
                    <span className="font-cormorant text-sm text-wood-dark uppercase">{initials}</span>
                </div>
                <div className="min-w-0">
                    <p className="font-cormorant text-base text-wood-dark leading-tight truncate group-hover:text-wood-accent transition-colors duration-200">{name}</p>
                    <p className="font-didot text-[10px] tracking-widest uppercase text-wood-accent/50">{role}</p>
                </div>
            </Link>
        </aside>
    );
}