$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Downloading official CC0 film/studio equipment models..."
py "$Here\download_pack.py" @args
if ($LASTEXITCODE -ne 0) { python "$Here\download_pack.py" @args }
