param(
  [string]$ExpoUrl = 'exp://127.0.0.1:8081/--/',
  [string]$MaestroCommand = 'maestro',
  [string]$AdbCommand = 'adb',
  [string]$DeviceId,
  [int]$AdbTimeoutSeconds = 15,
  [int]$MaestroStageTimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'process-runner.ps1')

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$maestro = Get-Command $MaestroCommand -ErrorAction SilentlyContinue
if (-not $maestro) {
  throw "Maestro CLI was not found. Install it and expose 'maestro' on PATH, or pass -MaestroCommand <path>."
}

$adb = Get-Command $AdbCommand -ErrorAction SilentlyContinue
if (-not $adb) {
  throw "Android Debug Bridge was not found. Expose 'adb' on PATH, or pass -AdbCommand <path>."
}

if (-not $env:JAVA_HOME) {
  $userJavaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
  if ($userJavaHome) {
    $env:JAVA_HOME = $userJavaHome
  }
}

$javaPath = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { $null }
if (-not $javaPath -or -not (Test-Path -LiteralPath $javaPath)) {
  $java = Get-Command 'java' -ErrorAction SilentlyContinue
  $javaPath = if ($java) { $java.Source } else { $null }
}
if ($maestro.Source -match '\.(bat|cmd)$' -and -not $javaPath) {
  throw 'Java was not found. Maestro 2 requires Java 17 or higher.'
}

$env:MAESTRO_CLI_NO_ANALYTICS = 'true'
$env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = 'true'
$runId = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$artifactDirectory = Join-Path $repositoryRoot ".artifacts\$runId"
$commandDirectory = Join-Path $artifactDirectory 'commands'
$consolePath = Join-Path $artifactDirectory 'console.log'
$environmentPath = Join-Path $artifactDirectory 'environment.txt'
New-Item -ItemType Directory -Path $commandDirectory -Force | Out-Null
$commandSequence = 0
$selectedDevice = $null
$createdReverse = $false
$exitCode = 0

function Write-HarnessLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  $line = "[$((Get-Date).ToUniversalTime().ToString('o'))] $Message"
  Write-Output $line
  Add-Content -LiteralPath $consolePath -Value $line -Encoding UTF8
}

function Add-EnvironmentEvidence {
  param([Parameter(Mandatory = $true)][string]$Value)
  Add-Content -LiteralPath $environmentPath -Value $Value -Encoding UTF8
}

function Invoke-HarnessProcess {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$ArgumentList = @(),
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds
  )

  $script:commandSequence += 1
  $safeName = $Name -replace '[^A-Za-z0-9_.-]', '-'
  $prefix = '{0:D3}-{1}' -f $script:commandSequence, $safeName
  $result = Invoke-BoundedProcess `
    -FilePath $FilePath `
    -ArgumentList $ArgumentList `
    -TimeoutSeconds $TimeoutSeconds `
    -WorkingDirectory $repositoryRoot `
    -StandardOutputPath (Join-Path $commandDirectory "$prefix.stdout.log") `
    -StandardErrorPath (Join-Path $commandDirectory "$prefix.stderr.log")

  if ($result.StandardOutput) {
    Write-Output $result.StandardOutput.TrimEnd()
    Add-Content -LiteralPath $consolePath -Value $result.StandardOutput.TrimEnd() -Encoding UTF8
  }
  if ($result.StandardError) {
    Write-Output $result.StandardError.TrimEnd()
    Add-Content -LiteralPath $consolePath -Value $result.StandardError.TrimEnd() -Encoding UTF8
  }
  Add-Content -LiteralPath $consolePath -Value (
    "Command '$Name': durationMs=$($result.DurationMilliseconds), exitCode=$($result.ExitCode), timedOut=$($result.TimedOut)"
  ) -Encoding UTF8

  if ($result.TimedOut) {
    throw "Command '$Name' exceeded its $TimeoutSeconds second timeout."
  }
  if ($result.ExitCode -ne 0) {
    throw "Command '$Name' failed with exit code $($result.ExitCode)."
  }

  return $result
}

function Invoke-Adb {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [switch]$WithoutDevice,
    [int]$TimeoutSeconds = $AdbTimeoutSeconds
  )

  $effectiveArguments = if ($WithoutDevice) {
    $Arguments
  } else {
    @('-s', $script:selectedDevice) + $Arguments
  }

  return Invoke-HarnessProcess `
    -Name "adb-$Name" `
    -FilePath $adb.Source `
    -ArgumentList $effectiveArguments `
    -TimeoutSeconds $TimeoutSeconds
}

