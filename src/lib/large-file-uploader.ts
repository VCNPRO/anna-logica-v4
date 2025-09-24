export interface UploadProgress {
  uploadId: string;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  stage: 'uploading' | 'processing' | 'complete' | 'error';
  message?: string;
}

export class LargeFileUploader {
  private chunkSize = 3 * 1024 * 1024; // 3MB (seguro bajo el límite de Vercel, considerando overhead de FormData)
  private onProgress?: (progress: UploadProgress) => void;

  constructor(onProgress?: (progress: UploadProgress) => void) {
    this.onProgress = onProgress;
  }

  async uploadFile(file: File): Promise<{ uploadId: string; filePath: string }> {
    // Get upload URL
    const { uploadId, uploadUrl, maxChunkSize } = await this.getUploadUrl(file);
    this.chunkSize = maxChunkSize || this.chunkSize;

    // Upload in chunks
    const totalChunks = Math.ceil(file.size / this.chunkSize);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);

      await this.uploadChunk(chunk, chunkIndex, uploadId);

      // Report progress
      const progress = ((chunkIndex + 1) / totalChunks) * 100;
      this.onProgress?.({
        uploadId,
        progress,
        bytesUploaded: end,
        totalBytes: file.size,
        stage: 'uploading',
        message: `Uploading chunk ${chunkIndex + 1} of ${totalChunks}`
      });
    }

    // Complete upload
    const completeResult = await this.completeUpload(uploadId);

    this.onProgress?.({
      uploadId,
      progress: 100,
      bytesUploaded: file.size,
      totalBytes: file.size,
      stage: 'complete',
      message: 'Upload complete'
    });

    return {
      uploadId,
      filePath: completeResult.filePath
    };
  }

  private async getUploadUrl(file: File) {
    const response = await fetch('/api/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }

    return response.json();
  }

  private async uploadChunk(chunk: Blob, chunkIndex: number, uploadId: string) {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('uploadId', uploadId);

    const response = await fetch('/api/upload-chunk', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload chunk ${chunkIndex}`);
    }
  }

  private async completeUpload(uploadId: string) {
    const response = await fetch('/api/complete-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId })
    });

    if (!response.ok) {
      throw new Error('Failed to complete upload');
    }

    return await response.json();
  }
}