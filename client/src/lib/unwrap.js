/** Normalize common API envelopes into usable data. */
export function unwrap(response, fallback = []) {
    const data = response?.data;
    if (!data) return fallback;
    if (data.result !== undefined && data.result !== null) return data.result;
    if (data.event !== undefined) return data.event;
    if (data.events !== undefined) return data.events;
    if (data.orders !== undefined) return data.orders;
    if (data.tickets !== undefined) return data.tickets;
    return fallback;
}

export function unwrapList(response) {
    const data = response?.data?.result;
    return Array.isArray(data) ? data : [];
}
