param(
    [string]$Root = (Get-Location).Path,
    [string]$Entry = "index.html",
    [int]$HttpPort = 8787,
    [int]$DevtoolsPort = 9222,
    [int]$MaxWaitMs = 15000
)

$ErrorActionPreference = "Stop"

function Get-ContentType {
    param([string]$Path)

    switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".js" { return "text/javascript; charset=utf-8" }
        ".mjs" { return "text/javascript; charset=utf-8" }
        ".css" { return "text/css; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png" { return "image/png" }
        ".jpg" { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".gif" { return "image/gif" }
        ".svg" { return "image/svg+xml" }
        ".ico" { return "image/x-icon" }
        ".webp" { return "image/webp" }
        ".woff" { return "font/woff" }
        ".woff2" { return "font/woff2" }
        default { return "application/octet-stream" }
    }
}

function Start-StaticServer {
    param(
        [string]$ServeRoot,
        [int]$Port
    )

    return Start-Job -ScriptBlock {
        param($InnerRoot, $InnerPort)

        $ErrorActionPreference = "Stop"
        $listener = [System.Net.HttpListener]::new()
        $listener.Prefixes.Add("http://127.0.0.1:$InnerPort/")
        $listener.Start()

        function Get-InnerContentType {
            param([string]$Path)

            switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
                ".html" { return "text/html; charset=utf-8" }
                ".js" { return "text/javascript; charset=utf-8" }
                ".mjs" { return "text/javascript; charset=utf-8" }
                ".css" { return "text/css; charset=utf-8" }
                ".json" { return "application/json; charset=utf-8" }
                ".png" { return "image/png" }
                ".jpg" { return "image/jpeg" }
                ".jpeg" { return "image/jpeg" }
                ".gif" { return "image/gif" }
                ".svg" { return "image/svg+xml" }
                ".ico" { return "image/x-icon" }
                ".webp" { return "image/webp" }
                ".woff" { return "font/woff" }
                ".woff2" { return "font/woff2" }
                default { return "application/octet-stream" }
            }
        }

        try {
            while ($true) {
                $context = $listener.GetContext()
                try {
                    $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
                    if ([string]::IsNullOrWhiteSpace($requestPath)) {
                        $requestPath = "index.html"
                    }

                    $relativePath = $requestPath -replace "/", "\"
                    $rootFull = [IO.Path]::GetFullPath($InnerRoot)
                    $targetFull = [IO.Path]::GetFullPath((Join-Path $InnerRoot $relativePath))

                    if (-not $targetFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $targetFull -PathType Leaf)) {
                        $context.Response.StatusCode = 404
                        $bytes = [Text.Encoding]::UTF8.GetBytes("Not Found")
                        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                    }
                    else {
                        $bytes = [IO.File]::ReadAllBytes($targetFull)
                        $context.Response.StatusCode = 200
                        $context.Response.ContentType = Get-InnerContentType -Path $targetFull
                        $context.Response.ContentLength64 = $bytes.Length
                        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                    }
                }
                catch {
                    $context.Response.StatusCode = 500
                    $bytes = [Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
                    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                finally {
                    $context.Response.OutputStream.Close()
                }
            }
        }
        finally {
            $listener.Stop()
            $listener.Close()
        }
    } -ArgumentList $ServeRoot, $Port
}

function Wait-HttpReady {
    param(
        [string]$Url,
        [int]$TimeoutMs = 10000
    )

    $deadline = (Get-Date).AddMilliseconds($TimeoutMs)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
            return
        }
        catch {
            Start-Sleep -Milliseconds 250
        }
    }

    throw "Timed out waiting for $Url"
}

function Wait-DevtoolsReady {
    param(
        [int]$Port,
        [int]$TimeoutMs = 10000
    )

    $deadline = (Get-Date).AddMilliseconds($TimeoutMs)
    $versionUrl = "http://127.0.0.1:$Port/json/version"
    while ((Get-Date) -lt $deadline) {
        try {
            return Invoke-RestMethod -Uri $versionUrl -TimeoutSec 2
        }
        catch {
            Start-Sleep -Milliseconds 250
        }
    }

    throw "Timed out waiting for DevTools on port $Port"
}

function Receive-WebSocketMessage {
    param(
        [System.Net.WebSockets.ClientWebSocket]$Socket,
        [System.Threading.CancellationToken]$Token
    )

    $buffer = New-Object byte[] 8192
    $stream = New-Object System.IO.MemoryStream

    while ($true) {
        $segment = [ArraySegment[byte]]::new($buffer)
        $result = $Socket.ReceiveAsync($segment, $Token).GetAwaiter().GetResult()

        if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
            return $null
        }

        $stream.Write($buffer, 0, $result.Count)
        if ($result.EndOfMessage) {
            break
        }
    }

    return [Text.Encoding]::UTF8.GetString($stream.ToArray())
}

$serverJob = $null
$edgeProcess = $null
$userDataDir = Join-Path $env:TEMP ("codex-edge-profile-" + [Guid]::NewGuid().ToString("N"))
$pageUrl = "http://127.0.0.1:$HttpPort/$Entry"

