$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Downloading core camera / lighting / grip / sound assets..."
py "$Here\download_pack.py" --core
if ($LASTEXITCODE -ne 0) { python "$Here\download_pack.py" --core }
