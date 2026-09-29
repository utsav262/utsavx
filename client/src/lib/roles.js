// Admins and managers run the platform; only customers buy tickets.
export const canPurchase = (user) => !user || user.role === 'customer';
