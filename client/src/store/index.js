import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import cartReducer from './slices/cartSlice.js';

export { setUser, signOut } from './slices/authSlice.js';
export { add, remove, clear, updateQuantity } from './slices/cartSlice.js';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        cart: cartReducer
    }
});

store.subscribe(() => {
    localStorage.setItem('utsavx_cart', JSON.stringify(store.getState().cart.items));
});

export default store;
