. (Join-Path $PSScriptRoot "config.ps1")

$wscript = Join-Path $env:SystemRoot "System32\wscript.exe"
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute $wscript -Argument "//B //nologo `"$Vbs`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -DontStopOnIdleEnd `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew `
    -Hidden
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Sobe o Caixa Pessoal no logon em http://localhost:$Port" | Out-Null

Write-Log "Tarefa $TaskName registrada para $userId (logon -> http://localhost:$Port)"
Write-Output "Tarefa $TaskName instalada. URL: http://localhost:$Port"
