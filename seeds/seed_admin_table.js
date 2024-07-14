const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  const hashedPassword = await bcrypt.hash(process.env.PASSWORD, 10);
  return knex('admin').del()
    .then(function () {
      return knex('admin').insert([
        { email: 'shubh@test.com', password: hashedPassword, roles: 'admin' }
      ]);
    });
};