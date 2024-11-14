require("dotenv").config();

const client = require("../../middleware/contentful.js")
const previewClient = require("../../middleware/contentful-preview.js");
const managementClient = require("../../middleware/contentful-management.js");

// Helpers

async function getSpaceAndEnvironment() {
    const spaceId = process.env.spaceID;
    const environmentId = process.env.environmentID;
    const space = await managementClient.getSpace(spaceId);
    return await space.getEnvironment(environmentId);
}

async function updateEntry(entryId, updateFields) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);
        Object.assign(entry.fields, updateFields);
        const updatedEntry = await entry.update();
        console.log(`Entry ${entryId} updated successfully.`);
        return updatedEntry;
    } catch (error) {
        handleError(`updating entry ${entryId}`, error);
    }
}

async function createEntry(entryType, fields) {
    try {
        const environment = await getSpaceAndEnvironment();
        const newEntry = await environment.createEntry(entryType, { fields });
        await newEntry.publish();
        console.log(`${entryType} entry created successfully:`, newEntry.sys.id);
        return newEntry;
    } catch (error) {
        handleError(`creating ${entryType} entry`, error);
    }
}


async function deleteEntry(entryId) {

    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        await entry.delete();
        console.log(`Entry ${entryId} deleted successfully.`);
    } catch (error) {
        handleError(`deleting entry ${entryId}`, error);
    }
}

async function addStandardHistoryEntry(standardId, historyData) {
    try {
        const environment = await getSpaceAndEnvironment();

        const historyEntry = await environment.createEntry('standardHistory', {
            fields: {
                action: { 'en-US': historyData.action },
                standard: { 'en-US': { sys: { type: "Link", linkType: "Entry", id: standardId } } },
                actionBy: { 'en-US': historyData.actionBy },
                actionByEmail: { 'en-US': historyData.actionByEmail },
                actionDatetime: { 'en-US': historyData.actionDatetime || new Date().toISOString() },
                comments: { 'en-US': historyData.comments }
            }
        });
      
        await historyEntry.publish();

    } catch (error) {
        handleError('adding standard history entry', error);
    }
}




async function handleError(action, error) {
    console.error(`Error ${action}:`, error);
    throw error; // Rethrow for upstream handling if needed
}


// Functions

async function updateTitle(entryId, value) {
    return await updateEntry(entryId, {
        title: { "en-US": value },
    });
}

async function updateVersion(entryId, value) {
    return await updateEntry(entryId, {
        version: { "en-US": value },
    });
}

async function updatePreviousVersion(entryId, value) {
    return await updateEntry(entryId, {
        previousVersion: { "en-US": value },
    });
}


async function updateSummary(entryId, value) {
    return await updateEntry(entryId, {
        summary: { "en-US": value },
    });
}

async function updateGuidance(entryId, value) {
    return await updateEntry(entryId, {
        guidance: { "en-US": value },
    });
}

async function updateStatus(entryId, value) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        // Set the stage field with the new linked entry
        entry.fields.stage = {
            "en-US": {
                sys: { type: "Link", linkType: "Entry", id: value }
            }
        };
        const updatedEntry = await entry.update();

    } catch (error) {
        handleError('updating stage field', error);
    }
}

async function updateToDraft(entryId, value, email) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        // Set the stage field with the new linked entry
        entry.fields.stage = {
            "en-US": {
                sys: { type: "Link", linkType: "Entry", id: value }
            }
        };

        let now = new Date().toISOString();

        entry.fields.draftCreatedAt = {
            "en-US": now
        };

        entry.fields.draftCreatedBy = {
            "en-US": email
        };



        const updatedEntry = await entry.update();

    } catch (error) {
        handleError('updating stage field', error);
    }
}


async function updateCategories(entryId, selectedCategories) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);


        if (!entry.fields.category) {
            entry.fields.category = { 'en-US': [] };
        }


        entry.fields.category['en-US'] = [];

        // Add each selected category as a linked entry

        console.log('selectedCategories', selectedCategories)

        for (const category of selectedCategories) {



            entry.fields.category['en-US'].push({
                sys: { type: "Link", linkType: "Entry", id: category },
            });
        }
        return await entry.update();

    } catch (error) {
        handleError('updating categories', error);
    }
}

async function updateSubCategories(entryId, selectedSubCategories) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);


        if (!entry.fields.subCategory) {
            entry.fields.subCategory = { 'en-US': [] };
        }


        entry.fields.subCategory['en-US'] = [];

        // Add each selected sub category as a linked entry

        console.log('selectedSubCategories', selectedSubCategories)

        for (const category of selectedSubCategories) {



            entry.fields.subCategory['en-US'].push({
                sys: { type: "Link", linkType: "Entry", id: category },
            });
        }
        return await entry.update();

    } catch (error) {
        handleError('updating sub categories', error);
    }
}

async function updatePurpose(entryId, value) {
    return await updateEntry(entryId, {
        purpose: { "en-US": value },
    });
}

