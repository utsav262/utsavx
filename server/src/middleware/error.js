export function notFound(req, res) {
    res.status(404).json({ message: 'Route not found', code: 404 });
}

export function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    console.error(error);

    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid identifier', code: 400 });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message, code: 400 });
    }
    if (error.code === 11000) {
        return res.status(409).json({ message: 'A record with those details already exists', code: 409 });
    }

    const status = error.statusCode || 500;
    return res.status(status).json({
        message: error.statusCode ? error.message : 'Something went wrong',
        code: status
    });
}
