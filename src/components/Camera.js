import React, { useEffect, useRef } from 'react';

const Camera = ({ videoRef, canvasRef, setViewStyle }) => {


    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoElement = videoRef.current;
            if (videoElement) {

                videoElement.srcObject = stream;
                videoElement.addEventListener('loadedmetadata', () => {
                    const viewStyle = {
                        height: videoElement.videoHeight,
                        width: videoElement.videoWidth
                    };
                    setViewStyle(viewStyle);
                });
            }
        } catch (error) {
            console.error('Error accessing the camera:', error);
        }
    };

    useEffect(() => {
        startCamera();
    }, []);


    return (
        <div>
            <video ref={videoRef} autoPlay playsInline></video>
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        </div>
    );
};

export default Camera;