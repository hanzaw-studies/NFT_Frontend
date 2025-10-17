import React, { useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  UploadCloud,
  Loader,
} from "lucide-react";

// Define the shape of the verification result from the backend
interface VerificationResult {
  exists: boolean;
  verified: boolean;
  // Fix 2: Changed to allow for string or number, as the error suggests flexibility in the return type
  // We will parse it to number before setting the state.
  tokenId: string | number;
  message: string;
}

// NOTE: This URL should match your Spring Boot application's address
const API_BASE_URL: string =
  (import.meta.env as any).SYS_BACKEND_URL || "http://localhost:8082";
const HASH_ENDPOINT: string = `${API_BASE_URL}/NFT_Backend/api/generateHash`;
const VERIFY_ENDPOINT: string = `${API_BASE_URL}/NFT_Backend/api/verifyImage`;

// Define props for StatusMessage component
interface StatusMessageProps {
  status: "initial" | "loading" | "success" | "not-found" | "error";
  message: string;
  hash: string | null;
  tokenId: number;
}

// --- Utility Components ---

const StatusMessage: React.FC<StatusMessageProps> = ({
  status,
  message,
  hash,
  tokenId,
}) => {
  let icon: React.ReactElement;
  let alertClass: string;
  let title: string;

  // Mapping status to Bootstrap Alert Classes
  if (status === "initial") {
    icon = (
      <FileText className="me-2" style={{ width: "2rem", height: "2rem" }} />
    );
    alertClass = "alert-primary";
    title = "Ready to Verify";
  } else if (status === "loading") {
    // Note: spinner-border spinner-border-sm is native Bootstrap component
    icon = (
      <Loader
        className="me-2 spinner-border spinner-border-sm"
        role="status"
        style={{ width: "2rem", height: "2rem" }}
      />
    );
    alertClass = "alert-info";
    title = "Processing...";
  } else if (status === "success") {
    icon = (
      <CheckCircle className="me-2" style={{ width: "2rem", height: "2rem" }} />
    );
    alertClass = "alert-success";
    title = "Verification Successful!";
  } else if (status === "not-found") {
    icon = (
      <XCircle className="me-2" style={{ width: "2rem", height: "2rem" }} />
    );
    alertClass = "alert-warning";
    title = "Image Not Found";
  } else if (status === "error") {
    icon = (
      <XCircle className="me-2" style={{ width: "2rem", height: "2rem" }} />
    );
    alertClass = "alert-danger";
    title = "Error";
  } else {
    return null;
  }

  return (
    <div
      className={`mt-4 p-4 border rounded-3 shadow ${alertClass}`}
      role="alert"
    >
      <div className="d-flex align-items-center">
        {icon}
        <h3 className="h5 mb-0 fw-bold">{title}</h3>
      </div>
      <p className="mt-2 mb-0 small">{message}</p>
      {hash && (
        <div
          className="mt-3 p-2 bg-white rounded small text-break"
          style={{ opacity: 0.8 }}
        >
          <strong className="d-block mb-1 text-secondary">
            Calculated Hash:
          </strong>
          <code className="text-dark">{hash}</code>
        </div>
      )}
      {tokenId > 0 && (
        <div
          className="mt-2 p-2 bg-white rounded fw-bold"
          style={{ opacity: 0.8 }}
        >
          Token ID Found: <span className="text-primary">{tokenId}</span>
        </div>
      )}
    </div>
  );
};

// --- Main App Component (Renamed to VerifyImageNFT) ---

