require('dotenv').config();
const client = require('../middleware/contentful.js');
const previewClient = require('../middleware/contentful-preview.js');
const managementClient = require('../middleware/contentful-management.js');

const { updateStatus, addStandardHistoryEntry } = require('../data/contentful/updates.js');

const { sendNotifyEmail } = require('../middleware/notify');

// Helper function to fetch a standard entry by ID with error handling
async function fetchStandardById(id) {
    try {
        return await previewClient.getEntry(id);
    } catch (error) {
        console.error(`Error fetching standard with ID ${id}:`, error);
        return null; // Handle the case when the entry is not found or there's an error
    }
}

// Dashboard: Display all standards ordered by 'number' field
exports.g_dashboard = async function (req, res) {
    const { id } = req.params;

    // Define mapping between id and display stage titles
    const stageMap = {
        approval: "Approval",
        approved: "Approved",
        published: "Published",
        rejected: "Rejected",
        archived: "Archived"
    };

    let type = stageMap[id?.toLowerCase()] || "Approval";

    let standards = []; // Placeholder for standards data
    let stageCounts = {}; // Placeholder for stage counts

    try {
        const results = await previewClient.getEntries({
            content_type: "standard",
            order: "fields.number",
        });

        // Set standards if results are valid
        standards = results?.items || [];

        // Initialise stageCounts with all stages set to 0
        Object.values(stageMap).forEach(stage => {
            stageCounts[stage] = 0;
        });

        // Count standards by stage title
        standards.forEach(standard => {
            const stageTitle = standard?.fields?.stage?.fields?.title;
            if (stageCounts.hasOwnProperty(stageTitle)) {
                stageCounts[stageTitle]++;
            }
        });
    } catch (error) {
        console.error("Error fetching entries from Contentful:", error);
    }

    // Render the view with `standards`, `stageCounts`, and `type`
    return res.render("admin/index", { standards, stageCounts, type });
};


// Manage Standard: Display the details of a single standard for management
exports.g_manage = async function (req, res) {
    const { id } = req.params;

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);

            const history = await previewClient.getEntries({
                content_type: "standardHistory",
                "fields.standard.sys.id": id,
                order: "-sys.createdAt"
            });

            let statusTemplate = [
                { status: "Draft", actionBy: "", actionByEmail: "", actionDatetime: "", action: "" },
                { status: "Approval", actionBy: "", actionByEmail: "", actionDatetime: "", action: "" },
                { status: "Outcome", actionBy: "", actionByEmail: "", actionDatetime: "", action: "" },
                { status: "Published", actionBy: "", actionByEmail: "", actionDatetime: "", action: "" }
            ];

            const actionToStatusMap = {
                "Draft created": "Draft",
                "Draft submitted": "Approval",
                "Approved": "Outcome",
                "Rejected": "Outcome",
                "Published": "Published"
            };

            let thistory = history.items;

            thistory.forEach(entry => {
                const action = entry.fields.action;
                const statusLabel = actionToStatusMap[action];

                const statusEntry = statusTemplate.find(item => item.status === statusLabel);
                if (statusEntry) {
                    statusEntry.actionBy = entry.fields.actionBy || "";
                    statusEntry.actionByEmail = entry.fields.actionByEmail || "";
                    statusEntry.actionDatetime = entry.fields.actionDatetime || "";
                    statusEntry.action = entry.fields.action || "";
                }
            });

            // Find last active index with actionBy filled in
            let lastActiveIndex = -1;
            for (let i = statusTemplate.length - 1; i >= 0; i--) {
                if (statusTemplate[i].actionBy) {
                    lastActiveIndex = i;
                    break;
                }
            }

            return res.render('admin/standard/index', { standard, timeline: statusTemplate, lastActiveIndex });

        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/admin');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/admin');
    }
};

exports.g_outcome = async function (req, res) {
    const { id } = req.params;

    const standard = await fetchStandardById(id);

    if (!standard) {
        return res.status(404).send('Standard not found');
    }

    return res.render('admin/standard/approve', { standard });


};

