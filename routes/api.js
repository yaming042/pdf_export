let express = require('express');
let router = express.Router();

router.get('/test', (req, res, next) => {
    res.json({status: 200, data: 'api ok', message: 'success'});
});

module.exports = router;
