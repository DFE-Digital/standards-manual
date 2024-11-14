exports.g_dashboard = async function (req, res) {
    
    // Get the data from the products json

    const products = require('../data/products.json');

    // Render the view

    res.render('compliance/index', {  products });

};