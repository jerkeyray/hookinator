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

var (
	mu     sync.RWMutex
	events = make(map[string][]WebhookRequest)
)

func Save(id string, req WebhookRequest) {
	mu.Lock()
	defer mu.Unlock()
	events[id] = append(events[id], req)
}

func Get(id string) []WebhookRequest {
	mu.RLock()
	defer mu.RUnlock()
	return events[id]
}
