require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    },
    pool: {
      min: 2,
      max: 10,  // Adjust this value to your needs, higher for larger apps
    },
    migrations: {
      directory: './app/data/migrations',
    },
    seeds: {
      directory: './app/data/seeds',
    },
  },
};