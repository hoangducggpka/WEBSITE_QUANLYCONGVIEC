// src/utils/api.js
const API_BASE =
    import.meta.env.VITE_API_BASE || "";

// function extractFirstError(data) {
//     if (typeof data === "string") return data;
//     if (data.error) return data.error;
//     if (data.detail) return data.detail;
//     if (data.message) return data.message;
//     if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
//         return data.non_field_errors[0];
//     }

//     // Trường hợp BulkTaskCreateSerializer: tasks là list lỗi theo index
//     if (Array.isArray(data.tasks)) {
//         for (const item of data.tasks) {
//             if (item && typeof item === "object" && Object.keys(item).length > 0) {
//                 const found = extractFirstError(item);
//                 if (found) return found;
//             }
//         }
//     }

//     return JSON.stringify(data);
// }
export function extractFirstError(data) {
    if (typeof data === "string") return data;
    if (data.detail) return Array.isArray(data.detail) ? data.detail[0] : data.detail;
    if (data.error)  return Array.isArray(data.error)  ? data.error[0]  : data.error;
    if (data.message) return data.message;
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
        return data.non_field_errors[0];
    }
    if (Array.isArray(data.tasks)) {
        for (const item of data.tasks) {
            if (item && typeof item === "object" && Object.keys(item).length > 0) {
                const found = extractFirstError(item);
                if (found) return found;
            }
        }
    }

    // Fallback: lấy lỗi field-level đầu tiên (vd: {"username": ["..."]})
    const keys = Object.keys(data);
    if (keys.length > 0) {
        const val = data[keys[0]];
        if (Array.isArray(val) && val.length) return val[0];
        if (typeof val === "string") return val;
    }

    return JSON.stringify(data);
}

export const apiFetch = async (url, options = {}) => {
  let access = localStorage.getItem("access");
  const refresh = localStorage.getItem("refresh");

  const makeRequest = async (token) => {
    const isFormData = options.body instanceof FormData;

    return fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        // Chỉ set Content-Type JSON khi KHÔNG phải FormData
        // Nếu là FormData, browser tự set multipart/form-data + boundary
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let response = await makeRequest(access);

  // access token hết hạn
  if (response.status === 401 && refresh) {
    try {
      const refreshRes = await fetch(`${API_BASE}/accounts/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!refreshRes.ok) throw new Error("Refresh expired");

      const refreshData = await refreshRes.json();
      localStorage.setItem("access", refreshData.access);
      access = refreshData.access;

      response = await makeRequest(access);
    } catch (err) {
      console.warn("Session expired");
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/login";
      throw err;
    }
  }
  if (!response.ok) {
    let errMsg = `Lỗi ${response.status}`;
    try {
        const data = await response.clone().json();
        errMsg = extractFirstError(data);
    } catch {
        // không phải JSON, giữ errMsg mặc định
    }
    throw new Error(errMsg);
}

  return response;
};

export const logoutRequest = async () => {
  const refresh = localStorage.getItem("refresh");
  try {
    await fetch(`${API_BASE}/accounts/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
  } catch (err) {
    console.warn("Logout request failed");
  }
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.location.href = "/login";
};

