require('dotenv').config();
const client = require('../middleware/contentful.js');
const previewClient = require('../middleware/contentful-preview.js');
const managementClient = require('../middleware/contentful-management.js');


const renderPreview = async (req, res, view) => {
    try {
        const { id } = req.params;
        const standard = await previewClient.getEntry(id);
        return res.render(view, { standard });
    } catch (error) {
        console.error(`Error fetching standard: ${error}`);
        return res.status(500).send('Internal Server Error');
    }
};

exports.g_standard = (req, res) => renderPreview(req, res, 'preview/index');
exports.g_preview_how = (req, res) => renderPreview(req, res, 'preview/how');
exports.g_preview_considerations = (req, res) => renderPreview(req, res, 'preview/considerations');
exports.g_preview_templates = (req, res) => renderPreview(req, res, 'preview/templates');
exports.g_preview_products = (req, res) => renderPreview(req, res, 'preview/products');
exports.g_preview_exceptions = (req, res) => renderPreview(req, res, 'preview/exceptions');