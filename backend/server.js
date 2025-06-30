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
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

// CORS middleware
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
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Get all items - modified for table structure
app.get('/items', async (req, res) => {
  const params = {
    TableName: TABLE_NAME
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    // Format data untuk tabel dengan menyertakan ID untuk operasi edit/hapus
    const items = (data.Items || []).map(item => ({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      createdAt: item.createdAt || ''
    }));
    res.json(items);
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Add new item - modified to return complete item data
app.post('/items', async (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  const newItem = {
    id: Date.now().toString(),
    name: req.body.name,
    description: req.body.description || '',
    createdAt: new Date().toISOString()
  };

  const params = {
    TableName: TABLE_NAME,
    Item: newItem
  };

  try {
    await dynamoDB.put(params).promise();
    res.status(201).json(newItem);
  } catch (err) {
    console.error('DynamoDB error:', err);
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// Add new endpoint for item operations
// Perbaikan endpoint DELETE di server.js
// app.delete('/items/:id', async (req, res) => {
//   // Validasi ID
//   if (!req.params.id) {
//     return res.status(400).json({ error: 'Item ID is required' });
//   }

//   const params = {
//     TableName: TABLE_NAME,
//     Key: {
//       id: req.params.id
//     },
//     ReturnValues: 'ALL_OLD' // Mengembalikan data yang dihapus
//   };

//   try {
//     const data = await dynamoDB.delete(params).promise();
//     if (!data.Attributes) {
//       return res.status(404).json({ error: 'Item not found' });
//     }
//     res.json({ 
//       message: 'Item deleted successfully',
//       deletedItem: data.Attributes 
//     });
//   } catch (err) {
//     console.error('DynamoDB error:', err);
//     res.status(500).json({ error: 'Failed to delete item', details: err.message });
//   }
// });

app.delete('/items/:id', async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ 
      success: false,
      error: 'Item ID is required' 
    });
  }

  try {
    // 1. Cek item exist terlebih dahulu
    const getParams = {
      TableName: TABLE_NAME,
      Key: { id: req.params.id }
    };
    
    const existingItem = await dynamoDB.get(getParams).promise();
    
    if (!existingItem.Item) {
      return res.status(404).json({ 
        success: false,
        error: 'Item not found' 
      });
    }

    // 2. Hapus item
    const deleteParams = {
      TableName: TABLE_NAME,
      Key: { id: req.params.id },
      ReturnValues: 'ALL_OLD'
    };
    
    const result = await dynamoDB.delete(deleteParams).promise();
    const deletedItem = result.Attributes;

    // 3. Kirim notifikasi SNS
    if (SNS_TOPIC_ARN) {
      const snsParams = {
        TopicArn: SNS_TOPIC_ARN,
        Subject: `Item Deleted: ${deletedItem.name || deletedItem.id}`,
        Message: `Item berikut telah dihapus:\n\n` +
                 `ID: ${deletedItem.id}\n` +
                 `Nama: ${deletedItem.name || 'N/A'}\n` +
                 `Deskripsi: ${deletedItem.description || 'N/A'}\n` +
                 `Dihapus pada: ${new Date().toISOString()}\n\n` +
                 `Detail lengkap:\n${JSON.stringify(deletedItem, null, 2)}`,
        MessageStructure: 'string'
      };

      await sns.publish(snsParams).promise();
      console.log('Notifikasi SNS terkirim untuk item yang dihapus');
    }

    // 4. Return response
    res.json({
      success: true,
      data: deletedItem,
      message: 'Item deleted successfully'
    });
    
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete item',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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