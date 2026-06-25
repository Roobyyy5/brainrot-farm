import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { RewardToastProvider } from "./context/RewardToastContext";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RewardToastProvider>
          <App />
        </RewardToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
