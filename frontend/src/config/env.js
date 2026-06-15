const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export const API_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8456/api",
);

export const WS_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8456/ws",
);

export const buildWsUrl = (path, params = {}) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${WS_BASE_URL}${normalizedPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};
