import { useState, useEffect } from 'react';
import { BASE } from '../utils/apiUtils';

export type Method = { id: string; name: string };
export type StaffMember = { id: string; first_name: string; last_name: string; role: string };

export function useSessionFormData() {
    const [methods, setMethods] = useState<Method[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);

    useEffect(() => {
        fetch(`${BASE}/api/methods`)
            .then(r => r.json())
            .then(j => setMethods(j.results ?? []))
            .catch(() => {});
        fetch(`${BASE}/api/users`)
            .then(r => r.ok ? r.json() : [])
            .then((users: StaffMember[]) => setStaffList(users.filter(u => ['owner', 'staff'].includes(u.role.toLowerCase()))))
            .catch(() => {});
    }, []);

    return { methods, staffList };
}
