const RECENT_SEARCHES_KEY = "wemove:recent-searches";
const MAX_RECENT_SEARCHES = 6;

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const readStorage = (key, fallback) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  return safeParse(window.localStorage.getItem(key), fallback);
};

const writeStorage = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const isValidKeyword = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return Boolean(normalized) && normalized !== "null" && normalized !== "undefined";
};

export const getRecentSearches = () =>
  readStorage(RECENT_SEARCHES_KEY, []).filter(isValidKeyword);

export const registerSearchKeyword = (keyword) => {
  const normalizedKeyword = String(keyword ?? "").trim();
  if (!isValidKeyword(normalizedKeyword)) {
    return;
  }

  const recentSearches = getRecentSearches().filter(
    (item) => item !== normalizedKeyword,
  );
  recentSearches.unshift(normalizedKeyword);
  writeStorage(
    RECENT_SEARCHES_KEY,
    recentSearches.slice(0, MAX_RECENT_SEARCHES),
  );
};

export const clearRecentSearches = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(RECENT_SEARCHES_KEY);
};

export const pruneStoredSearches = (allowedKeywords) => {
  if (typeof window === "undefined") {
    return;
  }

  const allowedSet = new Set(
    allowedKeywords
      .map((keyword) => String(keyword ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  if (!allowedSet.size) {
    return;
  }

  const nextRecentSearches = getRecentSearches().filter((keyword) =>
    allowedSet.has(String(keyword ?? "").trim().toLowerCase()) &&
    isValidKeyword(keyword),
  );
  writeStorage(RECENT_SEARCHES_KEY, nextRecentSearches);

  const popularRecords = readStorage(POPULAR_SEARCHES_KEY, []);
  const nextPopularRecords = popularRecords.filter((record) =>
    allowedSet.has(String(record?.keyword ?? "").trim().toLowerCase()) &&
    isValidKeyword(record?.keyword),
  );
  writeStorage(POPULAR_SEARCHES_KEY, nextPopularRecords);
};
