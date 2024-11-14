const { body, check, validationResult } = require('express-validator');

// Helper function to check if a field exists and is not empty
const checkExists = (field, errorMessage) => [
    check(field)
        .trim()
        .custom((value) => {
            if (value === '') {
                throw new Error(errorMessage);
            }
            return true;
        })
];

// Individual validations for specific fields
exports.validateTitle = checkExists('title', 'Enter a title');
exports.validateSummary = checkExists('summary', 'Enter a summary');
exports.validateCategory = checkExists('categories', 'Select a category');
exports.validateSubCategories = checkExists('subcategories', 'Select a sub-category');
exports.validatePurpose = checkExists('purpose', 'Enter a purpose');
exports.validateGuidance = checkExists('guidance', 'Enter guidance for how to meet the standard');

// Validation for approved fields, flattening the nested array by spreading each result
exports.validateApprovedFields = [
    ...checkExists('approved_name', 'Enter an approved name'),
    ...checkExists('approved_vendor', 'Enter an approved vendor'),
    ...checkExists('approved_version', 'Enter an approved version'),
    ...checkExists('approved_usecase', 'Enter an approved use case'),
];

// Example for validateExceptionFields with specific validation logic (as discussed previously)
exports.validateExceptionFields = [
    ...checkExists('exception', 'Enter an exception summary'),
    check('exceptiondetail')
        .trim()
        .notEmpty()
        .withMessage('Enter details of the exception')
        .isLength({ max: 1000 })
        .withMessage('Details of the exception must be 1000 characters or fewer')
];

exports.validateContactFields = [
    // Validate `contactType` is not empty
    check('contactType')
        .notEmpty()
        .withMessage('Select a contact type'),

    // Conditional validation for `contactEmail` and `contactName`
    body('contactEmail').custom((value, { req }) => {
        // Skip validation if `people` is provided
        if (req.body.people) {
            return true;
        }
        // If `people` is not provided, ensure `contactEmail` and `contactName` are filled
        if (!value) {
            throw new Error('Enter a contact email');
        }
        return true;
    }),
    body('contactName').custom((value, { req }) => {
        // Skip validation if `people` is provided
        if (req.body.people) {
            return true;
        }
        // If `people` is not provided, ensure `contactName` is filled
        if (!value) {
            throw new Error('Enter a contact name');
        }
        return true;
    }),


    // Validate that at least one option is chosen (either `people` or `contactEmail` and `contactName`)
    body().custom((_, { req }) => {
        const { contactEmail, contactName, people } = req.body;
        if (!people && (!contactEmail || !contactName)) {
            throw new Error('Select an existing person or enter new contact details');
        }
        return true;
    })
];