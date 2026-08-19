$ErrorActionPreference = "Continue"
$root = "d:\05_Codex\IP Pure Monitor"
$out = "C:\Users\ChenXZ\AppData\Local\Temp\cline\validate2.txt"
$lines = New-Object System.Collections.Generic.List[string]

# 1. Validate manifest.json (read as UTF-8)
try {
  $m = Get-Content -Raw -Encoding UTF8 (Join-Path $root "manifest.json") | ConvertFrom-Json
  $lines.Add("MANIFEST_OK version=" + $m.manifest_version + " name=" + $m.name)
  $lines.Add("  host_permissions = " + ($m.host_permissions -join ", "))
  $lines.Add("  content_scripts.js = " + ($m.content_scripts[0].js -join ", "))
} catch {
  $lines.Add("MANIFEST_ERROR " + $_.Exception.Message)
}

# 2. PNG magic byte check (89 50 4E 47 0D 0A 1A 0A)
$lines.Add("---- PNG CHECK ----")
foreach ($name in @("icon16.png","icon32.png","icon48.png","icon128.png")) {
  $p = Join-Path $root ("icons\" + $name)
  $bytes = [System.IO.File]::ReadAllBytes($p)
  $magic = ""
  for ($i = 0; $i -lt 8; $i++) { $magic += ("{0:X2}" -f $bytes[$i]) + " " }
  $isPng = ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47 -and $bytes[4] -eq 0x0D -and $bytes[5] -eq 0x0A -and $bytes[6] -eq 0x1A -and $bytes[7] -eq 0x0A)
  $lines.Add($name + " magic=" + $magic.Trim() + " validPNG=" + $isPng + " size=" + $bytes.Length)
}

# 3. Check leftover markers in JS files
$lines.Add("---- MARKER CHECK ----")
$jsFiles = Get-ChildItem -Recurse -File $root -Include *.js | Where-Object { $_.FullName -notmatch "\\tools\\" }
foreach ($f in $jsFiles) {
  $content = [System.IO.File]::ReadAllText($f.FullName)
  $bad = ($content -match "__CSS_PART2__|__UI_PART2__|__UI_PART2B__|__UI_PART3__")
  $lines.Add($f.FullName.Substring($root.Length + 1) + " leftoverMarker=" + $bad)
}

$lines | Out-File -FilePath $out -Encoding utf8
Write-Output "CHECK_DONE"

