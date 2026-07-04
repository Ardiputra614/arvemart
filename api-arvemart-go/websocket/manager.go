// websocket/manager.go
package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Client represents a connected WebSocket client
type Client struct {
	Conn     *websocket.Conn
	UserID   string
	OrderIDs map[string]bool // Orders that this client subscribes to
	Public   bool             // Receives public transaction feed
	Send     chan []byte
}

// Message structure for WebSocket communication
type Message struct {
	Type    string      `json:"type"`               // "subscribe", "unsubscribe", "order_update", "ping", "pong"
	OrderID string      `json:"order_id,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// WebSocketManager manages all WebSocket connections
type WebSocketManager struct {
	Clients    map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
	Mutex      sync.Mutex
}

var Manager = WebSocketManager{
	Clients:    make(map[*Client]bool),
	Register:   make(chan *Client),
	Unregister: make(chan *Client),
	Broadcast:  make(chan []byte),
}

// Start initializes the WebSocket manager
func (manager *WebSocketManager) Start() {
	go manager.start()
}

func (manager *WebSocketManager) start() {
	for {
		select {
		case client := <-manager.Register:
			manager.Mutex.Lock()
			manager.Clients[client] = true
			log.Printf("✅ Client registered. Total clients: %d", len(manager.Clients))
			manager.Mutex.Unlock()

		case client := <-manager.Unregister:
			manager.Mutex.Lock()
			if _, ok := manager.Clients[client]; ok {
				delete(manager.Clients, client)
				close(client.Send)
				log.Printf("❌ Client unregistered. Total clients: %d", len(manager.Clients))
			}
			manager.Mutex.Unlock()

		case message := <-manager.Broadcast:
			manager.Mutex.Lock()
			for client := range manager.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(manager.Clients, client)
				}
			}
			manager.Mutex.Unlock()
		}
	}
}

// SendToOrderSubscribers sends update to all clients subscribed to an order
func (manager *WebSocketManager) SendToOrderSubscribers(orderID string, data interface{}) {
	message := Message{
		Type:    "order_update", // KONSISTEN: selalu pakai "order_update"
		OrderID: orderID,
		Data:    data,
	}
	
	jsonMessage, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}
	
	manager.Mutex.Lock()
	defer manager.Mutex.Unlock()
	
	sentCount := 0
	for client := range manager.Clients {
		if client.OrderIDs[orderID] {
			select {
			case client.Send <- jsonMessage:
				sentCount++
				log.Printf("📤 Sent update for order %s to client %s", orderID, client.UserID)
			default:
				log.Printf("⚠️ Client %s buffer full, closing", client.UserID)
				close(client.Send)
				delete(manager.Clients, client)
			}
		}
	}
	
	log.Printf("Broadcast complete: sent to %d clients for order %s", sentCount, orderID)
}

// BroadcastToPublic sends a message to all clients subscribed to public feed
func (manager *WebSocketManager) BroadcastToPublic(data interface{}) {
	message := Message{
		Type: "public_update",
		Data: data,
	}

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling public message: %v", err)
		return
	}

	manager.Mutex.Lock()
	defer manager.Mutex.Unlock()

	for client := range manager.Clients {
		if client.Public {
			select {
			case client.Send <- jsonMessage:
			default:
				close(client.Send)
				delete(manager.Clients, client)
			}
		}
	}
}


