# Headless Chrome Diagnostic Ingester & Port Mapper Script
$targetDir = "C:\Users\Bekah\AppData\Local\Google\Chrome\User Data"
$targetFile = "$targetDir\DevToolsActivePort"
$errLog = "C:\Users\Bekah\.gemini\antigravity\scratch\chrome-err.log"
$outLog = "C:\Users\Bekah\.gemini\antigravity\scratch\chrome-out.log"

Write-Host "Ensuring clean slate: stopping active Chrome processes..."
Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Clean old logs and descriptor file
Remove-Item -Path $errLog, $outLog -ErrorAction SilentlyContinue
if (Test-Path $targetFile) {
  Remove-Item -Path $targetFile -Force -ErrorAction SilentlyContinue
}

# Launch Headless Google Chrome
$chromePaths = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "$env:USERPROFILE\AppData\Local\Google\Chrome\Application\chrome.exe"
)
$found = $false
foreach ($path in $chromePaths) {
  if (Test-Path $path) {
    Write-Host "Launching Google Chrome from: $path"
    Start-Process $path -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=C:\Users\Bekah\.gemini\antigravity\scratch\chrome-profile", "--headless=new", "--disable-gpu", "--no-sandbox" -RedirectStandardError $errLog -RedirectStandardOutput $outLog
    $found = $true
    break
  }
}

if (-not $found) {
  Write-Host "Chrome standard paths not found. Launching via default shell..."
  Start-Process "chrome" -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=C:\Users\Bekah\.gemini\antigravity\scratch\chrome-profile", "--headless=new", "--disable-gpu", "--no-sandbox" -RedirectStandardError $errLog -RedirectStandardOutput $outLog
}

Write-Host "Parsing boot telemetry logs to intercept dynamic WebSockets GUID..."
$success = $false
for ($i = 0; $i -lt 20; $i++) {
  if (Test-Path $errLog) {
    $content = Get-Content $errLog -Raw
    # Regular expression matching the standard DevTools listening console statement
    if ($content -match "DevTools listening on ws://127.0.0.1:9222(/devtools/browser/[a-f0-9-]+)") {
      $wsPath = $Matches[1]
      
      # Ensure target connector directory exists
      if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Force -Path $targetDir
      }
      
      # Manually construct DevToolsActivePort descriptor (Port on line 1, WS GUID on line 2)
      $activePortValue = "9222`r`n$wsPath"
      Set-Content -Path $targetFile -Value $activePortValue -Force
      
      Write-Host "✨ Manually compiled and mapped active DevToolsActivePort descriptor!"
      Write-Host "Socket WebSocket Path: $wsPath"
      Write-Host "Mapped Target File: $targetFile"
      $success = $true
      break
    }
  }
  Start-Sleep -Milliseconds 500
}

if ($success) {
  Write-Host "Keeping Chrome and WebSocket port active for 5 minutes..."
  for ($time = 1; $time -le 300; $time++) {
    if ($time % 30 -eq 0) {
      Write-Host "Active session ping: Chrome debugging on port 9222 active ($time seconds elapsed)."
    }
    Start-Sleep -Seconds 1
  }
} else {
  Write-Host "--- CHROME OUT LOG ---"
  if (Test-Path $outLog) { Get-Content $outLog | Out-String }
  Write-Host "--- CHROME ERR LOG ---"
  if (Test-Path $errLog) { Get-Content $errLog | Out-String }
  Write-Error "Failed to intercept Chrome WebSockets GUID."
}
