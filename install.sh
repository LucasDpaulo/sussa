#!/usr/bin/env bash
# Instala o Sussa no Linux a partir da última GitHub Release.
#
#   curl -fsSL https://raw.githubusercontent.com/LucasDpaulo/sussa/main/install.sh | bash
#
# Variáveis opcionais:
#   SUSSA_VERSION=v0.3.3   instala uma versão específica em vez da mais recente
#   SUSSA_FORMAT=appimage  força o AppImage mesmo em sistemas com apt
set -euo pipefail

REPO="LucasDpaulo/sussa"
VERSION="${SUSSA_VERSION:-latest}"
FORMAT="${SUSSA_FORMAT:-auto}"

info() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mErro:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = "Linux" ] || fail "este instalador é para Linux. No Windows, use install.ps1."
case "$(uname -m)" in
  x86_64 | amd64) ;;
  *) fail "arquitetura $(uname -m) ainda não tem pacote; só x64 é publicado por enquanto." ;;
esac

if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL "$1"; }
  download() { curl -fL --progress-bar -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO- "$1"; }
  download() { wget -q --show-progress -O "$2" "$1"; }
else
  fail "instale curl ou wget e rode de novo."
fi

if [ "$VERSION" = "latest" ]; then
  api="https://api.github.com/repos/$REPO/releases/latest"
else
  api="https://api.github.com/repos/$REPO/releases/tags/$VERSION"
fi

info "Procurando a versão ($VERSION) em github.com/$REPO..."
release_json="$(fetch "$api")" || fail "não foi possível consultar as releases. Verifique a conexão ou se a versão existe."

# Pega a URL de download do primeiro asset cujo nome termina com a extensão pedida.
asset_url() {
  printf '%s' "$release_json" \
    | grep -o '"browser_download_url": *"[^"]*"' \
    | sed 's/.*"\(https[^"]*\)"$/\1/' \
    | grep -E "$1\$" \
    | head -n 1
}

if [ "$FORMAT" = "auto" ]; then
  if command -v apt-get >/dev/null 2>&1; then FORMAT="deb"; else FORMAT="appimage"; fi
fi

if [ "$EUID" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

case "$FORMAT" in
  deb)
    url="$(asset_url '_amd64\.deb')"
    [ -n "$url" ] || fail "a release não tem pacote .deb."
    file="$tmp/$(basename "$url")"
    info "Baixando $(basename "$url")..."
    download "$url" "$file"
    chmod 644 "$file"  # o usuário _apt precisa conseguir ler o arquivo
    info "Instalando (o apt resolve as dependências que faltarem; pode pedir sua senha)..."
    $SUDO apt-get install -y "$file"
    ;;
  appimage)
    url="$(asset_url '\.AppImage')"
    [ -n "$url" ] || fail "a release não tem AppImage."
    dest_dir="$HOME/.local/bin"
    mkdir -p "$dest_dir"
    info "Baixando $(basename "$url") para $dest_dir/sussa..."
    download "$url" "$tmp/sussa"
    install -m 755 "$tmp/sussa" "$dest_dir/sussa"
    # Entrada no menu de aplicativos com o ícone (o .deb já faz isso sozinho).
    data_dir="${XDG_DATA_HOME:-$HOME/.local/share}"
    icon_dir="$data_dir/icons/hicolor/256x256/apps"
    mkdir -p "$icon_dir" "$data_dir/applications"
    download "https://raw.githubusercontent.com/$REPO/main/build/icons/256x256.png" "$icon_dir/sussa.png" \
      || printf 'Aviso: não foi possível baixar o ícone; o menu usará um ícone genérico.\n' >&2
    cat > "$data_dir/applications/sussa.desktop" <<DESKTOP
[Desktop Entry]
Name=Sussa
Comment=Pomodoro tranquilo para estudar e trabalhar
Exec=$dest_dir/sussa %U
Icon=sussa
Terminal=false
Type=Application
Categories=Office;
StartupWMClass=sussa
DESKTOP
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$data_dir/applications" >/dev/null 2>&1 || true
    if ! ldconfig -p 2>/dev/null | grep -q 'libfuse\.so\.2'; then
      printf '\nAviso: o AppImage precisa da libfuse2. Instale pelo gerenciador da sua distribuição\n' >&2
      printf '(ex.: "sudo dnf install fuse-libs" ou "sudo pacman -S fuse2").\n' >&2
    fi
    case ":$PATH:" in
      *":$dest_dir:"*) ;;
      *) printf '\nAviso: %s não está no PATH. Adicione ao seu ~/.bashrc:\n  export PATH="$HOME/.local/bin:$PATH"\n' "$dest_dir" >&2 ;;
    esac
    ;;
  *)
    fail "formato desconhecido: $FORMAT (use deb ou appimage)."
    ;;
esac

info "Pronto! Abra o Sussa pelo menu de aplicativos ou com o comando: sussa"
