import { NavLink, Outlet } from 'react-router-dom';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm rounded transition-colors ${
    isActive
      ? 'bg-black text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }`;

export default function AdminLayout() {
  return (
    <div className="flex-1 flex flex-col">
      <nav className="border-b border-gray-200 px-8 py-3">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-semibold text-gray-500 mr-4">ADMIN</span>
          <NavLink to="/admin/calendar" className={linkClass}>Calendar</NavLink>
          <NavLink to="/admin/bookings" className={linkClass}>Bookings</NavLink>
          <NavLink to="/admin/resources" className={linkClass}>Resources</NavLink>
        </div>
      </nav>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}