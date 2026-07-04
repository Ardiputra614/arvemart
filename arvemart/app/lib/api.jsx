import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GOLANG_URL,
  withCredentials: true, // cukup sekali di sini
});

export default api;
