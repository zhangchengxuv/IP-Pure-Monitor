# 生成 IP Pure Monitor 扩展图标（16/32/48/128 PNG）
# 用法：powershell -ExecutionPolicy Bypass -File tools\generate-icons.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root "icons"
if (-not (Test-Path $iconDir)) { New-Item -ItemType Directory -Path $iconDir | Out-Null }

Add-Type -AssemblyName System.Drawing

function New-RoundedPath([int]$size, [single]$radius) {
  $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $radius * 2
  $p.AddArc(0, 0, $d, $d, 180, 90)
  $p.AddArc($size - $d, 0, $d, $d, 270, 90)
  $p.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
  $p.AddArc(0, $size - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function New-Icon([int]$size, [string]$path) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
  $radius = [single]([Math]::Max(1, [int]($size * 0.22)))
  $gp = New-RoundedPath $size $radius

  # 深色渐变背景
  $c1 = [System.Drawing.ColorTranslator]::FromHtml("#1E293B")
  $c2 = [System.Drawing.ColorTranslator]::FromHtml("#0D1117")
  $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, 135.0)
  $g.FillPath($bgBrush, $gp)

  # 中央文字 "IP"
  $fontSize = [single]($size * 0.34)
  $font = [System.Drawing.Font]::new("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = [System.Drawing.StringFormat]::new()
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = [System.Drawing.RectangleF]::new([single]0, [single]0, [single]$size, [single]$size)
  $g.DrawString("IP", $font, [System.Drawing.Brushes]::White, $textRect, $sf)

  # 右上角状态圆点
  $dotSize = [int]([Math]::Max(1, [int]($size * 0.16)))
  $dotX = $size - $dotSize - [int]($size * 0.16)
  $dotY = [int]($size * 0.16)
  $g.FillEllipse([System.Drawing.Brushes]::Turquoise, $dotX, $dotY, $dotSize, $dotSize)

  # 清理资源
  $sf.Dispose()
  $font.Dispose()
  $bgBrush.Dispose()
  $gp.Dispose()
  $g.Dispose()

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-Icon 16  (Join-Path $iconDir "icon16.png")
New-Icon 32  (Join-Path $iconDir "icon32.png")
New-Icon 48  (Join-Path $iconDir "icon48.png")
New-Icon 128 (Join-Path $iconDir "icon128.png")

Write-Output "Icons generated in $iconDir"