try {
    $serverJob = Start-StaticServer -ServeRoot $Root -Port $HttpPort
    Wait-HttpReady -Url $pageUrl

    New-Item -ItemType Directory -Path $userDataDir | Out-Null

    $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if (-not (Test-Path -LiteralPath $edgePath)) {
        throw "Edge executable not found at $edgePath"
    }

    $edgeArgs = @(
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-debugging-port=$DevtoolsPort",
        "--user-data-dir=$userDataDir",
        "about:blank"
    )

    $edgeProcess = Start-Process -FilePath $edgePath -ArgumentList $edgeArgs -PassThru
    Wait-DevtoolsReady -Port $DevtoolsPort | Out-Null

    $newTargetUrl = "http://127.0.0.1:$DevtoolsPort/json/new?" + [Uri]::EscapeDataString($pageUrl)
    try {
        $target = Invoke-RestMethod -Uri $newTargetUrl -Method Put -TimeoutSec 5
    }
    catch {
        $target = Invoke-RestMethod -Uri $newTargetUrl -TimeoutSec 5
    }

    $socket = [System.Net.WebSockets.ClientWebSocket]::new()
    $cts = [System.Threading.CancellationTokenSource]::new()
    $socket.ConnectAsync([Uri]$target.webSocketDebuggerUrl, $cts.Token).GetAwaiter().GetResult()

    $messageId = 0
    function Send-Cdp {
        param(
            [string]$Method,
            [hashtable]$Params = @{}
        )

        $script:messageId++
        $payload = @{
            id = $script:messageId
            method = $Method
            params = $Params
        } | ConvertTo-Json -Compress -Depth 20

        $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
        $segment = [ArraySegment[byte]]::new($bytes)
        $socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).GetAwaiter().GetResult()
        return $script:messageId
    }

    Send-Cdp -Method "Runtime.enable" | Out-Null
    Send-Cdp -Method "Log.enable" | Out-Null
    Send-Cdp -Method "Network.enable" | Out-Null
    Send-Cdp -Method "Page.enable" | Out-Null

    $consoleEvents = New-Object System.Collections.Generic.List[object]
    $exceptionEvents = New-Object System.Collections.Generic.List[object]
    $logEntries = New-Object System.Collections.Generic.List[object]
    $networkFailures = New-Object System.Collections.Generic.List[object]
    $loadSeenAt = $null
    $deadline = (Get-Date).AddMilliseconds($MaxWaitMs)

    while ((Get-Date) -lt $deadline) {
        $remainingMs = [Math]::Max(1, [int](($deadline - (Get-Date)).TotalMilliseconds))
        $cts.CancelAfter($remainingMs)

        try {
            $rawMessage = Receive-WebSocketMessage -Socket $socket -Token $cts.Token
        }
        catch [System.OperationCanceledException] {
            break
        }
        finally {
            $cts.Dispose()
            $cts = [System.Threading.CancellationTokenSource]::new()
        }

        if (-not $rawMessage) {
            break
        }

        $message = $rawMessage | ConvertFrom-Json
        if (-not $message.method) {
            continue
        }

        switch ($message.method) {
            "Runtime.consoleAPICalled" {
                $argsText = @()
                foreach ($arg in $message.params.args) {
                    if ($null -ne $arg.value) {
                        $argsText += [string]$arg.value
                    }
                    elseif ($null -ne $arg.description) {
                        $argsText += [string]$arg.description
                    }
                    elseif ($null -ne $arg.unserializableValue) {
                        $argsText += [string]$arg.unserializableValue
                    }
                    else {
                        $argsText += "<unavailable>"
                    }
                }

                $consoleEvents.Add([pscustomobject]@{
                    type = $message.params.type
                    text = ($argsText -join " ")
                })
            }
            "Runtime.exceptionThrown" {
                $details = $message.params.exceptionDetails
                $exceptionEvents.Add([pscustomobject]@{
                    text = $details.text
                    url = $details.url
                    line = $details.lineNumber
                    column = $details.columnNumber
                    description = $details.exception.description
                })
            }
            "Log.entryAdded" {
                $entry = $message.params.entry
                $logEntries.Add([pscustomobject]@{
                    level = $entry.level
                    text = $entry.text
                    url = $entry.url
                    line = $entry.lineNumber
                })
            }
            "Network.loadingFailed" {
                $networkFailures.Add([pscustomobject]@{
                    errorText = $message.params.errorText
                    canceled = $message.params.canceled
                    blockedReason = $message.params.blockedReason
                })
            }
            "Page.loadEventFired" {
                if (-not $loadSeenAt) {
                    $loadSeenAt = Get-Date
                }
            }
        }

        if ($loadSeenAt -and ((Get-Date) - $loadSeenAt).TotalMilliseconds -ge 2000) {
            break
        }
    }

    [pscustomobject]@{
        pageUrl = $pageUrl
        console = $consoleEvents
        exceptions = $exceptionEvents
        logs = $logEntries
        networkFailures = $networkFailures
    } | ConvertTo-Json -Depth 20
}
finally {
    if ($socket) {
        try {
            $socket.Dispose()
        }
        catch { }
    }

    if ($cts) {
        try {
            $cts.Dispose()
        }
        catch { }
    }

    if ($edgeProcess -and -not $edgeProcess.HasExited) {
        try {
            Stop-Process -Id $edgeProcess.Id -Force
        }
        catch { }
    }

    if ($serverJob) {
        try {
            Stop-Job -Job $serverJob | Out-Null
        }
        catch { }
        try {
            Remove-Job -Job $serverJob -Force | Out-Null
        }
        catch { }
    }

    if (Test-Path -LiteralPath $userDataDir) {
        try {
            Remove-Item -LiteralPath $userDataDir -Recurse -Force
        }
        catch { }
    }
}
