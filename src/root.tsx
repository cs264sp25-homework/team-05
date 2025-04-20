import { RootRoute } from "@tanstack/react-router";

export const rootRoute = new RootRoute({
  component: () => {
    return (
      <div>
        <Outlet />
      </div>
    );
  },
});

import { Outlet } from "@tanstack/react-router"; 