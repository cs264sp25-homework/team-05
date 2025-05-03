import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./App";
import { TooltipProvider } from "@/components/ui/tooltip";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Debug: Log the environment variable
console.log("Clerk Key:", import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
// console.log(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  basepath: "/team-05",
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey="pk_test_c3VpdGFibGUtY29icmEtODQuY2xlcmsuYWNjb3VudHMuZGV2JA">
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
    </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>
);