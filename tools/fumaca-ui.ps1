<#
    Teste de fumaca da interface do JavaForge.

    Roda o app de verdade e confere que ele sobe, fica vivo e desenha a tela
    (nada de tela branca ou travamento). Nao substitui os testes Rust: prova
    o casco da interface, que os testes de logica nao alcancam.

    Uso:  powershell -File tools\fumaca-ui.ps1
#>
param(
    [string]$Exe = "$PSScriptRoot\..\src-tauri\target\release\javaforge.exe"
)

$erros = @()
function Checar($condicao, $mensagem) {
    if ($condicao) { Write-Output "  ok   $mensagem" }
    else { Write-Output "  FALHA $mensagem"; $script:erros += $mensagem }
}

Add-Type @"
using System;
using System.Drawing;
using System.Runtime.InteropServices;
public class Fumaca {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Exe)) {
    Write-Output "App nao encontrado em $Exe. Rode 'npm run tauri build' antes."
    exit 1
}

Get-Process javaforge -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# marca a quantidade de linhas do log ANTES de abrir, para comparar no fim
$logAntes = Join-Path $env:APPDATA "JavaForge\client.log"
$linhasAntes = 0
if (Test-Path $logAntes) { $linhasAntes = (Get-Content $logAntes | Measure-Object -Line).Lines }

$saida = Join-Path $PSScriptRoot "..\verify\fumaca"
New-Item -ItemType Directory -Force -Path $saida | Out-Null

Write-Output "abrindo o JavaForge..."
Start-Process -FilePath $Exe
Start-Sleep -Seconds 5

$p = Get-Process javaforge -ErrorAction SilentlyContinue | Select-Object -First 1
Checar ($null -ne $p) "o processo do JavaForge subiu"
if (-not $p) { exit 1 }

Checar ([Fumaca]::IsWindowVisible($p.MainWindowHandle)) "a janela esta visivel"
Start-Sleep -Seconds 3
Checar (-not $p.HasExited) "continua vivo 8s depois (sem crash)"

# desenha a tela: != uniforme
$r = New-Object Fumaca+RECT
[void][Fumaca]::GetWindowRect($p.MainWindowHandle, [ref]$r)
$w = $r.Right - $r.Left
$h = $r.Bottom - $r.Top
Checar ($w -gt 600 -and $h -gt 400) "a janela tem tamanho util ($w x $h)"

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[void][Fumaca]::PrintWindow($p.MainWindowHandle, $hdc, 2)
$g.ReleaseHdc($hdc)
$g.Dispose()

$cores = @{}
for ($y = 0; $y -lt $h; $y += 7) {
    for ($x = 0; $x -lt $w; $x += 7) {
        $c = $bmp.GetPixel($x, $y)
        $k = "$($c.R),$($c.G),$($c.B)"
        if ($cores.ContainsKey($k)) { $cores[$k]++ } else { $cores[$k] = 1 }
    }
}
$amostras = ($h / 7) * ($w / 7)
Checar ($cores.Count -gt 20) "a tela desenhou conteudo ($($cores.Count) cores distintas)"
$bmp.Save((Join-Path $saida "tela.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "  -> screenshot em verify\fumaca\tela.png"

# so interessa o que aconteceu NESTA execucao, nao o historico do log
$log = Join-Path $env:APPDATA "JavaForge\client.log"
if (Test-Path $log) {
    Start-Sleep -Milliseconds 500
    $novas = @(Get-Content $log | Select-Object -Skip $linhasAntes) |
        Where-Object { $_ -match "FALHA|Erro|error" }
    Checar ($novas.Count -eq 0) "nenhum erro novo no log da interface"
    if ($novas.Count -gt 0) { $novas | ForEach-Object { Write-Output "     $_" } }
}

Write-Output ""
if ($erros.Count -eq 0) { Write-Output "fumaca passou" }
else {
    Write-Output "fumaca falhou em $($erros.Count) cheque(s)"
    exit 1
}
