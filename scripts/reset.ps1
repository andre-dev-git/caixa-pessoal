. (Join-Path $PSScriptRoot "config.ps1")

Set-Location $Root

Write-Log "Reset iniciado: derrubando servidor na porta $Port"
Stop-CaixaServer
Write-Log "Servidor parado. Iniciando build"

& $Npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Log "Build falhou (codigo $LASTEXITCODE)"
    throw "Build falhou. O servidor permanece desligado."
}

Write-Log "Build concluido. Subindo servidor"
Start-CaixaServer

$deadline = (Get-Date).AddSeconds(30)
$ready = $false
while ((Get-Date) -lt $deadline) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Milliseconds 400
    }
}

if (-not $ready) {
    Write-Log "Servidor nao respondeu em http://localhost:$Port apos o reset"
    throw "Servidor nao respondeu em http://localhost:$Port"
}

Write-Log "Reset concluido: http://localhost:$Port"
Write-Output "Servidor no ar em http://localhost:$Port"
