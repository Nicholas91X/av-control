package main

import (
	"fmt"
	"runtime"
	"time"
)

var (
	Version   = "1.0.3"
	BuildDate = "2026-01-11"
	BuildTime = ""
)

type VersionInfo struct {
	Version   string `json:"version"`
	BuildDate string `json:"build_date"`
	BuildTime string `json:"build_time"`
	GoVersion string `json:"go_version"`
	OS        string `json:"os"`
	Arch      string `json:"arch"`
}

func GetVersionInfo() VersionInfo {
	bt := BuildTime
	if bt == "" {
		bt = time.Now().Format("2006-01-02 15:04:05")
	}

	return VersionInfo{
		Version:   Version,
		BuildDate: BuildDate,
		BuildTime: bt,
		GoVersion: runtime.Version(),
		OS:        runtime.GOOS,
		Arch:      runtime.GOARCH,
	}
}

func PrintVersion() {
	info := GetVersionInfo()
	fmt.Printf("═══════════════════════════════════════════\n")
	fmt.Printf("  AV Control System\n")
	fmt.Printf("═══════════════════════════════════════════\n")
	fmt.Printf("  Version:    %s\n", info.Version)
	fmt.Printf("  Build Date: %s\n", info.BuildDate)
	fmt.Printf("  Go Version: %s\n", info.GoVersion)
	fmt.Printf("  Platform:   %s/%s\n", info.OS, info.Arch)
	fmt.Printf("═══════════════════════════════════════════\n")
}
