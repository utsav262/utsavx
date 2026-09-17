import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { remove, updateQuantity } from '../store/index.js';
import { money } from '../lib/money.js';

export default function Cart() {
    const items = useSelector((state) => state.cart.items);
    const dispatch = useDispatch();
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return (
        <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Your night out</p>
            <h1 className="serif mt-2 text-6xl">Your tickets</h1>
            {items.length ? (
                <>
                    <div className="mt-10 divide-y divide-ink/15 border-y border-ink/15">
                        {items.map((item) => (
                            <div className="flex items-center justify-between gap-4 py-5" key={item.id}>
                                <div>
                                    <p className="serif text-3xl">{item.title}</p>
                                    <p className="text-sm text-ink/55">{item.ticketName || 'Ticket'} · {item.quantity} ticket(s)</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center rounded-full border border-ink/20 text-sm">
                                        <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))} className="px-3 py-2">−</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))} className="px-3 py-2">+</button>
                                    </div>
                                    <b>{money(item.price * item.quantity)}</b>
                                    <button onClick={() => dispatch(remove(item.id))} className="text-sm text-coral">Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between py-6 text-xl font-extrabold"><span>Total</span><span>{money(total)}</span></div>
                    <Link to="/checkout" className="block rounded-full bg-coral px-6 py-4 text-center font-extrabold text-white">Continue to checkout</Link>
                </>
            ) : (
                <div className="mt-10 border-y border-ink/15 py-14 text-center text-ink/55">Your cart is waiting for a good plan. <Link to="/events" className="font-bold text-coral">Find an event</Link></div>
            )}
        </main>
    );
}
