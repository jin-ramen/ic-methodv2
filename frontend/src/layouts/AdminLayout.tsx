import { createContext, useContext } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';

import { getTodayDate } from '../utils/dateUtils'

import SideNav from '../components/admin/SideNav';
import TopNav from '../components/admin/TopNav';

type AdminContextValue = {
    selectedDate: Date;
    offset: number;
    setOffset: (offset: number) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminContext(): AdminContextValue {
    const ctx = useContext(AdminContext);
    if (!ctx) throw new Error('useAdminContext must be used within AdminLayout');
    return ctx;
}

export default function AdminLayout() {
    const [searchParams, setSearchParams] = useSearchParams();

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

    return (
        <AdminContext.Provider value={{ selectedDate, offset, setOffset }}>
            <div className="flex md:h-[100dvh] md:overflow-hidden">
                <SideNav />
                <div className="flex flex-col flex-1 ml-16 md:ml-64 min-w-0 md:overflow-hidden">
                    <TopNav />
                    <main className="flex-1 md:overflow-hidden">
                        <Outlet />
                    </main>
                </div>
            </div>
        </AdminContext.Provider>
    );
}
