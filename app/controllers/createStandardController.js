require('dotenv').config();
const { check, validationResult } = require('express-validator');
const { validateTitle, validateSummary, validateCategory, validateSubCategories, validatePurpose, validateGuidance, validateApprovedFields, validateExceptionFields, validateContactFields } = require('../validation/create.js');

const client = require('../middleware/contentful.js');
const previewClient = require('../middleware/contentful-preview.js');
const managementClient = require('../middleware/contentful-management.js');


const { sendNotifyEmail } = require('../middleware/notify');

const { createStandardEntry, updateTitle, updateSummary, updateCategories, updatePurpose, updateGuidance, createApprovedProductEntry, updateApprovedProductsField, createToleratedProductEntry, updateToleratedProductsField, removeApprovedProductsField, updateApprovedProduct, createExceptionEntry, updateExceptionField, updateException, removeExceptionField, createPerson, updateContactField, removeContactField, updateSubCategories, updateStatus, deleteEntry, updateToDraft, addStandardHistoryEntry } = require('../data/contentful/updates.js');

const { slugify } = require('../middleware/tools.js');

function generateRandomId() {
    return Math.random().toString(36).substr(2, 9); // Generates a random string
}

async function getNextStandardNumber() {
    try {
        // Get the last standard number from the database and increment it by 1
        const response = await previewClient.getEntries({
            content_type: 'standard',
            order: '-fields.number',
            limit: 1
        });

        if (response.items.length === 0) {
            throw new Error('No standards found in the database.');
        }

        const lastStandard = response.items[0];
        let newNumber = 0;

        if (lastStandard) {
            newNumber = parseInt(lastStandard.fields.number, 10) + 1;
        }

        console.log(newNumber);
        return newNumber;
    } catch (error) {
        console.error('Error fetching the next standard number:', error);
        throw new Error('Failed to fetch the next standard number.');
    }
}

async function getStageID(stageNumber) {
    try {
        const stage = await client.getEntries({
            content_type: 'stage',
            'fields.number': stageNumber
        });

        if (stage.items.length === 0) {
            throw new Error(`Stage with number ${stageNumber} not found.`);
        }

        return stage.items[0].sys.id;
    } catch (error) {
        console.error(`Error fetching stage ID for stage number ${stageNumber}:`, error);
        throw new Error('Failed to fetch stage ID.');
    }
}

// GETS //

exports.g_create = async function (req, res) {
    let error = "";

    if (req.session.data && req.session.data['error']) {
        error = req.session.data['error'];
        req.session.data['error'] = "";
    }

    try {
        console.log(req.session.User);

        const stageId = await getStageID(20);

        const data = await previewClient.getEntries({
            content_type: 'standard',
            'fields.stage.sys.id': stageId,
            'fields.creator': req.session.User.EmailAddress
        });

        let drafts = data.items;

        res.render('create/index', { drafts, error });
    } catch (err) {
        console.error("Error fetching drafts:", err);
        req.session.data['error'] = { error: 'Failed to fetch drafts' };
        res.redirect('/create');
    }
}

exports.g_standardcreate = async function (req, res) {

    if (!req.session.data) {
        req.session.data = {};
    }

    let number = await getNextStandardNumber();

    // Create a new standard and put the ID into session
    const newStandard = {
        title: '',
        stageId: await getStageID(20),
        number: number,
        owners: [],
        technicalContacts: [],
        summary: '',
        purpose: '',
        compliance: '',
        considerations: '',
        templates: '',
        relatedGuidance: '',
        slug: '',
        version: 0.1,
        previousVersion: 0.0,
        approvedProducts: [],
        toleratedProducts: [],
        exceptions: [],
        category: [],
        subCategory: [],
        creator: req.session.User.EmailAddress,
    }

    const standard = await createStandardEntry(newStandard);

    const historyData = {
        action: "Draft created",
        actionBy: req.session.User.FirstName + " " + req.session.User.LastName,
        actionByEmail: req.session.User.EmailAddress,
        actionDatetime: new Date().toISOString()
    }

    await addStandardHistoryEntry(standard, historyData);

    if (standard) {
        req.session.data['id'] = standard;
        res.redirect('/create/standard');
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }


}

