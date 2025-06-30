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
const sns = new AWS.SNS();
const TABLE_NAME = 'DummyItems';
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:697771866556:ItemDeletionNotifications'; // Langsung di-set disini

// Enhanced CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://dummy-website-aws.s3-website-us-east-1.amazonaws.com',
    'http://dummy-website-alb-2063630277.us-east-1.elb.amazonaws.com'
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Enhanced endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'AWS CRUD API',
    sns_topic: SNS_TOPIC_ARN,
    timestamp: new Date().toISOString()
  });
});

// Get all items
app.get('/items', async (req, res) => {
  try {
    const data = await dynamoDB.scan({ TableName: TABLE_NAME }).promise();
    res.json({
      success: true,
      data: data.Items || [],
      count: data.Count || 0
    });
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch items',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Add new item
app.post('/items', async (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({ 
      success: false,
      error: 'Item name is required' 
    });
  }

  const newItem = {
    id: Date.now().toString(),
    name: req.body.name,
    description: req.body.description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: newItem
    }).promise();
    
    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Item created successfully'
    });
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save item',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Delete item with enhanced SNS notification
app.delete('/items/:id', async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ 
      success: false,
      error: 'Item ID is required' 
    });
  }

  try {
    // 1. Verify item exists
    const getResponse = await dynamoDB.get({
      TableName: TABLE_NAME,
      Key: { id: req.params.id }
    }).promise();

    if (!getResponse.Item) {
      return res.status(404).json({ 
        success: false,
        error: 'Item not found' 
      });
    }

    // 2. Delete item
    const deleteResponse = await dynamoDB.delete({
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      ReturnValues: 'ALL_OLD'
    }).promise();

    const deletedItem = deleteResponse.Attributes;

    // 3. Send SNS notification (enhanced)
    const snsParams = {
      TopicArn: SNS_TOPIC_ARN,
      Subject: `ITEM DELETED: ${deletedItem.name || deletedItem.id}`,
      Message: JSON.stringify({
        eventType: 'ITEM_DELETED',
        timestamp: new Date().toISOString(),
        item: deletedItem,
        metadata: {
          deletedBy: req.ip,
          userAgent: req.headers['user-agent']
        }
      }, null, 2),
      MessageAttributes: {
        'event_type': {
          DataType: 'String',
          StringValue: 'item_deletion'
        },
        'severity': {
          DataType: 'String',
          StringValue: 'low'
        }
      }
    };

    console.log('Attempting to send SNS notification:', JSON.stringify(snsParams, null, 2));
    
    const snsResponse = await sns.publish(snsParams).promise();
    console.log('SNS Notification sent successfully:', snsResponse.MessageId);

    // 4. Return success response
    res.json({
      success: true,
      data: deletedItem,
      message: 'Item deleted successfully',
      snsMessageId: snsResponse.MessageId
    });

  } catch (err) {
    console.error('Delete operation failed:', err);
    
    // Detailed error logging
    const errorDetails = {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      ...(err.originalError && { originalError: err.originalError })
    };

    res.status(500).json({ 
      success: false,
      error: 'Failed to delete item',
      details: errorDetails
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    snsTopic: SNS_TOPIC_ARN
  });
});

// Enhanced error handling
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SNS Topic: ${SNS_TOPIC_ARN}`);
  console.log(`DynamoDB Table: ${TABLE_NAME}`);
});