import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** Standard page width for app screens (dashboard, settings, forms). */
export function PageShell({ children, className = '' }) {
    return <main className={`mx-auto w-full max-w-6xl px-5 py-8 lg:px-8 lg:py-10 ${className}`}>{children}</main>;
}

/**
 * One heading style for every app screen: small coral eyebrow, serif title, one-line description,
 * actions on the right. `back` is an optional { to, label } for sub-pages.
 */
export function PageHeader({ eyebrow, title, description, actions, back }) {
    return (
        <header className="border-b border-ink/10 pb-5">
            {back ? (
                <Link to={back.to} className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink">
                    <ArrowLeft size={13} /> {back.label}
                </Link>
            ) : null}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    {eyebrow ? <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">{eyebrow}</p> : null}
                    <h1 className="serif mt-1 break-words text-4xl leading-tight sm:text-5xl">{title}</h1>
                    {description ? <p className="mt-2 max-w-2xl text-sm text-ink/55">{description}</p> : null}
                </div>
                {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
            </div>
        </header>
    );
}

/** Empty or "nothing yet" state with an optional next step. */
export function EmptyState({ icon: Icon, title, text, action }) {
    return (
        <div className="border border-dashed border-ink/15 bg-white px-6 py-14 text-center">
            {Icon ? (
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-coral/10 text-coral">
                    <Icon size={20} />
                </span>
            ) : null}
            <p className="serif mt-4 text-2xl">{title}</p>
            {text ? <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">{text}</p> : null}
            {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
        </div>
    );
}

/** Button styles shared by page headers and empty states. */
export const buttonCls = {
    primary: 'inline-flex items-center justify-center gap-2 bg-coral px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white transition hover:bg-ink',
    secondary: 'inline-flex items-center justify-center gap-2 border border-ink/15 bg-white px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider transition hover:border-coral'
};
