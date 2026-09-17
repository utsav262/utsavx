export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const wrapControllers = (controllers) => Object.fromEntries(
    Object.entries(controllers).map(([name, value]) => [name, typeof value === 'function' ? asyncHandler(value) : value])
);
