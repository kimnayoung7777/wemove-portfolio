const utf8Decoder = new TextDecoder("utf-8");

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return utf8Decoder.decode(bytes);
};

export const parseUserFromAccessToken = (accessToken) => {
  if (!accessToken) {
    return null;
  }

  try {
    const [, payload] = accessToken.split(".");
    const parsed = JSON.parse(decodeBase64Url(payload));

    return {
      memberId: Number(parsed.sub),
      loginId: parsed.loginId ?? "",
      nickname: parsed.nickname ?? "",
      role: parsed.role ?? "",
    };
  } catch {
    return null;
  }
};
