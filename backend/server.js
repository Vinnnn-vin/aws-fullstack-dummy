const AWS = require('aws-sdk');
const express = require('express');
const app = express();

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Recommended for security
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'DummyItems';

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://dummy-website-aws.s3-website-us-east-1.amazonaws.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Get all items
app.get('/items', async (req, res) => {
  const params = {
    TableName: TABLE_NAME
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    res.json(data.Items || []);
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Add new item
app.post('/items', async (req, res) => {
  // Validasi input
  if (!req.body.name) {
    return res.status(400).json({ error: 'Nama harus diisi' });
  }

  const params = {
    TableName: TABLE_NAME,
    Item: {
      id: Date.now().toString(),
      name: req.body.name,  // Pastikan field name ada
      description: req.body.description || '',  // Default value jika kosong
      createdAt: new Date().toISOString()
    }
  };

  try {
    await dynamoDB.put(params).promise();
    res.status(201).json(params.Item); // Kirim kembali data yang disimpan
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ error: 'Gagal menyimpan data' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});