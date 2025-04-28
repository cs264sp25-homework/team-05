import { RootRoute } from "@tanstack/react-router";

export const rootRoute = new RootRoute({
  notFoundComponent: () => <div>Page not found</div>,
  component: () => {
    return (
      <div>
        <Outlet />
      </div>
    );
  },
});

import { Outlet } from "@tanstack/react-router"; 