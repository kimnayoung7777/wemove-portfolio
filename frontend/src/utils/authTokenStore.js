let accessToken = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (nextAccessToken) => {
  accessToken = nextAccessToken ?? null;
};

export const clearAccessToken = () => {
  accessToken = null;
};
