import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../components/admin/SideNav';
import TopNav from '../components/admin/TopNav';

export type AdminContext = {
    selectedDate: Date;
    offset: number;
    setOffset: (offset: number) => void;
};

export default function AdminLayout() {
    const [today] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [offset, setOffset] = useState(0);

    const selectedDate = new Date(today);
    selectedDate.setDate(today.getDate() + offset);

    return (
        <div className="flex md:h-[100dvh] md:overflow-hidden">
            <SideNav />
            <div className="flex flex-col flex-1 ml-16 md:ml-64 min-w-0 md:overflow-hidden">
                <TopNav today={today} offset={offset} onOffsetChange={setOffset} />
                <main className="flex-1 md:overflow-hidden">
                    <Outlet context={{ selectedDate, offset, setOffset } satisfies AdminContext} />
                </main>
            </div>
        </div>
    );
}