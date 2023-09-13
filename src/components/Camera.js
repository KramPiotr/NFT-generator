import React, { useRef } from 'react';

const Camera = () => {
    const videoRef = useRef(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
        } catch (error) {
            console.error('Error accessing the camera:', error);
        }
    };

    return (
        <div>
            <button onClick={startCamera}>Start Camera</button>
            <video ref={videoRef} autoPlay playsInline></video>
        </div>
    );
};

export default Camera;