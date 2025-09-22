import React, { useState } from "react";

const PhotoUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      // Replace '/api/upload' with your backend endpoint
      const response = await fetch(
        "http://localhost:8082/NFT_Backend/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      const data = await response.json();
      // Assume backend returns { url: 'https://ipfs.io/ipfs/...' }
      setUploadedUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Upload error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "2rem auto",
        padding: "2rem",
        border: "1px solid #eee",
        borderRadius: 8,
      }}
    >
      <h2>Upload Photo to IPFS</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button
        onClick={handleUpload}
        disabled={loading}
        style={{ marginTop: "1rem" }}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
      {error && <div style={{ color: "red", marginTop: "1rem" }}>{error}</div>}
      {uploadedUrl && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Uploaded Photo:</h3>
          <img src={uploadedUrl} alt="Uploaded" style={{ maxWidth: "100%" }} />
          <div>
            <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
              View on IPFS
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