async function createApprovedProductEntry(product, vendor, version, usecase) {
    try {
        console.log(product, vendor, version, usecase);

        return await createEntry("approvedProducts", {
            product: { "en-US": product },
            vendor: { "en-US": vendor },
            version: { "en-US": version },
            useCase: { "en-US": usecase },
        });
    } catch (error) {
        handleError('creating approved product entry', error);
    }
}

async function updateApprovedProductsField(entryId, newProductEntryId) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        if (!entry.fields.approvedProducts) {
            entry.fields.approvedProducts = { "en-US": [] };
        }

        entry.fields.approvedProducts["en-US"].push({
            sys: { type: "Link", linkType: "Entry", id: newProductEntryId },
        });

        // Update the approvedProducts field
        const updateFields = {
            approvedProducts: entry.fields.approvedProducts,
        };

        return await updateEntry(entryId, updateFields);
    } catch (error) {
        handleError('updating approved products field', error);
    }
}

async function createToleratedProductEntry(product, vendor, version, usecase) {
    try {
        console.log(product, vendor, version, usecase);

        return await createEntry("toleratedProducts", {
            product: { "en-US": product },
            vendor: { "en-US": vendor },
            version: { "en-US": version },
            useCase: { "en-US": usecase },
        });
    } catch (error) {
        handleError('creating tolerated product entry', error);
    }
}

async function createPerson(name, email) {
    // Only create a new person if they don't already exist in the space (based on email)

    try {

        const environment = await getSpaceAndEnvironment();
        const existingPerson = await environment.getEntries({
            content_type: 'person',
            'fields.emailAddress': email,
        });

        if (existingPerson.items.length > 0) {
            return existingPerson.items[0];
        }

        return await createEntry("person", {
            name: { "en-US": name },
            emailAddress: { "en-US": email },
        });

    } catch (error) {
        handleError('creating person', error);
    }
}

async function updateToleratedProductsField(entryId, newProductEntryId) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        if (!entry.fields.toleratedProducts) {
            entry.fields.toleratedProducts = { "en-US": [] };
        }

        entry.fields.toleratedProducts["en-US"].push({
            sys: { type: "Link", linkType: "Entry", id: newProductEntryId },
        });

        // Update the toleratedProducts field
        const updateFields = {
            toleratedProducts: entry.fields.toleratedProducts,
        };

        return await updateEntry(entryId, updateFields);
    } catch (error) {
        handleError('updating tolerated products field', error);
    }
}

async function createExceptionEntry(exception, exceptiondetail) {
    try {

        return await createEntry("exceptions", {
            title: { "en-US": exception },
            details: { "en-US": exceptiondetail },
            active: { "en-US": true }
        });
    } catch (error) {
        handleError('creating exceptions entry', error);
    }
}



async function updateExceptionField(entryId, newExceptionEntry) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        if (!entry.fields.exceptions) {
            entry.fields.exceptions = { "en-US": [] };
        }

        entry.fields.exceptions["en-US"].push({
            sys: { type: "Link", linkType: "Entry", id: newExceptionEntry },
        });

        // Update the exceptions field
        const updateFields = {
            exceptions: entry.fields.exceptions,
        };

        return await updateEntry(entryId, updateFields);
    } catch (error) {
        handleError('updating exceptions field', error);
    }
}

async function updateContactField(entryId, newPersonEntryId, role) {

    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        if (role === 'Owner') {
            if (!entry.fields.owners) {
                entry.fields.owners = { "en-US": [] };
            }

            entry.fields.owners["en-US"].push({
                sys: { type: "Link", linkType: "Entry", id: newPersonEntryId },
            });

            // Update the owner field

            const updateFields = {
                owners: entry.fields.owners,
            };

            return await updateEntry(entryId, updateFields);

        }

        if (role === 'General contact') {

            if (!entry.fields.technicalContacts) {
                entry.fields.technicalContacts = { "en-US": [] };
            }

            entry.fields.technicalContacts["en-US"].push({
                sys: { type: "Link", linkType: "Entry", id: newPersonEntryId },
            });

            // Update the technicalContact field

            const updateFields = {
                technicalContacts: entry.fields.technicalContacts,
            };

            return await updateEntry(entryId, updateFields);

        }

    } catch (error) {
        handleError('updating contact field', error);
    }

}


async function removeApprovedProductsField(entryId, newProductEntryId) {
    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        // Remove the product from the approvedProducts field

        entry.fields.approvedProducts["en-US"] = entry.fields.approvedProducts["en-US"].filter(product => product.sys.id !== newProductEntryId);

        // Update the approvedProducts field
        const updateFields = {
            approvedProducts: entry.fields.approvedProducts,
        };

        return await updateEntry(entryId, updateFields);

    } catch (error) {
        handleError('updating tolerated products field', error);
    }
}



async function updateApprovedProduct(productEntryId, product, vendor, version, usecase) {

    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(productEntryId);

        Object.assign(entry.fields, {
            product: { "en-US": product },
            vendor: { "en-US": vendor },
            version: { "en-US": version },
            useCase: { "en-US": usecase },
        });

        return await entry.update();

    }
    catch (error) {
        handleError('updating approved product', error);
    }
}

