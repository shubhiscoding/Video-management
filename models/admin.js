const knex = require('knex')(require('../knexfile').development);

const getAdminByEmail = async (email) => {
  return knex('admin').where({ email }).first();
};

module.exports = {
  getAdminByEmail,
};
