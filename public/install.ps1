$ErrorActionPreference = 'Stop'
$repo = 'B-Divyesh/sf-game-text-beacon'
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest"
$asset = $release.assets | Where-Object { $_.name -match '\.(msi|exe)$' } | Select-Object -First 1
if (-not $asset) { throw 'No Windows package is published yet.' }
$sum = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS' } | Select-Object -First 1
$dir = Join-Path $env:TEMP 'game-text-beacon'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$file = Join-Path $dir $asset.name
Invoke-WebRequest $asset.browser_download_url -OutFile $file
$checksums = (Invoke-WebRequest $sum.browser_download_url).Content
$expected = (($checksums -split "`n") | Where-Object { $_ -match [regex]::Escape($asset.name) } | Select-Object -First 1).Split(' ')[0]
if ((Get-FileHash $file -Algorithm SHA256).Hash.ToLower() -ne $expected.ToLower()) { throw 'Checksum did not match. The installer was not opened.' }
Start-Process $file
Write-Host "Verified and opened $($asset.name)."
