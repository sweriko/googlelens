const { exec } = require('child_process');

// Configuration
const STREAM_URL = 'rtmp://localhost:1935/live/stream'; // Adjust as needed
const SCREEN_SIZE = '1920x1080'; // Adjust to your screen resolution

// FFmpeg command to capture screen and stream via RTMP
const ffmpegCommand = `ffmpeg -f gdigrab -framerate 30 -i desktop -s ${SCREEN_SIZE} -vcodec libx264 -preset veryfast -maxrate 3000k -bufsize 6000k -f flv ${STREAM_URL}`;

// Start FFmpeg
const ffmpeg = exec(ffmpegCommand);

ffmpeg.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout: ${data}`);
});

ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg stderr: ${data}`);
});

ffmpeg.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
});
