$ScriptDir = $PSScriptRoot
$Root = Split-Path $ScriptDir -Parent
$Port = 47193
$TaskName = "CaixaPessoal"
$Next = Join-Path $Root "node_modules\next\dist\bin\next"
$Vbs = Join-Path $ScriptDir "start-hidden.vbs"
$LogDir = Join-Path $env:LOCALAPPDATA "caixa-pessoal"
$Log = Join-Path $LogDir "server.log"

$Node = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $Node)) {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) {
        $Node = $cmd.Source
    }
}

$Npm = Join-Path (Split-Path $Node -Parent) "npm.cmd"
if (-not (Test-Path $Npm)) {
    $cmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($cmd) {
        $Npm = $cmd.Source
    }
}

function Write-Log([string]$Message) {
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir | Out-Null
    }
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $Log -Value $line -Encoding UTF8
}

function Stop-CaixaServer {
    $processIds = @()

    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $listeners) {
        if ($conn.OwningProcess -gt 0) {
            $processIds += $conn.OwningProcess
        }
    }

    $startMarker = Join-Path $ScriptDir "start.ps1"
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object {
        $_.CommandLine -and $_.CommandLine.Contains($startMarker)
    } | ForEach-Object {
        $processIds += $_.ProcessId
    }

    $processIds = $processIds | Select-Object -Unique
    foreach ($processId in $processIds) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }

    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline) {
        $stillListening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if (-not $stillListening) {
            return
        }
        Start-Sleep -Milliseconds 300
    }
}

function Start-CaixaServer {
    if (-not (Test-Path $Vbs)) {
        throw "Launcher oculto nao encontrado em $Vbs"
    }
    $wscript = Join-Path $env:SystemRoot "System32\wscript.exe"
    & $wscript //B //nologo $Vbs
}
