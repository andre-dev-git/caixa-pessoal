. (Join-Path $PSScriptRoot "config.ps1")

if (-not (Test-Path $Node)) {
    Write-Log "Node nao encontrado em $Node"
    exit 1
}

if (-not (Test-Path $Next)) {
    Write-Log "Binario do Next nao encontrado em $Next"
    exit 1
}

Set-Location $Root
Write-Log "Iniciando servidor em http://localhost:$Port"

& $Node $Next start --hostname 127.0.0.1 -p $Port 2>&1 | ForEach-Object {
    Write-Log "$_"
}

Write-Log ("Processo encerrou (codigo {0})" -f $LASTEXITCODE)
exit $LASTEXITCODE
