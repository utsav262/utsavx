/** People a ticket lets in; older tickets without the field admit one. */
export const admitsOf = (ticket) => Math.max(1, Number(ticket?.admits) || 1);

/** Appended to scan messages so gate staff see group passes at a glance. */
export const admitNote = (ticket) => {
    const people = admitsOf(ticket);
    return people > 1 ? ` Admit ${people} people together.` : '';
};

/** People who actually came in on a used ticket (older scans recorded no count: the whole group). */
export const enteredOf = (ticket) => {
    if (ticket?.status !== 'used') return 0;
    const entered = Number(ticket.peopleEntered);
    return Number.isInteger(entered) && entered > 0 ? Math.min(entered, admitsOf(ticket)) : admitsOf(ticket);
};

/**
 * How many people came in on this scan. Gate apps send either `people_entered`
 * (everyone, holder included) or `companions_count` (guests besides the holder).
 * Sending neither means the whole group came, so existing scanners keep working.
 * Returns { people } or { error } when the number doesn't fit the ticket.
 */
export function peopleEnteredFrom(body = {}, ticket) {
    const admits = admitsOf(ticket);
    const total = body.people_entered ?? body.peopleEntered;
    const companions = body.companions_count ?? body.companionsCount;

    let people = admits;
    if (total !== undefined && total !== null && total !== '') people = Number(total);
    else if (companions !== undefined && companions !== null && companions !== '') people = 1 + Number(companions);

    if (!Number.isInteger(people) || people < 1 || people > admits) {
        return {
            error: admits > 1
                ? `This ticket admits 1 to ${admits} people.`
                : 'This ticket admits 1 person.'
        };
    }
    return { people };
}

/** Scan message suffix: the whole group, or how many of them came. */
export const enteredNote = (ticket, people) => {
    const admits = admitsOf(ticket);
    if (admits <= 1) return '';
    return people < admits
        ? ` ${people} of ${admits} people entered.`
        : ` Admit ${admits} people together.`;
};
