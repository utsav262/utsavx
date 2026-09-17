import { Link } from 'react-router-dom';

export default function ManagerAuthShell({
    eyebrow = 'UTSAVX manager',
    title,
    subtitle,
    features = [
        'Create & publish events',
        'Sell tickets and track sales',
        'Invite team & scan at the door'
    ],
    children,
    footer
}) {
    return (
        <main className="min-h-[calc(100vh-73px)] bg-[radial-gradient(circle_at_top_left,rgba(240,199,94,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(45,74,62,0.12),transparent_45%)]">
            <div className="mx-auto grid max-w-6xl items-stretch gap-0 px-5 py-10 lg:grid-cols-2 lg:px-8 lg:py-16">
                <aside className="relative overflow-hidden bg-ink p-8 text-white sm:p-12 lg:min-h-[640px]">
                    <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-coral/30 blur-3xl" />
                    <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-moss/50 blur-3xl" />
                    <div className="relative flex h-full flex-col justify-between">
                        <div>
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-butter">
                                {eyebrow}
                            </p>
                            <h1 className="serif mt-6 text-5xl leading-[0.92] sm:text-6xl lg:text-7xl">
                                {title}
                            </h1>
                            <p className="mt-6 max-w-sm text-sm leading-7 text-white/65">{subtitle}</p>
                        </div>
                        <ul className="mt-10 space-y-3 text-sm text-white/70">
                            {features.map((item) => (
                                <li key={item} className="border-t border-white/10 pt-3">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
                <section className="flex items-center border border-ink/10 border-t-0 bg-cream/90 px-6 py-10 backdrop-blur sm:px-10 lg:border-l-0 lg:border-t lg:px-12">
                    <div className="mx-auto w-full max-w-md">
                        {children}
                        {footer && <div className="mt-8 text-center text-sm text-ink/55">{footer}</div>}
                    </div>
                </section>
            </div>
        </main>
    );
}

export function ManagerAuthField({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = true,
    minLength,
    autoComplete
}) {
    return (
        <label className="mt-5 block">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45">{label}</span>
            <input
                required={required}
                type={type}
                minLength={minLength}
                autoComplete={autoComplete}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="mt-2 w-full border-0 border-b border-ink/20 bg-transparent px-0 py-3 text-base outline-none transition placeholder:text-ink/35 focus:border-coral"
            />
        </label>
    );
}

export function ManagerAuthLink({ to, children }) {
    return (
        <Link to={to} className="font-bold text-coral hover:underline">
            {children}
        </Link>
    );
}
