[CmdletBinding()]
param([switch]$Offline, [string]$Typst)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

try {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $nodeCommand -or -not $npmCommand) {
        throw 'Install Node.js 18 or newer (https://nodejs.org/), reopen your terminal, and rerun setup-typst.cmd.'
    }
    $nodeVersion = & $nodeCommand.Source --version
    if ($LASTEXITCODE -ne 0 -or [int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 18) {
        throw 'Node.js 18 or newer is required.'
    }

    Write-Host 'Installing the locked dependencies into the exporter folder...'
    $npmArguments = @('ci', '--prefix', $PSScriptRoot, '--cache', (Join-Path $PSScriptRoot '.npm-cache'), '--no-audit', '--no-fund', '--prefer-offline')
    if ($Offline) { $npmArguments += '--offline' }
    & $npmCommand.Source @npmArguments
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check the npm output above.' }

    Write-Host 'Checking Typst HTML, imports, local images, tables, and SVG math with a small export...'
    $checkArguments = @((Join-Path $PSScriptRoot 'check-typst-setup.mjs'))
    if ($Typst) { $checkArguments += @('--typst', $Typst) }
    & $nodeCommand.Source @checkArguments
    if ($LASTEXITCODE -ne 0) {
        throw 'Typst export check failed. See the specific error above and the Typst requirements in README.md.'
    }
    Write-Host ''
    Write-Host 'Setup complete. Run convert-typst.cmd with a path to your lecture .typ file.'
    exit 0
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
