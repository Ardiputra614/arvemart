// // import axios from "axios";

// // const api = axios.create({
// //   baseURL: process.env.NEXT_PUBLIC_GOLANG_URL,
// //   withCredentials: true, // cukup sekali di sini
// // });

// // export default api;

// import axios from "axios";

// const api = axios.create({
//   baseURL: process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arveshop.web.id",
//   withCredentials: true,
//   headers: {
//     "Content-Type": "application/json",
//     Accept: "application/json",
//     "X-API-Key": process.env.NEXT_PUBLIC_API_SECRET_KEY || "4526478266756", // TAMBAHKAN INI!
//   },
//   timeout: 10000, // 10 detik timeout
// });

// // Optional: Request interceptor untuk logging
// api.interceptors.request.use((request) => {
//   console.log("Starting Request:", {
//     url: request.url,
//     method: request.method,
//     headers: request.headers,
//   });
//   return request;
// });

// // Response interceptor untuk error handling
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error("API Error:", {
//       status: error.response?.status,
//       data: error.response?.data,
//       message: error.message,
//     });
//     return Promise.reject(error);
//   },
// );

// export default api;

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arveshop.web.id",
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "X-API-Key": process.env.NEXT_PUBLIC_API_SECRET_KEY,
  },
  timeout: 10000,
});

api.interceptors.request.use((request) => {
  return request;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname + window.location.search;

      // Jangan redirect kalau udah di login/register, biar catch block handle error message
      if (currentPath === "/login" || currentPath === "/register") {
        return Promise.reject(error);
      }

      // Simpan halaman terakhir sebelum redirect
      sessionStorage.setItem("redirectAfterLogin", currentPath);

      // Redirect ke login
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;
