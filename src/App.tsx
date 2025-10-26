// note: no React import needed with the new JSX runtime
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import PhotoUpload from "./PhotoUpload";
import VerifyImageNFT from "./VerifyImageNFT";
import React, { useEffect, useState } from "react";

const NavBar: React.FC<{ onNavigate: (p: string) => void; route: string }> = ({
  onNavigate,
  route,
}) => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
      <div className="container">
        <a className="navbar-brand d-flex align-items-center" href="#">
          <img src={viteLogo} alt="vite" style={{ height: 28 }} />
          <img
            src={reactLogo}
            alt="react"
            style={{ height: 28, marginLeft: 8 }}
          />
          <span className="ms-2 fw-bold">NFT Minting and Verification</span>
        </a>

        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${
              route === "/mint" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => onNavigate("/mint")}
          >
            Mint NFT
          </button>
          <button
            className={`btn btn-sm ${
              route === "/verify" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => onNavigate("/verify")}
          >
            Verify Image
          </button>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const [route, setRoute] = useState<string>(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
      setRoute(path);
    }
  };

  let content: React.ReactNode = null;
  if (route === "/mint") content = <PhotoUpload />;
  else if (route === "/verify") content = <VerifyImageNFT />;
  else
    content = (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow text-center py-5">
              <h2 className="mb-3">Welcome to the NFT Demo</h2>
              <p className="text-muted mb-4">
                Use the navbar to choose Mint or Verify, or click the buttons
                below.
              </p>
              <div className="d-grid gap-3 px-4">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate("/mint")}
                >
                  Mint NFT
                </button>
                <button
                  className="btn btn-outline-secondary btn-lg"
                  onClick={() => navigate("/verify")}
                >
                  Verify Image
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="d-flex flex-column min-vh-100">
      <NavBar onNavigate={navigate} route={route} />
      <main className="flex-grow-1 d-flex align-items-center justify-content-center bg-light">
        <div className="w-100">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-12 col-md-10">{content}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
