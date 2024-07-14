const knex = require('knex')(require('../knexfile').development);

const saveVideo = async (req) => {
    try{
        const video = {
            filename: req.file.filename,
            path: req.file.path
          };
        
        const [id] = await knex('videos').insert(video).returning('id');
          const videoId = id['id'];
        return {
            videoId,
            name: video.name
        };
    } catch (error) {
        throw new Error('Unable to save video');
    }
};

async function getVideoById(id) {
    return knex('videos').where({ id }).first();
}

async function saveTrimmedVideo(file) {
    const [id] = await knex('videos').insert({ 
      filename: file.filename,
      path: file.path
    }).returning('id');
    const videoId = id['id'];
    return { videoId, name: file.filename };
}

async function getVideoPathFromDB(id) {
    try {
      const video = await knex('videos').where({ id }).select('path').first();
      if (!video) {
        return null;
      }
      return video.path;
    } catch (error) {
      console.error('Error fetching video path from DB:', error.message);
      throw error;
    }
  }

const saveMergedVideo = async (file) => {
  try{
    const video = {
        filename: file.name,
        path: file.path
      };
    
    const [id] = await knex('videos').insert(video).returning('id');
      const videoId = id['id'];
    return {
        videoId,
        name: video.name
    };
  } catch (error) {
      throw new Error('Unable to save video');
  }
};

module.exports = {
  saveVideo,
  getVideoById,
  saveTrimmedVideo,
  saveMergedVideo,
  getVideoPathFromDB,
};
