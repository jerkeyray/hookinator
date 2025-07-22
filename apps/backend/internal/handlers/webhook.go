package handlers

import (
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"hookinator/internal/store"
)

func HandleWebhook(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	bodyBytes, _ := io.ReadAll(r.Body)
	defer r.Body.Close()

	headers := make(map[string]string)
	for k, v := range r.Header {
		headers[k] = v[0]
	}

	store.Save(id, store.WebhookRequest{
		Timestamp: time.Now(),
		Method:    r.Method,
		Headers:   headers,
		Body:      string(bodyBytes),
	})

	fmt.Fprintf(w, "Received webhook for ID: %s\n", id)
}
