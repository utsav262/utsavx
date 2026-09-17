export function success(res, result, message = 'OK', code = 200, meta = undefined) {
    const body = { message, result, code };
    if (meta && typeof meta === 'object') Object.assign(body, meta);
    return res.status(code).json(body);
}

export function failure(res, message, code = 400, errors = undefined) {
    const body = { message, code };
    if (errors) body.errors = errors;
    return res.status(code).json(body);
}
