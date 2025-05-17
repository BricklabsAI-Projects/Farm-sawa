const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

router.post('/register', userController.register);
router.post('/login', userController.login);
router.put('/update-profile-name', userController.updateProfileName);
router.post('/save-message', userController.saveMessage);
router.get('/messages', userController.getMessages);

module.exports = router;