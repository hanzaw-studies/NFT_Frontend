import { useState } from "react";
import "./App.css";
import PhotoUpload from "./PhotoUpload";

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch(currentPage) {
      case 'upload':
        return (
          <div className="page">
            <button className="back-btn" onClick={() => setCurrentPage('home')}>← Back</button>
            <h2>Upload Photo to IPFS</h2>
            <PhotoUpload />
          </div>
        );
      case 'verify':
        return (
          <div className="page">
            <button className="back-btn" onClick={() => setCurrentPage('home')}>← Back</button>
            <h2>Verify Image</h2>
            <div className="upload-section">
              <input type="file" accept="image/*" className="file-input" />
              <button className="verify-btn">Verify Image</button>
            </div>
          </div>
        );
      default:
        return (
          <div className="home-page">
            <h1>NFT Creator</h1>
            <div className="main-sections">
              <div className="section" onClick={() => setCurrentPage('upload')}>
                <h3>Upload Image</h3>
                <p>Upload your photo to IPFS</p>
              </div>
              <div className="section" onClick={() => setCurrentPage('verify')}>
                <h3>Verify Image</h3>
                <p>Verify image authenticity</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app">
      <div className="user-profile">
        <div className="profile-card">
          <div className="avatar">👤</div>
          <button className="wallet-btn">Connect Wallet</button>
        </div>
      </div>
      {renderPage()}
    </div>
  );
}

export default App;
