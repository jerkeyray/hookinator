// store/store.go
package store

import (
	"sync"
	"time"
)

type WebhookRequest struct {
	Timestamp time.Time
	Headers   map[string]string
	Body      string
	Method    string
}

type WebhookData struct {
	Requests     []WebhookRequest
	ForwardingTo string // Optional forwarding URL
}

var (
	mu     sync.RWMutex
	events = make(map[string]*WebhookData)
)

func Save(id string, req WebhookRequest) {
	mu.Lock()
	defer mu.Unlock()
	if _, ok := events[id]; !ok {
		events[id] = &WebhookData{}
	}
	events[id].Requests = append(events[id].Requests, req)
}

func Get(id string) []WebhookRequest {
	mu.RLock()
	defer mu.RUnlock()
	if data, ok := events[id]; ok {
		return data.Requests
	}
	return nil
}

func SetForwardURL(id string, url string) {
	mu.Lock()
	defer mu.Unlock()
	if _, ok := events[id]; !ok {
		events[id] = &WebhookData{}
	}
	events[id].ForwardingTo = url
}

func GetForwardURL(id string) string {
	mu.RLock()
	defer mu.RUnlock()
	if data, ok := events[id]; ok {
		return data.ForwardingTo
	}
	return ""
}
