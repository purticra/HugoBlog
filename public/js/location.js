// ====== 配置区 ======
const SHEETDB_API_URL = "https://sheetdb.io/api/v1/42l4qrr2ds9o1";
// 允许重新记录的间隔时间（毫秒） 2 小时 = 2 * 60 * 60 * 1000
const RELOG_INTERVAL = 2 * 60 * 60 * 1000;
// ===================

// 发送数据到 SheetDB
async function sendToSheetDB(data) {
  try {
    const res = await fetch(SHEETDB_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [data] })
    });
    const result = await res.json();
    console.log("✅ SheetDB 返回：", result);
  } catch (err) {
    console.error("❌ 上传失败:", err);
  }
}

// 获取浏览器定位（需要用户授权）
function getGeoByBrowser() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("浏览器不支持地理定位");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// 获取 IP 定位（不需要授权）
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
    console.warn("IP 定位失败：", e);
    return null;
  }
}

// 主逻辑
(async function () {
  const lastLogged = localStorage.getItem("visitorLastLogged");
  const now = Date.now();

  if (lastLogged && now - parseInt(lastLogged) < RELOG_INTERVAL) {
    const minutesLeft = Math.ceil((RELOG_INTERVAL - (now - parseInt(lastLogged))) / 60000);
    console.log(`🚫 距离下次可记录还有 ${minutesLeft} 分钟。`);
    return;
  }

  let locationData = null;

  try {
    console.log("📍 尝试使用浏览器定位...");
    const browserLoc = await getGeoByBrowser();
    locationData = browserLoc;
    console.log("✅ 浏览器定位成功");
  } catch (err) {
    console.warn("❌ 浏览器定位失败:", err);
    console.log("🌐 使用 IP 定位替代...");
    const ipLoc = await getGeoByIP();
    locationData = ipLoc;
  }

  if (!locationData) {
    console.error("无法获取任何地理位置信息。");
    return;
  }

  const data = {
    timestamp: new Date().toISOString(),
    ip: locationData.ip || "",
    city: locationData.city || "",
    region: locationData.region || "",
    country: locationData.country || "",
    latitude: locationData.latitude,
    longitude: locationData.longitude,
  };

  await sendToSheetDB(data);

  // ✅ 记录当前时间戳，下次 2 小时后才可再次上传
  localStorage.setItem("visitorLastLogged", now.toString());
})();
