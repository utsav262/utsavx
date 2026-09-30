import { useEffect, useState } from 'react';
import { apiClient } from '../api/index.js';
import { unwrapList } from './unwrap.js';

let cached = null;
let pending = null;

/** Live event categories from the catalog (fetched once per page load). */
export function useCategories() {
    const [rows, setRows] = useState(cached || []);
    useEffect(() => {
        if (cached) return undefined;
        let alive = true;
        pending = pending || apiClient.categories()
            .then((res) => { cached = unwrapList(res).map((c) => ({ name: c.name, slug: c.slug || String(c.name).toLowerCase() })); return cached; })
            .catch(() => { pending = null; return []; });
        pending.then((value) => alive && setRows(value));
        return () => { alive = false; };
    }, []);
    return rows;
}
