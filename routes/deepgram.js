var router = require('express').Router();
const deepgramController = require('../controllers/deepgram');

//Sub Routes
router.post('/', deepgramController.transcribe);

//export the router back to the index.js page
module.exports = router;