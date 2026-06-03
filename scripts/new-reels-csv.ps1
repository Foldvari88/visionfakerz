param(
  [string]$CaptionsPath = "data\captions.txt",
  [string]$ReelsCsvPath = "data\reels.csv",
  [string]$CanvaCsvPath = "canva\canva_bulk_create.csv",
  [string]$PromptCsvPath = "canva\background_prompts.csv",
  [string]$FilenamePrefix = "reel"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

try {
  if (-not (Test-Path -LiteralPath $CaptionsPath)) {
    throw "Caption lista nem talalhato: $CaptionsPath"
  }

  $captions = @(Get-Content -LiteralPath $CaptionsPath |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and -not $_.StartsWith("#") })

  if ($captions.Count -eq 0) {
    throw "Nincs feldolgozhato caption ebben: $CaptionsPath"
  }

  $prompts = @()
  if (Test-Path -LiteralPath $PromptCsvPath) {
    $prompts = @(Import-Csv -LiteralPath $PromptCsvPath)
  }

  $reelRows = New-Object System.Collections.Generic.List[object]
  $canvaRows = New-Object System.Collections.Generic.List[object]

  for ($i = 0; $i -lt $captions.Count; $i += 1) {
    $id = "{0:000}" -f ($i + 1)
    $filename = "{0}_{1}" -f $FilenamePrefix, $id
    $prompt = ""

    if ($prompts.Count -gt 0) {
      $prompt = $prompts[$i % $prompts.Count].prompt
    }

    $reelRows.Add([pscustomobject]@{
      id = $id
      caption = $captions[$i]
      background = ""
      filename = $filename
    })

    $canvaRows.Add([pscustomobject]@{
      ID = $id
      Caption = $captions[$i]
      "Background prompt" = $prompt
      "File name" = $filename
    })
  }

  $reelRows | Export-Csv -LiteralPath $ReelsCsvPath -NoTypeInformation -Encoding UTF8
  $canvaRows | Export-Csv -LiteralPath $CanvaCsvPath -NoTypeInformation -Encoding UTF8

  Write-Host "Kesz:"
  Write-Host "- $ReelsCsvPath"
  Write-Host "- $CanvaCsvPath"
}
finally {
  Pop-Location
}
