<#
.SYNOPSIS
  Leva o banco REAL (game_ranking) e as imagens para o banco da nuvem (Neon).

.DESCRIPTION
  Etapas (o banco REAL e apenas LIDO, nunca alterado):
    1. Backup do banco REAL em D:\backups.
    2. Cria uma copia local: game_ranking_nuvem.
    3. Liga o backend nessa copia para aplicar as migrations novas e copiar as imagens
       de backend\storage para dentro do banco (a nuvem gratis nao guarda arquivos em disco).
    4. Gera o arquivo final (D:\backups\para_nuvem_<data>.sql).
    5. Se -EnviarParaNeon for usado: envia esse arquivo para o banco do Neon.

  IMPORTANTE: na etapa 5 o banco do Neon precisa estar VAZIO (recem-criado) e o site no
  Render ainda NAO pode ter sido ligado nele.

.EXAMPLE
  # So prepara (etapas 1 a 4) e confere
  powershell -ExecutionPolicy Bypass -File .\scripts\migrar-para-nuvem.ps1

.EXAMPLE
  # Prepara e envia para o Neon (o script pede o endereco de conexao do Neon)
  powershell -ExecutionPolicy Bypass -File .\scripts\migrar-para-nuvem.ps1 -EnviarParaNeon
#>
param(
    [switch] $EnviarParaNeon,
    # Opcional: endereco do Neon direto no comando (se vazio, o script pergunta).
    [string] $NeonUrl = '',
    [string] $PgBin = 'D:\db\bin',
    [string] $Maven = 'C:\Tools\apache-maven-3.9.9\bin\mvn.cmd',
    [string] $JavaHome = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot',
    [string] $PastaBackups = 'D:\backups'
)

$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..')
$psql = Join-Path $PgBin 'psql.exe'
$pgDump = Join-Path $PgBin 'pg_dump.exe'
$data = Get-Date -Format yyyy-MM-dd_HH-mm

function Passo($texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }

# Credenciais do PostgreSQL local (do application.yml)
$yml = Get-Content (Join-Path $raiz 'backend\src\main\resources\application.yml')
$dbUser = ($yml | Select-String '^\s+username:' | Select-Object -First 1).Line.Split(':', 2)[1].Trim()
$dbPass = ($yml | Select-String '^\s+password:' | Select-Object -First 1).Line.Split(':', 2)[1].Trim()
$env:PGPASSWORD = $dbPass

try {
    New-Item -ItemType Directory -Force $PastaBackups | Out-Null

    Passo '1/5 Backup do banco REAL'
    $backup = Join-Path $PastaBackups "game_ranking_$data.sql"
    & $pgDump -h localhost -U $dbUser -d game_ranking --no-owner --no-privileges -f $backup
    if ($LASTEXITCODE -ne 0) { throw 'Falha no backup.' }
    Write-Host "   $backup"

    Passo '2/5 Copia local game_ranking_nuvem'
    & $psql -h localhost -U $dbUser -d postgres -q -c 'DROP DATABASE IF EXISTS game_ranking_nuvem;' -c 'CREATE DATABASE game_ranking_nuvem;'
    & $psql -h localhost -U $dbUser -d game_ranking_nuvem -q -v ON_ERROR_STOP=1 -f $backup | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar a copia.' }

    Passo '3/5 Migrations novas e importacao das imagens (liga o backend por alguns segundos)'
    $env:JAVA_HOME = $JavaHome
    $log = Join-Path $env:TEMP "migrar-para-nuvem-$data.log"
    $argumentos = '--spring.datasource.url=jdbc:postgresql://localhost:5432/game_ranking_nuvem ' +
                  '--app.storage.type=database --app.storage.import-legacy-files=true --server.port=18099'
    $processo = Start-Process -FilePath $Maven -WorkingDirectory (Join-Path $raiz 'backend') `
        -ArgumentList '-q', 'spring-boot:run', "`"-Dspring-boot.run.arguments=$argumentos`"" `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err" -PassThru -NoNewWindow
    $limite = (Get-Date).AddMinutes(4)
    while ((Get-Date) -lt $limite -and -not $processo.HasExited) {
        Start-Sleep -Seconds 3
        if (Select-String -Path $log -Pattern 'Started GameRankingApplication|APPLICATION FAILED' -Quiet) { break }
    }
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '18099' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    if (-not $processo.HasExited) { Stop-Process -Id $processo.Id -Force -ErrorAction SilentlyContinue }

    $importacao = Select-String -Path $log -Pattern 'Importacao de arquivos' | Select-Object -Last 1
    if (-not $importacao) {
        Write-Host "   O backend nao concluiu. Veja o log: $log" -ForegroundColor Red
        Select-String -Path $log -Pattern 'Caused by' | Select-Object -Last 1 | ForEach-Object { Write-Host "   $($_.Line.Trim())" }
        exit 1
    }
    Write-Host ('   ' + ($importacao.Line -replace '^.*:\s+Importacao', 'Importacao'))

    Passo '4/5 Arquivo final para a nuvem'
    $final = Join-Path $PastaBackups "para_nuvem_$data.sql"
    & $pgDump -h localhost -U $dbUser -d game_ranking_nuvem --no-owner --no-privileges -f $final
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar o arquivo final.' }
    $resumo = & $psql -h localhost -U $dbUser -d game_ranking_nuvem -tAc "select (select count(*) from users) || ' usuarios, ' || (select count(*) from completions) || ' registros, ' || (select count(*) from file_blobs) || ' imagens, banco com ' || pg_size_pretty(pg_database_size('game_ranking_nuvem'))"
    Write-Host "   $final"
    Write-Host "   Conteudo: $resumo"
}
finally {
    $env:PGPASSWORD = $null
}

if (-not $EnviarParaNeon) {
    Write-Host "`nPronto. Para enviar ao Neon, rode de novo com -EnviarParaNeon." -ForegroundColor Green
    exit 0
}

Passo '5/5 Envio para o Neon'
Write-Host '   Cole o endereco de conexao do Neon (Dashboard > Connect), comecando com postgresql://'
Write-Host '   (o texto nao aparece enquanto voce cola; depois aperte Enter)'
$neon = $NeonUrl
if (-not $neon) {
    $seguro = Read-Host -AsSecureString '   Endereco'
    $neon = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro))
}
if (-not $neon.StartsWith('postgres')) { Write-Host '   Endereco invalido.' -ForegroundColor Red; exit 1 }

$tabelas = & $psql $neon -tAc "select count(*) from information_schema.tables where table_schema = 'public'"
if ($LASTEXITCODE -ne 0) { Write-Host '   Nao consegui conectar ao Neon. Confira o endereco.' -ForegroundColor Red; exit 1 }
if ([int]$tabelas -gt 0) {
    Write-Host "   O banco do Neon NAO esta vazio ($tabelas tabelas). Nada foi enviado." -ForegroundColor Red
    Write-Host '   Use um banco recem-criado e que o site ainda nao tenha usado.'
    exit 1
}

& $psql $neon -q -v ON_ERROR_STOP=1 -f $final | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host '   Falha no envio. Veja a mensagem acima.' -ForegroundColor Red; exit 1 }
$conferencia = & $psql $neon -tAc "select (select count(*) from users) || ' usuarios, ' || (select count(*) from completions) || ' registros, ' || (select count(*) from file_blobs) || ' imagens'"
Write-Host "   Enviado! No Neon agora: $conferencia" -ForegroundColor Green
Write-Host '   Proximo passo: criar o site no Render (docs/deploy.md).'
