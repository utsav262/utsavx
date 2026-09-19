import { useState } from 'react';
import { apiClient } from '../../api/index.js';
import { unwrap } from '../../lib/unwrap.js';
import TicketsScreen from './TicketsScreen.jsx';
import PaidTicketScreen from './PaidTicketScreen.jsx';
import TicketSummaryScreen from './TicketSummaryScreen.jsx';
import {
    emptyTicketDraft,
    isEditableTicket,
    ticketFromApi,
    toApiPayload,
    toLocalTicket,
    validateTicketDraft
} from './ticketUtils.js';

/**
 * Orchestrates Tickets → PaidTicket → TicketSummary.
 * When eventId is set, persists via manager ticket APIs.
 * Otherwise mutates local tickets (create-event before draft save).
 */
export default function TicketFlow({
    eventId,
    eventTitle = 'Event',
    tickets = [],
    onTicketsChange,
    onClose,
    notice
}) {
    const [screen, setScreen] = useState('list');
    const [draft, setDraft] = useState(emptyTicketDraft());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const syncFromApi = async () => {
        if (!eventId) return;
        const response = await apiClient.managerTickets(eventId);
        const rows = unwrap(response, []);
        onTicketsChange(Array.isArray(rows) ? rows.map(ticketFromApi) : []);
    };

    const openAdd = () => {
        setDraft(emptyTicketDraft());
        setError('');
        setScreen('form');
    };

    const openEdit = (ticket) => {
        if (!isEditableTicket(ticket)) {
            notice?.('System complimentary tickets cannot be edited.');
            return;
        }
        setDraft(ticketFromApi(ticket));
        setError('');
        setScreen('form');
    };

    const goSummary = () => {
        const message = validateTicketDraft(draft);
        if (message) {
            setError(message);
            return;
        }
        setError('');
        setScreen('summary');
    };

    const save = async () => {
        const message = validateTicketDraft(draft);
        if (message) {
            setError(message);
            setScreen('form');
            return;
        }
        setBusy(true);
        setError('');
        try {
            if (eventId) {
                const payload = toApiPayload(draft, eventId);
                if (draft._id) {
                    await apiClient.managerUpdateTicket(draft._id, payload);
                    notice?.('Ticket updated.');
                } else {
                    await apiClient.managerCreateTicket(payload);
                    notice?.('Ticket created.');
                }
                await syncFromApi();
            } else {
                const local = toLocalTicket(draft);
                if (draft._id) {
                    onTicketsChange(
                        tickets.map((row) =>
                            String(row._id) === String(draft._id) ? { ...row, ...local } : row
                        )
                    );
                    notice?.('Ticket updated.');
                } else {
                    const id = `local-${Date.now()}`;
                    onTicketsChange([...tickets, { ...local, _id: id }]);
                    notice?.('Ticket added.');
                }
            }
            setScreen('list');
            setDraft(emptyTicketDraft());
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not save ticket.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (ticket) => {
        if (!isEditableTicket(ticket)) {
            notice?.('System complimentary tickets cannot be deleted.');
            return;
        }
        if (!window.confirm(`Delete “${ticket.name}”?`)) return;
        setBusy(true);
        try {
            if (eventId && !String(ticket._id).startsWith('local-')) {
                await apiClient.managerDeleteTicket(ticket._id);
                await syncFromApi();
            } else {
                onTicketsChange(tickets.filter((row) => String(row._id) !== String(ticket._id)));
            }
            notice?.('Ticket deleted.');
        } catch (failure) {
            notice?.(failure.response?.data?.message || 'Could not delete ticket.');
        } finally {
            setBusy(false);
        }
    };

    if (screen === 'form') {
        return (
            <PaidTicketScreen
                draft={draft}
                setDraft={setDraft}
                error={error}
                onBack={() => {
                    setError('');
                    setScreen('list');
                }}
                onContinue={goSummary}
            />
        );
    }

    if (screen === 'summary') {
        return (
            <TicketSummaryScreen
                draft={draft}
                busy={busy}
                error={error}
                onBack={() => setScreen('form')}
                onSave={save}
            />
        );
    }

    return (
        <TicketsScreen
            tickets={tickets}
            eventTitle={eventTitle}
            busy={busy}
            onBack={onClose}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={remove}
        />
    );
}
