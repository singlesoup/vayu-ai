# Vayu 3.10 privacy audit — RUNTIME half (watcher for the live-loop test).
#
# Watches every TCP connection of the Vayu process tree (vayu.exe + the npm/
# cmd/node/cargo dev chain when running `tauri dev`) and records anything that
# dials OUT. Verdict rule from plan.md 3.10: only 127.0.0.1:11434 may leave the
# machine. Non-loopback remotes = violations. Loopback remotes other than the
# Ollama port are listed for review (dev-server ports 1420/5173 are expected in
# `tauri dev`; a release build should show none).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\privacy-runtime-watch.ps1 [-DurationSec 900] [-OutDir <dir>]
# Start it, drive the full in-app loop (morning -> brain dump -> ask -> tasks
# -> evening reflection -> close), then read the verdict. Keep this running
# for the whole loop, not just part of it.

param(
  [int]$DurationSec = 900,
  [string]$OutDir = "$env:LOCALAPPDATA\vayu-privacy"
)

$ErrorActionPreference = "SilentlyContinue"

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$log = Join-Path $OutDir "privacy-audit-$stamp.log"

function Write-Log([string]$line) { [IO.File]::AppendAllText($log, $line + "`r`n", [Text.Encoding]::UTF8) }

# Ollama default endpoint (matches ollama.rs DEFAULT_BASE_URL).
$ollamaPort = 11434

# Process-tree predicate: the app binary, or dev-tool processes whose command
# line references this repo's vite/tauri chain.
function Find-VayuPids {
  Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -ieq "vayu.exe") -or
    ($_.CommandLine -and $_.CommandLine -match "(?i)vayu|tauri dev|vayu-ai\\node_modules\\.*vite")
  } | Select-Object -ExpandProperty ProcessId -Unique
}

$violations = 0
$generatedDns = New-Object System.Collections.Generic.HashSet[string]
Write-Log "vayu privacy runtime watch started $stamp (duration ${DurationSec}s)"
Write-Log "verdict rule: only 127.0.0.1:$ollamaPort may be contacted; anything else = violation"
Write-Log "pid sampling: $((Find-VayuPids) -join ', ') (refreshed each pass)"

$end = (Get-Date).AddSeconds($DurationSec)
while ((Get-Date) -lt $end) {
  $pids = Find-VayuPids
  if ($pids) {
    $conns = Get-NetTCPConnection -OwningProcess @($pids) -ErrorAction SilentlyContinue |
      Where-Object { $_.State -in "Established", "SynSent" }
    foreach ($c in $conns) {
      $remote = $c.RemoteAddress
      if ($remote -eq "::-1" -or $remote -like "127.*") { continue }
      $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
      $row = "{0} VIOLATION pid={1} ({2}) remote={3}:{4} state={5}" -f `
        (Get-Date -Format "HH:mm:ss.fff"), $c.OwningProcess, $p.ProcessName, $remote, $c.RemotePort, $c.State
      Write-Host $row -ForegroundColor Red
      Write-Log $row
      $violations++
    }
    # Loopback contacts on ports other than Ollama — recorded for review only.
    $localOthers = Get-NetTCPConnection -OwningProcess @($pids) -ErrorAction SilentlyContinue |
      Where-Object {
        $_.State -eq "Established" -and
        ($_.RemoteAddress -like "127.*" -or $_.RemoteAddress -eq "::-1") -and
        $_.RemotePort -ne $ollamaPort
      }
    foreach ($c in $localOthers) {
      $tag = "lb pid=$($c.OwningProcess) remote=127.0.0.1:$($c.RemotePort)"
      if ($generatedDns.Add($tag)) { Write-Log "(review) $tag" }
    }
  }
  Start-Sleep -Milliseconds 500
}

$procList = (Find-VayuPids | ForEach-Object {
  $p = Get-Process -Id $_ -ErrorAction SilentlyContinue
  if ($p) { "$($p.Id):$($p.ProcessName)" }
}) -join ", "

Write-Log "watch ended $(Get-Date -Format 'HH:mm:ss')"
Write-Log "processes watched at exit: $procList"
Write-Log "VIOLATIONS_TOTAL=$violations"
Write-Host ""
Write-Host "=== privacy runtime verdict: $violations outbound violation(s) ===" -ForegroundColor $(if ($violations -eq 0) { "Green" } else { "Red" })
Write-Host "review-only loopback contacts are logged in: $log"
Write-Host ""
if ($violations -eq 0) { exit 0 } else { exit 1 }
