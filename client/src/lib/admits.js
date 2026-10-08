/** People one ticket lets in (group / family passes). Older data without the field admits one. */
export function admitsOf(source) {
    return Math.max(1, Math.floor(Number(source?.admits)) || 1);
}

/** e.g. "Admits 3 people — enter together"; empty for normal tickets. */
export function admitsNote(source) {
    const admits = admitsOf(source);
    return admits > 1 ? `Admits ${admits} people — enter together` : '';
}
