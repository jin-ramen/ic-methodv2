import { Link } from 'react-router-dom';
import { useApi } from '../../utils/useApi';
import type { Resource } from '../../types/resource';

export default function BookList() {
  const { data: resources, error } = useApi<Resource[]>('/resources');

  if (error) {
    return (
      <section className="flex-1 flex items-center justify-center p-8">
        <p className="font-playfair text-wood-accent">{error}</p>
      </section>
    );
  }

  if (!resources) {
    return (
      <section className="flex-1 flex items-center justify-center p-8">
        <p className="font-playfair text-wood-accent italic">Loading…</p>
      </section>
    );
  }

  if (resources.length === 0) {
    return (
      <section className="flex-1 flex items-center justify-center p-8">
        <p className="font-playfair text-wood-accent italic">Nothing available to book yet.</p>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col items-center justify-center px-8 py-16">
      <h1 className="font-cormorant text-4xl md:text-5xl text-wood-text tracking-widest mb-2">
        Book a Session
      </h1>
      <div className="w-12 h-px bg-wood-accent mx-auto mb-12" />

      <ul className="grid gap-px sm:grid-cols-2 w-full max-w-2xl border border-wood-accent/30">
        {resources.map((r) => (
          <li key={r.id}>
            <Link
              to={`/book/${r.id}`}
              className="group block p-8 border border-wood-accent/20 hover:bg-wood-primary/40 transition-colors duration-300"
            >
              <h2 className="font-cormorant text-2xl text-wood-text tracking-wide group-hover:text-wood-light transition-colors duration-300">
                {r.name}
              </h2>
              <p className="font-playfair text-xs text-wood-accent mt-2 tracking-widest uppercase">
                {r.duration_minutes} minutes
              </p>
              <div className="mt-4 w-6 h-px bg-wood-accent/50 group-hover:w-12 transition-all duration-300" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}