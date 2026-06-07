// models/cutoff_schedule.go
package models

import (
	"time"
)

type CutOffSchedule struct {
    ID              uint      `gorm:"primaryKey" json:"id"`
    Provider        string    `gorm:"size:50;not null;index" json:"provider"` // "bank_bca", "digiflazz", etc
    DayOfWeek       int       `json:"day_of_week"` // 0-6 (Minggu=0), -1 untuk setiap hari
    StartTime       string    `gorm:"size:5" json:"start_time"` // Format "23:00"
    EndTime         string    `gorm:"size:5" json:"end_time"`   // Format "04:00"
    Description     string    `gorm:"size:255" json:"description"`
    IsActive        bool      `gorm:"default:true" json:"is_active"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}

// IsInCutOff - cek apakah waktu sekarang dalam cut off
func (c *CutOffSchedule) IsInCutOff(checkTime time.Time) bool {
    if !c.IsActive {
        return false
    }
    
    // Cek hari
    if c.DayOfWeek != -1 && int(checkTime.Weekday()) != c.DayOfWeek {
        return false
    }
    
    // Parse start dan end time
    start, _ := time.Parse("15:04", c.StartTime)
    end, _ := time.Parse("15:04", c.EndTime)
    
    current := time.Date(2000, 1, 1, checkTime.Hour(), checkTime.Minute(), 0, 0, time.UTC)
    startTime := time.Date(2000, 1, 1, start.Hour(), start.Minute(), 0, 0, time.UTC)
    endTime := time.Date(2000, 1, 1, end.Hour(), end.Minute(), 0, 0, time.UTC)
    
    // Handle overnight cut off (start > end)
    if startTime.After(endTime) {
        if current.After(startTime) || current.Before(endTime) {
            return true
        }
    } else {
        if current.After(startTime) && current.Before(endTime) {
            return true
        }
    }
    
    return false
}