$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'process-runner.ps1')

$testDirectory = Join-Path ([IO.Path]::GetTempPath()) "plantory-process-runner-$([Guid]::NewGuid())"
New-Item -ItemType Directory -Path $testDirectory | Out-Null

function Assert-Equal {
  param($Actual, $Expected, [string]$Message)
  if ($Actual -ne $Expected) {
    throw "$Message Expected '$Expected', received '$Actual'."
  }
}

try {
  $success = Invoke-BoundedProcess `
    -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-Command', "Write-Output 'runner-ok'") `
    -TimeoutSeconds 5 `
    -WorkingDirectory $testDirectory `
    -StandardOutputPath (Join-Path $testDirectory 'success.out') `
    -StandardErrorPath (Join-Path $testDirectory 'success.err')
  Assert-Equal -Actual $success.TimedOut -Expected $false -Message 'Successful command timed out.'
  Assert-Equal -Actual $success.ExitCode -Expected 0 -Message 'Successful command returned the wrong exit code.'
  Assert-Equal -Actual $success.StandardOutput.Trim() -Expected 'runner-ok' -Message 'Successful command output was not captured.'

  $failure = Invoke-BoundedProcess `
    -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-Command', 'exit 7') `
    -TimeoutSeconds 5 `
    -WorkingDirectory $testDirectory `
    -StandardOutputPath (Join-Path $testDirectory 'failure.out') `
    -StandardErrorPath (Join-Path $testDirectory 'failure.err')
  Assert-Equal -Actual $failure.TimedOut -Expected $false -Message 'Failing command timed out.'
  Assert-Equal -Actual $failure.ExitCode -Expected 7 -Message 'Failing command returned the wrong exit code.'

  $timeout = Invoke-BoundedProcess `
    -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-Command', 'Start-Sleep -Seconds 10') `
    -TimeoutSeconds 1 `
    -WorkingDirectory $testDirectory `
    -StandardOutputPath (Join-Path $testDirectory 'timeout.out') `
    -StandardErrorPath (Join-Path $testDirectory 'timeout.err')
  Assert-Equal -Actual $timeout.TimedOut -Expected $true -Message 'Long-running command was not timed out.'
  Assert-Equal -Actual ($timeout.DurationMilliseconds -lt 5000) -Expected $true -Message 'Timed-out command was not reclaimed promptly.'

  Write-Output 'Process runner tests passed.'
} finally {
  Remove-Item -LiteralPath $testDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
