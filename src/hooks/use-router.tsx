import { useStore } from "@nanostores/react";
import { $router, Page, Params } from "@/store/router";
import { getPagePath, openPage, redirectPage } from "@nanostores/router";


// Custom hook to use the router
export function useRouter() {
  const page = useStore($router); // Subscribing to the $router store to get the current page state

  const navigate = (routeName: Page, params = {}, search = {}) => {
    openPage($router, routeName, params, search);
  };

  const redirect = (routeName: Page, params = {}, search = {}) => {
    redirectPage($router, routeName, params, search);
  };

  const getPath = (routeName: Page, params = {}, search = {}) => {
    return getPagePath($router, routeName, params, search);
  };

  return {
    currentRoute: page?.route,
    params: page?.params as Params,
    search: page?.search,
    navigate, // use this function to navigate to a specific route
    redirect, // use this function to redirect to a specific route
    getPath, // use this function to get the path for a specific route
  };
}
