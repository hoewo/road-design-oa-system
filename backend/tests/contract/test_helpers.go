package contract

import "strconv"

// uintToString converts uint to string for URL path construction
func uintToString(id uint) string {
	return strconv.FormatUint(uint64(id), 10)
}

// uintFromInterface converts interface{} to uint (used in test responses)
func uintFromInterface(value interface{}) uint {
	switch v := value.(type) {
	case float64:
		return uint(v)
	case int:
		return uint(v)
	default:
		return 0
	}
}
