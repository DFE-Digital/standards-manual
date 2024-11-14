exports.up = function (knex) {
    // Ensure the pgcrypto extension is available for UUID generation
    return knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
        .then(() => {
            return knex.schema.createTable('User', table => {
                table.increments('UserID').primary();
                table.uuid('UniqueID').defaultTo(knex.raw('gen_random_uuid()')).notNullable();
                table.string('EmailAddress', 255).notNullable().unique('email_address_unique'); // Add unique constraint inline
                table.string('FirstName', 100).notNullable();
                table.string('LastName', 100).notNullable();
                table.string('Token', 100);
                table.datetime('TokenExpiry', { precision: 6 }).nullable();
            });
        });
};

exports.down = function (knex) {
    // Reverse the order of operations in the down migration
    return knex.schema.dropTable('User')
        .then(() => knex.raw('DROP EXTENSION IF EXISTS "pgcrypto"'));
};
