# Genera public/assets/logo-icon-source.png (cuadrado) desde public/assets/logo.png
# para poder ejecutar: npx tauri icon ./public/assets/logo-icon-source.png
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path "$root\public\assets\logo.png")) {
  Write-Error "Falta public/assets/logo.png"
}
Add-Type -AssemblyName System.Drawing
$inPath = Join-Path $root "public\assets\logo.png"
$outPath = Join-Path $root "public\assets\logo-icon-source.png"
$src = [System.Drawing.Bitmap]::FromFile($inPath)
try {
  $w = $src.Width; $h = $src.Height
  $size = [Math]::Max($w, $h)
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $bmp.SetResolution($src.HorizontalResolution, $src.VerticalResolution)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $x = [int](($size - $w) / 2); $y = [int](($size - $h) / 2)
  $g.DrawImage($src, $x, $y, $w, $h)
  $g.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "OK $outPath (${size}x${size})"
} finally { $src.Dispose() }
