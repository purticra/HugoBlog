// ====== 配置区 ======
const SHEETDB_API_URL = "https://sheetdb.io/api/v1/42l4qrr2ds9o1";
// 同一浏览器两次记录的最小间隔：2 小时
const RELOG_INTERVAL = 2 * 60 * 60 * 1000;
// 等待用户响应定位授权弹窗的最长时间
const GPS_PROMPT_TIMEOUT = 20 * 1000;
// ===================

function readLastLogged() {
  try {
    return parseInt(localStorage.getItem("visitorLastLogged") || "0", 10);
  } catch (e) {
    return 0;
  }
}

function writeLastLogged(ts) {
  try {
    localStorage.setItem("visitorLastLogged", String(ts));
  } catch (e) {}
}

// 浏览器 GPS 定位（需要用户授权）
function getGeoByBrowser() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("浏览器不支持地理定位");
      return;
    }
    // 用户不理会弹窗时 getCurrentPosition 不会返回，这里兜底
    const timer = setTimeout(() => reject("等待定位授权超时"), GPS_PROMPT_TIMEOUT);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        clearTimeout(timer);
        reject(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// IP 定位（不需要授权）
async function getGeoByIP() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const info = await res.json();
    return {
      ip: info.ip,
      city: info.city,
      region: info.region,
      country: info.country_name,
      latitude: info.latitude,
      longitude: info.longitude,
    };
  } catch (e) {
    return null;
  }
}

async function sendToSheetDB(data) {
  try {
    await fetch(SHEETDB_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [data] }),
    });
    return true;
  } catch (e) {
    return false;
  }
}

(async function () {
  const now = Date.now();
  if (now - readLastLogged() < RELOG_INTERVAL) return;

  // GPS 和 IP 并行：GPS 成功用 GPS 坐标，IP 始终用来补 ip / 城市
  const [gps, ipLoc] = await Promise.all([
    getGeoByBrowser().catch(() => null),
    getGeoByIP(),
  ]);

  if (!gps && !ipLoc) return;

  const base = ipLoc || {};
  const coords = gps || base;

  const data = {
    timestamp: new Date().toISOString(),
    source: gps ? "browser" : "ipapi",
    ip: base.ip || "",
    city: base.city || "",
    region: base.region || "",
    country: base.country || "",
    latitude: coords.latitude ?? "",
    longitude: coords.longitude ?? "",
    accuracy: gps ? Math.round(gps.accuracy) : "",
  };

  if (await sendToSheetDB(data)) writeLastLogged(now);
})();
