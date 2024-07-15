const knex = require('knex')(require('../knexfile').development);

const saveToken = async (req) => {
    try{
        const token = {
            Tokenid: req.Tokenid,
            videoId: req.videoId,
            expiryTime: req.expiryTime
        }
        return knex('tokens').insert(token);
    }catch(error){
        console.error('Error saving token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTokenById = async (tokenId) => {
    try{
        return knex('tokens').where({ Tokenid: tokenId }).first();
    }catch(error){
        console.error('Error getting token:', error);
        res.status(404).json({ error: 'Token Not FOund' });
    }
}

const deleteToken = async (Tokenid) => {
    return knex('tokens').where({ Tokenid }).delete();
}

module.exports = {
    saveToken,
    getTokenById,
    deleteToken
};
