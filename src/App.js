import { useState, useEffect, useRef } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';
import Camera from './components/Camera';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';

import { client } from "@gradio/client";

const TEXT_MODE_VIEW_STYLE = {
  height: 512,
  width: 512
}

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState(null)
  const [url, setURL] = useState(null)

  const [message, setMessage] = useState("")
  const [isWaiting, setIsWaiting] = useState(false)

  const [mode, setMode] = useState("camera");

  const [viewStyle, setViewStyle] = useState(TEXT_MODE_VIEW_STYLE);

  let isCameraMode = mode === "camera";

  const switchMode = (event) => {
    const mode = event.target.value;
    isCameraMode = mode === "camera";
    if (!isCameraMode) {
      setViewStyle(TEXT_MODE_VIEW_STYLE);
    }
    setMode(mode);
  }

  const videoRef = useRef(null);
  const canvasRef = useRef(null);


  const takePhoto = async () => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    if (videoElement && canvasElement) {
      // Set the canvas dimensions to match the video's dimensions
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      // Capture a frame from the video and draw it on the canvas
      const context = canvasElement.getContext('2d');
      context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

      canvasElement.toBlob(async (blob) => {
        // Send the captured image to the API for transformation
        const app = await client("https://tencentarc-t2i-adapter-sdxl.hf.space/");
        const result = await app.predict("/run", [
          blob,    // Use the captured image
          "Howdy!",
          "Howdy!",
          "canny",
          "(No style)",
          1,
          0.1,
          0.5,
          0.5,
          0,
          true,
        ]);

        // Display the transformed image
        console.log(result.data);
      });

      // Convert the canvas content to a data URL (base64-encoded image)
      // const photoDataUrl = canvasElement.toDataURL('image/png');



      // Display the taken photo
      setImage(photoDataUrl);
    }
  };

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()

    const nft = new ethers.Contract(config[network.chainId].nft.address, NFT, provider)
    setNFT(nft)
  }

  const submitHandler = async (e) => {
    e.preventDefault()

    if (name === "" || description === "") {
      window.alert("Please provide a name and description")
      return
    }

    setIsWaiting(true)

    // Call AI API to generate a image based on description
    const imageData = await createImage()

    // Upload image to IPFS (NFT.Storage)
    const url = await uploadImage(imageData)

    // Mint NFT
    await mintImage(url)

    setIsWaiting(false)
    setMessage("")
  }

  const createImage = async () => {
    setMessage("Generating Image...")

    // You can replace this with different model API's
    // const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0`
    const URL = `https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5`

    // Send the request
    const response = await axios({
      url: URL,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        inputs: description, options: { wait_for_model: true },
      }),
      responseType: 'arraybuffer',
    })

    const type = response.headers['content-type']
    const data = response.data

    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data // <-- This is so we can render it on the page

    console.log(img);
    setImage(img)

    return data
  }

  const uploadImage = async (imageData) => {
    setMessage("Uploading Image...")

    // Create instance to NFT.Storage
    const nftstorage = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_API_KEY })

    // Send request to store image
    const { ipnft } = await nftstorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    })

    // Save the URL
    const url = `https://${ipnft}.ipfs.dweb.link`
    setURL(url)

    return url
  }

  const mintImage = async (tokenURI) => {
    setMessage("Waiting for Mint...")

    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether") })
    await transaction.wait()
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />

      <div className='form'>
        <form onSubmit={submitHandler}>
          <label htmlFor="mode">Choose a mode:</label>
          <select name="mode" id="mode" value={mode} onChange={switchMode}>
            <option value="text"> Text to image</option>
            <option value="camera"> Camera </option>
          </select>
          <input type="text" placeholder="Create a name..." onChange={(e) => { setName(e.target.value) }} />
          <input type="text" placeholder="Create a description..." onChange={(e) => setDescription(e.target.value)} />
          <input type="submit" value="Create & Mint" disabled={isWaiting || !account} />

        </form>

        <div className='column-display'>
          <div className="image" style={viewStyle}>
            {isWaiting ?
              (<div className="image__placeholder">
                <Spinner animation="border" />
                <p>{message}</p>
              </div>) : (image ? (
                <img style={viewStyle} src={image} alt="AI generated" />
              ) : (isCameraMode ? <Camera videoRef={videoRef} canvasRef={canvasRef} setViewStyle={setViewStyle} /> : (<></>)))}
          </div>
          {!isWaiting && !image && isCameraMode && (
            <button type="button" className="image__button" onClick={takePhoto}>Take a photo</button>
          )}
        </div>
      </div>

      {!isWaiting && url && (
        <p>
          View on&nbsp;<a href={url} target="_blank" rel="noreferrer">IPFS</a>
        </p>
      )}
    </div>
  );
}

export default App;
