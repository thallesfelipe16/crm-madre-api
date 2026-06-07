const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/dashboard.controller');

router.get('/stats', auth, c.stats);

module.exports = router;