async function updateException(exceptionEntryId, exception, exceptiondetail) {

    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(exceptionEntryId);

        Object.assign(entry.fields, {
            title: { "en-US": exception },
            details: { "en-US": exceptiondetail },
        });

        return await entry.update();

    }
    catch (error) {
        handleError('updating exception', error);
    }
}

async function removeExceptionField(entryId, newExceptionEntryId) {

    try {
        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        // Remove the exception from the exceptions field

        entry.fields.exceptions["en-US"] = entry.fields.exceptions["en-US"].filter(exception => exception.sys.id !== newExceptionEntryId);

        // Update the exceptions field
        const updateFields = {
            exceptions: entry.fields.exceptions,
        };

        return await updateEntry(entryId, updateFields);

    }
    catch (error) {
        handleError('updating exceptions field', error);
    }
}

async function removeContactField(entryId, newPersonEntryId, previousRole) {
    // We use previous role, incase the user changes the type and the clicks the remove button. Just incase the person assigned is both owner and technical.
    try {

        const environment = await getSpaceAndEnvironment();
        const entry = await environment.getEntry(entryId);

        if (previousRole === 'owner') {

            // Remove the person from the owners field

            entry.fields.owners["en-US"] = entry.fields.owners["en-US"].filter(person => person.sys.id !== newPersonEntryId);

            // Update the owners field
            const updateFields = {
                owners: entry.fields.owners,
            };

            return await updateEntry(entryId, updateFields);

        }

        if (previousRole === 'general contact') {

            // Remove the person from the technicalContacts field

            entry.fields.technicalContacts["en-US"] = entry.fields.technicalContacts["en-US"].filter(person => person.sys.id !== newPersonEntryId);

            // Update the technicalContacts field

            const updateFields = {
                technicalContacts: entry.fields.technicalContacts,
            };

            return await updateEntry(entryId, updateFields);

        }

    } catch (error) {
        handleError('updating contact field', error);
    }

}

async function createStandardEntry(standardData) {
    try {
        const spaceId = process.env.spaceID;
        const environmentId = process.env.environmentID;

        const space = await managementClient.getSpace(spaceId);
        const environment = await space.getEnvironment(environmentId);

        const newEntry = await environment.createEntry('standard', {
            fields: {
                title: {
                    'en-US': standardData.title
                },
                stage: {
                    'en-US': {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: standardData.stageId
                        }
                    }
                },
                number: {
                    'en-US': standardData.number
                },
                owners: {
                    'en-US': standardData.owners ? standardData.owners.map(ownerId => ({
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: ownerId
                        }
                    })) : []
                },
                technicalContacts: {
                    'en-US': standardData.technicalContacts ? standardData.technicalContacts.map(contactId => ({
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: contactId
                        }
                    })) : []
                },
                summary: {
                    'en-US': standardData.summary
                },
                purpose: {
                    'en-US': standardData.purpose
                },
                compliance: {
                    'en-US': standardData.compliance
                },
                considerations: {
                    'en-US': standardData.considerations
                },
                templates: {
                    'en-US': standardData.templates
                },
                relatedGuidance: {
                    'en-US': standardData.relatedGuidance
                },
                slug: {
                    'en-US': standardData.slug
                },
                version: {
                    'en-US': standardData.version
                },
                previousVersion: {
                    'en-US': standardData.previousVersion
                },
                category: {
                    'en-US': standardData.category ? standardData.category.map(categoryId => ({
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: categoryId
                        }
                    })) : []
                },
                subCategory: {
                    'en-US': standardData.subCategory ? standardData.subCategory.map(subCategoryId => ({
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: subCategoryId
                        }
                    })) : []
                },
                toleratedProducts: {
                    'en-US': standardData.toleratedProducts ? standardData.toleratedProducts.map(productId => ({
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: productId
                        }
                    })) : []
                },
                approvedProducts: {
                    'en-US': standardData.approvedProducts ? standardData.approvedProducts.map(productId => ({
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: productId
                        }
                    })) : []
                },
                exceptions: {
                    'en-US': standardData.exceptions ? standardData.exceptions.map(exceptionId => ({
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: exceptionId
                        }
                    })) : []
                },
                creator: {
                    'en-US': standardData.creator
                },
            }
        });



        console.log('Entry created successfully:', newEntry.sys.id);

        return newEntry.sys.id;

    } catch (error) {
        console.error('Error creating entry:', error);
    }
}



module.exports = { createStandardEntry, updateTitle, updateSummary, updateCategories, updatePurpose, updateGuidance, createApprovedProductEntry, updateApprovedProductsField, createToleratedProductEntry, updateToleratedProductsField, removeApprovedProductsField, updateApprovedProduct, createExceptionEntry, updateExceptionField, updateException, removeExceptionField, createPerson, updateContactField, removeContactField, updateSubCategories, updateStatus, deleteEntry, updateToDraft, addStandardHistoryEntry, updateVersion, updatePreviousVersion };