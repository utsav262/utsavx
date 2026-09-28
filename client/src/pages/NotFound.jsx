import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-cream px-5">
      <div className="text-center">
        <p className="serif text-[10rem] leading-none text-coral">404</p>
        <h1 className="serif mt-2 text-4xl">Page not found</h1>
        <p className="mt-3 text-ink/60">Yeh page exist nahi karta ya move ho gaya.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-full bg-coral px-6 py-3 font-bold text-white">Go home</Link>
          <Link to="/events" className="rounded-full border border-ink/20 px-6 py-3 font-bold">Browse events</Link>
        </div>
      </div>
    </main>
  );
}
