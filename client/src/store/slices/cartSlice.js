import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        items: (() => {
            try {
                const parsed = JSON.parse(localStorage.getItem('utsavx_cart') || '[]');
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        })()
    },
    reducers: {
        add: (state, action) => {
            const item = state.items.find((entry) => entry.id === action.payload.id);
            if (item) item.quantity += action.payload.quantity;
            else state.items.push(action.payload);
        },
        updateQuantity: (state, action) => {
            const item = state.items.find((entry) => entry.id === action.payload.id);
            if (item) item.quantity = Math.max(1, action.payload.quantity);
        },
        remove: (state, action) => {
            state.items = state.items.filter((item) => item.id !== action.payload);
        },
        clear: (state) => {
            state.items = [];
        }
    }
});

export const { add, remove, clear, updateQuantity } = cartSlice.actions;
export default cartSlice.reducer;
