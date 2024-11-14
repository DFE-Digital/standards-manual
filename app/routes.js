const express = require('express')
const router = express.Router()

// Controllers
const homeController = require('./controllers/homeController.js');
const standardsController = require('./controllers/standardsController.js');

// Home route
router.get("/", homeController.g_home);


// Standards routes
router.get("/standards", standardsController.g_dashboard);
router.get("/standard/:id", standardsController.g_preview);
router.get("/standard/meet/:id", standardsController.g_previewmeet);
router.get("/standard/products/:id", standardsController.g_previewproducts);


router.get("/categories", standardsController.g_getcategories);
router.get("/category/:slug", standardsController.g_getcategory);

module.exports = router