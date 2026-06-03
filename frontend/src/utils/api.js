const API_BASE = "http://127.0.0.1:8000";

export const apiFetch = async (url, options = {}) => {
  let access = localStorage.getItem("access");
  const refresh = localStorage.getItem("refresh");

  const makeRequest = async (token) => {
    return fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });
  };

  let response = await makeRequest(access);

  // access token hết hạn
  if (response.status === 401 && refresh) {
    try {
      const refreshRes = await fetch(`${API_BASE}/accounts/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refresh })
      });

      if (!refreshRes.ok) {
        throw new Error("Refresh expired");
      }

      const refreshData = await refreshRes.json();

      localStorage.setItem("access", refreshData.access);
      access = refreshData.access;

      // retry request
      response = await makeRequest(access);
    } catch (err) {
      console.warn("Session expired");

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      window.location.href = "/login";
      throw err;
    }
  }

  return response;
};

export const logoutRequest = async () => {
  const refresh = localStorage.getItem("refresh");

  try {
    await fetch(`${API_BASE}/accounts/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh })
    });
  } catch (err) {
    console.warn("Logout request failed");
  }

  localStorage.removeItem("access");
  localStorage.removeItem("refresh");

  window.location.href = "/login";
};