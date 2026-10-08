import {
  eventAvailability,
  minPrice,
  ticketAdmits,
  ticketLeft,
  ticketState,
} from '../src/lib/events';
import { isEmail, passwordProblem } from '../src/lib/validation';
import { orderStatus, ticketQrValue } from '../src/lib/tickets';
import { absoluteUrl, ApiError, listOf } from '../src/api/client';
import { API_ORIGIN } from '../src/config';

const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 3 * 86400000).toISOString();

describe('ticket availability', () => {
  test('null quantity_left means no cap', () => {
    const ticket = { salesStatus: 'on-sale', quantity_left: null };
    expect(ticketLeft(ticket)).toBeNull();
    expect(ticketState(ticket)).toBe('on-sale');
  });

  test('zero left or paused is not purchasable', () => {
    expect(ticketState({ salesStatus: 'on-sale', quantity_left: 0 })).toBe(
      'sold-out',
    );
    expect(ticketState({ salesStatus: 'paused', quantity_left: 5 })).toBe(
      'paused',
    );
  });

  test('only published, upcoming events are live', () => {
    expect(eventAvailability({ status: 'published', startsAt: future })).toBe(
      'live',
    );
    expect(eventAvailability({ status: 'sold-out', startsAt: future })).toBe(
      'sold-out',
    );
    expect(eventAvailability({ status: 'published', startsAt: past })).toBe(
      'ended',
    );
    expect(eventAvailability({ status: 'cancelled', startsAt: future })).toBe(
      'cancelled',
    );
  });

  test('minPrice picks the cheapest ticket type', () => {
    expect(minPrice({ ticketTypes: [{ price: 900 }, { price: 450 }] })).toBe(
      450,
    );
    expect(minPrice({ price: 0 })).toBe(0);
  });
});

describe('group tickets', () => {
  test('one ticket can admit several people; missing or bad values mean 1', () => {
    expect(ticketAdmits({ admits: 3 })).toBe(3);
    expect(ticketAdmits({})).toBe(1);
    expect(ticketAdmits({ admits: 0 })).toBe(1);
    expect(ticketAdmits(null)).toBe(1);
  });
});

describe('validation matches the API rules', () => {
  test('password needs 8+ chars, a letter and a number', () => {
    expect(passwordProblem('short1')).toMatch(/8 characters/);
    expect(passwordProblem('12345678')).toMatch(/letter/);
    expect(passwordProblem('abcdefgh')).toMatch(/number/);
    expect(passwordProblem('password123')).toBeNull();
  });

  test('email shape', () => {
    expect(isEmail(' emma@utsavx.com ')).toBe(true);
    expect(isEmail('emma@')).toBe(false);
  });
});

describe('api helpers', () => {
  test('listOf unwraps the API envelopes', () => {
    expect(listOf({ result: [1] })).toEqual([1]);
    expect(listOf({ tickets: [2] })).toEqual([2]);
    expect(listOf({ result: { id: 1 } })).toEqual([]);
  });

  test('absoluteUrl prefixes server-relative paths only', () => {
    expect(absoluteUrl('/api/v1/account/avatar/1')).toBe(
      `${API_ORIGIN}/api/v1/account/avatar/1`,
    );
    expect(absoluteUrl('https://x.test/a.jpg')).toBe('https://x.test/a.jpg');
    expect(absoluteUrl(null)).toBeNull();
  });

  test('ApiError exposes the first message per field', () => {
    const error = new ApiError('Validation failed', 422, {
      errors: { current_password: ['Current password is incorrect'] },
    });
    expect(error.fieldErrors).toEqual({
      current_password: 'Current password is incorrect',
    });
  });
});

describe('tickets and orders', () => {
  test('QR encodes the confirmation code, like the website', () => {
    expect(
      ticketQrValue({ confirmationCode: 'UTX-1-AB', qrPayload: '{}' }),
    ).toBe('UTX-1-AB');
  });

  test('order status labels', () => {
    expect(orderStatus('pending').label).toBe('Awaiting payment');
    expect(orderStatus('paid').tone).toBe('green');
  });
});
