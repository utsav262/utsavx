/** Same password rule as the API (server/src/validators/auth.js). */
export function passwordProblem(password) {
  if (!password || password.length < 8)
    return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password)) return 'Password must include a letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return null;
}

export const isEmail = value =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
