Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
toolingDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(toolingDir)
backendDir = projectRoot & "\Recipe-Portal\backend"

' Check if port 5000 is already active
Set oExec = WshShell.Exec("netstat -ano")
alreadyRunning = False
Do While Not oExec.StdOut.AtEndOfStream
    line = oExec.StdOut.ReadLine()
    If InStr(line, ":5000 ") > 0 And InStr(line, "LISTENING") > 0 Then
        alreadyRunning = True
        Exit Do
    End If
Loop

If Not alreadyRunning Then
    WshShell.CurrentDirectory = backendDir
    WshShell.Run "node server.js", 0, False
End If
