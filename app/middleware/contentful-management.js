require('dotenv').config()

const contentful = require('contentful-management');

const mangementClient = contentful.createClient({
    accessToken: process.env.contentManagementKey 
});

module.exports = mangementClient;