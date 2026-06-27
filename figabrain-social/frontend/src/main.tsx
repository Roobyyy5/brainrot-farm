import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { RewardToastProvider } from "./context/RewardToastContext";
import { NotificationBadgeProvider } from "./context/NotificationBadgeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/index.css";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationBadgeProvider>
            <RewardToastProvider>
              <App />
            </RewardToastProvider>
          </NotificationBadgeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
