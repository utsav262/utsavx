import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/index.js';
import { unwrap } from './unwrap.js';

let cached = null;

/** Organizer types, categories and detail-field specs for the create-event wizard (fetched once per page load). */
export function useEventTaxonomy() {
    const [taxonomy, setTaxonomy] = useState(cached);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (cached) return undefined;
        let alive = true;
        setError('');
        apiClient.eventTaxonomy()
            .then((res) => {
                const value = unwrap(res, null);
                if (!value?.organizerTypes) throw new Error('Malformed taxonomy');
                cached = value;
                if (alive) setTaxonomy(value);
            })
            .catch((failure) => {
                if (alive) setError(failure.response?.data?.message || 'Could not load event types.');
            });
        return () => { alive = false; };
    }, [attempt]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    return { taxonomy, error, retry };
}
