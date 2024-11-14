require('dotenv').config();


const client = require('../middleware/contentful.js');

exports.g_dashboard = async function (req, res) {
    const { id } = req.params;

    try {

        // Fetch all published standards

        const results = await client.getEntries({
            content_type: "standard",
            order: "fields.number"
        });

        // Get categories and just the title and number

        const categoryResults = await client.getEntries({
            content_type: "category",
            order: "fields.title",
            select: "fields.title, fields.number"
        });

        // Set standards if results are valid
        let standards = results?.items || [];
        let categories = categoryResults?.items || [];
        // Render the view with `standards`, `stageCounts`, and `type`
        return res.render("standards/index", { standards, categories });

    } catch (error) {
        console.error("Error fetching entries from Contentful:", error);
    }

    return res.redirect("/");

};

exports.g_preview = async function (req, res) {

    const { id } = req.params;

    if (id) {
        try {
            const standard = await client.getEntry(id);
            return res.render('standards/view/index', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/standards');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/standards');
    }
}
exports.g_previewmeet = async function (req, res) {
    const { id } = req.params;

    if (id) {
        try {
            const standard = await client.getEntry(id);
            return res.render('standards/view/meet', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/standards');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/standards');
    }
}

exports.g_previewproducts = async function (req, res) {
    const { id } = req.params;
    if (id) {
        try {
            const standard = await client.getEntry(id);
            return res.render('standards/view/products', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/standards');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/standards');
    }
}

exports.g_getcategories = async function (req, res) {
    try {
        // Fetch all categories
        const categoryResults = await client.getEntries({
            content_type: "category",
            order: "fields.title",
            select: "fields.title, fields.number, fields.description, fields.slug"
        });

        // Fetch all standards
        const standardResults = await client.getEntries({
            content_type: "standard",
            select: "fields.category"
        });

        // Create a map to count standards per category
        const categoryCountMap = {};

        // Loop over each standard and increase the count for its categories
        standardResults.items.forEach((standard) => {
            const categories = standard.fields.category || [];
            categories.forEach((category) => {
                const categoryId = category.sys.id;
                categoryCountMap[categoryId] = (categoryCountMap[categoryId] || 0) + 1;
            });
        });

        // Attach the count to each category in the result set
        let categories = categoryResults.items.map((category) => {
            const categoryId = category.sys.id;
            return {
                ...category.fields,
                standardCount: categoryCountMap[categoryId] || 0
            };
        });

        // Render with categories, each including a standard count
        return res.render('standards/categories/index', { categories });
    } catch (error) {
        console.error("Error fetching categories from Contentful:", error);
        return res.redirect('/standards');
    }
};


exports.g_getcategory = async function (req, res) {
    const { slug } = req.params;

    if (slug) {
        try {

            // Fetch the standards and then loop round them, creating a new list of standards which contain a category with a matching slug

            const results = await client.getEntries({
                content_type: "standard",
                order: "fields.number",
                select: "fields.category, fields.title, fields.number, fields.subCategory"
            });

            const categoryResults = await client.getEntries({
                content_type: "category",
                "fields.slug": slug
            });

            // Set standards if results are valid
            let standards = results?.items || [];
            let category = categoryResults?.items[0]

            standards = standards.filter((standard) => {
                const categories = standard.fields.category || [];
                return categories.some((category) => category.sys.id === categoryResults.items[0].sys.id);
            });

            // Fetch all sub categories for a given category

            const subCategoryResults = await client.getEntries({
                content_type: "subCategory",
                "fields.category.sys.id": category.sys.id,
                order: "fields.title",
                select: "fields.title, fields.number, fields.slug"
            });

          
            // Render with categories, each including a standard count
            return res.render('standards/categories/view', { standards, category: category.fields, categories: subCategoryResults.items });
        } catch (error) {
            console.error("Error fetching category from Contentful:", error);
            return res.redirect('/standards');
        }
    } else {
        req.session.data['error'] = { error: 'No slug found in session data' };
        return res.redirect('/standards');
    }
}