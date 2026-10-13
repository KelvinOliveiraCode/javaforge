Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class JFD3 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  public struct RECT { public int Left, Top, Right, Bottom; }
  public static int[] Rect(IntPtr h) {
    RECT r;
    GetWindowRect(h, out r);
    return new int[] { r.Left, r.Top, r.Right, r.Bottom };
  }
}
"@
$name = $args[0]
$p = Get-Process javaforge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { "app nao esta rodando"; exit 1 }
if ([JFD3]::IsIconic($p.MainWindowHandle)) { [void][JFD3]::ShowWindow($p.MainWindowHandle, 9); Start-Sleep -Milliseconds 400 }
$top = New-Object IntPtr(-1)
[void][JFD3]::SetWindowPos($p.MainWindowHandle, $top, 0, 0, 0, 0, 0x0001 -bor 0x0002)
Start-Sleep -Milliseconds 300
$rect = [JFD3]::Rect($p.MainWindowHandle)
$left = [int]$rect[0]; $top2 = [int]$rect[1]; $right = [int]$rect[2]; $bottom = [int]$rect[3]
$w = $right - $left; $h = $bottom - $top2
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($left, $top2, 0, 0, $bmp.Size)
New-Item -ItemType Directory -Force -Path "C:\Users\Kelvin\Desktop\JavaForge\verify" | Out-Null
$out = "C:\Users\Kelvin\Desktop\JavaForge\verify\$name.png"
$bmp.Save($out)
$g.Dispose(); $bmp.Dispose()
# volta ao normal (nao fica sempre na frente)
$notop = New-Object IntPtr(-2)
[void][JFD3]::SetWindowPos($p.MainWindowHandle, $notop, 0, 0, 0, 0, 0x0001 -bor 0x0002)
"salvo: $out (${w}x${h})"
