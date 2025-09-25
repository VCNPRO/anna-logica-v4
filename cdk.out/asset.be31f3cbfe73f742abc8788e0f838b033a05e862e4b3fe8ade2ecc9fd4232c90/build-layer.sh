#!/bin/bash

# Create the layer directory structure
mkdir -p bin

# Download FFmpeg static binary for Linux (Lambda environment)
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz

# Extract FFmpeg
tar -xf ffmpeg.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg bin/
mv ffmpeg-*-amd64-static/ffprobe bin/

# Make executables
chmod +x bin/ffmpeg
chmod +x bin/ffprobe

# Clean up
rm -rf ffmpeg.tar.xz ffmpeg-*-amd64-static

echo "FFmpeg layer built successfully!"
echo "FFmpeg binary: $(ls -la bin/ffmpeg)"
echo "FFprobe binary: $(ls -la bin/ffprobe)"