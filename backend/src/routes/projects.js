const express = require('express');
const router = express.Router();

// Placeholder projects route
router.get('/', (req, res) => {
  res.send('Projects route works!');
});

module.exports = router;
