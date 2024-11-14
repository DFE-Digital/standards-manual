// contentful-preview-client.js
require('dotenv').config();

const contentful = require('contentful');

const previewClient = contentful.createClient({
    space: process.env.spaceID,
    accessToken: process.env.contentfulPreviewAPI, // Use your Preview API key
    host: 'preview.contentful.com' // Specify the Preview API endpoint
});

module.exports = previewClient;