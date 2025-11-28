package utils

import "strconv"

// ParseUintParam parses a string parameter to uint
func ParseUintParam(raw string) (uint, error) {
	id, err := strconv.ParseUint(raw, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}
