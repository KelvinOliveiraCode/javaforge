param(
  [int]$X = 0,
  [int]$Y = 0,
  [string]$Keys = "",
  [string]$Name = "shot"
)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class JFK {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, uint d, int i);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  public struct RECT { public int Left, Top, Right, Bottom; }
  public static int[] Rect(IntPtr h) { RECT r; GetWindowRect(h, out r); return new int[] { r.Left, r.Top, r.Right, r.Bottom }; }
  public static void Click(int x, int y) {
    SetCursorPos(x, y);
    System.Threading.Thread.Sleep(150);
    mouse_event(0x02, 0, 0, 0, 0);
    System.Threading.Thread.Sleep(50);
    mouse_event(0x04, 0, 0, 0, 0);
  }
}
"@
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$p = Get-Process javaforge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { "app nao esta rodando"; exit 1 }
$hwnd = $p.MainWindowHandle
if ([JFK]::IsIconic($hwnd)) { [void][JFK]::ShowWindow($hwnd, 9); Start-Sleep -Milliseconds 400 }
$topmost = New-Object IntPtr(-1)
[void][JFK]::SetWindowPos($hwnd, $topmost, 0, 0, 0, 0, 0x0001 -bor 0x0002)
Start-Sleep -Milliseconds 300
[void][JFK]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 400

$r0 = [JFK]::Rect($hwnd)
if ($X -gt 0 -or $Y -gt 0) {
    [JFK]::Click(([int]$r0[0]) + $X, ([int]$r0[1]) + $Y)
    Start-Sleep -Milliseconds 500
}
if ($Keys -ne "") {
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
    Start-Sleep -Milliseconds 600
}

$r = [JFK]::Rect($hwnd)
$left = [int]$r[0]
$top2 = [int]$r[1]
$right = [int]$r[2]
$bottom = [int]$r[3]
$w = $right - $left
$h = $bottom - $top2
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($left, $top2, 0, 0, $bmp.Size)
New-Item -ItemType Directory -Force -Path "C:\Users\Kelvin\Desktop\JavaForge\verify" | Out-Null
$out = "C:\Users\Kelvin\Desktop\JavaForge\verify\$Name.png"
$bmp.Save($out)
$g.Dispose(); $bmp.Dispose()
$notop = New-Object IntPtr(-2)
[void][JFK]::SetWindowPos($hwnd, $notop, 0, 0, 0, 0, 0x0001 -bor 0x0002)
"salvo: $out (${w}x${h})"
