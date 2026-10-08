import { absoluteUrl } from '../api/client';

/** Slug when there is one — the details endpoint accepts either. */
export const eventKey = event => event?.slug || event?._id || event?.id;
export const eventMongoId = event => event?._id || event?.id;
export const eventTitle = event =>
  event?.title || event?.name || 'Untitled event';
export const eventCity = event => event?.city || event?.venue?.city || null;

/**
 * Cover photo. The manager app saves uploads as "gallery" images, which the API
 * returns in `images` (details only) rather than as cover_image — use those too.
 */
export const eventImage = event =>
  absoluteUrl(
    event?.cover_image ||
      event?.image ||
      event?.imageUrl ||
      event?.horizontal_flyer ||
      event?.flyer1 ||
      event?.images?.find(image => image?.url)?.url,
  );

export function venueLine(venue) {
  if (!venue) return null;
  if (typeof venue === 'string') return venue;
  const parts = [venue.name, venue.address, venue.city].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export const ticketTypesOf = event =>
  event?.tickets || event?.ticketTypes || [];
export const ticketTypeId = ticket => String(ticket?._id || ticket?.id || '');

export function minPrice(event) {
  const prices = ticketTypesOf(event)
    .map(ticket => Number(ticket.price))
    .filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : Number(event?.price ?? 0);
}

/** quantity_left is null when the host set no cap. */
export function ticketLeft(ticket) {
  const left = ticket?.quantity_left;
  return left === null || left === undefined ? null : Number(left);
}

/** 'on-sale' | 'paused' | 'sold-out' — mirrors the server's reserve check. */
export function ticketState(ticket) {
  if (!ticket) return 'sold-out';
  if (ticket.salesStatus === 'paused') return 'paused';
  const left = ticketLeft(ticket);
  if (ticket.salesStatus === 'sold-out' || (left !== null && left <= 0)) {
    return 'sold-out';
  }
  return 'on-sale';
}

export function hasEnded(event) {
  const end = event?.endsAt || event?.startsAt;
  return end ? new Date(end) < new Date() : false;
}

/** Only published events take online orders; 'sold-out' and 'cancelled' don't. */
export function eventAvailability(event) {
  if (event?.status === 'cancelled') return 'cancelled';
  if (hasEnded(event)) return 'ended';
  if (event?.status === 'sold-out') return 'sold-out';
  return event?.status === 'published' ? 'live' : 'unavailable';
}
