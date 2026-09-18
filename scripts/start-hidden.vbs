Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
ps1 = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "start.ps1")
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """", 0, False
