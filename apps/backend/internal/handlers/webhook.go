package handlers

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"

	"hookinator/internal/store"

	"github.com/go-chi/chi/v5"
)

func HandleWebhook(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	bodyBytes, _ := io.ReadAll(r.Body)
	defer r.Body.Close()

	headers := make(map[string]string)
	for k, v := range r.Header {
		headers[k] = v[0]
	}

	// Save for inspection
	store.Save(id, store.WebhookRequest{
		Timestamp: time.Now(),
		Method:    r.Method,
		Headers:   headers,
		Body:      string(bodyBytes),
	})

	// Forward if forwarding URL exists
	forwardURL := store.GetForwardURL(id)
	if forwardURL != "" {
		go func() {
			req, _ := http.NewRequest(r.Method, forwardURL, bytes.NewReader(bodyBytes))
			for k, v := range headers {
				req.Header.Set(k, v)
			}
			client := &http.Client{Timeout: 5 * time.Second}
			client.Do(req)
		}()
	}
	fmt.Fprintf(w, "Webhook received and processed")
}