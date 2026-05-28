package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

var (
	jwksOnce sync.Once
	jwksKey  keyfunc.Keyfunc
	jwksErr  error
)

const segment = "corridor"
const serviceName = "corridor-api"

func main() {
	loadEnv()

	mux := http.NewServeMux()
	mux.HandleFunc("/", root)
	mux.HandleFunc("/v1/"+segment+"/health", health)
	mux.HandleFunc("/v1/"+segment+"/ready", ready)
	mux.HandleFunc("/v1/"+segment+"/hello", hello)

	handler := cors(mux)

	host := envOr("HOST", "127.0.0.1")
	port := envOr("PORT", "3005")
	addr := host + ":" + port
	fmt.Printf("[ ready ] http://%s\n", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		fmt.Fprintf(os.Stderr, "listen: %v\n", err)
		os.Exit(1)
	}
}

func loadEnv() {
	dir, _ := os.Getwd()
	for i := 0; i < 24; i++ {
		if _, err := os.Stat(filepath.Join(dir, "nx.json")); err == nil {
			_ = godotenv.Load(filepath.Join(dir, ".env"))
			_ = godotenv.Overload(filepath.Join(dir, "apps/services/corridor-api/.env.development"))
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func root(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Spectra " + serviceName,
		"segment": segment,
	})
}

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func ready(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"checks": map[string]string{"runtime": "ok"},
	})
}

func hello(w http.ResponseWriter, r *http.Request) {
	sub, status, body := authenticate(r)
	if status != 0 {
		writeJSON(w, status, body)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"message":       "Hello from " + serviceName,
		"segment":       segment,
		"service":       serviceName,
		"authenticated": true,
		"principal":     map[string]string{"sub": sub},
	})
}

func authenticate(r *http.Request) (sub string, status int, errBody map[string]string) {
	token := bearerToken(r)
	if token == "" {
		return "", http.StatusUnauthorized, map[string]string{
			"error":   "missing_token",
			"message": "Authorization: Bearer <access_token> is required.",
		}
	}

	if os.Getenv("AUTH0_VERIFY_DISABLED") == "true" {
		parser := jwt.NewParser(jwt.WithoutClaimsValidation())
		tok, _, err := parser.ParseUnverified(token, jwt.MapClaims{})
		if err != nil {
			return "", http.StatusUnauthorized, map[string]string{
				"error":   "invalid_token",
				"message": err.Error(),
			}
		}
		claims, _ := tok.Claims.(jwt.MapClaims)
		return claimSub(claims), 0, nil
	}

	domain := strings.TrimSpace(os.Getenv("AUTH0_DOMAIN"))
	audience := normalizeAudience(os.Getenv("AUTH0_AUDIENCE"))
	if domain == "" || audience == "" {
		return "", http.StatusServiceUnavailable, map[string]string{
			"error": "auth_not_configured",
			"message": "Set AUTH0_DOMAIN and AUTH0_AUDIENCE, or AUTH0_VERIFY_DISABLED=true for local development only.",
		}
	}

	issuer := resolveIssuer(domain, os.Getenv("AUTH0_ISSUER"))
	host := strings.TrimPrefix(strings.TrimPrefix(strings.TrimSpace(domain), "https://"), "http://")
	host = strings.TrimRight(host, "/")
	jwksURL := "https://" + host + "/.well-known/jwks.json"

	kf, err := getJWKS(jwksURL)
	if err != nil {
		return "", http.StatusServiceUnavailable, map[string]string{
			"error":   "auth_not_configured",
			"message": err.Error(),
		}
	}

	tok, err := jwt.Parse(token, kf.Keyfunc,
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithIssuer(issuer),
		jwt.WithAudience(audience),
	)
	if err != nil || !tok.Valid {
		msg := "Token verification failed."
		if err != nil {
			msg = err.Error()
		}
		return "", http.StatusUnauthorized, map[string]string{
			"error":   "invalid_token",
			"message": msg,
		}
	}
	claims, _ := tok.Claims.(jwt.MapClaims)
	return claimSub(claims), 0, nil
}

func getJWKS(url string) (keyfunc.Keyfunc, error) {
	jwksOnce.Do(func() {
		jwksKey, jwksErr = keyfunc.NewDefault([]string{url})
	})
	return jwksKey, jwksErr
}

func claimSub(claims jwt.MapClaims) string {
	if s, ok := claims["sub"].(string); ok && s != "" {
		return s
	}
	return "unknown"
}

func bearerToken(r *http.Request) string {
	hdr := r.Header.Get("Authorization")
	if !strings.HasPrefix(strings.ToLower(hdr), "bearer ") {
		return ""
	}
	return strings.TrimSpace(hdr[7:])
}

func normalizeAudience(raw string) string {
	return strings.TrimRight(strings.TrimSpace(raw), "/")
}

func resolveIssuer(domain, override string) string {
	if o := strings.TrimSpace(override); o != "" {
		if strings.HasSuffix(o, "/") {
			return o
		}
		return o + "/"
	}
	host := strings.TrimPrefix(strings.TrimPrefix(strings.TrimSpace(domain), "https://"), "http://")
	host = strings.TrimRight(host, "/")
	return "https://" + host + "/"
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
