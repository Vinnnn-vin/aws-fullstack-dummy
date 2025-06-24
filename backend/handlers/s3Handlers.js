module.exports.uploadFile = (s3) => async (req, res) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: req.body.filename,
    Body: req.body.content
  };

  try {
    const data = await s3.upload(params).promise();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.listFiles = (s3) => async (req, res) => {
  const params = {
    Bucket: process.env.S3_BUCKET
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    res.status(200).json(data.Contents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};