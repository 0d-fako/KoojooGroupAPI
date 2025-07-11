const express = require('express');
const GroupController = require('../controllers/groupController');

const router = express.Router();


router.post('/', GroupController.createGroup);
router.get('/:groupId', GroupController.getGroup);
router.get('/treasurer/:treasurerId', GroupController.getTreasurerGroups);
router.get('/', GroupController.getAllGroups);

module.exports = router;