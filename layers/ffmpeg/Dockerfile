# Use Amazon Linux 2 to match Lambda runtime
FROM amazonlinux:2

# Install dependencies
RUN yum update -y && \
    yum install -y curl tar xz

# Create the layer structure
WORKDIR /opt
RUN mkdir -p bin

# Download and extract FFmpeg static binary
RUN curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz && \
    tar -xf ffmpeg.tar.xz && \
    mv ffmpeg-*-amd64-static/ffmpeg bin/ && \
    mv ffmpeg-*-amd64-static/ffprobe bin/ && \
    chmod +x bin/ffmpeg && \
    chmod +x bin/ffprobe && \
    rm -rf ffmpeg.tar.xz ffmpeg-*-amd64-static

# Verify the binaries
RUN ls -la bin/
RUN /opt/bin/ffmpeg -version | head -5
RUN /opt/bin/ffprobe -version | head -5

# Create a simple script to copy the files out
CMD ["tar", "-czf", "/tmp/ffmpeg-layer.tar.gz", "-C", "/opt", "."]