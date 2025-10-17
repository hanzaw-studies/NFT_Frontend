import React, { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { ethers } from "ethers";

const PhotoUpload: React.FC = () => {
  // State for Image CID/URL (The actual image)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [imageCID, setImageCID] = useState<string>("");

  // New state for Metadata CID (The JSON file)
  const [metadataCID, setMetadataCID] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [manualIpfsUrl, setManualIpfsUrl] = useState<string>("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [account, setAccount] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  // Using a separate state for the hash only for display purposes
  const [imageHashState, setImageHashState] = useState<string>("");

  // Read configuration from Vite env variables with safe fallbacks
  const CONTRACT_ADDRESS =
    (import.meta.env as any).SMART_CONTRACT_ADDRESS ||
    "0xDbb80Ec59D02650873AD9FD48E802356103b5d2D"; // Replace with your Sepolia V2 address

  // Smart Contract ABI (UPDATED for ImageNFT_V2)
  const CONTRACT_ABI = [
    {
      inputs: [
        // ARG 1: Changed to _metadataCID
        { internalType: "string", name: "_metadataCID", type: "string" },
        { internalType: "bytes32", name: "_imageHash", type: "bytes32" },
        { internalType: "string", name: "_description", type: "string" },
      ],
      name: "mintNFT",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "bytes32", name: "_imageHash", type: "bytes32" },
      ],
      name: "isImageHashExists",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getNextTokenId",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "minter",
          type: "address",
        },
        // Changed name to metadataCID
        {
          indexed: false,
          internalType: "string",
          name: "metadataCID",
          type: "string",
        },
        {
          indexed: false,
          internalType: "bytes32",
          name: "imageHash",
          type: "bytes32",
        },
        {
          indexed: false,
          internalType: "string",
          name: "description",
          type: "string",
        },
      ],
      name: "NFTMinted",
      type: "event",
    },
  ];

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window as any;

      if (!ethereum) {
        console.log("Make sure you have MetaMask!");
        setStatus("MetaMask is not installed. Please install it to continue.");
        return;
      }

      console.log(
        "Detected ethereum provider:",
        ethereum?.isMetaMask ? "MetaMask" : ethereum
      );
      const accounts = await ethereum.request({ method: "eth_accounts" });
      console.log("Existing accounts from provider:", accounts);

      if (accounts.length !== 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        setStatus("Wallet connected successfully.");
      }

      // Listen for account changes
      ethereum.on("accountsChanged", handleAccountsChanged);
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  // Run wallet check on mount
  useEffect(() => {
    checkIfWalletIsConnected();
    // cleanup listener on unmount
    return () => {
      const { ethereum } = window as any;
      if (ethereum && ethereum.removeListener) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setIsConnected(true);
    } else {
      setAccount("");
      setIsConnected(false);
      setStatus("Please connect to MetaMask.");
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window as any;

      if (!ethereum) {
        setStatus("MetaMask is not installed. Please install it to continue.");
        return;
      }

      setLoading(true);
      console.log("Requesting accounts via eth_requestAccounts...");
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("eth_requestAccounts result:", accounts);

      setAccount(accounts[0]);
      setIsConnected(true);
      setStatus("Wallet connected successfully.");
      setLoading(false);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setStatus("Failed to connect wallet: " + (error as Error).message);
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate keccak256 hash of the image
  const generateImageHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // ethers expects a hex string of the bytes for keccak256
    const hexString = ethers.hexlify(uint8Array);
    try {
      // Use ethers keccak256 to compute the hash locally (no provider call needed)
      const hash = ethers.keccak256(hexString);
      console.log("image hex length:", hexString.length, "hash:", hash);
      return hash;
    } catch (error) {
      console.error("Error generating image hash:", error);
      throw error;
    }
  };

  // Check if image is already minted
  const checkImageMinted = async (imageHash: string): Promise<boolean> => {
    const anyWindow = window as any;
    const ethProvider = anyWindow.ethereum;
    const provider = ethProvider
      ? new ethers.BrowserProvider(ethProvider)
      : ethers.getDefaultProvider();

    // Verify contract exists at address on the connected network
    try {
      const network = await provider.getNetwork?.();
      console.log("Provider network:", network);
      console.log("Checking contract at address:", CONTRACT_ADDRESS);
      const code = await provider.getCode(CONTRACT_ADDRESS);
      console.log("Contract code at address:", code);
      if (!code || code === "0x" || code === "0x0") {
        throw new Error(
          `No contract deployed at ${CONTRACT_ADDRESS} on the connected network (got code: ${code}).`
        );
      }
    } catch (err) {
      console.error("Error checking contract code at address:", err);
      throw err;
    }

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI as any,
        provider
      );

      console.log("Contract instance:", contract);
      console.log("Contract address:", contract.address);
      console.log("Using imageHash:", imageHash);

      // ensure imageHash is a 0x-prefixed hex string (bytes32)
      if (typeof imageHash !== "string" || !imageHash.startsWith("0x")) {
        throw new Error(
          "Image hash must be a 0x-prefixed hex string (bytes32)."
        );
      }

      console.log("Before calling contract.isImageHashExists(imageHash) ...");
      const result: boolean = await contract.isImageHashExists(imageHash);
      console.log("contract.isImageMinted returned:", result);
      return result;
    } catch (error) {
      console.error("Error checking if image is minted:", error);
      throw error;
    }
  };

  // Helper: robustly extract an IPFS CID from backend response or URL string
  const extractIpfsCid = (body: any, maybeUrl?: string): string | null => {
    const candidates: Array<string | undefined> = [
      body?.url,
      body?.data?.url,
      body?.cid,
      body?.IpfsHash,
      body?.hash,
      maybeUrl,
      typeof body === "string" ? body : undefined,
    ];

    for (const v of candidates) {
      if (!v || typeof v !== "string") continue;
      if (v.startsWith("ipfs://")) return v.replace(/^ipfs:\/\//, "");
      const ipfsIdx = v.indexOf("/ipfs/");
      if (ipfsIdx !== -1) {
        const cid = v.substring(ipfsIdx + "/ipfs/".length).split(/[?#]/)[0];
        if (cid) return cid;
      }
      try {
        const url = new URL(v);
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length > 0) {
          const last = pathParts[pathParts.length - 1];
          // Check if it looks like a CID (rough check)
          if (
            last.length >= 16 &&
            (last.startsWith("Qm") || last.startsWith("bafy"))
          )
            return last;
        }
      } catch (e) {
        if (v.length >= 16 && (v.startsWith("Qm") || v.startsWith("bafy")))
          return v;
      }
    }

    return null;
  };

  // Helper: try to decode Solidity revert reason from returned data
  const decodeRevertReason = (
    data: string | undefined | null
  ): string | null => {
    if (!data || typeof data !== "string") return null;
    // standard Error(string) selector
    const ERROR_SELECTOR = "0x08c379a0";
    try {
      if (data.startsWith(ERROR_SELECTOR)) {
        // remove selector
        const hex = data.replace(/^0x/, "");
        const payload = hex.slice(8); // remove 4-byte selector (8 hex chars)
        // payload: offset (32 bytes) + length (32 bytes) + string bytes
        // skip offset (64 hex chars)
        const lenHex = payload.slice(64, 128); // next 32 bytes = length
        const strLen = parseInt(lenHex, 16);
        if (isNaN(strLen) || strLen <= 0) return null;
        const strHex = payload.slice(128, 128 + strLen * 2);
        const bytes =
          strHex.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) || [];
        const reason = new TextDecoder().decode(new Uint8Array(bytes));
        return reason;
      }
      // sometimes providers return raw utf8 in hex without selector
      if (data.startsWith("0x")) {
        try {
          const hex = data.replace(/^0x/, "");
          const bytes = hex.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) || [];
          const text = new TextDecoder().decode(new Uint8Array(bytes));
          return text;
        } catch (e) {
          return null;
        }
      }
    } catch (e) {
      console.error("decodeRevertReason failed:", e);
    }
    return null;
  };

  // UPDATED: Function now takes metadataCID instead of imageCID
  const encodeMintNFTData = (
    metadataCID: string, // New argument name
    imageHash: string,
    description: string
  ): string => {
    // Use ethers Interface to encode the function calldata
    const iface = new ethers.Interface(CONTRACT_ABI as any);
    const data = iface.encodeFunctionData("mintNFT", [
      metadataCID, // Pass metadataCID as the first argument
      imageHash,
      description,
    ]);
    return data;
  };

  // NEW HELPER: Upload the JSON metadata to the backend
  const uploadMetadataToIpfs = async (
    metadataJson: string
  ): Promise<string> => {
    // Assuming your backend has a dedicated endpoint for uploading JSON metadata
    setStatus("Uploading NFT metadata JSON to IPFS...");

    // NOTE: You must implement a backend endpoint that accepts a JSON string/object
    // and uploads it to IPFS, returning the METADATA CID.
    try {
      const resp = await fetch(`/NFT_Backend/api/upload-metadata`, {
        // Update this endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: JSON.parse(metadataJson), // Pass the parsed JSON object
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `Metadata upload failed: ${resp.status} ${resp.statusText} ${text}`
        );
      }

      const body = await resp.json();
      console.log("Backend metadata upload response:", body);

      const cid = extractIpfsCid(body, body?.url);
      if (!cid) {
        throw new Error(
          "Missing CID in backend response after metadata upload"
        );
      }
      return cid;
    } catch (err) {
      console.error("Error uploading metadata:", err);
      throw new Error("Failed to upload metadata to IPFS via backend.");
    }
  };

  const mintedNFT = async () => {
    console.log("mintedNFT called with", {
      imageFile,
      uploadedImageUrl,
      description,
      isConnected,
    });

    // Ensure currentImageCID is initialized to a string or null before assignment
    let currentImageCID: string | null = imageCID;
    let localImageHash: string = ""; // Will hold the computed hash locally

    if (!imageFile || !uploadedImageUrl) {
      // Step 0: Upload Image if not already done
      if (!imageFile) {
        setError("Image file is missing.");
        return;
      }

      setLoading(true);
      setStatus("Uploading image to backend IPFS service...");
      try {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("description", description);

        const resp = await fetch(`/NFT_Backend/api/upload`, {
          method: "POST",
          body: formData,
        });
        if (!resp.ok) throw new Error("Upload failed");
        const rawText = await resp.text().catch(() => "");
        console.log("backend upload rawText:", rawText);
        let body: any = {};
        try {
          body = JSON.parse(rawText);
        } catch (e) {
          body = { url: rawText };
        }

        console.log("Backend upload response body:", body);
        console.log("Body URL:", body.url);

        currentImageCID = extractIpfsCid(body, body.url);
        console.log("Extracted image CID:", currentImageCID);
        if (!currentImageCID) {
          throw new Error("Image upload did not return a valid CID.");
        }

        // Store the image CID and URL
        setImageCID(currentImageCID);
        if (body.url) {
          setUploadedImageUrl(body.url);
        }
      } catch (err: any) {
        setError(err?.message || "Upload failed");
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    // Ensure we have an image CID for the next steps
    if (!currentImageCID) currentImageCID = imageCID;
    if (!currentImageCID) {
      setError("Image CID is missing after upload.");
      return;
    }

    if (!isConnected) {
      setError("Please connect your wallet first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMintedTokenId("");
      setStatus("Generating image hash...");

      // Step 1: Generate image hash
      // Use the file object for hashing (best practice for consistency)
      if (!imageFile)
        throw new Error("Image file object is missing for hashing.");

      const imageHashComputed = await generateImageHash(imageFile);
      console.log("Computed image hash:", imageHashComputed);

      localImageHash = imageHashComputed; // Store computed hash locally
      setImageHashState(localImageHash); // Store for display state
      setStatus(
        "Image hash generated: " + localImageHash.substring(0, 20) + "..."
      );

      // Step 2: Check if image is already minted
      setStatus("Checking if image is already minted...");
      const alreadyMinted = await checkImageMinted(localImageHash); // Use local hash

      console.log("Is image already minted?", alreadyMinted);

      if (alreadyMinted) {
        setStatus("This image has already been minted as an NFT.");
        setLoading(false);
        return;
      }

      // --- NEW STEP 3 & 4: Create and Upload Metadata JSON ---

      // Step 3: Create Metadata JSON
      setStatus("Creating NFT metadata JSON...");
      const currentTokenId = await getNextTokenId();

      const metadataJson = JSON.stringify({
        name: `Image NFT V2 #${currentTokenId}`,
        description: description,
        // CRUCIAL: 'image' field must point to the raw image CID
        image: `ipfs://${currentImageCID}`,
        attributes: [
          // Optional attributes can be added here
        ],
      });
      console.log("Generated Metadata JSON:", metadataJson);

      // Step 4: Upload Metadata JSON to IPFS
      let currentMetadataCID = await uploadMetadataToIpfs(metadataJson);
      setMetadataCID(currentMetadataCID);
      setStatus(
        "Metadata JSON uploaded to IPFS with CID: " + currentMetadataCID
      );

      // --- END NEW STEPS ---

      // Step 5: Prepare and send transaction to mint NFT
      setStatus("Preparing transaction to mint NFT...");

      const anyWindow = window as any;
      const ethProvider = anyWindow.ethereum;
      if (!ethProvider) throw new Error("Ethereum provider not found");

      const provider = new ethers.BrowserProvider(ethProvider);
      const signer = await provider.getSigner();

      console.log("************ Minting NFT ************");
      console.log("metadataCID (NEW): ", currentMetadataCID);
      console.log("imageHash: ", localImageHash);
      console.log("description: ", description);

      // Encode function call data using ethers Interface
      const data = encodeMintNFTData(
        currentMetadataCID,
        localImageHash,
        description
      );
      console.log("######## Minting NFT ########");
      // First try a direct eth_call simulation to capture revert data (if any)
      try {
        console.log(
          "Running provider.call simulation to capture revert data..."
        );
        console.log("CONTRACT_ADDRESS:", CONTRACT_ADDRESS);
        console.log("data:", data);
        const fromAddr = await signer.getAddress().catch(() => null);
        const callParams: any = { to: CONTRACT_ADDRESS, data };
        if (fromAddr) callParams.from = fromAddr;
        const callResult = await provider.call(callParams);
        console.log("provider.call result (hex):", callResult);
      } catch (callErr: any) {
        console.error("provider.call simulation error:", callErr);
        const raw =
          (callErr as any)?.data ||
          (callErr as any)?.error?.data ||
          (callErr as any)?.error ||
          null;
        console.error("provider.call raw revert data:", raw);

        const reason = decodeRevertReason(raw);
        const looksValidText =
          typeof reason === "string" && !reason.includes("");

        let selector: string | null = null;
        try {
          if (
            typeof raw === "string" &&
            raw.startsWith("0x") &&
            raw.length >= 10
          ) {
            selector = raw.slice(0, 10);
          }
        } catch (e) {
          /* noop */
        }

        try {
          const iface = new ethers.Interface(CONTRACT_ABI as any);
          const parseError = (iface as any).parseError;
          if (parseError && selector) {
            try {
              const parsed = (iface as any).parseError(raw);
              console.log("Parsed custom error using Interface:", parsed);
              if (parsed && parsed.name) {
                setError(
                  `Revert (custom error): ${parsed.name} ${JSON.stringify(
                    parsed.args
                  )}`
                );
                setStatus(`Call simulation reverted: ${parsed.name}`);
              }
            } catch (e) {
              /* ignore parse failures and fall through to fallback message */
            }
          }
        } catch (e) {
          /* ignore interface parse failures */
        }

        if (looksValidText) {
          console.error("Decoded provider.call revert reason:", reason);
          setError("Revert reason (simulation): " + reason);
          setStatus("Call simulation reverted: " + reason);
        } else if (selector) {
          console.error("Custom error selector detected:", selector);
          setError(
            `Reverted with custom error selector ${selector}. Raw data: ${raw}`
          );
          setStatus(
            `Call simulation reverted (custom error ${selector}). See console for raw hex.`
          );
        } else {
          setError(
            "Call simulation reverted (unknown). See console for details."
          );
          setStatus("Call simulation reverted (unknown). See console.");
        }
      }

      setStatus("Estimating gas to simulate the mint call...");

      try {
        // Try estimating gas first to simulate the call and surface failures early
        const gasEstimate = await signer.estimateGas({
          to: CONTRACT_ADDRESS,
          data,
        });
        console.log("Gas estimate:", gasEstimate.toString());

        setStatus("Please approve the transaction in MetaMask...");

        // add a small buffer to the gas limit
        const buffered = (gasEstimate * 120n) / 100n;

        const txResponse = await signer.sendTransaction({
          to: CONTRACT_ADDRESS,
          data,
          gasLimit: buffered,
        });

        setTxHash(txResponse.hash);
        setStatus("Transaction sent. Waiting for confirmation...");

        const receipt = await txResponse.wait();

        const tokenId = parseTokenIdFromReceipt(receipt);
        setMintedTokenId(tokenId);

        setStatus("NFT minted successfully! 🎉");
        setLoading(false);
      } catch (txErr: any) {
        console.error("Transaction simulation/send failed:", txErr);
        const raw =
          (txErr as any)?.data ||
          (txErr as any)?.error?.data ||
          (txErr as any)?.error ||
          null;
        console.error("Transaction raw revert data:", raw);
        const reason = decodeRevertReason(raw);
        if (reason) {
          console.error("Decoded tx revert reason:", reason);
          setError("Revert reason: " + reason);
          setStatus("Transaction reverted: " + reason);
        } else {
          const msg = txErr?.message || String(txErr);
          setError("Failed to mint NFT: " + msg);
          setStatus(
            "Transaction failed during simulation/send. See console for details."
          );
        }
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
      // Safely extract message from unknown error
      const errMsg = error instanceof Error ? error.message : String(error);
      setError("Failed to mint NFT: " + errMsg);

      if ((error as any)?.code === 4001) {
        setStatus("Transaction rejected by user.");
      } else if (errMsg.includes("already minted")) {
        setStatus("This image has already been minted as an NFT.");
      } else {
        setStatus("Error minting NFT: " + errMsg);
      }
      setLoading(false);
    }
  };

  // NEW HELPER: Get the next token ID from the contract
  const getNextTokenId = async (): Promise<string> => {
    try {
      const anyWindow = window as any;
      const ethProvider = anyWindow.ethereum;
      const provider = ethProvider
        ? new ethers.BrowserProvider(ethProvider)
        : ethers.getDefaultProvider();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI as any,
        provider
      );

      const nextId = await contract.getNextTokenId();
      return nextId.toString();
    } catch (error) {
      console.error("Error fetching next token ID:", error);
      // Fallback to a generic number if contract call fails
      return "0";
    }
  };

  // Parse token ID from transaction receipt logs
  // Returns the tokenId as a decimal string, or null if not found
  const parseTokenIdFromReceipt = (receipt: any): string | null => {
    try {
      if (!receipt || !receipt.logs || receipt.logs.length === 0) return null;

      const iface = new ethers.Interface(CONTRACT_ABI as any);

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ data: log.data, topics: log.topics });
          if (parsed && parsed.name === "NFTMinted") {
            // tokenId is the first indexed argument
            const tokenId =
              parsed.args.tokenId?.toString?.() || String(parsed.args[0]);
            return tokenId;
          }
        } catch (e) {
          // not the event we are looking for, ignore
        }
      }

      return null;
    } catch (error) {
      console.error("Error parsing token ID:", error);
      return null;
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-9">
          <div className="card shadow-lg">
            <div className="card-body">
              <h1 className="card-title text-center mb-4">
                NFT Minting System (V2)
              </h1>

              {/* Wallet Connection */}
              <div className="mb-4">
                <h5 className="mb-3">Wallet Connection</h5>
                {!isConnected ? (
                  <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="btn btn-primary w-100 d-flex align-items-center justify-content-center"
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Connecting...
                      </>
                    ) : (
                      "Connect MetaMask"
                    )}
                  </button>
                ) : (
                  <div className="alert alert-success d-flex align-items-center mb-0">
                    <CheckCircle className="me-2 text-success" size={20} />
                    <div>
                      <div className="fw-bold">Connected</div>
                      <div className="text-monospace small">
                        {account.slice(0, 6)}...{account.slice(-4)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <hr />

              {/* Image Upload */}
              <div className="mb-3">
                <label htmlFor="image-upload" className="form-label">
                  Upload Image
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="form-control"
                />
                {imagePreview && (
                  <div className="mt-3 text-center">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="img-fluid rounded"
                      style={{ maxHeight: 320 }}
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-3">
                <label className="form-label">Image Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-control"
                  rows={4}
                  placeholder="Enter a description for your NFT..."
                />
              </div>

              {/* Debug: manual IPFS URL (paste backend response here to test minting) */}
              <div className="mb-3">
                <label className="form-label">Manual Image URL (debug)</label>
                <div className="input-group">
                  <input
                    className="form-control"
                    placeholder="https://ipfs.io/ipfs/<CID>"
                    value={manualIpfsUrl}
                    onChange={(e) => setManualIpfsUrl(e.target.value)}
                    readOnly={false}
                    tabIndex={0}
                    onFocus={() => console.log("manualIpfsUrl input focused")}
                    onClick={() => console.log("manualIpfsUrl input clicked")}
                    style={{ zIndex: 10 }}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      // Note: Manually setting URL is highly discouraged as it bypasses the
                      // crucial imageHash computation for the contract call, but kept for debug.
                      setUploadedImageUrl(manualIpfsUrl);
                      // Attempt to extract CID from the manual URL for the Metadata creation step
                      const cid = extractIpfsCid(
                        { url: manualIpfsUrl },
                        manualIpfsUrl
                      );
                      setImageCID(cid || "");
                      setStatus(
                        "Manual IPFS URL set for testing (CID: " +
                          (cid || "N/A") +
                          ")"
                      );
                    }}
                  >
                    Use URL
                  </button>
                </div>
                <div className="form-text">
                  Paste the **Image** IPFS URL returned by your backend here and
                  click "Use URL" to test the mint flow without re-uploading.
                </div>
              </div>

              {/* Mint Button */}
              <div className="d-grid">
                <button
                  onClick={mintedNFT}
                  disabled={
                    loading ||
                    !isConnected ||
                    !(imageFile || uploadedImageUrl) ||
                    !description
                  }
                  className="btn btn-lg btn-primary"
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Processing...
                    </>
                  ) : (
                    "Mint NFT"
                  )}
                </button>
              </div>

              {/* Disabled reason helper */}
              {(loading ||
                !isConnected ||
                !(imageFile || uploadedImageUrl) ||
                !description) && (
                <div className="mt-2 small text-muted">
                  <strong>Why disabled:</strong>
                  <ul className="mb-0">
                    {!isConnected && <li>Please connect MetaMask wallet.</li>}
                    {!imageFile && !uploadedImageUrl && (
                      <li>
                        Please choose an image to upload or provide an IPFS URL
                        above.
                      </li>
                    )}
                    {!description && (
                      <li>Please enter an image description.</li>
                    )}
                    {loading && (
                      <li>Operation in progress — wait until it finishes.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Status and Results */}
              <hr className="mt-4" />
              <h5 className="mb-3">Status and Results</h5>

              {status && (
                <div className="alert alert-info">
                  <strong>Status:</strong> {status}
                </div>
              )}

              {error && (
                <div className="alert alert-danger">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* NEW: Display the calculated Image Hash */}
              {imageHashState && (
                <div className="alert alert-light border-secondary">
                  <strong>Calculated Image Hash:</strong>
                  <span className="text-monospace small d-block">
                    {imageHashState.slice(0, 10)}...{imageHashState.slice(-10)}
                    {/* Optional: Add a button to copy the hash */}
                  </span>
                </div>
              )}

              {mintedTokenId && (
                <div className="alert alert-success d-flex align-items-center">
                  <CheckCircle className="me-2 text-success" size={20} />
                  <div>
                    <strong>Minted! Token ID:</strong> {mintedTokenId}
                    {txHash && (
                      <div className="small text-muted">
                        Tx Hash:{" "}
                        <a
                          href={`https://sepolia.etherscan.io/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {txHash.slice(0, 10)}...{txHash.slice(-8)}
                        </a>
                      </div>
                    )}
                    {metadataCID && (
                      <div className="small text-muted">
                        Metadata CID: {metadataCID} (NFT should display in
                        wallet!)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;