// Approve Standard: Display approval page
exports.g_approve = async function (req, res) {
    const { id } = req.params;
    const standard = await fetchStandardById(id);

    if (!standard) {
        return res.status(404).send('Standard not found');
    }

    return res.render('admin/standard/approve', { standard });
};

exports.g_outcomeapproved = async function (req, res) {
    const { id } = req.params;
    const standard = await fetchStandardById(id);

    if (!standard) {
        return res.status(404).send('Standard not found');
    }

    return res.render('admin/standard/outcome-approved', { standard });
};

exports.g_outcomerejected = async function (req, res) {
    const { id } = req.params;
    const standard = await fetchStandardById(id);

    if (!standard) {
        return res.status(404).send('Standard not found');
    }

    return res.render('admin/standard/outcome-rejected', { standard });
};


// Reject Standard: Display rejection page
exports.g_reject = async function (req, res) {
    const { id } = req.params;
    const standard = await fetchStandardById(id);

    if (!standard) {
        return res.status(404).send('Standard not found');
    }

    return res.render('admin/standard/reject', { standard });
};

// Approved Standard: Display approved page
exports.g_approved = async function (req, res) {
    const { id } = req.params;
    const standard = await fetchStandardById(id);

    if (!standard) {
        return res.status(404).send('Standard not found');
    }

    return res.render('admin/standard/approved', { standard });
};

// Rejected Standard: Display rejected page
exports.g_rejected = async function (req, res) {
    const { id } = req.params;
    const standard = await fetchStandardById(id);

    if (!standard) {
        return res.status(404).send('Standard not found');
    }

    return res.render('admin/standard/rejected', { standard });
};

exports.g_admins = async function (req, res) {

    // Get roles
    const results = await client.getEntries({
        content_type: "roles",
        order: "fields.name"
    });

    // Set standards if results are valid
    let roles = results?.items || [];

    res.render('admin/admins/index', { roles });
};


exports.g_preview = async function (req, res) {
    if (!req.session.data) {
        req.session.data = {};
    }

    const { id } = req.params;

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('admin/standard/preview', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/admin');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/admin');
    }
}
exports.g_previewmeet = async function (req, res) {
    if (!req.session.data) {
        req.session.data = {};
    }

    const { id } = req.params;

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('admin/standard/preview-meet', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/admin');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/admin');
    }
}

exports.g_previewproducts = async function (req, res) {
    if (!req.session.data) {
        req.session.data = {};
    }

    const { id } = req.params;

    if (id) {
        try {
            const standard = await previewClient.getEntry(id);
            return res.render('admin/standard/preview-products', { standard });
        } catch (error) {
            console.error("Error fetching standard entry from Contentful:", error);
            req.session.data['error'] = { error: 'Failed to fetch standard entry' };
            return res.redirect('/admin');
        }
    } else {
        req.session.data['error'] = { error: 'No ID found in session data' };
        return res.redirect('/admin');
    }
}






// Handle Approval Form Submission
exports.p_approval = async function (req, res) {
    const { standard_id, approval } = req.body;

    if (approval === "approve") {
        return res.redirect(`/admin/standard/approve/${standard_id}`);
    } else {
        return res.redirect(`/admin/standard/reject/${standard_id}`);
    }
};

