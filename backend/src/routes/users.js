const express = require('express');
const router = express.Router();

// Placeholder users route
router.get('/', (req, res) => {
  res.send('Users route works!');
});

module.exports = router;
