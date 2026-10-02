Option Explicit
' SDD Hub: arranca el servidor sin ventana y abre el navegador.
' Si ya esta en marcha, solo abre el navegador.
Dim sh, fso, dir
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
sh.Run "node """ & dir & "\server.js"" --open", 0, False
