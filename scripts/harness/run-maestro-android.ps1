param(
  [string]$ExpoUrl = 'exp://127.0.0.1:8081/--/',
  [string]$MaestroCommand = 'maestro'
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$maestro = Get-Command $MaestroCommand -ErrorAction SilentlyContinue
if (-not $maestro) {
  throw "Maestro CLI was not found. Install it and expose 'maestro' on PATH, or pass -MaestroCommand <path>."
}

$devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\sdevice$' }
if (-not $devices) {
  throw 'No online Android device is available through adb.'
}

$runId = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$artifactDirectory = Join-Path $repositoryRoot ".artifacts\$runId"
$consolePath = Join-Path $artifactDirectory 'console.log'
New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null

function Invoke-MaestroFlow {
  param([string]$Stage, [string]$Flow)

  $outputDirectory = Join-Path $artifactDirectory "$Stage-output"
  $reportPath = Join-Path $artifactDirectory "$Stage-report.xml"
  & $maestro.Source test `
    -e "EXPO_URL=$ExpoUrl" `
    --format junit `
    --output $reportPath `
    --test-output-dir $outputDirectory `
    --debug-output $outputDirectory `
    $Flow 2>&1 | Tee-Object -FilePath $consolePath -Append
  if ($LASTEXITCODE -ne 0) {
    throw "Maestro stage '$Stage' failed with exit code $LASTEXITCODE."
  }
}

function Invoke-AdbInput {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  & adb @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "adb input failed: $($Arguments -join ' ')"
  }
}

$exitCode = 0
Push-Location $repositoryRoot
try {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $maestroInputMethod = adb shell ime list -s | Where-Object {
    $_ -eq 'dev.mobile.maestro/.input.MaestroInputMethodService'
  }

  if ($maestroInputMethod) {
    Invoke-MaestroFlow -Stage 'suite' -Flow '.maestro'
  } else {
    Write-Output 'Maestro input method is unavailable; using the audited adb text-input fallback.' |
      Tee-Object -FilePath $consolePath -Append
    Invoke-MaestroFlow -Stage 'smoke' -Flow '.maestro/smoke.yaml'
    Invoke-MaestroFlow -Stage 'pot-open' -Flow '.maestro/stages/pot-open-form.yaml'
    Invoke-AdbInput shell input text HarnessPot
    Invoke-MaestroFlow -Stage 'pot-create' -Flow '.maestro/stages/pot-save-and-edit.yaml'
    Invoke-AdbInput shell input keyevent KEYCODE_MOVE_END
    1..20 | ForEach-Object { Invoke-AdbInput shell input keyevent KEYCODE_DEL | Out-Null }
    Invoke-AdbInput shell input text HarnessAcceptedPot
    Invoke-MaestroFlow -Stage 'pot-update-delete' -Flow '.maestro/stages/pot-save-and-delete.yaml'
  }
  $ErrorActionPreference = $previousErrorActionPreference
} catch {
  Write-Error $_
  $exitCode = 1
} finally {
  $ErrorActionPreference = 'Stop'
  Pop-Location
}

Write-Output "Maestro evidence: $artifactDirectory"
exit $exitCode
