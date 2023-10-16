let express = require('express');
let path = require('path');
let router = express.Router();

/* GET home page. */
router.get('/*', function (req, res, next) {
    res.sendFile(path.resolve(__dirname, './../public/dist/index.html'));
});

module.exports = router;
