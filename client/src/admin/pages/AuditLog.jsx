import { useState } from 'react';
import { Badge, DataTable, Drawer, Facts, PageHead, Pagination, Section, Toolbar, dateTime, inputCls, useAdminList } from '../components/kit.jsx';

function Json({ value }) {
    if (value == null) return <p className="text-sm text-ink/45 dark:text-white/45">—</p>;
    return <pre className="overflow-x-auto whitespace-pre-wrap break-words border border-ink/10 bg-white p-3 text-xs dark:border-white/10 dark:bg-[#111]">{JSON.stringify(value, null, 2)}</pre>;
}

export default function AdminAuditLog() {
    const list = useAdminList('/audit', { status: 'all' });
    const [open, setOpen] = useState(null);
    const { params, setParam } = list;
    const actions = list.extra.actions || [];
    return (
        <div className="space-y-5">
            <PageHead eyebrow="Accountability" title="Audit log" />
            <Toolbar
                search={params.q}
                onSearch={(v) => setParam('q', v)}
                placeholder="Admin email or target id"
                filters={[
                    { label: 'Action', value: params.action || '', onChange: (v) => setParam('action', v), options: [['', 'All'], ...actions.map((a) => [a, a])] },
                    { label: 'Result', value: params.status, onChange: (v) => setParam('status', v), options: [['all', 'All'], ['success', 'Success'], ['failure', 'Failure']] }
                ]}
                csv={{ path: '/audit', params, filename: 'audit-log' }}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-ink/55 dark:text-white/55">From</span>
                <input type="date" aria-label="From date" value={params.from || ''} onChange={(e) => setParam('from', e.target.value)} className={`${inputCls} w-auto`} />
                <span className="text-ink/55 dark:text-white/55">to</span>
                <input type="date" aria-label="To date" value={params.to || ''} onChange={(e) => setParam('to', e.target.value)} className={`${inputCls} w-auto`} />
            </div>
            <DataTable
                loading={list.loading}
                rows={list.rows}
                onRowClick={setOpen}
                columns={[
                    { key: 'created_at', label: 'When', render: (r) => <span className="whitespace-nowrap">{dateTime(r.created_at)}</span> },
                    { key: 'admin', label: 'Admin' },
                    { key: 'action', label: 'Action', render: (r) => <span className="font-mono text-xs font-bold">{r.action}</span> },
                    { key: 'target', label: 'Target', render: (r) => (r.target_type ? <span className="text-xs">{r.target_type} <span className="font-mono text-ink/50 dark:text-white/50">{r.target_id?.slice(-6)}</span></span> : '—') },
                    { key: 'status', label: 'Result', render: (r) => <Badge tone={r.status === 'success' ? 'green' : 'red'}>{r.status}</Badge> },
                    { key: 'ip', label: 'IP', render: (r) => <span className="font-mono text-xs">{r.ip}</span> }
                ]}
            />
            <Pagination pagination={list.pagination} onPage={(p) => setParam('page', p)} />
            <Drawer open={Boolean(open)} onClose={() => setOpen(null)} eyebrow="Audit entry" title={open?.action || ''}>
                {open ? (
                    <>
                        <Facts items={[['When', dateTime(open.created_at)], ['Admin', open.admin || '—'], ['Target', `${open.target_type || '—'} ${open.target_id || ''}`], ['Result', open.status], ['IP', open.ip || '—'], ['Browser', open.user_agent || '—']]} />
                        <Section title="Before"><Json value={open.before} /></Section>
                        <Section title="After"><Json value={open.after} /></Section>
                    </>
                ) : null}
            </Drawer>
        </div>
    );
}
