"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import {
  Activity,
  Download,
  MessageSquare,
  Users,
  XCircle,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Send,
  QrCode,
  RefreshCw,
  Trash2,
  BarChart3,
  Clock,
  Camera,
  ScanLine,
  Smartphone,
  Copy,
  Loader2,
  Eye,
  Plus,
  Search,
  Settings,
  Wifi,
} from "lucide-react";
import io from "socket.io-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://202.10.36.51:4000/api";
const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || "http://202.10.36.51:4000";

export default function WaEnginePage() {
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalDevices: 0,
    activeDevices: 0,
    queueSize: 0,
    devices: [],
  });
  const [loading, setLoading] = useState({
    devices: false,
    sending: false,
    connecting: false,
    qrLoading: {},
    disconnecting: {},
  });
  const [activeTab, setActiveTab] = useState("devices");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const [qrModal, setQrModal] = useState({ open: false, device: null });
  const [scanGuideModal, setScanGuideModal] = useState(false);
  const [addDeviceModal, setAddDeviceModal] = useState(false);
  const [, setDeviceSettingsModal] = useState({ open: false, device: null });

  const [sendForm, setSendForm] = useState({
    device_id: "",
    target: "",
    message: "",
  });

  const [newDevice, setNewDevice] = useState({
    name: "",
    type: "primary",
  });

  // ✅ Helper function (bukan hook, taruh sebelum useCallback)
  const calculateSuccessRate = (sent, failed) => {
    const total = sent + failed;
    if (total === 0) return 100;
    return Math.round((sent / total) * 100);
  };

  // ✅ 1. Semua useCallback dideklarasikan PERTAMA
  const addLog = useCallback((log) => {
    const newLog = {
      ...log,
      id: Date.now() + Math.random(),
      timestamp: new Date(),
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 100));
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      if (data.success) {
        const totalSent =
          data.stats.devices?.reduce(
            (acc, d) => acc + (d.messagesSent || 0),
            0,
          ) || 0;
        const totalFailed =
          data.stats.devices?.reduce(
            (acc, d) => acc + (d.messagesFailed || 0),
            0,
          ) || 0;
        setStats({
          totalDevices: data.stats.totalDevices || 0,
          activeDevices: data.stats.activeDevices || 0,
          queueSize: data.stats.queueSize || 0,
          totalSent,
          totalFailed,
          successRate: calculateSuccessRate(totalSent, totalFailed),
          devices: data.stats.devices || [],
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading((prev) => ({ ...prev, devices: true }));
    try {
      const response = await fetch(`${API_BASE}/devices`);
      const data = await response.json();
      if (data.success) {
        const transformedDevices = data.devices.map((device) => ({
          id: device.id,
          name: device.name,
          status: device.status,
          number: device.number,
          qrImage: device.qrCode,
          qrGenerated: !!device.qrCode,
          type: device.type || "primary",
          stats: {
            messagesSent: device.stats?.messagesSent || 0,
            messagesFailed: device.stats?.messagesFailed || 0,
            lastActivity: device.stats?.lastActivity,
            successRate: calculateSuccessRate(
              device.stats?.messagesSent || 0,
              device.stats?.messagesFailed || 0,
            ),
          },
        }));
        setDevices(transformedDevices);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      addLog({
        type: "error",
        device: "System",
        message: "Failed to fetch devices",
      });
      toast.error("Failed to fetch devices");
    } finally {
      setLoading((prev) => ({ ...prev, devices: false }));
    }
  }, [addLog]);

  // ✅ 2. useEffect socket SETELAH semua useCallback
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Socket connected");
      setSocketConnected(true);
      addLog({
        type: "success",
        device: "System",
        message: "Connected to WA Engine server",
      });
    });

    newSocket.on("disconnect", () => {
      setSocketConnected(false);
      addLog({
        type: "warning",
        device: "System",
        message: "Disconnected from WA Engine server",
      });
    });

    newSocket.on("qr_generated", ({ deviceId, qrImage }) => {
      setDevices((prev) =>
        prev.map((device) =>
          device.id === deviceId
            ? { ...device, qrImage, status: "qr_ready", qrGenerated: true }
            : device,
        ),
      );
      setLoading((prev) => ({
        ...prev,
        qrLoading: { ...prev.qrLoading, [deviceId]: false },
      }));
      addLog({
        type: "info",
        device: "System",
        message: `QR code generated for device ${deviceId}`,
      });
      toast.info("QR Code generated. Scan to connect.");
    });

    newSocket.on("qr_updated", ({ deviceId, qrImage }) => {
      setDevices((prev) =>
        prev.map((device) =>
          device.id === deviceId ? { ...device, qrImage } : device,
        ),
      );
    });

    newSocket.on("device_connected", ({ deviceId, number }) => {
      setDevices((prev) =>
        prev.map((device) =>
          device.id === deviceId
            ? {
                ...device,
                status: "connected",
                number,
                qrImage: null,
                qrGenerated: false,
              }
            : device,
        ),
      );
      setStats((prev) => ({ ...prev, activeDevices: prev.activeDevices + 1 }));
      addLog({
        type: "success",
        device: "System",
        message: `📱 Device connected: ${number}`,
      });
      toast.success("Device connected successfully");
    });

    newSocket.on("device_status", ({ deviceId, status }) => {
      setDevices((prev) =>
        prev.map((device) =>
          device.id === deviceId ? { ...device, status } : device,
        ),
      );
    });

    newSocket.on("message_queued", (data) => {
      addLog({
        type: "info",
        device: "System",
        message: `📤 Message queued (Position: ${data.queuePosition})`,
      });
    });

    newSocket.on("message_result", (data) => {
      addLog({
        type: data.success ? "success" : "error",
        device: "System",
        message: data.success
          ? "✅ Message sent successfully"
          : `❌ Message failed: ${data.error}`,
      });
      if (data.success) fetchStats();
    });

    newSocket.on("device_removed", ({ deviceId }) => {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      addLog({
        type: "warning",
        device: "System",
        message: `Device ${deviceId} removed`,
      });
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      addLog({
        type: "error",
        device: "System",
        message: `Socket error: ${error.message || error}`,
      });
    });

    return () => newSocket.disconnect();
  }, [addLog, fetchStats]);

  // ✅ 3. useEffect fetch data SETELAH socket
  useEffect(() => {
    fetchDevices();
    fetchStats();

    const interval = setInterval(() => fetchStats(), 10000);
    return () => clearInterval(interval);
  }, [fetchDevices, fetchStats]);

  // Add device
  const handleAddDevice = async () => {
    if (!newDevice.name.trim()) {
      toast.error("Please enter a device name");
      return;
    }

    setLoading((prev) => ({ ...prev, connecting: true }));

    try {
      const response = await fetch(`${API_BASE}/device/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDevice.name, type: newDevice.type }),
      });

      const data = await response.json();

      if (data.success) {
        const newDeviceData = {
          id: data.deviceId,
          name: data.name,
          status: "connecting",
          qrImage: null,
          qrGenerated: false,
          number: null,
          type: newDevice.type,
          stats: {
            messagesSent: 0,
            messagesFailed: 0,
            lastActivity: null,
            successRate: 100,
          },
        };

        setDevices((prev) => [...prev, newDeviceData]);
        addLog({
          type: "success",
          device: "System",
          message: `Device "${newDevice.name}" added successfully`,
        });
        toast.success("Device added successfully");
        setNewDevice({ name: "", type: "primary" });
        setAddDeviceModal(false);
        fetchStats();

        if (socket && socket.connected) {
          setTimeout(() => {
            socket.emit("request_qr", { deviceId: data.deviceId });
            setLoading((prev) => ({
              ...prev,
              qrLoading: { ...prev.qrLoading, [data.deviceId]: true },
            }));
          }, 2000);
        } else {
          const checkSocket = setInterval(() => {
            if (socket?.connected) {
              socket.emit("request_qr", { deviceId: data.deviceId });
              setLoading((prev) => ({
                ...prev,
                qrLoading: { ...prev.qrLoading, [data.deviceId]: true },
              }));
              clearInterval(checkSocket);
            }
          }, 1000);
          setTimeout(() => clearInterval(checkSocket), 10000);
        }
      }
    } catch (error) {
      console.error("Error adding device:", error);
      toast.error("Failed to add device");
    } finally {
      setLoading((prev) => ({ ...prev, connecting: false }));
    }
  };

  // Refresh QR
  const handleRefreshQR = async (deviceId) => {
    setLoading((prev) => ({
      ...prev,
      qrLoading: { ...prev.qrLoading, [deviceId]: true },
    }));

    try {
      const response = await fetch(`${API_BASE}/qr/${deviceId}/refresh`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success && socket) {
        socket.emit("request_qr", { deviceId });
        addLog({
          type: "info",
          device: "System",
          message: "Refreshing QR code...",
        });
        toast.info("Generating new QR code...");
      }
    } catch (error) {
      console.error("Error refreshing QR:", error);
      toast.error("Failed to refresh QR code");
    } finally {
      setTimeout(() => {
        setLoading((prev) => ({
          ...prev,
          qrLoading: { ...prev.qrLoading, [deviceId]: false },
        }));
      }, 2000);
    }
  };

  // Disconnect device
  const handleDisconnect = async (deviceId) => {
    if (!confirm("Are you sure you want to disconnect this device?")) return;

    setLoading((prev) => ({
      ...prev,
      disconnecting: { ...prev.disconnecting, [deviceId]: true },
    }));

    try {
      const response = await fetch(`${API_BASE}/device/${deviceId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setDevices((prev) =>
          prev.map((device) =>
            device.id === deviceId
              ? { ...device, status: "disconnected" }
              : device,
          ),
        );
        setStats((prev) => ({
          ...prev,
          activeDevices: prev.activeDevices - 1,
        }));
        addLog({
          type: "warning",
          device: "System",
          message: "Device disconnected",
        });
        toast.info("Device disconnected");
      }
    } catch (error) {
      console.error("Error disconnecting device:", error);
      toast.error("Failed to disconnect device");
    } finally {
      setLoading((prev) => ({
        ...prev,
        disconnecting: { ...prev.disconnecting, [deviceId]: false },
      }));
    }
  };

  // Delete device
  const handleDelete = async (deviceId) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return;

    if (
      !confirm(
        `Are you sure you want to permanently delete "${device.name}"? All session data will be lost.`,
      )
    )
      return;

    try {
      const response = await fetch(`${API_BASE}/device/${deviceId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setDevices((prev) => prev.filter((d) => d.id !== deviceId));
        addLog({
          type: "error",
          device: "System",
          message: `Device "${device.name}" deleted`,
        });
        toast.success("Device deleted successfully");
        fetchStats();
      }
    } catch (error) {
      console.error("Error deleting device:", error);
      toast.error("Failed to delete device");
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!sendForm.device_id || !sendForm.target || !sendForm.message) {
      toast.error("Please fill all required fields");
      return;
    }

    const device = devices.find((d) => d.id === sendForm.device_id);
    if (!device || device.status !== "connected") {
      toast.error("Device is not connected");
      return;
    }

    setLoading((prev) => ({ ...prev, sending: true }));

    try {
      const response = await fetch(`${API_BASE}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });
      const data = await response.json();

      if (data.success) {
        addLog({
          type: "success",
          device: device.name,
          message: `Message queued for ${sendForm.target}`,
        });
        setStats((prev) => ({ ...prev, queueSize: data.queuePosition }));
        toast.success("Message queued successfully");
        setSendForm((prev) => ({ ...prev, target: "", message: "" }));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setLoading((prev) => ({ ...prev, sending: false }));
    }
  };

  // Filter and sort devices
  const filteredDevices = devices
    .filter((device) => {
      if (
        searchQuery &&
        !device.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !device.number?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filterStatus !== "all" && device.status !== filterStatus) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return a.status.localeCompare(b.status);
        case "messages":
          return (b.stats?.messagesSent || 0) - (a.stats?.messagesSent || 0);
        case "lastActivity":
          return (
            new Date(b.stats?.lastActivity || 0) -
            new Date(a.stats?.lastActivity || 0)
          );
        default:
          return 0;
      }
    });

  const getStatusIcon = (status) => {
    switch (status) {
      case "connected":
        return <Wifi className="w-4 h-4 text-green-500" />;
      case "disconnected":
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case "qr_ready":
        return <QrCode className="w-4 h-4 text-yellow-500" />;
      case "connecting":
      case "reconnecting":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 border-green-200";
      case "disconnected":
        return "bg-red-100 text-red-800 border-red-200";
      case "qr_ready":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "connecting":
      case "reconnecting":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDeviceTypeColor = (type) => {
    switch (type) {
      case "primary":
        return "bg-blue-100 text-blue-800";
      case "marketing":
        return "bg-purple-100 text-purple-800";
      case "backup":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // QR Code Display Component
  const QRCodeDisplay = ({ device, showModal = false }) => {
    return (
      <div className={`${showModal ? "p-2" : "space-y-4"}`}>
        <div className="relative">
          <div
            className={`${showModal ? "w-72 h-72" : "w-48 h-48"} mx-auto rounded-lg border-4 border-white shadow-xl bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center`}
          >
            {device.qrImage ? (
              <Image
                src={device.qrImage}
                alt="WhatsApp QR Code"
                width={showModal ? 288 : 192}
                height={showModal ? 288 : 192}
                className="rounded-lg"
                unoptimized
              />
            ) : (
              <div className="text-center p-4">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500">QR code not available</p>
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <QrCode className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {!showModal && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Scan with WhatsApp to connect
            </p>
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => handleRefreshQR(device.id)}
                disabled={loading.qrLoading[device.id]}
                className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading.qrLoading[device.id] ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Refresh
              </button>
              <button
                onClick={() => setQrModal({ open: true, device })}
                className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Eye className="w-3 h-3 mr-1" />
                Enlarge
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="py-8 text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    WhatsApp Engine
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Multi-Device WhatsApp Gateway
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <div
                    className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`}
                  />
                  <span className="text-sm text-gray-600">
                    {socketConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <button
                  onClick={() => setAddDeviceModal(true)}
                  className="inline-flex items-center justify-center px-5 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Device
                </button>
                <button
                  onClick={fetchDevices}
                  className="inline-flex items-center justify-center px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${loading.devices ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                title: "Messages Sent",
                value: stats.totalSent || 0,
                icon: MessageSquare,
                bgColor: "bg-green-50",
                iconColor: "text-green-500",
              },
              {
                title: "Active Devices",
                value: `${stats.activeDevices || 0}/${stats.totalDevices || 0}`,
                icon: Users,
                bgColor: "bg-blue-50",
                iconColor: "text-blue-500",
              },
              {
                title: "Success Rate",
                value: `${stats.successRate || 100}%`,
                icon: BarChart3,
                bgColor: "bg-purple-50",
                iconColor: "text-purple-500",
              },
              {
                title: "Queue Size",
                value: stats.queueSize || 0,
                icon: Clock,
                bgColor: "bg-amber-50",
                iconColor: "text-amber-500",
              },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {[
                  {
                    id: "devices",
                    label: "Devices",
                    icon: Smartphone,
                    count: devices.length,
                  },
                  { id: "send", label: "Send Message", icon: Send },
                  {
                    id: "logs",
                    label: "System Logs",
                    icon: Activity,
                    count: logs.length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          activeTab === tab.id
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Devices Tab */}
              {activeTab === "devices" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search devices by name or number..."
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="connected">Connected</option>
                        <option value="disconnected">Disconnected</option>
                        <option value="qr_ready">QR Ready</option>
                        <option value="connecting">Connecting</option>
                      </select>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="name">Sort by Name</option>
                        <option value="status">Sort by Status</option>
                        <option value="messages">Sort by Messages</option>
                        <option value="lastActivity">Sort by Activity</option>
                      </select>
                    </div>
                  </div>

                  {filteredDevices.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Smartphone className="w-12 h-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No devices found
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {searchQuery || filterStatus !== "all"
                          ? "Try adjusting your search or filter"
                          : "Add your first WhatsApp device to get started"}
                      </p>
                      {!searchQuery && filterStatus === "all" && (
                        <button
                          onClick={() => setAddDeviceModal(true)}
                          className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Add Your First Device
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredDevices.map((device) => (
                        <div
                          key={device.id}
                          className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
                        >
                          {/* Device Header */}
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div
                                className={`p-3 rounded-xl ${
                                  device.type === "primary"
                                    ? "bg-blue-100"
                                    : device.type === "marketing"
                                      ? "bg-purple-100"
                                      : "bg-green-100"
                                }`}
                              >
                                <Smartphone
                                  className={`w-6 h-6 ${
                                    device.type === "primary"
                                      ? "text-blue-600"
                                      : device.type === "marketing"
                                        ? "text-purple-600"
                                        : "text-green-600"
                                  }`}
                                />
                              </div>
                              <div>
                                <div className="flex items-center space-x-3">
                                  <h4 className="font-semibold text-gray-900">
                                    {device.name}
                                  </h4>
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getDeviceTypeColor(device.type)}`}
                                  >
                                    {device.type}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(device.status)} flex items-center space-x-1`}
                                  >
                                    {getStatusIcon(device.status)}
                                    <span className="ml-1">
                                      {device.status}
                                    </span>
                                  </span>
                                  {device.number && (
                                    <span className="text-xs text-gray-500">
                                      {device.number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setDeviceSettingsModal({ open: true, device })
                              }
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="Settings"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Device Info */}
                          <div className="space-y-4">
                            {device.status === "connected" ? (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white p-4 rounded-lg border">
                                    <p className="text-xs text-gray-600 mb-1">
                                      Messages Sent
                                    </p>
                                    <div className="flex items-end justify-between">
                                      <p className="text-2xl font-bold text-gray-900">
                                        {device.stats.messagesSent}
                                      </p>
                                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                        {device.stats.successRate}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-white p-4 rounded-lg border">
                                    <p className="text-xs text-gray-600 mb-1">
                                      Last Activity
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatTime(device.stats.lastActivity)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex space-x-3">
                                  <button
                                    onClick={() => handleDisconnect(device.id)}
                                    disabled={loading.disconnecting[device.id]}
                                    className="flex-1 py-2.5 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 disabled:opacity-50 flex items-center justify-center"
                                  >
                                    {loading.disconnecting[device.id] ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <WifiOff className="w-4 h-4 mr-2" />
                                    )}
                                    Disconnect
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveTab("send");
                                      setSendForm((prev) => ({
                                        ...prev,
                                        device_id: device.id,
                                      }));
                                    }}
                                    className="flex-1 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center"
                                  >
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Message
                                  </button>
                                </div>
                              </>
                            ) : device.status === "qr_ready" ? (
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-dashed border-blue-200">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">
                                      Scan QR Code
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Scan with WhatsApp to connect
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setScanGuideModal(true)}
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                                  >
                                    <ScanLine className="w-3 h-3 mr-1" />
                                    How to scan?
                                  </button>
                                </div>
                                <QRCodeDisplay device={device} />
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-6 rounded-lg text-center">
                                <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-3">
                                  {getStatusIcon(device.status)}
                                </div>
                                <p className="text-sm text-gray-600">
                                  Device is {device.status}
                                </p>
                                {device.status === "disconnected" && (
                                  <button
                                    onClick={() => handleRefreshQR(device.id)}
                                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reconnect
                                  </button>
                                )}
                              </div>
                            )}

                            <button
                              onClick={() => handleDelete(device.id)}
                              className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Device
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Send Message Tab */}
              {activeTab === "send" && (
                <div className="max-w-3xl mx-auto">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Send WhatsApp Message
                    </h3>
                    <p className="text-gray-500">
                      Send messages through connected WhatsApp devices
                    </p>
                  </div>

                  <form onSubmit={handleSendMessage} className="space-y-6">
                    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select WhatsApp Device *
                      </label>
                      <div className="space-y-3">
                        {devices
                          .filter((d) => d.status === "connected")
                          .map((device) => (
                            <label
                              key={device.id}
                              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                                sendForm.device_id === device.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="device"
                                value={device.id}
                                checked={sendForm.device_id === device.id}
                                onChange={(e) =>
                                  setSendForm((prev) => ({
                                    ...prev,
                                    device_id: e.target.value,
                                  }))
                                }
                                className="h-4 w-4 text-blue-600"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900">
                                    {device.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {device.number}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                  <span className="flex items-center">
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    {device.stats.messagesSent} sent
                                  </span>
                                  <span className="flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {device.stats.successRate}% success
                                  </span>
                                </div>
                              </div>
                            </label>
                          ))}
                      </div>
                      {devices.filter((d) => d.status === "connected")
                        .length === 0 && (
                        <p className="text-sm text-red-500 mt-2">
                          No connected devices available. Please connect a
                          device first.
                        </p>
                      )}
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Phone Number *
                      </label>
                      <div className="flex items-center">
                        <span className="bg-gray-200 px-4 py-3 rounded-l-lg border border-r-0 border-gray-300 text-gray-700 font-medium">
                          +62
                        </span>
                        <input
                          type="text"
                          value={sendForm.target}
                          onChange={(e) =>
                            setSendForm((prev) => ({
                              ...prev,
                              target: e.target.value.replace(/\D/g, ""),
                            }))
                          }
                          placeholder="81234567890"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Format: 81234567890 (without +62)
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Message Content *
                      </label>
                      <textarea
                        value={sendForm.message}
                        onChange={(e) =>
                          setSendForm((prev) => ({
                            ...prev,
                            message: e.target.value,
                          }))
                        }
                        rows={6}
                        placeholder="Type your message here..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          Max 4096 characters
                        </span>
                        <span
                          className={`text-sm ${sendForm.message.length > 4000 ? "text-red-500" : "text-gray-500"}`}
                        >
                          {sendForm.message.length}/4096
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading.sending || !sendForm.device_id}
                      className="w-full bg-green-500 text-white py-4 rounded-xl hover:bg-green-600 transition-all font-semibold text-lg flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {loading.sending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === "logs" && (
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        System Activity Logs
                      </h3>
                      <p className="text-gray-500">
                        Real-time monitoring of all activities
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setLogs([])}
                        className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={fetchDevices}
                        className="px-4 py-2.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 flex items-center"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 h-[500px] overflow-y-auto font-mono">
                    {logs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center">
                        <Activity className="w-16 h-16 text-gray-700 mb-4" />
                        <p className="text-gray-500">No activity logs yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-start space-x-3 p-3 hover:bg-gray-800/50 rounded-lg transition-colors group"
                          >
                            <div className="flex-shrink-0 mt-1">
                              {log.type === "success" ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : log.type === "error" ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : log.type === "warning" ? (
                                <AlertCircle className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <Activity className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-1">
                                <span className="text-xs text-gray-400">
                                  {formatTime(log.timestamp)}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    log.type === "success"
                                      ? "bg-green-900/50 text-green-300"
                                      : log.type === "error"
                                        ? "bg-red-900/50 text-red-300"
                                        : log.type === "warning"
                                          ? "bg-yellow-900/50 text-yellow-300"
                                          : "bg-blue-900/50 text-blue-300"
                                  }`}
                                >
                                  {log.type.toUpperCase()}
                                </span>
                                <span className="text-blue-300 text-sm font-medium truncate">
                                  [{log.device}]
                                </span>
                              </div>
                              <p className="text-gray-200 text-sm leading-relaxed">
                                {log.message}
                              </p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(log.message)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-200 transition-opacity"
                              title="Copy log"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Device Modal */}
      <Transition show={addDeviceModal}>
        <Dialog
          onClose={() => setAddDeviceModal(false)}
          className="relative z-50"
        >
          <Transition.Child
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                  <div className="p-6">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                      Add New Device
                    </Dialog.Title>
                    <p className="text-gray-500 mb-6">
                      Add a new WhatsApp device to your engine
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Device Name *
                        </label>
                        <input
                          type="text"
                          value={newDevice.name}
                          onChange={(e) =>
                            setNewDevice((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="e.g., Marketing Phone"
                          className="w-full px-3 py-2.5 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Device Type
                        </label>
                        <select
                          value={newDevice.type}
                          onChange={(e) =>
                            setNewDevice((prev) => ({
                              ...prev,
                              type: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2.5 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="primary">Primary</option>
                          <option value="marketing">Marketing</option>
                          <option value="backup">Backup</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setAddDeviceModal(false)}
                        className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddDevice}
                        disabled={loading.connecting || !newDevice.name.trim()}
                        className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center"
                      >
                        {loading.connecting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        {loading.connecting ? "Adding..." : "Add Device"}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* QR Code Modal */}
      {qrModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {qrModal.device?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Scan this QR code with WhatsApp
                  </p>
                </div>
                <button
                  onClick={() => setQrModal({ open: false, device: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <QRCodeDisplay device={qrModal.device} showModal={true} />

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => {
                    setScanGuideModal(true);
                    setQrModal({ open: false, device: null });
                  }}
                  className="w-full py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  How to Scan
                </button>
                <button
                  onClick={() => {
                    if (qrModal.device?.qrImage) {
                      const link = document.createElement("a");
                      link.href = `data:image/png;base64,${qrModal.device.qrImage}`;
                      link.download = `whatsapp-qr-${qrModal.device.id}.png`;
                      link.click();
                      toast.success("QR code downloaded");
                    }
                  }}
                  className="w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Guide Modal */}
      {scanGuideModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  How to Scan QR Code
                </h3>
                <button
                  onClick={() => setScanGuideModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Open WhatsApp",
                    description: "Open WhatsApp on your mobile phone",
                  },
                  {
                    step: 2,
                    title: "Go to Settings",
                    description: "Tap ⋮ (three dots) → Linked Devices",
                  },
                  {
                    step: 3,
                    title: "Scan QR Code",
                    description: "Tap 'Link a Device' and scan the QR code",
                  },
                  {
                    step: 4,
                    title: "Wait for Connection",
                    description:
                      "Wait for the device status to change to 'Connected'",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">
                        {item.step}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setScanGuideModal(false)}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Got it, thanks!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
