import { Link } from 'react-router-dom';

export default function AdminHome() {
  return (
    <section className="flex-1 p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/admin/calendar"
          className="block p-6 border border-gray-200 rounded hover:border-gray-400"
        >
          <h2 className="font-semibold">Calendar</h2>
          <p className="text-sm text-gray-500 mt-1">Week view of all bookings</p>
        </Link>
        <Link
          to="/admin/bookings"
          className="block p-6 border border-gray-200 rounded hover:border-gray-400"
        >
          <h2 className="font-semibold">Bookings</h2>
          <p className="text-sm text-gray-500 mt-1">List, filter, and cancel</p>
        </Link>
        <Link
          to="/admin/resources"
          className="block p-6 border border-gray-200 rounded hover:border-gray-400"
        >
          <h2 className="font-semibold">Resources</h2>
          <p className="text-sm text-gray-500 mt-1">Manage bookable things and their hours</p>
        </Link>
      </div>
    </section>
  );
}