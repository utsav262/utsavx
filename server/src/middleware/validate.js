import { ZodError } from 'zod';

export const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(422).json({
                message: 'Validation failed',
                errors: error.flatten().fieldErrors,
                code: 422
            });
        }
        return next(error);
    }
};
