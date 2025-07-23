package handlers

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"hookinator/internal/database"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	bodyBytes, _ := io.ReadAll(r.Body)
	defer r.Body.Close()

	headers := make(map[string]string)
	for k, v := range r.Header {
		headers[k] = v[0]
	}

	// Save webhook request to database
	webhookReq := database.WebhookRequest{
		Timestamp: time.Now(),
		Method:    r.Method,
		Headers:   headers,
		Body:      string(bodyBytes),
	}

	if err := h.DB.SaveRequest(id, webhookReq); err != nil {
		log.Printf("Failed to save webhook request: %v", err)
		// Continue processing even if save fails
	}

	// Forward if forwarding URL exists
	forwardURL, err := h.DB.GetForwardURL(id)
	if err != nil {
		log.Printf("Failed to get forward URL: %v", err)
	} else if forwardURL != "" {
		go func() {
			req, _ := http.NewRequest(r.Method, forwardURL, bytes.NewReader(bodyBytes))
			for k, v := range headers {
				req.Header.Set(k, v)
			}
			client := &http.Client{Timeout: 5 * time.Second}
			_, err := client.Do(req)
			if err != nil {
				log.Printf("Failed to forward webhook: %v", err)
			}
		}()
	}

	fmt.Fprintf(w, "Webhook received and processed")
}