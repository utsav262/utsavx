import { Coins, Ticket, BarChart3, Download } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import DataTable from '../components/DataTable.jsx';
import PanelHeader from '../components/PanelHeader.jsx';
import { money } from '../../../lib/money.js';

export default function SalesView({ event, orders }) {
  if (!event) {
    return <p className="mt-8 text-sm text-ink/55">Select an event first.</p>;
  }

  return (
    <div className="mt-6 space-y-8">
      <PanelHeader
        eyebrow="Sales"
        title={event.title}
        subtitle="Revenue, tickets, and payouts at a glance."
        actions={
          <button className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider hover:border-coral hover:text-coral">
            <Download size={13} /> Export CSV
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gross sales" value={money(orders?.gross_sales || 0)} Icon={Coins} />
        <StatCard label="Tickets sold" value={orders?.total_sold || 0} Icon={Ticket} accent="moss" />
        <StatCard label="Payout due" value={money(orders?.payout_due || 0)} Icon={BarChart3} accent="amber" />
      </div>

      <DataTable
        rows={orders?.table_data || []}
        columns={['ticket_type', 'confirmation_id', 'payment_status', 'price_paid']}
        emptyText="No orders yet."
      />
    </div>
  );
}
