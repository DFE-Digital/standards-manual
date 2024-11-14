const managementClient = require('./contentful-management.js');


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



module.exports = createStandardEntry;