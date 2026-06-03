param(
  [string]$CsvPath = "data\reels.csv",
  [string]$QueryRulesPath = "data\background_query_rules.csv",
  [string]$OutputDir = "assets\backgrounds",
  [string]$ManifestPath = "assets\backgrounds\background_manifest.csv",
  [ValidateSet("pexels", "pixabay", "both")]
  [string]$Provider = "pexels",
  [string]$PexelsApiKey = $env:PEXELS_API_KEY,
  [string]$PixabayApiKey = $env:PIXABAY_API_KEY,
  [int]$PerCaption = 1,
  [int]$SearchResults = 12,
  [int]$MaxDownloads = 25,
  [int]$MinDuration = 5,
  [int]$MaxDuration = 60,
  [int]$MinWidth = 540,
  [int]$DelaySeconds = 2,
  [switch]$DryRun,
  [switch]$ListQueriesOnly,
  [switch]$NoCsvUpdate
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

try {
  function Add-QueryString {
    param(
      [string]$BaseUrl,
      [hashtable]$Params
    )

    $pairs = foreach ($key in $Params.Keys) {
      if ($null -ne $Params[$key] -and "$($Params[$key])" -ne "") {
        "{0}={1}" -f [uri]::EscapeDataString($key), [uri]::EscapeDataString("$($Params[$key])")
      }
    }

    return "$BaseUrl`?$($pairs -join '&')"
  }

  function Get-Slug {
    param([string]$Text)
    $slug = $Text.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
    $slug = $slug.Trim("-")
    if (-not $slug) { return "background" }
    if ($slug.Length -gt 42) { return $slug.Substring(0, 42).Trim("-") }
    return $slug
  }

  function Get-QueryForCaption {
    param(
      [string]$Caption,
      [object[]]$Rules
    )

    if (-not $Caption) { $Caption = "" }
    $captionLower = $Caption.ToLowerInvariant()
    $fallback = $Rules | Where-Object { $_.triggers -eq "*" } | Select-Object -First 1

    foreach ($rule in $Rules) {
      if ($rule.triggers -eq "*") { continue }
      $triggers = $rule.triggers -split "\|"

      foreach ($trigger in $triggers) {
        if (-not $trigger) { continue }

        $pattern = "(^|[^\p{L}\p{N}])" + [regex]::Escape($trigger.ToLowerInvariant()) + "($|[^\p{L}\p{N}])"
        if ([regex]::IsMatch($captionLower, $pattern)) {
          return $rule.query
        }
      }
    }

    if ($fallback) { return $fallback.query }
    return "cinematic vertical background"
  }

  function Get-RowValue {
    param(
      [object]$Row,
      [string]$Name
    )

    if ($Row.PSObject.Properties.Name -contains $Name) {
      return $Row.$Name
    }

    return $null
  }

  function Search-PexelsVideos {
    param(
      [string]$Query,
      [string]$ApiKey,
      [int]$PerPage
    )

    if (-not $ApiKey) {
      throw "PEXELS_API_KEY nincs beallitva. PowerShell pelda: `$env:PEXELS_API_KEY='ide_jon_a_kulcs'"
    }

    $url = Add-QueryString -BaseUrl "https://api.pexels.com/v1/videos/search" -Params @{
      query = $Query
      orientation = "portrait"
      size = "medium"
      per_page = $PerPage
      locale = "hu-HU"
    }

    Invoke-RestMethod -Uri $url -Headers @{ Authorization = $ApiKey }
  }

  function Search-PixabayVideos {
    param(
      [string]$Query,
      [string]$ApiKey,
      [int]$PerPage
    )

    if (-not $ApiKey) {
      throw "PIXABAY_API_KEY nincs beallitva. PowerShell pelda: `$env:PIXABAY_API_KEY='ide_jon_a_kulcs'"
    }

    $url = Add-QueryString -BaseUrl "https://pixabay.com/api/videos/" -Params @{
      key = $ApiKey
      q = $Query
      lang = "hu"
      orientation = "vertical"
      safesearch = "true"
      order = "popular"
      per_page = $PerPage
    }

    Invoke-RestMethod -Uri $url
  }

  function Convert-PexelsResult {
    param([object]$Video)

    if ($Video.duration -and (($Video.duration -lt $MinDuration) -or ($Video.duration -gt $MaxDuration))) {
      return $null
    }

    $files = @($Video.video_files |
      Where-Object {
        $_.file_type -eq "video/mp4" -and
        $_.height -gt $_.width -and
        $_.width -ge $MinWidth
      } |
      Sort-Object @{ Expression = { $_.width * $_.height }; Descending = $true })

    if ($files.Count -eq 0) { return $null }
    $file = $files[0]

    [pscustomobject]@{
      provider = "pexels"
      source_id = "$($Video.id)"
      download_url = $file.link
      source_url = $Video.url
      author = $Video.user.name
      author_url = $Video.user.url
      width = $file.width
      height = $file.height
      duration = $Video.duration
      license = "Pexels License"
    }
  }

  function Convert-PixabayResult {
    param([object]$Hit)

    if ($Hit.duration -and (($Hit.duration -lt $MinDuration) -or ($Hit.duration -gt $MaxDuration))) {
      return $null
    }

    $renditions = @($Hit.videos.large, $Hit.videos.medium, $Hit.videos.small, $Hit.videos.tiny) |
      Where-Object {
        $_ -and $_.url -and $_.height -gt $_.width -and $_.width -ge $MinWidth
      } |
      Sort-Object @{ Expression = { $_.width * $_.height }; Descending = $true }

    if ($renditions.Count -eq 0) { return $null }
    $file = $renditions[0]

    [pscustomobject]@{
      provider = "pixabay"
      source_id = "$($Hit.id)"
      download_url = $file.url
      source_url = $Hit.pageURL
      author = $Hit.user
      author_url = if ($Hit.user) { "https://pixabay.com/users/$($Hit.user)-$($Hit.user_id)/" } else { "" }
      width = $file.width
      height = $file.height
      duration = $Hit.duration
      license = "Pixabay Content License"
    }
  }

  function Find-Candidates {
    param([string]$Query)

    $candidates = New-Object System.Collections.Generic.List[object]

    if ($Provider -eq "pexels" -or $Provider -eq "both") {
      $result = Search-PexelsVideos -Query $Query -ApiKey $PexelsApiKey -PerPage $SearchResults
      foreach ($video in @($result.videos)) {
        $candidate = Convert-PexelsResult -Video $video
        if ($candidate) { $candidates.Add($candidate) }
      }
    }

    if ($Provider -eq "pixabay" -or $Provider -eq "both") {
      $result = Search-PixabayVideos -Query $Query -ApiKey $PixabayApiKey -PerPage ([Math]::Max(3, $SearchResults))
      foreach ($hit in @($result.hits)) {
        $candidate = Convert-PixabayResult -Hit $hit
        if ($candidate) { $candidates.Add($candidate) }
      }
    }

    return @($candidates)
  }

  if (-not (Test-Path -LiteralPath $CsvPath)) {
    throw "CSV nem talalhato: $CsvPath"
  }

  if (-not (Test-Path -LiteralPath $QueryRulesPath)) {
    throw "Query rule fajl nem talalhato: $QueryRulesPath"
  }

  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

  $rows = @(Import-Csv -LiteralPath $CsvPath)
  $rules = @(Import-Csv -LiteralPath $QueryRulesPath)
  $manifestRows = @()
  $seen = New-Object System.Collections.Generic.HashSet[string]

  if (Test-Path -LiteralPath $ManifestPath) {
    $manifestRows = @(Import-Csv -LiteralPath $ManifestPath)
    foreach ($item in $manifestRows) {
      if ($item.source_key) { [void]$seen.Add($item.source_key) }
    }
  }

  $downloads = 0
  $updatedRows = New-Object System.Collections.Generic.List[object]

  if ($ListQueriesOnly) {
    foreach ($row in $rows) {
      $caption = Get-RowValue -Row $row -Name "caption"
      $id = Get-RowValue -Row $row -Name "id"
      $manualQuery = Get-RowValue -Row $row -Name "background_query"
      $query = if ($manualQuery) { $manualQuery } else { Get-QueryForCaption -Caption $caption -Rules $rules }
      [pscustomobject]@{
        id = $id
        caption = $caption
        background_query = $query
      }
    }

    return
  }

  foreach ($row in $rows) {
    $caption = Get-RowValue -Row $row -Name "caption"
    $id = Get-RowValue -Row $row -Name "id"
    if (-not $id) { $id = "{0:000}" -f ($updatedRows.Count + 1) }

    $existingBackground = Get-RowValue -Row $row -Name "background"
    $manualQuery = Get-RowValue -Row $row -Name "background_query"
    $query = if ($manualQuery) { $manualQuery } else { Get-QueryForCaption -Caption $caption -Rules $rules }
    $assigned = $existingBackground

    for ($copy = 1; $copy -le $PerCaption; $copy += 1) {
      if ($downloads -ge $MaxDownloads) { break }

      $candidates = Find-Candidates -Query $query
      $candidate = $candidates | Where-Object {
        $sourceKey = "$($_.provider):$($_.source_id)"
        -not $seen.Contains($sourceKey)
      } | Select-Object -First 1

      if (-not $candidate) {
        Write-Warning "Nincs uj talalat ehhez: $query"
        continue
      }

      $sourceKey = "$($candidate.provider):$($candidate.source_id)"
      [void]$seen.Add($sourceKey)

      $slug = Get-Slug -Text $query
      $fileName = "{0}_{1}_{2}.mp4" -f $id, $candidate.provider, $slug
      $outPath = Join-Path $OutputDir $fileName

      Write-Host "Downloading $fileName <= $query"
      if (-not $DryRun) {
        Invoke-WebRequest -Uri $candidate.download_url -OutFile $outPath
      }

      $downloads += 1
      if (-not $assigned) { $assigned = $fileName }

      $manifestRows += [pscustomobject]@{
        downloaded_at = (Get-Date).ToString("s")
        filename = $fileName
        provider = $candidate.provider
        source_key = $sourceKey
        source_id = $candidate.source_id
        source_url = $candidate.source_url
        author = $candidate.author
        author_url = $candidate.author_url
        license = $candidate.license
        query = $query
        caption_id = $id
        caption = $caption
        width = $candidate.width
        height = $candidate.height
        duration = $candidate.duration
      }

      if ($downloads -lt $MaxDownloads -and $DelaySeconds -gt 0) {
        Start-Sleep -Seconds $DelaySeconds
      }
    }

    $updatedRows.Add([pscustomobject]@{
      id = $id
      caption = $caption
      background = $assigned
      filename = (Get-RowValue -Row $row -Name "filename")
      background_query = $query
    })

  }

  if (-not $DryRun) {
    $manifestRows | Export-Csv -LiteralPath $ManifestPath -NoTypeInformation -Encoding UTF8

    if (-not $NoCsvUpdate) {
      $updatedRows | Export-Csv -LiteralPath $CsvPath -NoTypeInformation -Encoding UTF8
    }
  }

  Write-Host "Kesz. Letoltesek szama: $downloads"
  Write-Host "Manifest: $ManifestPath"
}
finally {
  Pop-Location
}
