@echo off
echo Building FFmpeg Layer for AWS Lambda...

REM Build the Docker image
docker build -t ffmpeg-layer .

REM Run the container and extract the layer
docker run --rm -v "%CD%:/output" ffmpeg-layer sh -c "tar -czf /tmp/ffmpeg-layer.tar.gz -C /opt . && cp /tmp/ffmpeg-layer.tar.gz /output/"

REM Extract the layer locally
tar -xzf ffmpeg-layer.tar.gz

REM Clean up
del ffmpeg-layer.tar.gz

echo FFmpeg layer built successfully!
echo Check the bin/ directory for ffmpeg and ffprobe binaries.

REM Verify
dir bin\
bin\ffmpeg.exe -version 2>NUL || echo Note: FFmpeg binary is for Linux/Lambda, won't run on Windows