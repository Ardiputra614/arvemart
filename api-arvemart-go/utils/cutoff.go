// utils/cutoff.go
package utils

import (
	"api-arveshop-go/config"
	"api-arveshop-go/models"
	"fmt"
	"log"
	"time"
)

// CheckCutOff - cek apakah provider sedang cut off
func CheckCutOff(provider string) (bool, *models.CutOffSchedule, error) {
    var schedules []models.CutOffSchedule
    
    now := time.Now()
    
    // Cari schedule yang aktif untuk provider ini
    err := config.DB.Where("provider = ? AND is_active = ?", provider, true).Find(&schedules).Error
    if err != nil {
        log.Printf("Error checking cut off: %v", err)
        return false, nil, err
    }
    
    for _, schedule := range schedules {
        if schedule.IsInCutOff(now) {
            return true, &schedule, nil
        }
    }
    
    return false, nil, nil
}

// GetNextCutOffEnd - dapatkan waktu selesai cut off berikutnya
func GetNextCutOffEnd(provider string) (*time.Time, error) {
    var schedules []models.CutOffSchedule
    
    err := config.DB.Where("provider = ? AND is_active = ?", provider, true).Find(&schedules).Error
    if err != nil {
        return nil, err
    }
    
    now := time.Now()
    var nextEnd *time.Time
    
    for _, schedule := range schedules {
        if schedule.IsInCutOff(now) {
            // Masih dalam cut off, hitung kapan selesai
            endParts := schedule.EndTime
            endHour, endMin := 0, 0
            if _, err := fmt.Sscanf(endParts, "%d:%d", &endHour, &endMin); err == nil {
                endTime := time.Date(now.Year(), now.Month(), now.Day(), endHour, endMin, 0, 0, now.Location())
                
                // Jika end time sudah lewat hari ini, tambah 1 hari
                if endTime.Before(now) {
                    endTime = endTime.Add(24 * time.Hour)
                }
                
                nextEnd = &endTime
                break
            }
        }
    }
    
    return nextEnd, nil
}