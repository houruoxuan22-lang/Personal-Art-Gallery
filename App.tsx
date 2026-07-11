import { useEffect, useState } from "react";
import GalleryPage from "./pages/GalleryPage";
import HomePage from "./pages/HomePage";
import type { GalleryImage } from "./pages/HomePage";
import type { UserWallAllocation } from "./galleryLayoutEngine";

type RouteState = {
  path: string;
  galleryImages: GalleryImage[];
  galleryAllocation: UserWallAllocation | null;
};

function getRouteState(): RouteState {
  const state = window.history.state as {
    galleryImages?: GalleryImage[];
    galleryAllocation?: UserWallAllocation;
  } | null;

  return {
    path: window.location.pathname,
    galleryImages: Array.isArray(state?.galleryImages) ? state.galleryImages : [],
    galleryAllocation: state?.galleryAllocation ?? null
  };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => getRouteState());

  useEffect(() => {
    function syncRoute() {
      setRoute(getRouteState());
    }

    window.addEventListener("popstate", syncRoute);
    window.addEventListener("gallery:navigate", syncRoute);

    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("gallery:navigate", syncRoute);
    };
  }, []);

  if (route.path === "/gallery") {
    return (
      <GalleryPage
        images={route.galleryImages}
        allocation={route.galleryAllocation}
      />
    );
  }

  return <HomePage />;
}
