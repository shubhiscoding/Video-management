const knex = require('knex')(require('../knexfile').development);

const saveVideo = async (req) => {
    try{
        const { filename, path } = req.file;
        const videoId = await knex('videos').insert({ filename, path });
    } catch (error) {
        throw new Error('Unable to save video');
    }
};

module.exports = {
  saveVideo,
};
