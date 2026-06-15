const KAKAO_MAP_SCRIPT_ID = "wemove-kakao-map-sdk";

let kakaoMapPromise;

export const KAKAO_MAP_APP_KEY = String(
  import.meta.env.VITE_KAKAO_MAP_APP_KEY || "",
).trim();

export const loadKakaoMap = () => {
  if (!KAKAO_MAP_APP_KEY) {
    return Promise.reject(new Error("KAKAO_MAP_APP_KEY_MISSING"));
  }

  if (window.kakao?.maps?.services) {
    return Promise.resolve(window.kakao);
  }

  if (kakaoMapPromise) {
    return kakaoMapPromise;
  }

  kakaoMapPromise = new Promise((resolve, reject) => {
    const loadMaps = () => {
      if (!window.kakao?.maps) {
        reject(new Error("KAKAO_MAP_SDK_UNAVAILABLE"));
        return;
      }

      window.kakao.maps.load(() => resolve(window.kakao));
    };

    const existingScript = document.getElementById(KAKAO_MAP_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", loadMaps, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("KAKAO_MAP_SDK_LOAD_FAILED")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_MAP_SCRIPT_ID;
    script.async = true;
    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
        KAKAO_MAP_APP_KEY,
      )}&autoload=false&libraries=services,clusterer`;
    script.addEventListener("load", loadMaps, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("KAKAO_MAP_SDK_LOAD_FAILED")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return kakaoMapPromise;
};