function Get-AdbServerIdentity {
  $listener = Get-NetTCPConnection -LocalPort 5037 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $listener) {
    return $null
  }

  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  [pscustomobject]@{
    ProcessId = $listener.OwningProcess
    ProcessName = $process.ProcessName
    Path = $process.Path
  }
}

function Wait-ForOnlineDevices {
  param([int]$TimeoutSeconds = 30)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $result = Invoke-Adb -Name 'devices' -Arguments @('devices', '-l') -WithoutDevice
    $onlineDevices = @(
      $result.StandardOutput -split "`r?`n" |
        Where-Object { $_ -match '^(\S+)\s+device(?:\s|$)' } |
        ForEach-Object { ([regex]::Match($_, '^(\S+)')).Groups[1].Value }
    )
    if ($onlineDevices.Count -gt 0) {
      return $onlineDevices
    }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)

  throw "No online Android device became available within $TimeoutSeconds seconds."
}

function Invoke-MaestroFlow {
  param([Parameter(Mandatory = $true)][string]$Stage, [Parameter(Mandatory = $true)][string]$Flow)

  $outputDirectory = Join-Path $artifactDirectory "$Stage-output"
  $reportPath = Join-Path $artifactDirectory "$Stage-report.xml"
  $maestroArguments = @(
    'test',
    '--no-ansi',
    "--udid=$selectedDevice",
    '-e', "EXPO_URL=$ExpoUrl",
    '--format', 'junit',
    '--output', $reportPath,
    '--test-output-dir', $outputDirectory,
    $Flow
  )

  if ($maestro.Source -match '\.(bat|cmd)$') {
    $appHome = Split-Path -Parent (Split-Path -Parent $maestro.Source)
    $javaArguments = @(
      '--enable-native-access=ALL-UNNAMED',
      '-classpath', (Join-Path $appHome 'lib\*'),
      'maestro.cli.AppKt'
    ) + $maestroArguments
    $result = Invoke-HarnessProcess `
      -Name "maestro-$Stage" `
      -FilePath $javaPath `
      -ArgumentList $javaArguments `
      -TimeoutSeconds $MaestroStageTimeoutSeconds
  } else {
    $result = Invoke-HarnessProcess `
      -Name "maestro-$Stage" `
      -FilePath $maestro.Source `
      -ArgumentList $maestroArguments `
      -TimeoutSeconds $MaestroStageTimeoutSeconds
  }

  Write-HarnessLog "Maestro stage '$Stage' passed in $($result.DurationMilliseconds)ms."
}

