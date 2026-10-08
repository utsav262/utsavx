/** People a ticket lets in; older tickets without the field admit one. */
export const admitsOf = (ticket) => Math.max(1, Number(ticket?.admits) || 1);

/** Appended to scan messages so gate staff see group passes at a glance. */
export const admitNote = (ticket) => {
    const people = admitsOf(ticket);
    return people > 1 ? ` Admit ${people} people together.` : '';
};
