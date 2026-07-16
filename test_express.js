const express = require('express');
const app = express();
app.get('/api/awc/*all', (req, res) => {
    res.json(req.params);
});
app.listen(3001, () => {
    console.log("Listening 3001");
});
