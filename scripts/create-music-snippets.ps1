param(
  [string]$SourceDir = "assets\music\source_tracks",
  [string]$OutputDir = "assets\music\snippets",
  [string]$FfmpegPath = "",
  [int]$Duration = 15,
  [int]$StartAt = 20,
  [int]$SnippetsPerTrack = 1,
  [int]$StepSeconds = 30,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

try {
  function Resolve-Ffmpeg {
    param([string]$RequestedPath)

    $candidates = @()
    if ($RequestedPath) { $candidates += $RequestedPath }
    if ($env:FFMPEG_PATH) { $candidates += $env:FFMPEG_PATH }

    $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($cmd) { $candidates += $cmd.Source }

    $candidates += "C:\Program Files\ShareX\ffmpeg.exe"
    $candidates += "C:\ffmpeg\bin\ffmpeg.exe"

    foreach ($candidate in $candidates) {
      if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        return (Resolve-Path -LiteralPath $candidate).Path
      }
    }

    throw "ffmpeg.exe nem talalhato."
  }

  function Get-SafeName {
    param([string]$Name)
    $safe = [System.IO.Path]::GetFileNameWithoutExtension($Name) -replace '[\\/:*?"<>|]', "_"
    $safe = $safe -replace "\s+", "_"
    return $safe.Trim("_")
  }

  if (-not (Test-Path -LiteralPath $SourceDir)) {
    throw "Forras zene mappa nem talalhato: $SourceDir"
  }

  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

  $audioExts = @(".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus")
  $tracks = @(Get-ChildItem -LiteralPath $SourceDir -File |
    Where-Object { $audioExts -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name)

  if ($tracks.Count -eq 0) {
    throw "Nincs zene ebben a mappaban: $SourceDir. Ide tedd a sajat VisionFakerz trackeket."
  }

  $ffmpeg = Resolve-Ffmpeg -RequestedPath $FfmpegPath
  $manifest = New-Object System.Collections.Generic.List[object]
  $counter = 0

  foreach ($track in $tracks) {
    for ($i = 0; $i -lt $SnippetsPerTrack; $i += 1) {
      $counter += 1
      $start = $StartAt + ($i * $StepSeconds)
      $safeBase = Get-SafeName -Name $track.Name
      $outName = "{0:000}_{1}_{2}s.mp3" -f $counter, $safeBase, $start
      $outPath = Join-Path $OutputDir $outName

      $args = @(
        "-y",
        "-hide_banner",
        "-ss", "$start",
        "-t", "$Duration",
        "-i", $track.FullName,
        "-vn",
        "-af", "afade=t=in:st=0:d=0.2,afade=t=out:st=$($Duration - 0.7):d=0.7",
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        $outPath
      )

      Write-Host "Creating snippet $outName"
      if ($DryRun) {
        Write-Host "$ffmpeg $($args -join ' ')"
      } else {
        & $ffmpeg @args
        if ($LASTEXITCODE -ne 0) {
          throw "ffmpeg hiba snippet keszites kozben: $outPath"
        }
      }

      $manifest.Add([pscustomobject]@{
        filename = $outName
        source_file = $track.Name
        start_seconds = $start
        duration_seconds = $Duration
      })
    }
  }

  if (-not $DryRun) {
    $manifest | Export-Csv -LiteralPath (Join-Path $OutputDir "snippet_manifest.csv") -NoTypeInformation -Encoding UTF8
  }

  Write-Host "Kesz. Snippetek: $OutputDir"
}
finally {
  Pop-Location
}