// Handle Approval Confirmation
exports.p_outcome = async function (req, res) {
    const { standard_id, outcome, reason } = req.body;

    //ToDo: Validate the form data

    // Based on the selected outcome, set the status

    const standard = await previewClient.getEntry(standard_id);

    const owners = standard.fields.owners || [];
    const creatorEmail = standard.fields.creator;

    // create a list of all the emails to send to from the owners

    const publishersList = [];
    publishersList.push(creatorEmail);

    owners.forEach(owner => {
        publishersList.push(owner.fields.emailAddress);
    });

    const uniquePublishersList = [...new Set(publishersList)];

    // send the email

    const templateParams = {
        standardName: standard.fields.title
    };

    if (outcome === 'Approve') {

        // Update the statius of the standard to 'Approved'

        const stage = await client.getEntries({
            content_type: 'stage',
            'fields.number': 41 // appproved
        });

        const stageId = stage.items[0].sys.id;

        await updateStatus(standard_id, stageId);

        const historyData = {
            action: "Approved",
            actionBy: req.session.User.FirstName + " " + req.session.User.LastName,
            actionByEmail: req.session.User.EmailAddress,
            actionDatetime: new Date().toISOString(),
            comments: ""
        }

        await addStandardHistoryEntry(standard_id, historyData);

        // TODO: Send email to the creator, owner and points of contact to say it's been approved


        const templateParams = {
            standardName: standard.fields.title,
            serviceURL: process.env.serviceURL,
            standardId: standard_id

        };

        uniquePublishersList.forEach(email => {
            sendNotifyEmail(process.env.email_forumApproved, email, templateParams);
        });

        return res.redirect(`/admin/standard/outcome-approved/${standard_id}`);

    }

    if (outcome === 'Reject') {

        // Update the statius of the standard to 'Approved'

        const stage = await client.getEntries({
            content_type: 'stage',
            'fields.number': 42 // rejected
        });

        const stageId = stage.items[0].sys.id;

        await updateStatus(standard_id, stageId);

        const historyData = {
            action: "Rejected",
            actionBy: req.session.User.FirstName + " " + req.session.User.LastName,
            actionByEmail: req.session.User.EmailAddress,
            actionDatetime: new Date().toISOString(),
            comments: reason
        }

        await addStandardHistoryEntry(standard_id, historyData);

        // TODO: Send email to the creator, owner and points of contact to say it's been rejected with the reason

        const templateParams = {
            standardName: standard.fields.title,
            reason: reason,
            serviceURL: process.env.serviceURL,
            standardId: standard_id
        };

        uniquePublishersList.forEach(email => {
            sendNotifyEmail(process.env.email_forumRejected, email, templateParams);
        });


    }

    // Send submittor, owner an email with the outcome 

    return res.redirect(`/admin/standard/${standard_id}`);
};

exports.p_publish = async function (req, res) {
    const { standard_id, action } = req.body;

    //ToDo: Validate the form data

    // Based on the selected outcome, set the status

    const spaceId = process.env.spaceID;
    const space = await managementClient.getSpace(spaceId);
    const environment = await space.getEnvironment(process.env.environmentID);

    if (action === 'Publish') {

        // Update the statius of the standard to 'Approved'

        const stage = await client.getEntries({
            content_type: 'stage',
            'fields.number': 80 // published
        });

        const stageId = stage.items[0].sys.id;

        await updateStatus(standard_id, stageId);

        // Once updated, publish the standard
        const standard = await environment.getEntry(standard_id);
        await standard.publish();

        // Send notify email to the creator, owner and points of contact to say it's been published with link to view in the standards manual

        const historyData = {
            action: "Published",
            actionBy: req.session.User.FirstName + " " + req.session.User.LastName,
            actionByEmail: req.session.User.EmailAddress,
            actionDatetime: new Date().toISOString(),
            comments: ""
        }

        await addStandardHistoryEntry(standard_id, historyData);
    }

    if (action === 'Revert') {

        // Update the statius of the standard to 'Approved'

        const stage = await client.getEntries({
            content_type: 'stage',
            'fields.number': 20 // Back to draft
        });

        const stageId = stage.items[0].sys.id;

        await updateStatus(standard_id, stageId);

        const historyData = {
            action: "Revert to draft",
            actionBy: req.session.User.FirstName + " " + req.session.User.LastName,
            actionByEmail: req.session.User.EmailAddress,
            actionDatetime: new Date().toISOString(),
            comments: ""
        }

        await addStandardHistoryEntry(standard_id, historyData);

    }

    return res.redirect(`/admin/standard/${standard_id}`);
};
