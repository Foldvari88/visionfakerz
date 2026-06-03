param(
  [string]$CsvPath = "data\reels.csv",
  [string]$BackgroundDir = "assets\backgrounds",
  [string]$MusicPath = "assets\music\track.mp3",
  [string]$SnippetDir = "assets\music\snippets",
  [string]$OutputDir = "output",
  [string]$StylePath = "data\reel_style.json",
  [string]$FfmpegPath = "",
  [int]$Duration = 15,
  [int]$Width = 1080,
  [int]$Height = 1920,
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

    throw "ffmpeg.exe nem talalhato. Add meg -FfmpegPath parameterrel, vagy allitsd be az FFMPEG_PATH kornyezeti valtozot."
  }

  function Get-RelativeFilterPath {
    param([string]$Path)
    return ($Path -replace "\\", "/")
  }

  function Escape-AssText {
    param([string]$Text)
    $clean = $Text -replace "`r", " " -replace "`n", " "
    $clean = $clean -replace "\{", "(" -replace "\}", ")"
    return $clean.Trim()
  }

  function Convert-HexToAssColor {
    param(
      [string]$Hex,
      [double]$Alpha = 0
    )

    if (-not $Hex) { $Hex = "#FFFFFF" }
    $clean = $Hex.Trim().TrimStart("#")
    if ($clean.Length -ne 6) {
      throw "Hibas szin formatum: $Hex. Pelda: #FFFFFF"
    }

    $r = $clean.Substring(0, 2)
    $g = $clean.Substring(2, 2)
    $b = $clean.Substring(4, 2)
    $alphaByte = [Math]::Round([Math]::Max(0, [Math]::Min(1, $Alpha)) * 255)
    $a = "{0:X2}" -f [int]$alphaByte

    return "&H$a$b$g$r"
  }

  function Get-Style {
    param([string]$Path)

    $defaults = [pscustomobject]@{
      font_name = "Arial"
      font_size = 72
      max_line_length = 28
      caption_position = "bottom"
      caption_margin = 260
      text_color = "#FFFFFF"
      outline_color = "#000000"
      box_color = "#000000"
      box_opacity = 0.35
      bold = $true
      outline = 4
      shadow = 0
      image_motion = "auto"
      image_zoom_end = 1.16
    }

    if (-not (Test-Path -LiteralPath $Path)) {
      return $defaults
    }

    $custom = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    foreach ($prop in $custom.PSObject.Properties) {
      $defaults | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value -Force
    }

    return $defaults
  }

  function Get-Alignment {
    param([string]$Position)

    switch ($Position.ToLowerInvariant()) {
      "top" { return 8 }
      "center" { return 5 }
      "middle" { return 5 }
      "bottom" { return 2 }
      default { return 2 }
    }
  }

  function Get-RowStyle {
    param(
      [object]$BaseStyle,
      [object]$Row
    )

    $styleJson = $BaseStyle | ConvertTo-Json -Depth 5
    $rowStyle = $styleJson | ConvertFrom-Json
    $overrideNames = @(
      "font_name",
      "font_size",
      "max_line_length",
      "caption_position",
      "caption_margin",
      "text_color",
      "outline_color",
      "box_color",
      "box_opacity",
      "bold",
      "outline",
      "shadow",
      "image_motion",
      "image_zoom_end"
    )

    foreach ($name in $overrideNames) {
      if (($Row.PSObject.Properties.Name -contains $name) -and $Row.$name) {
        $value = $Row.$name
        if ($name -eq "bold") {
          $value = $value -in @("1", "true", "yes", "igen")
        }

        $rowStyle | Add-Member -NotePropertyName $name -NotePropertyValue $value -Force
      }
    }

    return $rowStyle
  }

  function Wrap-Caption {
    param(
      [string]$Text,
      [int]$MaxLineLength = 28
    )

    $words = (Escape-AssText $Text) -split "\s+"
    $lines = New-Object System.Collections.Generic.List[string]
    $current = ""

    foreach ($word in $words) {
      if (-not $current) {
        $current = $word
        continue
      }

      if (($current.Length + 1 + $word.Length) -le $MaxLineLength) {
        $current = "$current $word"
      } else {
        $lines.Add($current)
        $current = $word
      }
    }

    if ($current) { $lines.Add($current) }
    return ($lines -join "\N")
  }

  function New-AssFile {
    param(
      [string]$Caption,
      [string]$Path,
      [int]$DurationSeconds,
      [int]$CanvasWidth,
      [int]$CanvasHeight,
      [object]$Style
    )

    $wrapped = Wrap-Caption -Text $Caption -MaxLineLength $Style.max_line_length
    $end = "0:00:{0:00}.00" -f $DurationSeconds
    $primaryColor = Convert-HexToAssColor -Hex $Style.text_color -Alpha 0
    $outlineColor = Convert-HexToAssColor -Hex $Style.outline_color -Alpha 0.15
    $boxAlpha = 1 - [Math]::Max(0, [Math]::Min(1, [double]$Style.box_opacity))
    $boxColor = Convert-HexToAssColor -Hex $Style.box_color -Alpha $boxAlpha
    $bold = if ($Style.bold) { -1 } else { 0 }
    $alignment = Get-Alignment -Position $Style.caption_position
    $fontName = "$($Style.font_name)" -replace ",", " "
    $fontSize = [int]$Style.font_size
    $marginV = [int]$Style.caption_margin
    $outline = [double]$Style.outline
    $shadow = [double]$Style.shadow

    $content = @"
[Script Info]
ScriptType: v4.00+
PlayResX: $CanvasWidth
PlayResY: $CanvasHeight
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,$fontName,$fontSize,$primaryColor,&H000000FF,$outlineColor,$boxColor,$bold,0,0,0,100,100,0,0,3,$outline,$shadow,$alignment,110,110,$marginV,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,$end,Default,,0,0,0,,$wrapped
"@

    Set-Content -LiteralPath $Path -Value $content -Encoding UTF8
  }

  function Get-ImageMotionFilter {
    param(
      [object]$Style,
      [int]$RowIndex,
      [int]$DurationSeconds,
      [int]$CanvasWidth,
      [int]$CanvasHeight,
      [string]$AssFilterPath
    )

    $frames = $DurationSeconds * 30
    $sourceWidth = $CanvasWidth * 2
    $sourceHeight = $CanvasHeight * 2
    $zoomEnd = [Math]::Max(1.02, [Math]::Min(1.35, [double]$Style.image_zoom_end))
    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    $zoomEndText = $zoomEnd.ToString("0.000000", $culture)
    $zoomStep = [string]::Format($culture, "{0:0.000000}", (($zoomEnd - 1) / [Math]::Max(1, $frames)))
    $motion = "$($Style.image_motion)".ToLowerInvariant()

    if ($motion -eq "auto") {
      $variants = @("zoom_in", "pan_right", "pan_left", "zoom_drift")
      $motion = $variants[($RowIndex - 1) % $variants.Count]
    }

    switch ($motion) {
      "pan_right" {
        $zoomExpr = "'$zoomEndText'"
        $xExpr = "'(iw-iw/zoom)*(on/$frames)'"
        $yExpr = "'ih/2-(ih/zoom/2)'"
      }
      "pan_left" {
        $zoomExpr = "'$zoomEndText'"
        $xExpr = "'(iw-iw/zoom)*(1-on/$frames)'"
        $yExpr = "'ih/2-(ih/zoom/2)'"
      }
      "zoom_drift" {
        $zoomExpr = "'min(zoom+$zoomStep,$zoomEndText)'"
        $xExpr = "'iw/2-(iw/zoom/2)+(iw-iw/zoom)*0.10*sin(on/45)'"
        $yExpr = "'ih/2-(ih/zoom/2)+(ih-ih/zoom)*0.08*cos(on/55)'"
      }
      default {
        $zoomExpr = "'min(zoom+$zoomStep,$zoomEndText)'"
        $xExpr = "'iw/2-(iw/zoom/2)'"
        $yExpr = "'ih/2-(ih/zoom/2)'"
      }
    }

    return "scale=$sourceWidth`:$sourceHeight`:force_original_aspect_ratio=increase,crop=$sourceWidth`:$sourceHeight,zoompan=z=$zoomExpr`:x=$xExpr`:y=$yExpr`:d=$frames`:s=$CanvasWidth`x$CanvasHeight`:fps=30,ass='$AssFilterPath'"
  }

  $ffmpeg = Resolve-Ffmpeg -RequestedPath $FfmpegPath
  $style = Get-Style -Path $StylePath

  if (-not (Test-Path -LiteralPath $CsvPath)) {
    throw "CSV nem talalhato: $CsvPath"
  }

  if (-not (Test-Path -LiteralPath $BackgroundDir)) {
    throw "Hatter mappa nem talalhato: $BackgroundDir"
  }

  if (-not (Test-Path -LiteralPath $MusicPath)) {
    $snippetFiles = @()
    if (Test-Path -LiteralPath $SnippetDir) {
      $snippetFiles = @(Get-ChildItem -LiteralPath $SnippetDir -File |
        Where-Object { @(".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus") -contains $_.Extension.ToLowerInvariant() } |
        Sort-Object Name)
    }

    if ($snippetFiles.Count -eq 0) {
      throw "Zene nem talalhato: $MusicPath, es nincs snippet sem itt: $SnippetDir. Tegyel be track.mp3-at, vagy futtasd a 6_create_music_snippets.bat fajlt."
    }
  }

  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
  $tmpDir = Join-Path $OutputDir "_tmp"
  New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

  $videoExts = @(".mp4", ".mov", ".m4v", ".webm", ".mkv")
  $imageExts = @(".jpg", ".jpeg", ".png", ".webp")
  $supportedExts = $videoExts + $imageExts

  $backgrounds = @(Get-ChildItem -LiteralPath $BackgroundDir -File |
    Where-Object { $supportedExts -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name)

  if ($backgrounds.Count -eq 0) {
    throw "Nincs hatterfajl az assets/backgrounds mappaban."
  }

  $rows = @(Import-Csv -LiteralPath $CsvPath)
  if ($rows.Count -eq 0) {
    throw "A CSV ures: $CsvPath"
  }

  $index = 0
  foreach ($row in $rows) {
    $index += 1

    if (-not $row.caption) {
      Write-Warning "Sor kihagyva, mert nincs caption: $index"
      continue
    }

    $backgroundPath = $null
    if ($row.background) {
      if ([System.IO.Path]::IsPathRooted($row.background)) {
        $backgroundPath = $row.background
      } else {
        $backgroundPath = Join-Path $BackgroundDir $row.background
      }

      if (-not (Test-Path -LiteralPath $backgroundPath)) {
        throw "A megadott hatter nem talalhato a(z) $index. sorban: $backgroundPath"
      }
    } else {
      $backgroundPath = $backgrounds[($index - 1) % $backgrounds.Count].FullName
    }

    $captionId = if ($row.id) { $row.id } else { "{0:000}" -f $index }
    $baseName = if ($row.filename) { $row.filename } else { "reel_$captionId" }
    $safeName = ($baseName -replace '[\\/:*?"<>|]', "_")
    $outputPath = Join-Path $OutputDir "$safeName.mp4"
    $assPath = Join-Path $tmpDir "$safeName.ass"
    $rowStyle = Get-RowStyle -BaseStyle $style -Row $row
    $rowMusicPath = $MusicPath

    if (($row.PSObject.Properties.Name -contains "music") -and $row.music) {
      if ([System.IO.Path]::IsPathRooted($row.music)) {
        $rowMusicPath = $row.music
      } else {
        $candidateSnippet = Join-Path $SnippetDir $row.music
        $candidateMusic = Join-Path "assets\music" $row.music
        if (Test-Path -LiteralPath $candidateSnippet) {
          $rowMusicPath = $candidateSnippet
        } elseif (Test-Path -LiteralPath $candidateMusic) {
          $rowMusicPath = $candidateMusic
        } else {
          $rowMusicPath = $row.music
        }
      }
    } elseif (Test-Path -LiteralPath $SnippetDir) {
      $snippetPool = @(Get-ChildItem -LiteralPath $SnippetDir -File |
        Where-Object { @(".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus") -contains $_.Extension.ToLowerInvariant() } |
        Sort-Object Name)
      if ($snippetPool.Count -gt 0) {
        $rowMusicPath = $snippetPool[($index - 1) % $snippetPool.Count].FullName
      }
    }

    if (-not (Test-Path -LiteralPath $rowMusicPath)) {
      throw "A zene/snippet nem talalhato a(z) $index. sorhoz: $rowMusicPath"
    }

    New-AssFile -Caption $row.caption -Path $assPath -DurationSeconds $Duration -CanvasWidth $Width -CanvasHeight $Height -Style $rowStyle

    $assFilterPath = Get-RelativeFilterPath -Path $assPath
    $scaleFilter = "scale=$Width`:$Height`:force_original_aspect_ratio=increase,crop=$Width`:$Height,ass='$assFilterPath'"
    $imageMotionFilter = Get-ImageMotionFilter -Style $rowStyle -RowIndex $index -DurationSeconds $Duration -CanvasWidth $Width -CanvasHeight $Height -AssFilterPath $assFilterPath
    $ext = [System.IO.Path]::GetExtension($backgroundPath).ToLowerInvariant()

    if ($imageExts -contains $ext) {
      $args = @(
        "-y",
        "-hide_banner",
        "-i", $backgroundPath,
        "-stream_loop", "-1",
        "-i", $rowMusicPath,
        "-vf", $imageMotionFilter,
        "-t", "$Duration",
        "-shortest",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-c:a", "aac",
        "-b:a", "192k",
        "-af", "afade=t=out:st=14.3:d=0.7",
        $outputPath
      )
    } else {
      $args = @(
        "-y",
        "-hide_banner",
        "-stream_loop", "-1",
        "-i", $backgroundPath,
        "-stream_loop", "-1",
        "-i", $rowMusicPath,
        "-vf", $scaleFilter,
        "-t", "$Duration",
        "-shortest",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-c:a", "aac",
        "-b:a", "192k",
        "-af", "afade=t=out:st=14.3:d=0.7",
        $outputPath
      )
    }

    Write-Host "Rendering $safeName.mp4"
    if ($DryRun) {
      Write-Host "$ffmpeg $($args -join ' ')"
    } else {
      & $ffmpeg @args
      if ($LASTEXITCODE -ne 0) {
        throw "ffmpeg hiba a kovetkezo fajlnal: $outputPath"
      }
    }
  }

  Write-Host "Kesz. Kimenet: $OutputDir"
}
finally {
  Pop-Location
}
