import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: JSON.parse(localStorage.getItem('utsavx_user') || 'null'),
        token: localStorage.getItem('utsavx_token')
    },
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload.user || action.payload;
            state.token = action.payload.token || state.token;
            if (state.user) localStorage.setItem('utsavx_user', JSON.stringify(state.user));
            if (state.token) localStorage.setItem('utsavx_token', state.token);
        },
        signOut: (state) => {
            state.user = null;
            state.token = null;
            localStorage.removeItem('utsavx_user');
            localStorage.removeItem('utsavx_token');
        }
    }
});

export const { setUser, signOut } = authSlice.actions;
export default authSlice.reducer;
