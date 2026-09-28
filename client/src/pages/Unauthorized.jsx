import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function Unauthorized() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-cream px-5">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral/10">
          <ShieldAlert className="h-7 w-7 text-coral" />
        </div>
        <h1 className="serif mt-6 text-4xl">403 — Access denied</h1>
        <p className="mt-3 text-ink/60">Aapko is page ka access nahi hai.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-full bg-coral px-6 py-3 font-bold text-white">Go home</Link>
          <Link to="/contact" className="rounded-full border border-ink/20 px-6 py-3 font-bold">Contact support</Link>
        </div>
      </div>
    </main>
  );
}
