package types

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// Date represents a date without time
type Date struct {
	time.Time
}

// UnmarshalJSON implements json.Unmarshaler
func (d *Date) UnmarshalJSON(b []byte) error {
	s := string(b)
	// Remove quotes
	if len(s) > 2 && s[0] == '"' && s[len(s)-1] == '"' {
		s = s[1 : len(s)-1]
	}

	// Parse date in YYYY-MM-DD format
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return err
	}

	d.Time = t
	return nil
}

// MarshalJSON implements json.Marshaler
func (d Date) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf(`"%s"`, d.Time.Format("2006-01-02"))), nil
}

// Value implements driver.Valuer for database
func (d Date) Value() (driver.Value, error) {
	return d.Time, nil
}

// Scan implements sql.Scanner for database
func (d *Date) Scan(value interface{}) error {
	if value == nil {
		d.Time = time.Time{}
		return nil
	}

	if t, ok := value.(time.Time); ok {
		d.Time = t
		return nil
	}

	return fmt.Errorf("cannot scan %T into Date", value)
}