Push-Location $repositoryRoot
try {
  Add-EnvironmentEvidence "runId=$runId"
  Add-EnvironmentEvidence "repositoryCommit=$(git rev-parse HEAD)"
  Add-EnvironmentEvidence "maestro=$($maestro.Source)"
  Add-EnvironmentEvidence "adbClient=$($adb.Source)"
  Add-EnvironmentEvidence "javaHome=$env:JAVA_HOME"
  Add-EnvironmentEvidence "java=$javaPath"
  Add-EnvironmentEvidence "expoUrl=$ExpoUrl"

  $serverBefore = Get-AdbServerIdentity
  Add-EnvironmentEvidence "adbServerBefore=$($serverBefore | ConvertTo-Json -Compress)"
  if ($serverBefore -and $serverBefore.Path) {
    $serverPath = [IO.Path]::GetFullPath($serverBefore.Path)
    $clientPath = [IO.Path]::GetFullPath($adb.Source)
    if ($serverPath -ine $clientPath) {
      if ($serverBefore.ProcessName -ne 'adb') {
        throw "Port 5037 is owned by unexpected process '$($serverBefore.ProcessName)' ($serverPath)."
      }
      Write-HarnessLog "Replacing ADB server '$serverPath' with SDK client '$clientPath'."
      Stop-Process -Id $serverBefore.ProcessId -Force
      Start-Sleep -Milliseconds 300
    }
  }

  Invoke-Adb -Name 'start-server' -Arguments @('start-server') -WithoutDevice | Out-Null
  $serverAfter = Get-AdbServerIdentity
  Add-EnvironmentEvidence "adbServerAfter=$($serverAfter | ConvertTo-Json -Compress)"
  if (-not $serverAfter -or -not $serverAfter.Path -or
      ([IO.Path]::GetFullPath($serverAfter.Path) -ine [IO.Path]::GetFullPath($adb.Source))) {
    throw "The selected SDK adb did not become the server on port 5037."
  }

  $onlineDevices = @(Wait-ForOnlineDevices)
  if ($DeviceId) {
    if ($DeviceId -notin $onlineDevices) {
      throw "Requested device '$DeviceId' is not online. Online devices: $($onlineDevices -join ', ')."
    }
    $selectedDevice = $DeviceId
  } elseif ($onlineDevices.Count -eq 1) {
    $selectedDevice = $onlineDevices[0]
  } else {
    throw "Multiple online Android devices are available: $($onlineDevices -join ', '). Pass -DeviceId explicitly."
  }
  Add-EnvironmentEvidence "deviceId=$selectedDevice"

  $deviceState = Invoke-Adb -Name 'get-state' -Arguments @('get-state')
  $shellProbe = Invoke-Adb -Name 'shell-probe' -Arguments @('shell', 'echo', 'plantory-e2e-ready')
  if ($deviceState.StandardOutput.Trim() -ne 'device' -or
      $shellProbe.StandardOutput.Trim() -ne 'plantory-e2e-ready') {
    throw "Android device '$selectedDevice' did not pass the bounded shell preflight."
  }

  $deviceIdentity = Invoke-Adb -Name 'device-identity' -Arguments @(
    'shell', 'getprop', 'ro.product.model'
  )
  Add-EnvironmentEvidence "deviceModel=$($deviceIdentity.StandardOutput.Trim())"
  $packagePath = Invoke-Adb -Name 'expo-package' -Arguments @('shell', 'pm', 'path', 'host.exp.exponent')
  Add-EnvironmentEvidence "expoPackage=$($packagePath.StandardOutput.Trim())"

  if ($ExpoUrl -match '^exp://(?:127\.0\.0\.1|localhost):8081/--/?$') {
    $metroListener = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if (-not $metroListener) {
      throw 'Metro is not listening on host port 8081.'
    }

    $reverseList = Invoke-Adb -Name 'reverse-list' -Arguments @('reverse', '--list')
    $reverseExists = $reverseList.StandardOutput -match '(?m)\btcp:8081\s+tcp:8081\b'
    if (-not $reverseExists) {
      Invoke-Adb -Name 'reverse-create' -Arguments @('reverse', 'tcp:8081', 'tcp:8081') | Out-Null
      $createdReverse = $true
      Write-HarnessLog 'Created temporary adb reverse mapping for Metro port 8081.'
    } else {
      Write-HarnessLog 'Reusing existing adb reverse mapping for Metro port 8081.'
    }
  }

  $maestroInputMethods = Invoke-Adb -Name 'ime-list' -Arguments @('shell', 'ime', 'list', '-s')
  if ($maestroInputMethods.StandardOutput -split "`r?`n" -contains
      'dev.mobile.maestro/.input.MaestroInputMethodService') {
    Invoke-MaestroFlow -Stage 'suite' -Flow '.maestro'
  } else {
    Write-HarnessLog 'Maestro input method is unavailable; using the audited adb text-input fallback.'
    Invoke-MaestroFlow -Stage 'smoke' -Flow '.maestro/smoke.yaml'
    Invoke-MaestroFlow -Stage 'pot-open' -Flow '.maestro/stages/pot-open-form.yaml'
    Invoke-Adb -Name 'input-create-name' -Arguments @('shell', 'input', 'text', 'HarnessPot') | Out-Null
    Invoke-MaestroFlow -Stage 'pot-create' -Flow '.maestro/stages/pot-save-and-edit.yaml'
    Invoke-Adb -Name 'input-move-end' -Arguments @('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END') | Out-Null
    1..20 | ForEach-Object {
      Invoke-Adb -Name "input-delete-$_" -Arguments @('shell', 'input', 'keyevent', 'KEYCODE_DEL') | Out-Null
    }
    Invoke-Adb -Name 'input-update-name' -Arguments @('shell', 'input', 'text', 'HarnessAcceptedPot') | Out-Null
    Invoke-MaestroFlow -Stage 'pot-update-delete' -Flow '.maestro/stages/pot-save-and-delete.yaml'
  }
} catch {
  Write-HarnessLog "FAIL: $($_.Exception.Message)"
  $exitCode = 1
} finally {
  if ($createdReverse -and $selectedDevice) {
    try {
      Invoke-Adb -Name 'reverse-remove' -Arguments @('reverse', '--remove', 'tcp:8081') | Out-Null
      Write-HarnessLog 'Removed temporary adb reverse mapping for Metro port 8081.'
    } catch {
      Write-HarnessLog "Cleanup warning: $($_.Exception.Message)"
      $exitCode = 1
    }
  }
  Pop-Location
}

Write-Output "Maestro evidence: $artifactDirectory"
exit $exitCode
