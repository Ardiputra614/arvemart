// hooks/useWebSocket.js
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";

export const useWebSocket = (orderId, userId = null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://arvemart.com";
      const userIdParam = userId || orderId || "anonymous";
      const url = `${wsUrl}/ws?user_id=${userIdParam}`;

      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Subscribe ke order
        if (orderId) {
          ws.send(
            JSON.stringify({
              type: "subscribe",
              order_id: orderId,
            }),
          );
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);

        // Reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Terima semua tipe yang relevan
          if (message.type === "order_update") {

            if (message.order_id === orderId) {
              setOrderStatus(message.data);

              // Notifikasi
              if (
                message.data?.payment_status === "settlement" ||
                message.data?.payment_status === "success" ||
                message.data?.payment_status === "capture"
              ) {
                toast.success("✅ Pembayaran berhasil!");
              }

              if (message.data?.digiflazz_status === "Sukses") {
                toast.success("✅ Produk berhasil dikirim!");
              }
            }
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("❌ Connection error:", error);
    }
  }, [orderId, userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    orderStatus,
    wsRef: wsRef.current,
  };
};
