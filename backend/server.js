const AWS = require('aws-sdk');
const express = require('express');
const app = express();

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'DummyItems';

// Enhanced CORS configuration
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://dummy-website-aws.s3-website-us-east-1.amazonaws.com',
    'http://localhost:3000' // For local testing
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const healthcheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: 'pending'
      }
    }
  };

  try {
    // Test database connection
    await dynamoDB.listTables({}).promise();
    healthcheck.checks.database.status = 'healthy';
    res.status(200).json(healthcheck);
  } catch (err) {
    healthcheck.status = 'Degraded';
    healthcheck.checks.database.status = 'unhealthy';
    healthcheck.checks.database.error = err.message;
    res.status(503).json(healthcheck);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Backend is running',
    endpoints: {
      health: '/health',
      items: {
        get: '/items',
        post: '/items'
      }
    }
  });
});

// Get all items with pagination support
app.get('/items', async (req, res) => {
  const params = {
    TableName: TABLE_NAME,
    Limit: req.query.limit || 10
  };

  if (req.query.lastKey) {
    params.ExclusiveStartKey = JSON.parse(req.query.lastKey);
  }

  try {
    const data = await dynamoDB.scan(params).promise();
    res.json({
      items: data.Items || [],
      lastKey: data.LastEvaluatedKey
    });
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch items',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Add new item with validation
app.post('/items', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { name, description } = req.body;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Valid name is required' });
  }

  const params = {
    TableName: TABLE_NAME,
    Item: {
      id: Date.now().toString(),
      name: name.trim(),
      description: (description || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  try {
    await dynamoDB.put(params).promise();
    res.status(201).json(params.Item);
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ 
      error: 'Failed to save item',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});