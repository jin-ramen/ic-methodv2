import { createContext, useContext } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';

import { getTodayDate } from '../utils/dateUtils'
import { useAdminAuth } from '../hooks/useAdminAuth'

import SideNav from '../components/admin/layout/SideNav';
import TopNav from '../components/admin/layout/TopNav';
import AdminLoginForm from '../components/admin/AdminLoginForm';

type AdminContextValue = {
    selectedDate: Date;
    offset: number;
    setOffset: (offset: number) => void;
    role: string;
    userId: string;
    name: string;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminContext(): AdminContextValue {
    const ctx = useContext(AdminContext);
    if (!ctx) throw new Error('useAdminContext must be used within AdminLayout');
    return ctx;
}

export default function AdminLayout() {
    const [searchParams, setSearchParams] = useSearchParams();
    const auth = useAdminAuth();

    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const setOffset = (newOffset: number) => {
        setSearchParams((prev) => {
            prev.set('offset', newOffset.toString());
            return prev;
        }, { replace: true });
    };

    const today = getTodayDate();
    const selectedDate = new Date(today);
    selectedDate.setDate(today.getDate() + offset);

    if (auth.status === 'loading') {
        return <div className="min-h-screen bg-wood-light" />;
    }

    if (auth.status === 'unauthorized' || auth.status === 'forbidden') {
        return (
            <AdminLoginForm
                forbidden={auth.status === 'forbidden'}
                onSuccess={auth.refetch}
            />
        );
    }

    return (
        <AdminContext.Provider value={{ selectedDate, offset, setOffset, role: auth.role ?? '', userId: auth.userId ?? '', name: auth.name ?? '' }}>
            <div className="flex md:h-[100dvh] md:overflow-hidden">
                <SideNav />
                <div className="flex flex-col flex-1 md:ml-64 min-w-0 md:overflow-hidden">
                    <TopNav />
                    <main className="flex-1 flex flex-col md:overflow-hidden">
                        <Outlet />
                    </main>
                </div>
            </div>
        </AdminContext.Provider>
    );
}
