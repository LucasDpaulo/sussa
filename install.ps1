# Instala o Sussa no Windows a partir da última GitHub Release.
#
#   irm https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.ps1 | iex
#
# Variáveis opcionais (defina antes de rodar):
#   $env:SUSSA_VERSION = 'v0.2.0'   instala uma versão específica
#   $env:SUSSA_SILENT  = '1'        instala sem abrir o assistente

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'  # deixa o download muito mais rápido no Windows PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$repo = 'LucasDpaulo/sussa'
$version = if ($env:SUSSA_VERSION) { $env:SUSSA_VERSION } else { 'latest' }

if (-not [Environment]::Is64BitOperatingSystem) {
    throw 'Só há instalador para Windows x64 por enquanto.'
}

$api = if ($version -eq 'latest') {
    "https://api.github.com/repos/$repo/releases/latest"
} else {
    "https://api.github.com/repos/$repo/releases/tags/$version"
}

Write-Host "==> Procurando a versão ($version) em github.com/$repo..." -ForegroundColor Green
try {
    $release = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'sussa-installer' }
} catch {
    throw "Não foi possível consultar as releases. Verifique a conexão ou se a versão existe. ($_)"
}

$asset = $release.assets | Where-Object { $_.name -like '*setup*.exe' } | Select-Object -First 1
if (-not $asset) { throw 'A release não tem instalador .exe.' }

$file = Join-Path $env:TEMP $asset.name
Write-Host "==> Baixando $($asset.name)..." -ForegroundColor Green
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $file -UseBasicParsing

Write-Host '==> Abrindo o instalador...' -ForegroundColor Green
$installerArgs = @()
if ($env:SUSSA_SILENT -eq '1') { $installerArgs += '/S' }
$proc = if ($installerArgs.Count) {
    Start-Process -FilePath $file -ArgumentList $installerArgs -Wait -PassThru
} else {
    Start-Process -FilePath $file -Wait -PassThru
}
Remove-Item $file -ErrorAction SilentlyContinue

if ($proc.ExitCode -ne 0) { throw "O instalador terminou com código $($proc.ExitCode)." }
Write-Host '==> Pronto! Abra o Sussa pelo menu Iniciar.' -ForegroundColor Green
