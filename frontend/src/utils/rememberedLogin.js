const REMEMBERED_LOGIN_ID_KEY = "wemoveRememberedLoginId";

export const getRememberedLoginId = () => {
  try {
    return localStorage.getItem(REMEMBERED_LOGIN_ID_KEY) ?? "";
  } catch {
    return "";
  }
};

export const setRememberedLoginId = (loginId) => {
  try {
    localStorage.setItem(REMEMBERED_LOGIN_ID_KEY, loginId);
  } catch {}
};

export const clearRememberedLoginId = () => {
  try {
    localStorage.removeItem(REMEMBERED_LOGIN_ID_KEY);
  } catch {}
};
