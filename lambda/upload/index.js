const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EFS_MOUNT = process.env.EFS_MOUNT_PATH || '/mnt/efs';

exports.handler = async (event) => {
  console.log('📤 Upload Handler Starting...');

  try {
    const { httpMethod, path: requestPath } = event;

    if (requestPath.includes('/upload/chunk')) {
      return await handleChunkUpload(event);
    } else if (requestPath === '/upload' && httpMethod === 'POST') {
      return await handleCompleteUpload(event);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('❌ Upload error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Upload failed',
        details: error.message
      })
    };
  }
};

async function handleChunkUpload(event) {
  console.log('📦 Processing chunk upload...');

  const body = JSON.parse(event.body);
  const { uploadId, chunkIndex, chunkData, totalChunks } = body;

  if (!uploadId || chunkIndex === undefined || !chunkData) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters' })
    };
  }

  // Create upload directory
  const uploadDir = path.join(EFS_MOUNT, 'uploads', uploadId);
  await fs.mkdir(uploadDir, { recursive: true });

  // Save chunk
  const chunkPath = path.join(uploadDir, `chunk_${chunkIndex}`);
  const chunkBuffer = Buffer.from(chunkData, 'base64');
  await fs.writeFile(chunkPath, chunkBuffer);

  console.log(`✅ Saved chunk ${chunkIndex}/${totalChunks - 1} (${chunkBuffer.length} bytes)`);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      chunkIndex,
      uploadId
    })
  };
}

async function handleCompleteUpload(event) {
  console.log('🔄 Completing upload...');

  const body = JSON.parse(event.body);
  const { uploadId, fileName, totalChunks } = body;

  if (!uploadId || !fileName || !totalChunks) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters' })
    };
  }

  const uploadDir = path.join(EFS_MOUNT, 'uploads', uploadId);
  const finalPath = path.join(EFS_MOUNT, 'files', `${uuidv4()}_${fileName}`);

  // Create final directory
  await fs.mkdir(path.dirname(finalPath), { recursive: true });

  // Combine chunks
  const writeStream = await fs.open(finalPath, 'w');

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(uploadDir, `chunk_${i}`);

      try {
        const chunkData = await fs.readFile(chunkPath);
        await writeStream.write(chunkData);
        console.log(`📋 Merged chunk ${i}/${totalChunks - 1}`);
      } catch (error) {
        throw new Error(`Missing chunk ${i}`);
      }
    }
  } finally {
    await writeStream.close();
  }

  // Cleanup chunks
  try {
    await fs.rmdir(uploadDir, { recursive: true });
  } catch (error) {
    console.warn('⚠️ Could not cleanup chunks:', error.message);
  }

  // Verify final file
  const stats = await fs.stat(finalPath);
  const fileSizeMB = stats.size / (1024 * 1024);

  console.log(`✅ Upload complete: ${finalPath} (${fileSizeMB.toFixed(2)}MB)`);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      filePath: path.relative(EFS_MOUNT, finalPath),
      fileSize: stats.size,
      fileSizeMB: fileSizeMB.toFixed(2)
    })
  };
}