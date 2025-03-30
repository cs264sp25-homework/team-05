import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/sonner";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { TooltipProvider } from "@/components/ui/tooltip";


const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey="pk_test_c3VpdGFibGUtY29icmEtODQuY2xlcmsuYWNjb3VudHMuZGV2JA">
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <TooltipProvider>
        <App />
        <Toaster richColors position="top-center" />
        </TooltipProvider>
    </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
);