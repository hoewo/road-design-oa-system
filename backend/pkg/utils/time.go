package utils

import (
	"fmt"
	"time"
)

// ParseFlexibleDate parses date strings in multiple formats
func ParseFlexibleDate(value string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02",
		"2006/01/02",
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("invalid date format, expected YYYY-MM-DD or RFC3339")
}

