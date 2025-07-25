package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Define a custom key type to avoid collisions in context
type contextKey string
const UserIDKey contextKey = "userID"

// AuthMiddleware verifies the JWT token from the Authorization header.
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Get the token from the header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// The header should be in the format "Bearer <token>"
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader { // No "Bearer " prefix
			http.Error(w, "Invalid token format", http.StatusUnauthorized)
			return
		}

		// 2. Parse and validate the token
		// The secret key should be the same one you use in your Next.js .env.local file (AUTH_SECRET)
		jwtSecret := os.Getenv("AUTH_SECRET")
		if jwtSecret == "" {
			// In a real app, you'd log this as a critical server configuration error
			http.Error(w, "Server configuration error", http.StatusInternalServerError)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Make sure the signing method is what you expect
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// 3. Extract user ID and add it to the request context
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			userID, ok := claims["id"].(string) // Corresponds to token.id in NextAuth callback
			if !ok {
				http.Error(w, "Invalid token claims: user ID not found", http.StatusUnauthorized)
				return
			}
			// Add the user ID to the context of the request
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			// Call the next handler in the chain with the new context
			next.ServeHTTP(w, r.WithContext(ctx))
		} else {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
		}
	})
}
