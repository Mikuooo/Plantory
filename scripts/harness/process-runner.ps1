function ConvertTo-ProcessArgument {
  param([AllowEmptyString()][string]$Argument)

  if ($Argument -notmatch '[\s"]') {
    return $Argument
  }

  $builder = [Text.StringBuilder]::new()
  [void]$builder.Append('"')
  $backslashCount = 0

  foreach ($character in $Argument.ToCharArray()) {
    if ($character -eq '\') {
      $backslashCount += 1
      continue
    }

    if ($character -eq '"') {
      [void]$builder.Append(('\' * (($backslashCount * 2) + 1)))
      [void]$builder.Append('"')
    } else {
      [void]$builder.Append(('\' * $backslashCount))
      [void]$builder.Append($character)
    }

    $backslashCount = 0
  }

  [void]$builder.Append(('\' * ($backslashCount * 2)))
  [void]$builder.Append('"')
  return $builder.ToString()
}

function Stop-ProcessTree {
  param([Parameter(Mandatory = $true)][int]$ProcessId)

  $rootProcess = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $rootProcess) {
    return
  }

  if ($PSVersionTable.PSVersion.Major -ge 7) {
    $rootProcess.Kill($true)
    return
  }

  if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'Process-tree cleanup requires PowerShell 7 on non-Windows systems.'
  }

  $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
  $childrenByParent = @{}
  foreach ($process in $processes) {
    $parentId = [int]$process.ParentProcessId
    if (-not $childrenByParent.ContainsKey($parentId)) {
      $childrenByParent[$parentId] = [Collections.Generic.List[int]]::new()
    }
    [void]$childrenByParent[$parentId].Add([int]$process.ProcessId)
  }

  $orderedIds = [Collections.Generic.List[int]]::new()
  function Add-Descendants {
    param([int]$ParentId)

    if ($childrenByParent.ContainsKey($ParentId)) {
      foreach ($childId in $childrenByParent[$ParentId]) {
        Add-Descendants -ParentId $childId
      }
    }
    [void]$orderedIds.Add($ParentId)
  }

  Add-Descendants -ParentId $ProcessId
  foreach ($id in $orderedIds) {
    Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-BoundedProcess {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$ArgumentList = @(),
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$StandardOutputPath,
    [Parameter(Mandatory = $true)][string]$StandardErrorPath
  )

  if ($TimeoutSeconds -lt 1) {
    throw 'TimeoutSeconds must be at least 1.'
  }

  foreach ($path in @($StandardOutputPath, $StandardErrorPath)) {
    $parent = Split-Path -Parent $path
    if ($parent) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
  }

  $displayArguments = ($ArgumentList | ForEach-Object { ConvertTo-ProcessArgument $_ }) -join ' '
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $FilePath
  if ($startInfo.PSObject.Properties.Name -contains 'ArgumentList') {
    foreach ($argument in $ArgumentList) {
      $startInfo.ArgumentList.Add($argument)
    }
  } else {
    $startInfo.Arguments = $displayArguments
  }
  $startInfo.WorkingDirectory = $WorkingDirectory
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  if (-not $process.Start()) {
    throw "Failed to start process: $FilePath"
  }
  $standardOutputTask = $process.StandardOutput.ReadToEndAsync()
  $standardErrorTask = $process.StandardError.ReadToEndAsync()

  $completed = $process.WaitForExit($TimeoutSeconds * 1000)
  if (-not $completed) {
    Stop-ProcessTree -ProcessId $process.Id
    [void]$process.WaitForExit(5000)
  } else {
    $process.WaitForExit()
  }
  $stopwatch.Stop()
  $standardOutput = $standardOutputTask.Result
  $standardError = $standardErrorTask.Result
  [IO.File]::WriteAllText($StandardOutputPath, $standardOutput, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($StandardErrorPath, $standardError, [Text.UTF8Encoding]::new($false))

  [pscustomobject]@{
    Command = "$FilePath $displayArguments"
    ExitCode = if ($completed) { $process.ExitCode } else { $null }
    TimedOut = -not $completed
    DurationMilliseconds = $stopwatch.ElapsedMilliseconds
    StandardOutput = $standardOutput
    StandardError = $standardError
  }
}
