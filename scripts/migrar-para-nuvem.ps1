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
    # Apaga a estrutura do Neon antes de enviar, SOMENTE se ela nao tiver nenhum usuario nem registro
    # (caso tipico: o site no Render foi ligado antes do envio e criou tabelas vazias).
    [switch] $LimparNeonVazio,
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

# Acha o endereco mesmo "embrulhado" (ex.: psql 'postgresql://...' ou DATABASE_URL=postgresql://...).
function Extrair-Endereco([string] $texto) {
    if (-not $texto) { return '' }
    $achado = [regex]::Match($texto, "postgres(?:ql)?://[^\s'`"]+")
    if ($achado.Success) { return $achado.Value }
    return ''
}

# Mostra o endereco sem a senha, para conferencia.
function Esconder-Senha([string] $endereco) {
    return ($endereco -replace '(://[^:/@]+:)[^@]+@', '$1****@')
}

# Explica o que chegou, sem revelar o conteudo.
function Descrever-Texto([string] $texto) {
    if (-not $texto) { return 'nada foi recebido (a colagem nao funcionou)' }
    if ($texto -match '[\x00-\x1F]') { return 'chegou um caractere de controle: o Ctrl+V nao funcionou nesse campo' }
    $inicio = $texto.Trim().Substring(0, [Math]::Min(8, $texto.Trim().Length))
    return "chegou um texto de $($texto.Length) caracteres comecando com '$inicio' (deveria comecar com postgresql://)"
}

$recebido = $NeonUrl
if (-not $recebido) {
    # 1a opcao: o que estiver copiado (botao "copiar" do Neon). Nada precisa ser colado.
    $copiado = Extrair-Endereco ((Get-Clipboard -Raw -ErrorAction SilentlyContinue) | Out-String)
    if ($copiado) {
        Write-Host "   Encontrei este endereco copiado: $(Esconder-Senha $copiado)"
        $resposta = Read-Host '   Usar este endereco? (S/N)'
        if ($resposta -match '^[sS]') { $recebido = $copiado }
    }
}
if (-not $recebido) {
    Write-Host '   Cole o endereco do Neon (Connect) e aperte Enter.'
    Write-Host '   O texto nao aparece enquanto voce cola. Cole com o BOTAO DIREITO do mouse, uma vez so.'
    $seguro = Read-Host -AsSecureString '   Endereco'
    $recebido = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro))
}

$neon = Extrair-Endereco $recebido
if (-not $neon) {
    Write-Host "   Endereco invalido: $(Descrever-Texto $recebido)." -ForegroundColor Red
    Write-Host '   Dica: no Neon, clique no botao de copiar do endereco e rode o script de novo (ele le o que foi copiado).'
    exit 1
}
Write-Host "   Usando: $(Esconder-Senha $neon)"

# Alem do codigo de saida, confere o conteudo das respostas: so segue com numeros reais.
$tabelas = (& $psql $neon -tAc "select count(*) from information_schema.tables where table_schema = 'public'" | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $tabelas -notmatch '^\d+$') {
    Write-Host '   Nao consegui conectar ao Neon. Nada foi enviado.' -ForegroundColor Red
    Write-Host '   Se a mensagem acima diz "password authentication failed", a senha do endereco esta errada:'
    Write-Host '   copie o endereco de novo no Neon (Connect) e tente outra vez.'
    exit 1
}
if ([int]$tabelas -gt 0) {
    # Conta o que existe la (sem mostrar dados pessoais) para saber o que aconteceu.
    $sqlResumo = "select coalesce((select count(*) from users), 0) || ';' || coalesce((select count(*) from completions), 0) || ';' || coalesce((select count(*) from file_blobs), 0)"
    $resumoNeon = (& $psql $neon -tAc $sqlResumo 2>$null | Out-String).Trim()
    $partes = $resumoNeon -split ';'
    if ($partes.Count -ne 3) {
        Write-Host "   O banco do Neon NAO esta vazio ($tabelas tabelas) e nao reconheci o conteudo. Nada foi enviado." -ForegroundColor Red
        exit 1
    }
    $usuariosNeon = [int]$partes[0]; $registrosNeon = [int]$partes[1]; $imagensNeon = [int]$partes[2]
    Write-Host "   O Neon ja tem $tabelas tabelas com: $usuariosNeon usuarios, $registrosNeon registros, $imagensNeon imagens." -ForegroundColor Yellow

    if ($usuariosNeon -gt 0 -or $registrosNeon -gt 0) {
        Write-Host '   Ja existem dados no Neon (provavelmente um envio anterior funcionou). Nada foi enviado.' -ForegroundColor Green
        Write-Host '   Confira se os numeros acima batem com o "Conteudo" da etapa 4. Se baterem, pode seguir para o Render.'
        exit 0
    }

    # Tabelas vazias: o site (Render) foi ligado antes do envio e o Flyway criou a estrutura.
    if (-not $LimparNeonVazio) {
        Write-Host '   As tabelas estao VAZIAS: o site no Render provavelmente foi ligado antes do envio.' -ForegroundColor Yellow
        Write-Host '   Para apagar essa estrutura vazia e enviar os dados, rode de novo com -LimparNeonVazio:'
        Write-Host '     powershell -ExecutionPolicy Bypass -File .\scripts\migrar-para-nuvem.ps1 -EnviarParaNeon -LimparNeonVazio'
        Write-Host '   Depois do envio, reinicie o site no Render (Manual Deploy > Restart service).'
        exit 1
    }

    Write-Host '   Apagando a estrutura vazia do Neon (nenhum usuario ou registro existe la)...'
    & $psql $neon -q -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE;' -c 'CREATE SCHEMA public;' | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host '   Nao foi possivel limpar o Neon. Nada foi enviado.' -ForegroundColor Red; exit 1 }
}

& $psql $neon -q -v ON_ERROR_STOP=1 -f $final | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host '   Falha no envio. Veja a mensagem acima.' -ForegroundColor Red; exit 1 }
$conferencia = (& $psql $neon -tAc "select (select count(*) from users) || ' usuarios, ' || (select count(*) from completions) || ' registros, ' || (select count(*) from file_blobs) || ' imagens'" | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $conferencia -notmatch '^\d+ usuarios') {
    Write-Host '   Nao foi possivel confirmar os dados no Neon. Confira pelo painel (Tables) antes de seguir.' -ForegroundColor Red
    exit 1
}
Write-Host "   Enviado! No Neon agora: $conferencia" -ForegroundColor Green
Write-Host '   Proximo passo: criar o site no Render (docs/deploy.md).'