const VerifyImageNFT: React.FC = () => {
  // Type File | null is inferred correctly by useState
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "initial" | "loading" | "success" | "not-found" | "error"
  >("initial");
  const [message, setMessage] = useState<string>(
    "Upload a photo (JPEG, PNG) to check if it has already been minted as an NFT on the blockchain."
  );
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<number>(0);

  // Reset all states
  const resetState = useCallback(() => {
    setFile(null);
    setStatus("initial");
    setMessage(
      "Upload a photo (JPEG, PNG) to check if it has already been minted as an NFT on the blockchain."
    );
    setImageHash(null);
    setTokenId(0);
    // Reset file input element
    const input = document.getElementById("file-upload") as HTMLInputElement;
    if (input) input.value = "";
  }, []);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files ? event.target.files[0] : null;
    if (selectedFile) {
      setFile(selectedFile);
      setStatus("initial");
      setMessage(
        `File selected: ${selectedFile.name}. Click 'Verify Image' to proceed.`
      );
      setImageHash(null);
      setTokenId(0);
    }
  };

  // Step 1: Generate Hash via Backend
  const generateHash = useCallback(
    async (fileToUpload: File): Promise<string> => {
      setMessage("Step 1/2: Generating cryptographic hash...");
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const response = await fetch(HASH_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Hash generation failed (Status ${response.status}).`);
      }

      const data: { success?: boolean; hash?: string; message?: string } =
        await response.json();
      if (!data.success || !data.hash) {
        throw new Error(
          data.message || "Hash generation failed with an unknown error."
        );
      }

      setImageHash(data.hash);
      return data.hash;
    },
    []
  );

  // Step 2: Verify Hash via Backend
  const verifyImage = useCallback(
    async (hash: string): Promise<VerificationResult> => {
      setMessage("Step 2/2: Checking hash against NFT registry...");

      const response = await fetch(VERIFY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageHash: hash }),
      });

      if (!response.ok) {
        throw new Error(`Verification failed (Status ${response.status}).`);
      }

      const data: VerificationResult = await response.json();
      return data;
    },
    []
  );

  // Main verification handler
  const handleVerify = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    setStatus("loading");
    setTokenId(0);

    try {
      // 1. Generate Hash
      const hash = await generateHash(file);

      // 2. Verify Hash
      const verificationResult = await verifyImage(hash);

      // Fix 2: Ensure tokenId is a number before setting state.
      const verifiedTokenId = Number(verificationResult.tokenId);

      if (verificationResult.exists && verificationResult.verified) {
        setStatus("success");
        setMessage(
          `This image is already minted as NFT Token ID: ${verifiedTokenId}.`
        );
        setTokenId(verifiedTokenId);
      } else if (verificationResult.exists && !verificationResult.verified) {
        // Hash exists but cache is pending/stale
        setStatus("not-found");
        setMessage(
          verificationResult.message ||
            "Image hash exists on contract but verification details are currently unavailable. Try again shortly."
        );
      } else {
        setStatus("not-found");
        setMessage(
          "This image has NOT been found in the NFT registry. It is unique and ready to be minted!"
        );
      }
    } catch (error) {
      console.error("Verification Error:", error);
      setStatus("error");
      // Ensure error is an Error object to safely access the message property
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setMessage(
        `Verification failed: ${errorMessage}. Please check the backend connection and logs.`
      );
    }
  };

  // Memoized button text for loading state
  const buttonText = useMemo(() => {
    if (status === "loading") {
      return "Verifying...";
    }
    return file ? `Verify '${file.name}'` : "Verify Image";
  }, [status, file]);

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center vh-100 bg-light p-3">
      {/* Custom style for dashed border since it's not standard in Bootstrap utilities */}
      <style>{`
                .border-dashed { border-style: dashed !important; }
            `}</style>

      <div className="col-12 col-md-8 col-lg-6 col-xl-5 bg-white p-5 rounded-4 shadow-lg border border-primary-subtle">
        <header className="text-center mb-4">
          <h1 className="h3 fw-bold text-primary d-flex align-items-center justify-content-center">
            <CheckCircle
              style={{ width: "1.5rem", height: "1.5rem" }}
              className="me-2"
            />
            NFT Uniqueness Checker
          </h1>
          <p className="text-secondary mt-2 small">
            Powered by Keccak-256 Hashing and Spring Boot Backend
          </p>
        </header>

        {/* File Upload Area (Custom Dashed Style) */}
        <div
          className="border border-dashed border-primary-subtle rounded-3 p-4 transition-all"
          style={{ minHeight: "120px" }}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            id="file-upload"
            onChange={handleFileChange}
            className="d-none" // Bootstrap d-none
          />
          <label
            htmlFor="file-upload"
            className="d-flex flex-column align-items-center justify-content-center cursor-pointer p-3 text-center"
            style={{ cursor: "pointer" }}
          >
            <UploadCloud
              style={{ width: "2.5rem", height: "2.5rem" }}
              className="text-primary mb-2"
            />
            <p className="small text-secondary mb-1">
              {file ? (
                <span className="fw-semibold text-primary">{file.name}</span>
              ) : (
                <>
                  <span className="fw-semibold text-primary">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </>
              )}
            </p>
            <p className="text-muted" style={{ fontSize: "0.75rem" }}>
              PNG or JPEG (max 10MB recommended)
            </p>
          </label>
        </div>

        {/* Actions */}
        <div className="d-flex gap-3 mt-4">
          <button
            onClick={handleVerify}
            disabled={!file || status === "loading"}
            className={`flex-grow-1 btn btn-lg fw-semibold shadow-sm ${
              file && status !== "loading"
                ? "btn-primary"
                : "btn-secondary disabled"
            }`}
          >
            {status === "loading" && (
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
            )}
            {buttonText}
          </button>

          <button
            onClick={resetState}
            className="btn btn-lg btn-outline-secondary shadow-sm"
            title="Reset"
          >
            <RefreshCw style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
        </div>

        {/* Result Display */}
        <StatusMessage
          status={status}
          message={message}
          hash={imageHash}
          tokenId={tokenId}
        />

        {/* Instructions */}
        <div className="mt-4 text-center small text-muted border-top pt-3">
          <p className="mb-0">
            Verification requires your Spring Boot backend to be running on{" "}
            <code className="text-dark">http://localhost:8080</code> with the{" "}
            <code className="text-dark">/api/generateHash</code> and{" "}
            <code className="text-dark">/api/verifyImage</code> endpoints
            correctly configured.
          </p>
        </div>
      </div>
    </div>
  );
};

// Fix 1: Ensure the component is correctly exported and imported.
export default VerifyImageNFT;
