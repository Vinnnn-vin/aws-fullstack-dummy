const AWS = require('aws-sdk');
const express = require('express');
const app = express();

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'DummyItems';

app.use(express.json());

app.get('/items', async (req, res) => {
  const params = {
    TableName: TABLE_NAME
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    res.json(data.Items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/items', async (req, res) => {
  const params = {
    TableName: TABLE_NAME,
    Item: {
      id: Date.now().toString(),
      ...req.body
    }
  };

  try {
    await dynamoDB.put(params).promise();
    res.status(201).json(params.Item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});