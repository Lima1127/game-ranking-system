<#
.SYNOPSIS
  Cadastra um usuario no Reviradao e, opcionalmente, o torna ADMIN.

.DESCRIPTION
  O cadastro passa pela propria API (/auth/register), entao a senha e guardada
  criptografada do mesmo jeito que no site. Com -Admin, o papel do usuario e
  trocado para ADMIN direto no banco (via psql).

  Requisitos: o backend precisa estar rodando.

.EXAMPLE
  # Jogador comum no banco de TESTE (padrao)
  powershell -ExecutionPolicy Bypass -File .\scripts\criar-usuario.ps1 -Nome "Joao" -Email "joao@teste.com" -Senha "senha123"

.EXAMPLE
  # Admin (se o e-mail ja existir, so promove para ADMIN)
  powershell -ExecutionPolicy Bypass -File .\scripts\criar-usuario.ps1 -Nome "Alex" -Email "alex@teste.com" -Senha "senha123" -Admin

.EXAMPLE
  # Mesmo coisa, mas no banco REAL
  powershell -ExecutionPolicy Bypass -File .\scripts\criar-usuario.ps1 -Nome "Alex" -Email "alex@x.com" -Senha "senha123" -Admin -Banco game_ranking
#>
param(
    [Parameter(Mandatory = $true)] [string] $Nome,
    [Parameter(Mandatory = $true)] [string] $Email,
    [Parameter(Mandatory = $true)] [string] $Senha,
    [switch] $Admin,
    [string] $Banco = 'game_ranking_teste',
    [string] $Api = 'http://localhost:8080/api/v1',
    [string] $Psql = 'D:\db\bin\psql.exe'
)

$ErrorActionPreference = 'Stop'

if ($Senha.Length -lt 6) {
    Write-Host 'A senha precisa ter pelo menos 6 caracteres.' -ForegroundColor Red
    exit 1
}

# 1) Cadastro pela API -------------------------------------------------------
Write-Host "Cadastrando $Email ..."
$body = @{ displayName = $Nome; email = $Email; password = $Senha } | ConvertTo-Json
try {
    Invoke-RestMethod -Method Post -Uri "$Api/auth/register" -ContentType 'application/json; charset=utf-8' -Body $body | Out-Null
    Write-Host '  Usuario criado.' -ForegroundColor Green
}
catch {
    $mensagem = $_.ErrorDetails.Message
    if (-not $mensagem -and $_.Exception.Response) {
        # No Windows PowerShell 5.1 o corpo do erro precisa ser lido da resposta.
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $mensagem = $reader.ReadToEnd()
    }
    if ($mensagem -match 'Email ja cadastrado') {
        Write-Host '  Este e-mail ja estava cadastrado.' -ForegroundColor Yellow
        if (-not $Admin) { exit 0 }
    }
    elseif (-not $_.Exception.Response) {
        Write-Host "  Nao consegui falar com o backend em $Api. Ele esta rodando?" -ForegroundColor Red
        exit 1
    }
    else {
        Write-Host "  Erro no cadastro: $mensagem" -ForegroundColor Red
        exit 1
    }
}

if (-not $Admin) {
    Write-Host "Pronto! Login: $Email"
    exit 0
}

# 2) Promover para ADMIN no banco --------------------------------------------
if (-not (Test-Path $Psql)) {
    Write-Host "psql nao encontrado em $Psql. Informe o caminho com -Psql." -ForegroundColor Red
    exit 1
}

# Usuario e senha do banco vem do application.yml do backend.
$yml = Get-Content (Join-Path $PSScriptRoot '..\backend\src\main\resources\application.yml')
$dbUser = ($yml | Select-String '^\s+username:' | Select-Object -First 1).Line.Split(':', 2)[1].Trim()
$env:PGPASSWORD = ($yml | Select-String '^\s+password:' | Select-Object -First 1).Line.Split(':', 2)[1].Trim()

try {
    # O e-mail vai como variavel do psql (:'email'), nunca colado dentro do SQL.
    $sql = "UPDATE users SET role = 'ADMIN', updated_at = NOW() WHERE lower(email) = lower(:'email');"
    $resultado = $sql | & $Psql -h localhost -U $dbUser -d $Banco -v "email=$Email" -v ON_ERROR_STOP=1 -tA
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

if ($resultado -match 'UPDATE 1') {
    Write-Host "  $Email agora e ADMIN no banco '$Banco'." -ForegroundColor Green
    Write-Host '  Se a pessoa ja estava logada, ela precisa sair e entrar de novo para ver o menu Admin.'
}
else {
    Write-Host "  Nenhum usuario com o e-mail $Email no banco '$Banco'." -ForegroundColor Red
    Write-Host '  Confira se o backend esta rodando no mesmo banco (TESTE x REAL).'
    exit 1
}
