package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

var (
	dbConnectionString string
	dbType             string
)

func init() {
	dbConnectionString = os.Getenv("DB_CONNECTION_STRING")
	if dbConnectionString == "" {
		dbConnectionString = "mock-database-url"
	}

	dbType = os.Getenv("DB_TYPE")
	if dbType == "" {
		dbType = "PostgreSQL"
	}
}

// BadgeMetadata represents the data payload expected from the frontend.
type BadgeMetadata struct {
	Name     string `json:"name,omitempty"`
	Role     string `json:"role,omitempty"`
	ImageURL string `json:"imageUrl"`
	Format   string `json:"format"`
}

func main() {
	// Serve static files from the /public directory
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	// API Endpoint to mock saving badge data
	http.HandleFunc("/api/save-badge", handleSaveBadge)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting HH Goa standalone generator server on :%s...\n", port)
	log.Printf("Configured to use Database Type: %s\n", dbType)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleSaveBadge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var metadata BadgeMetadata
	if err := json.NewDecoder(r.Body).Decode(&metadata); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Mocking the database interaction
	log.Printf("[DATABASE] Connecting to %s database at: %s\n", dbType, dbConnectionString)
	time.Sleep(500 * time.Millisecond) // simulate latency
	log.Printf("[DATABASE] Successfully saved badge record for User: '%s' (Format: %s)\n", metadata.Name, metadata.Format)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Badge record saved to database.",
	})
}
