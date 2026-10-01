const express = require('express');
const app = express();
const port = 8083;

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
  console.log('GET request received:', req.query);
  res.send('GET request received');
});

app.post('/', (req, res) => {
  console.log('POST request received:', req.body);
  res.send('POST request received');
});

app.post('/v2/webhooks', (req, res) => {
  console.log('POST request received:', req.body);
  const {
    created_at,
    event_timestamp,
    event,
    license_key,
    license_status,
    test,
    partner_plan_name,
    unit_quantity,
    parent_license_key
  } = req.body;

  // if (event === 'migrate') return res.json({ success: false });

  res.json({
    event,
    success: true,
    message: 'Your OPTIONAL message',
  });
});

app.get('/v2/redirect-url', (req, res) => {
  console.log('Redirect request received:', req.body);
  const {
    created_at,
    event_timestamp,
    event,
    license_key,
    license_status,
    test,
  } = req.body;

  res.json({
    event,
    success: true,
    message: 'Your OPTIONAL message',
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

