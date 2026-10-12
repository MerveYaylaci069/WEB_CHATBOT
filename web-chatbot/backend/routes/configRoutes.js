const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

router.get('/', configController.listSites);
router.get('/:siteKey/admin', configController.getAdminConfig);
router.post('/:siteKey', configController.updateConfig);
router.get('/:siteKey', configController.getWidgetConfig);
router.delete('/:siteKey', configController.deleteSite);

module.exports = router;
