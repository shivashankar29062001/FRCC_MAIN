$root = 'C:\Users\DELL\OneDrive\Desktop\FRCC CONVENTION\client\public\images'
$files = Get-ChildItem $root -Recurse -File
Write-Output ("Total files: " + $files.Count)
$big = $files | Where-Object { $_.Length -gt 300KB }
Write-Output ("Over 300KB: " + $big.Count)
$max = $files | Measure-Object Length -Maximum
Write-Output ("Largest KB: " + [math]::Round($max.Maximum/1KB, 1))
Write-Output "--- Sample HYD/HC/VG1 ---"
Get-ChildItem (Join-Path $root 'halls\HYD\HC\VG1') -File | ForEach-Object { $_.Name }
Write-Output "--- Sample venues/VG1 ---"
Get-ChildItem (Join-Path $root 'venues\VG1') -File | ForEach-Object { $_.Name }
Write-Output "--- photo-credits.md head ---"
Get-Content 'C:\Users\DELL\OneDrive\Desktop\FRCC CONVENTION\photo-credits.md' -TotalCount 12
