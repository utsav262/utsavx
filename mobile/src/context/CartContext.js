import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { MAX_TICKETS_PER_TYPE } from '../config';
import { KEYS, readJson, writeJson } from '../lib/storage';

const CartContext = createContext(null);

const clamp = (quantity, max) =>
  Math.max(1, Math.min(max || MAX_TICKETS_PER_TYPE, Math.floor(quantity) || 1));

const isValidItem = item =>
  item && item.id && item.eventId && item.ticketTypeId && item.quantity > 0;

function reducer(items, action) {
  switch (action.type) {
    case 'load': {
      // Anything added before storage finished loading wins over the saved copy.
      const saved = action.items.filter(
        row => isValidItem(row) && !items.some(item => item.id === row.id),
      );
      return [...saved, ...items];
    }
    case 'add': {
      const incoming = action.item;
      const existing = items.find(item => item.id === incoming.id);
      if (!existing) {
        return [
          ...items,
          { ...incoming, quantity: clamp(incoming.quantity, incoming.maxQty) },
        ];
      }
      return items.map(item =>
        item.id === incoming.id
          ? {
              ...item,
              ...incoming,
              quantity: clamp(
                item.quantity + incoming.quantity,
                incoming.maxQty,
              ),
            }
          : item,
      );
    }
    case 'setQuantity':
      return items.map(item =>
        item.id === action.id
          ? { ...item, quantity: clamp(action.quantity, item.maxQty) }
          : item,
      );
    case 'remove':
      return items.filter(item => item.id !== action.id);
    case 'removeEvent':
      return items.filter(item => item.eventId !== action.eventId);
    case 'clear':
      return [];
    default:
      return items;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, []);
  const loaded = useRef(false);

  useEffect(() => {
    readJson(KEYS.cart, []).then(saved => {
      dispatch({ type: 'load', items: Array.isArray(saved) ? saved : [] });
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (loaded.current) writeJson(KEYS.cart, items);
  }, [items]);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * item.quantity,
      0,
    );
    return {
      items,
      count,
      total,
      add: item => dispatch({ type: 'add', item }),
      setQuantity: (id, quantity) =>
        dispatch({ type: 'setQuantity', id, quantity }),
      remove: id => dispatch({ type: 'remove', id }),
      removeEvent: eventId => dispatch({ type: 'removeEvent', eventId }),
      clear: () => dispatch({ type: 'clear' }),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