exports.g_standard_tasks = async function (req, res) {

    if (!req.session.data) {
        req.session.data = {};
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/index', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }


}


exports.g_success = async function (req, res) {

    if (!req.session.data) {
        req.session.data = {};
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/success', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}


exports.g_confirmdelete = async function (req, res) {
    if (!req.session.data) {
        req.session.data = {};
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/confirm-delete', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}

exports.g_deleted = async function (req, res) {

    req.session.data = {};

    return res.render('create/standard/deleted');

}



exports.g_standard_getdraft = async function (req, res) {

    req.session.data = {};

    const { id } = req.params;

    // Get drafts from contentful

    try {
        const draft = await previewClient.getEntry(id);

        req.session.data['id'] = id;

        return res.redirect('/create/standard');
    }
    catch (error) {

        req.session.data['error'] = { error: 'Draft not found' };

        return res.redirect('/create');
    }
}

exports.g_preview = async function (req, res) {
    if (!req.session.data) {
        req.session.data = {};
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/preview', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}
exports.g_previewmeet = async function (req, res) {
    if (!req.session.data) {
        req.session.data = {};
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/preview-meet', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}

exports.g_previewproducts = async function (req, res) {
    if (!req.session.data) {
        req.session.data = {};
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/preview-products', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}



exports.g_title = async function (req, res) {
    // Ensure session data exists
    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    const id = req.session.data['id'];

    if (!id) {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }

    try {
        const standard = await previewClient.getEntry(id);
        return res.render('create/standard/title', { standard });
    } catch (error) {
        console.error("Error fetching standard entry from Contentful:", error);
        req.session.data['error'] = { error: 'Failed to fetch standard entry' };
        return res.redirect('/create');
    }
}

exports.g_summary = async function (req, res) {
    // Get the ID out the session and get it from the DB, on the post we'll update the DB

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/summary', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}



exports.g_categories = async function (req, res) {
    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    const response = await client.getEntries({
        content_type: 'category',
        order: 'fields.title',
        select: 'fields.title,fields.number',
        'fields.active': true
    });

    const categories = response.items.map(item => {
        return {
            text: item.fields.title,
            value: item.sys.id
        }
    });

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/categories', { categories, standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}


exports.g_subcategories = async function (req, res) {

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let id = req.session.data['id'];

    // Get the sub categories
    try {
        const response = await client.getEntries({
            content_type: 'subCategory',
            order: 'fields.title'
        });

        const subcategories = response.items.map(item => {
            return {
                text: item.fields.title,
                value: item.sys.id,
                category: item.fields.category.sys.id
            }
        });

        if (id) {
            try {
                const standard = await previewClient.getEntry(id);
                return res.render('create/standard/sub-categories', { standard, subcategories });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        } else {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

    } catch (error) {
        console.error("Error fetching subcategories from Contentful:", error);
        req.session.data['error'] = { error: 'Failed to fetch subcategories' };
        return res.redirect('/create');
    }
};




exports.g_purpose = async function (req, res) {
    // Get the ID out the session and get it from the DB, on the post we'll update the DB

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/purpose', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}


exports.g_products = async function (req, res) {
    // Get the ID out the session and get it from the DB, on the post we'll update the DB

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let message = req.session.data['success'];

    req.session.data['success'] = "";

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/products', { standard, message });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}


exports.g_addapprovedproduct = async function (req, res) {


    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/add-approved-product', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}

exports.g_manageapprovedproduct = async function (req, res) {

    const { productid } = req.params;

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            const product = await previewClient.getEntry(productid);
            return res.render('create/standard/manage-approved-product', { standard, product });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}

exports.g_manageexception = async function (req, res) {

    const { exceptionid } = req.params;

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            const exception = await previewClient.getEntry(exceptionid);
            return res.render('create/standard/manage-exception', { standard, exception });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}

exports.g_managecontact = async function (req, res) {

    const { contactid } = req.params;

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            const person = await previewClient.getEntry(contactid);
            return res.render('create/standard/manage-contact', { standard, person });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }

}



exports.g_addtoleratedproduct = async function (req, res) {

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    let id = req.session.data['id'];

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('create/standard/add-tolerated-product', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/create');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }
}


exports.g_removeapprovedproduct = async function (req, res) {
    const { id } = req.params;

    if (!req.session.data) {
        req.session.data = {};
    }

    let approvedProducts = req.session.data.approvedProducts || [];

    const index = approvedProducts.findIndex(product => product.id === id);

    if (index > -1) {
        approvedProducts.splice(index, 1);
        req.session.data.approvedProducts = approvedProducts;
        return res.redirect('/create/standard/products');
    } else {
        req.session.data['error'] = { error: 'Approved product not found' };
        return res.redirect('/create/standard/products');
    }
};

exports.g_removeatoleratedproduct = async function (req, res) {
    const { id } = req.params;

    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    const toleratedProducts = req.session.data.toleratedProducts || [];
    const index = toleratedProducts.findIndex(product => product.id === id);

    if (index > -1) {
        toleratedProducts.splice(index, 1);
    }

    req.session.data.toleratedProducts = toleratedProducts;

    return res.render('create/standard/products');
};

exports.g_exceptions = async function (req, res) {
    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    const id = req.session.data['id'];

    if (!id) {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }

    try {
        const standard = await previewClient.getEntry(id);
        return res.render('create/standard/exceptions', { standard });
    } catch (error) {
        console.error("Error fetching standard entry from Contentful:", error);
        req.session.data['error'] = { error: 'Failed to fetch standard entry' };
        return res.redirect('/create');
    }
};

exports.g_addexception = async function (req, res) {
    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    const id = req.session.data['id'];

    if (!id) {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }

    try {
        const standard = await previewClient.getEntry(id);
        return res.render('create/standard/add-exception', { standard });
    } catch (error) {
        console.error("Error fetching standard entry from Contentful:", error);
        req.session.data['error'] = { error: 'Failed to fetch standard entry' };
        return res.redirect('/create');
    }
};

exports.g_contacts = async function (req, res) {
    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    const message = req.session.data['success'];
    req.session.data['success'] = "";

    const id = req.session.data['id'];

    if (!id) {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }

    try {
        const standard = await previewClient.getEntry(id);
        return res.render('create/standard/contacts', { standard, message });
    } catch (error) {
        console.error("Error fetching standard entry from Contentful:", error);
        req.session.data['error'] = { error: 'Failed to fetch standard entry' };
        return res.redirect('/create');
    }
};

exports.g_addcontact = async function (req, res) {
    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    const id = req.session.data['id'];

    if (!id) {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }

    try {
        const standard = await previewClient.getEntry(id);
        const response = await client.getEntries({
            content_type: 'person',
            order: 'fields.name',
            select: 'fields.name,fields.emailAddress'
        });

        const people = response.items.map(item => ({
            text: item.fields.name,
            value: item.fields.emailAddress
        }));

        return res.render('create/standard/add-contact', { people, standard });
    } catch (error) {
        console.error("Error fetching standard entry or people list from Contentful:", error);
        req.session.data['error'] = { error: 'Failed to fetch necessary data' };
        return res.redirect('/create');
    }
};

exports.g_guidance = async function (req, res) {
    if (!req.session.data) {
        return res.redirect('/create/standard');
    }

    const id = req.session.data['id'];

    if (!id) {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }

    try {
        const standard = await previewClient.getEntry(id);
        return res.render('create/standard/guidance', { standard });
    } catch (error) {
        console.error("Error fetching standard entry from Contentful:", error);
        req.session.data['error'] = { error: 'Failed to fetch standard entry' };
        return res.redirect('/create');
    }
};


// POSTS //

exports.p_title = [
    validateTitle,
    async function (req, res) {
        const errors = validationResult(req);
        const id = req.session.data['id'];

        if (!id) {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

        if (!errors.isEmpty()) {
            try {
                const standard = await previewClient.getEntry(id);
                standard.fields.title = "";
                return res.render('create/standard/title', {
                    errors: errors.array(), standard
                });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        }

        // Update the standard entry with any changes to the title
        await updateTitle(id, req.body['title']);
        return res.redirect('/create/standard/summary');
    }
];



exports.p_summary = [
    validateSummary,
    async function (req, res) {
        const errors = validationResult(req);
        const id = req.session.data['id'];

        if (!id) {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

        if (!errors.isEmpty()) {
            try {
                const standard = await previewClient.getEntry(id);
                standard.fields.summary = "";
                return res.render('create/standard/summary', {
                    errors: errors.array(), standard
                });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        }

        // Update the standard entry with any changes to the summary
        await updateSummary(id, req.body['summary']);
        return res.redirect('/create/standard/categories');
    }
];



exports.p_categories = [validateCategory, async function (req, res) {
    try {
        const errors = validationResult(req);
        const id = req.session.data['id'];

        if (!id) {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

        if (!errors.isEmpty()) {
            try {

                const response = await client.getEntries({
                    content_type: 'category',
                    order: 'fields.title',
                    select: 'fields.title,fields.number',
                    'fields.active': true
                });

                const categories = response.items.map(item => {
                    return {
                        text: item.fields.title,
                        value: item.sys.id
                    }
                });

                const standard = await previewClient.getEntry(id);
                return res.render('create/standard/categories', {
                    errors: errors.array(), standard, categories
                });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        }

        const selectedCategories = req.body['categories'];

        // From a checkbox list, may be 1 selected or many, so could be a string or array, so convert to array in all cases

        const selectedCategoriesArray = Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories];


        await updateCategories(id, selectedCategoriesArray);


        return res.redirect('/create/standard/sub-categories');
    } catch (error) {
        console.error("Error updating categories:", error);
        return res.status(500).send("Error updating categories");
    }
}];

exports.p_subcategories = [
    validateSubCategories,
    async function (req, res) {
        try {
            const errors = validationResult(req);
            const id = req.session.data['id'];

            if (!id) {
                req.session.data['error'] = { error: 'No ID found in session data' };
                return res.redirect('/create');
            }

            if (!errors.isEmpty()) {
                const response = await client.getEntries({
                    content_type: 'subCategory',
                    order: 'fields.title'
                });

                const subcategories = response.items.map(item => ({
                    text: item.fields.title,
                    value: item.sys.id,
                    category: item.fields.category.sys.id
                }));

                const standard = await previewClient.getEntry(id);
                return res.render('create/standard/sub-categories', {
                    errors: errors.array(), standard, subcategories
                });
            }

            const selectedSubcategories = req.body['subcategories'];
            const selectedSubCategoriesArray = Array.isArray(selectedSubcategories) ? selectedSubcategories : [selectedSubcategories];
            await updateSubCategories(id, selectedSubCategoriesArray);

            // Redirect to the next step in the flow
            return res.redirect('/create/standard/purpose');
        } catch (error) {
            console.error("Error updating categories:", error);
            return res.status(500).send("Error updating categories");
        }
    }
];


exports.p_purpose = [
    validatePurpose,
    async function (req, res) {

        const errors = validationResult(req);
        const id = req.session.data['id'];

        if (!id) {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

        if (!errors.isEmpty()) {
            try {
                const standard = await previewClient.getEntry(id);
                standard.fields.purpose = "";
                return res.render('create/standard/purpose', {
                    errors: errors.array(), standard
                });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        }

        // Update the standard entry with any changes to the title
        await updatePurpose(id, req.body['purpose']);
        return res.redirect('/create/standard/guidance');
    }
];


exports.p_contacts = async function (req, res) {
    const { id } = req.session.data;

    if (!id) {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/create');
    }

    try {
        const standard = await previewClient.getEntry(id);
        const owners = standard.fields.owners || [];

        if (owners.length === 0) {
            const errors = [{ msg: 'You must have at least one owner' }];
            return res.render('create/standard/contacts', { errors, standard });
        }

        return res.redirect("/create/standard");
    } catch (error) {
        console.error("Error fetching standard entry from Contentful:", error);
        req.session.data['error'] = { error: 'Failed to fetch standard entry' };
        return res.redirect('/create');
    }
}


exports.p_addapprovedproduct = [
    ...validateApprovedFields,

    async function (req, res) {
        const errors = validationResult(req);
        const id = req.session.data['id'];

        if (!id) {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

        // If validation errors exist, re-render the page with errors
        if (!errors.isEmpty()) {
            try {
                const standard = await previewClient.getEntry(id);

                // Render the form with validation errors and the standard data
                return res.render('create/standard/add-approved-product', {
                    errors: errors.array(),
                    standard,
                    formData: req.body // Include form data to populate fields
                });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        }

        // If no validation errors, proceed with the main functionality
        const { approved_name, approved_vendor, approved_version, approved_usecase } = req.body;

        try {
            // Create a new approved product entry
            const newProductEntry = await createApprovedProductEntry(
                approved_name,
                approved_vendor,
                approved_version,
                approved_usecase
            );

            if (newProductEntry) {
                // Update the standard to link the new product entry
                await updateApprovedProductsField(id, newProductEntry.sys.id);

                // Redirect upon successful entry creation and update
                return res.redirect("/create/standard/products");
            }
        } catch (error) {
            console.error("Error adding approved product:", error);
            return res.status(500).send("Failed to add approved product.");
        }
    }
];



exports.p_addtoleratedproduct = [
    ...validateApprovedFields, // Assuming you have validation setup for tolerated products

    async function (req, res) {
        const errors = validationResult(req);
        const { id } = req.session.data;

        if (!id) {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

        // If validation errors exist, re-render the page with errors
        if (!errors.isEmpty()) {
            try {
                const standard = await previewClient.getEntry(id);

                // Render the form with validation errors and the standard data
                return res.render('create/standard/add-tolerated-product', {
                    errors: errors.array(),
                    standard,
                    formData: req.body // Include form data to populate fields
                });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        }

        const { tolerated_name, tolerated_vendor, tolerated_version, tolerated_usecase } = req.body;

        try {
            // Create a new tolerated product entry
            const newProductEntry = await createToleratedProductEntry(
                tolerated_name,
                tolerated_vendor,
                tolerated_version,
                tolerated_usecase
            );

            if (newProductEntry) {
                // Update the standard to link the new product entry
                await updateToleratedProductsField(id, newProductEntry.sys.id);

                // Redirect upon successful entry creation and update
                return res.redirect("/create/standard/products");
            }
        } catch (error) {
            console.error("Error adding tolerated product:", error);
            req.session.data['error'] = { error: 'Failed to add tolerated product' };
            return res.redirect('/create');
        }
    }
];


exports.p_addexception = [
    // Run the validation middlewares (assuming you have a validation setup for `exception` and `exceptiondetail`)
    validateExceptionFields,

    async function (req, res) {
        const errors = validationResult(req);
        const { id } = req.session.data;

        if (!id) {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

        // If there are validation errors, re-render the page with errors
        if (!errors.isEmpty()) {
            try {
                const standard = await previewClient.getEntry(id);

                // Render the form with validation errors and the current form data
                return res.render('create/standard/add-exception', {
                    errors: errors.array(),
                    standard,
                    formData: req.body // Include form data to repopulate fields
                });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        }

        // If no validation errors, proceed with creating the exception entry
        const { exception, exceptiondetail } = req.body;

        try {
            // Create a new exception entry
            const newExceptionEntry = await createExceptionEntry(
                exception,
                exceptiondetail
            );

            if (newExceptionEntry) {
                // Update the standard to link the new exception entry
                await updateExceptionField(
                    id,
                    newExceptionEntry.sys.id
                );

                return res.redirect("/create/standard/exceptions");
            }
        } catch (error) {
            console.error("Error adding exception:", error);
            return res.status(500).send("Failed to add exception.");
        }
    }
];



exports.p_addcontact = [
    validateContactFields,

    async function (req, res) {
        const errorsArray = validationResult(req).array();
        const errors = {};
        errorsArray.forEach(error => {
            errors[error.path] = error.msg; // Mapping error messages by field name
        });
        const { id } = req.session.data;

        // Re-render the form with errors if validation fails
        if (errorsArray.length > 0) {
            try {
                const standard = await previewClient.getEntry(id);

                // Fetch the list of existing people for the dropdown
                const response = await client.getEntries({
                    content_type: 'person',
                    order: 'fields.name',
                    select: 'fields.name,fields.emailAddress'
                });

                const people = response.items.map(item => ({
                    text: item.fields.name,
                    value: item.fields.emailAddress
                }));

                return res.render('create/standard/add-contact', {
                    errorsArray, // Pass errorsArray for the summary
                    errors,      // Pass errors object for inline field messages
                    standard,
                    formData: req.body,
                    people
                });
            } catch (error) {
                console.error("Error fetching standard or people list:", error);
                req.session.data['error'] = { error: 'Failed to fetch necessary data' };
                return res.redirect('/create');
            }
        }

        const { contactType, people, contactEmail, contactName } = req.body;

        try {
            // Case 1: Use `contactEmail` and `contactName` if both are provided
            if (contactEmail && contactName) {
                const person = await createPerson(contactName, contactEmail);
                await updateContactField(id, person.sys.id, contactType);
                return res.redirect('/create/standard/contacts');
            }

            // Case 2: If `contactEmail` and `contactName` are empty, use `people` to fetch contact details
            if (people) {
                const response = await client.getEntries({
                    content_type: 'person',
                    'fields.emailAddress': people
                });
                const person = response.items[0];
                if (person) {
                    await updateContactField(id, person.sys.id, contactType);
                }
            }

            // Redirect if successful
            return res.redirect('/create/standard/contacts');
        } catch (error) {
            console.error("Error handling contact addition:", error);
            return res.status(500).send("Failed to add contact.");
        }
    }
];



exports.p_guidance = [
    validateGuidance,
    async function (req, res) {

        const errors = validationResult(req);
        const id = req.session.data['id'];

        if (!id) {
            req.session.data['error'] = { error: 'No ID found in session data' };
            return res.redirect('/create');
        }

        if (!errors.isEmpty()) {
            try {
                const standard = await previewClient.getEntry(id);
                standard.fields.purpose = "";
                return res.render('create/standard/guidance', {
                    errors: errors.array(), standard
                });
            } catch (error) {
                console.error("Error fetching standard entry from Contentful:", error);
                req.session.data['error'] = { error: 'Failed to fetch standard entry' };
                return res.redirect('/create');
            }
        }

        // Update the standard entry with any changes to the title
        await updateGuidance(id, req.body['guidance']);
        return res.redirect('/create/standard/products');
    }
];



exports.p_submit = async function (req, res) {
    const { action } = req.body;

    // Check if the session data exists
    if (!req.session.data) {
        req.session.data = { error: 'Session data not found' };
        return res.redirect('/create/standard');
    }

    const { id } = req.session.data;

    try {
        const standard = await previewClient.getEntry(id);

        if (!standard) {
            req.session.data['error'] = { error: 'Standard entry not found' };
            return res.redirect('/create/standard');
        }

        if (action === 'Submit') {
            // Get the ID for the stage
            const stageResponse = await client.getEntries({
                content_type: 'stage',
                'fields.number': 40
            });

            if (stageResponse.items.length === 0) {
                req.session.data['error'] = { error: 'Stage not found' };
                return res.redirect('/create/standard');
            }

            const stageId = stageResponse.items[0].sys.id;

            // Update the stage of the standard to 'Draft'
            await updateToDraft(id, stageId, req.session.User.EmailAddress);

            const historyData = {
                action: "Draft submitted",
                actionBy: `${req.session.User.FirstName} ${req.session.User.LastName}`,
                actionByEmail: req.session.User.EmailAddress,
                actionDatetime: new Date().toISOString()
            };

            await addStandardHistoryEntry(standard.sys.id, historyData);

            // Send notify email to submittor, owners

            const owners = standard.fields.owners || [];
            const otherContacts = standard.fields.technicalContacts || [];
            const creatorEmail = standard.fields.creator;

            // create a list of all the emails to send to from the owners

            const publishersList = [];
            const awarenessList = [];

            publishersList.push(creatorEmail);

            owners.forEach(owner => {
                publishersList.push(owner.fields.emailAddress);
            });

            otherContacts.forEach(contact => {
                awarenessList.push(contact.fields.emailAddress);
            });

            // remove any duplicates
            const uniquePublishersList = [...new Set(publishersList)];
            const uniqueawarenessList = [...new Set(awarenessList)];

            // send the email

            const templateParams = {
                standardName: standard.fields.title
            };

            uniquePublishersList.forEach(email => {
                sendNotifyEmail(process.env.email_standardSubmittedPublishers, email, templateParams);
            });

            uniqueawarenessList.forEach(email => {
                sendNotifyEmail(process.env.email_standardSubmittedAwareness, email, templateParams);
            });
   
            // Render the success view
            return res.render('create/standard/success', { id });
        }

        if (action === 'Delete') {
            return res.redirect('/create/standard/confirm-delete');
        }

        req.session.data['error'] = { error: 'Invalid action' };
        return res.redirect('/create/standard');
    } catch (error) {
        console.error("Error handling submit action:", error);
        req.session.data['error'] = { error: 'Failed to handle submit action' };
        return res.redirect('/create/standard');
    }
};

exports.p_manageApprovedProduct = async function (req, res) {
    const { approvedID, approved_name, approved_vendor, approved_version, approved_usecase, manage } = req.body;
    const { id } = req.session.data;

    try {
        if (manage === 'save') {
            await updateApprovedProduct(approvedID, approved_name, approved_vendor, approved_version, approved_usecase);
            req.session.data['success'] = "Changes saved.";
        } else if (manage === 'delete') {
            await removeApprovedProductsField(id, approvedID);
            req.session.data['success'] = "Approved product removed.";
        }
        return res.redirect('/create/standard/products');
    } catch (error) {
        console.error("Error managing approved product:", error);
        req.session.data['error'] = { error: 'Failed to manage approved product' };
        return res.redirect('/create/standard/products');
    }
};

exports.p_manageException = async function (req, res) {
    const { exceptionID, exception, exceptiondetail, manage } = req.body;
    const { id } = req.session.data;

    try {
        if (manage === 'save') {
            await updateException(exceptionID, exception, exceptiondetail);
            req.session.data['success'] = "Changes saved.";
        } else if (manage === 'delete') {
            await removeExceptionField(id, exceptionID);
            req.session.data['success'] = "Exception removed.";
        }
        return res.redirect('/create/standard/exceptions');
    } catch (error) {
        console.error("Error managing exception:", error);
        req.session.data['error'] = { error: 'Failed to manage exception' };
        return res.redirect('/create/standard/exceptions');
    }
};

exports.p_manageContact = async function (req, res) {
    const { contactID, contactType, manage, previousRole } = req.body;
    const { id } = req.session.data;

    try {
        if (manage === 'delete') {
            await removeContactField(id, contactID, previousRole);
            req.session.data['success'] = "Contact removed.";
        } else if (manage === 'save') {
            await updateContactField(id, contactID, contactType);
            req.session.data['success'] = "Changes saved.";
        }
        return res.redirect('/create/standard/contacts');
    } catch (error) {
        console.error("Error managing contact:", error);
        req.session.data['error'] = { error: 'Failed to manage contact' };
        return res.redirect('/create/standard/contacts');
    }
};

exports.p_confirmdelete = async function (req, res) {
    const { id } = req.session.data;

    try {
        await deleteEntry(id);
        req.session.data = {}; // Clear session data after deletion
        return res.redirect('/create/standard/deleted');
    } catch (error) {
        console.error("Error deleting standard:", error);
        req.session.data['error'] = { error: 'Failed to delete standard' };
        return res.redirect('/create/standard');
    }
};
