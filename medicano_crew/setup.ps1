$PYTHON_VERSION = "3.13.3"
$VENV_DIR = "venv"

function Find-Python {
    $majorMinor = $PYTHON_VERSION.Substring(0, $PYTHON_VERSION.LastIndexOf('.'))
    foreach ($cmd in @("python$majorMinor", "python3", "python")) {
        if (Get-Command $cmd -ErrorAction SilentlyContinue) {
            $ver = & $cmd --version 2>&1 | Select-String -Pattern '\d+\.\d+\.\d+' | ForEach-Object { $_.Matches.Value }
            if ($ver -eq $PYTHON_VERSION) {
                return $cmd
            }
        }
    }
    return $null
}

function Activate-Pyenv {
    if (-not (Get-Command pyenv -ErrorAction SilentlyContinue)) {
        $pyenvPath = "$env:USERPROFILE\.pyenv\pyenv-win\bin\pyenv.bat"
        if (Test-Path $pyenvPath) {
            $env:PYENV = "$env:USERPROFILE\.pyenv\pyenv-win"
            $env:PYENV_ROOT = "$env:USERPROFILE\.pyenv\pyenv-win"
            $env:PYENV_HOME = "$env:USERPROFILE\.pyenv\pyenv-win"
            $env:PATH = "$env:PYENV\bin;$env:PYENV\shims;$env:PATH"
        }
    }
}

$pythonCmd = Find-Python

if ($pythonCmd) {
    Write-Host "Python $PYTHON_VERSION encontrado: $pythonCmd"
} else {
    Activate-Pyenv
    if (Get-Command pyenv -ErrorAction SilentlyContinue) {
        Write-Host "Python $PYTHON_VERSION nao encontrado. Instalando via pyenv-win..."
        pyenv install $PYTHON_VERSION
        pyenv local $PYTHON_VERSION
        $pythonCmd = "python"
        Write-Host "Python $PYTHON_VERSION instalado."
    } else {
        Write-Host "Instale o pyenv-win ou a versao correspondente do python ($PYTHON_VERSION)"
        Write-Host "pyenv-win: https://github.com/pyenv-win/pyenv-win"
        exit 1
    }
}

Write-Host "Criando ambiente virtual em '$VENV_DIR'..."
if (Get-Command pyenv -ErrorAction SilentlyContinue) {
    $env:PYENV_VERSION = $PYTHON_VERSION
    & $pythonCmd -m venv $VENV_DIR
    Remove-Item Env:PYENV_VERSION -ErrorAction SilentlyContinue
} else {
    & $pythonCmd -m venv $VENV_DIR
}

Write-Host "Instalando dependencias..."
& "$VENV_DIR\Scripts\pip.exe" install --upgrade pip --quiet
& "$VENV_DIR\Scripts\pip.exe" install -r requirements.txt

Write-Host ""
Write-Host "Pronto. Para ativar o ambiente:"
Write-Host "  $VENV_DIR\Scripts\Activate.ps1"
