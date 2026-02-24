import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastProvider } from "./components/Toast";
import { AuthProvider } from "./auth";
import { EventProvider } from "./event";
import { PermissionsProvider } from "./permissions";
import App from "./App";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ToastProvider>
        <AuthProvider>
          <EventProvider>
            <PermissionsProvider>
              <App />
            </PermissionsProvider>
          </EventProvider>
        </AuthProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
