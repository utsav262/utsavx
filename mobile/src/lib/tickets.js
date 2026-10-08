/** Ticket.status from the API: valid | used | cancelled */
export function ticketStatus(status) {
  switch (status) {
    case 'used':
      return { label: 'Used', tone: 'grey' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'red' };
    default:
      return { label: 'Valid', tone: 'green' };
  }
}

/** BookingOrder.status from the API: pending | paid | cancelled | refunded */
export function orderStatus(status) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', tone: 'green' };
    case 'pending':
      return { label: 'Awaiting payment', tone: 'amber' };
    case 'refunded':
      return { label: 'Refunded', tone: 'grey' };
    default:
      return { label: 'Cancelled', tone: 'red' };
  }
}

/** Door staff scan the confirmation code — same value the website encodes. */
export const ticketQrValue = ticket =>
  String(ticket?.confirmationCode || ticket?.qrPayload || '');
