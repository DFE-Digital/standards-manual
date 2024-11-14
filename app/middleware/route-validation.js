const { param, validationResult } = require('express-validator');

// Middleware for validating `id` as a UUID
const validateId = [
    param('id').isUUID().withMessage('Invalid ID format'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = {
    validateId,
};