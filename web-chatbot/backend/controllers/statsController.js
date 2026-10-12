const statsService = require('../services/statsService');

const getStats = (req, res) => {
    res.json(statsService.getStatsBySite());
};

module.exports = { getStats };
