const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Placeholder routes
app.get('/', (req, res) => res.send('SGFMAN API Running'));
app.use('/auth', require('./routes/auth'));
app.use('/projects', require('./routes/projects'));
app.use('/users', require('./routes/users'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SGFMAN API listening on port ${PORT}`));
