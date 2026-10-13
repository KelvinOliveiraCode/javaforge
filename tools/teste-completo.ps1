# Verificacao completa (segundo plano) do JavaForge.
# 1) testes Rust (codegen, javac, maven, banco)
# 2) banco do app gerado: login valido, senha errada e usuario inexistente
# 3) app gerado inicia sem erros
# Escreve o resultado em verify/relatorio.txt
$rel = "C:\Users\Kelvin\Desktop\JavaForge\verify\relatorio.txt"
"" | Set-Content $rel
function Log($m) { "$([DateTime]::Now.ToString('HH:mm:ss')) $m" | Tee-Object -FilePath $rel -Append }

Log "=== Verificacao JavaForge (segundo plano) ==="

# 1. Testes Rust
Log "[1/3] testes Rust (codegen, javac, maven, banco)..."
$env:JAVAFORGE_MVN = "C:\Users\Kelvin\tools\maven\bin\mvn.cmd"
Push-Location "C:\Users\Kelvin\Desktop\JavaForge\src-tauri"
$testOut = & cargo test -j 2 --test end_to_end 2>&1 | Out-String
Pop-Location
if ($testOut -match "test result: ok\. (\d+) passed") {
    Log "  OK: $($Matches[1]) testes passaram"
} else {
    Log "  FALHA nos testes Rust"
    Log ($testOut -split "`n" | Select-String -Pattern "error|panicked|FAILED" | Select-Object -First 5 | Out-String)
}

# 2. Banco do app gerado (projeto de modelo login gerado pelos testes)
Log "[2/3] banco do app gerado (login admin/1234 no SQLite)..."
$proj = "$env:TEMP\javaforge-e2e\tpl-login"
if (-not (Test-Path "$proj\src\main\java")) { Log "  FALHA: projeto gerado nao encontrado em $proj"; exit 1 }
$javac = "C:\Users\Kelvin\tools\jdk21\bin\javac.exe"
$jar = "$proj\lib\sqlite-jdbc.jar"
$classes = "$proj\target\classes"
$outVer = "C:\Users\Kelvin\Desktop\JavaForge\verify\verificador"
New-Item -ItemType Directory -Force -Path $outVer | Out-Null
& $javac -encoding UTF-8 -cp "$classes;$jar" -d $outVer "C:\Users\Kelvin\Desktop\JavaForge\tools\VerificaBanco.java"
if ($LASTEXITCODE -ne 0) { Log "  FALHA ao compilar o verificador"; exit 1 }
Push-Location $proj
$saida = & java -cp "$classes;$outVer;$jar" com.teste.app.VerificaBanco 2>&1
Pop-Location
Log "  $saida"
if ($saida -match "BANCO_OK") { Log "  OK: login valido aceito; senha errada e usuario inexistente rejeitados" } else { Log "  FALHA na verificacao do banco" }

# 3. App gerado inicia sem erros
Log "[3/3] app gerado inicia (Swing) sem erros..."
Get-Process java -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -in @("Entrar","Sistema") } | Stop-Process -Force
Start-Sleep -Seconds 1
$env:PATH += ";C:\Users\Kelvin\tools\maven\bin"
$p = Start-Process -FilePath "mvnw.cmd" -ArgumentList "-q","-B","compile","exec:java" -WorkingDirectory $proj -PassThru -WindowStyle Hidden
$appOk = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    $jp = Get-Process java -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq "Entrar" } | Select-Object -First 1
    if ($jp) { $appOk = $true; break }
    if ($p.HasExited) { break }
}
if ($appOk) { Log "  OK: janela de login do app gerado iniciou (pid $($jp.Id))" } else { Log "  FALHA: app gerado nao iniciou" }
Get-Process java -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -in @("Entrar","Sistema") } | Stop-Process -Force

Log ""
if ($testOut -match "test result: ok" -and $saida -match "BANCO_OK" -and $appOk) {
    Log "RESULTADO: TODOS OS TESTES PASSARAM"
} else {
    Log "RESULTADO: FALHA (ver itens acima)"
}
Log "=== fim ==="
