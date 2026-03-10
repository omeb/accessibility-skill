#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SOURCE="$SCRIPT_DIR/skills"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Wix Accessibility Skills Installer${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}!${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${BLUE}→${NC} $1"
}

install_skills() {
  local target_dir="$1"
  local label="$2"

  if [ ! -d "$SKILLS_SOURCE" ]; then
    print_error "Skills source directory not found: $SKILLS_SOURCE"
    exit 1
  fi

  mkdir -p "$target_dir"

  local count=0
  for skill_dir in "$SKILLS_SOURCE"/*/; do
    if [ -f "$skill_dir/SKILL.md" ]; then
      local skill_name
      skill_name=$(basename "$skill_dir")
      mkdir -p "$target_dir/$skill_name"
      cp "$skill_dir/SKILL.md" "$target_dir/$skill_name/SKILL.md"
      print_success "Installed $skill_name"
      count=$((count + 1))
    fi
  done

  echo ""
  print_success "Installed $count skills to $label"
  echo -e "  ${BLUE}$target_dir${NC}"
}

verify_installation() {
  local target_dir="$1"
  echo ""
  print_info "Verifying installation..."

  local ok=true
  for skill in web-accessibility a11y-react-patterns a11y-rules-reference a11y-harmony-pipeline; do
    if [ -f "$target_dir/$skill/SKILL.md" ]; then
      print_success "$skill/SKILL.md exists"
    else
      print_warning "$skill/SKILL.md not found"
      ok=false
    fi
  done

  if $ok; then
    echo ""
    print_success "All skills installed and verified."
  fi
}

show_usage() {
  echo "Usage: ./install.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --cursor-global    Install to ~/.cursor/skills/ (all Cursor projects)"
  echo "  --cursor-project   Install to .cursor/skills/ in current directory"
  echo "  --codex            Install to ~/.codex/skills/ (Claude Code / Codex)"
  echo "  --target DIR       Install to a custom directory"
  echo "  --help             Show this help message"
  echo ""
  echo "If no option is given, the installer will prompt you interactively."
}

interactive_install() {
  echo "Where would you like to install the accessibility skills?"
  echo ""
  echo "  1) Cursor — global (all projects)    → ~/.cursor/skills/"
  echo "  2) Cursor — this project only        → .cursor/skills/"
  echo "  3) Claude Code / Codex               → ~/.codex/skills/"
  echo "  4) Custom directory"
  echo ""
  read -rp "Choose [1-4]: " choice

  case $choice in
    1)
      install_skills "$HOME/.cursor/skills" "Cursor global skills"
      verify_installation "$HOME/.cursor/skills"
      ;;
    2)
      install_skills ".cursor/skills" "project Cursor skills"
      verify_installation ".cursor/skills"
      echo ""
      print_info "Tip: Commit .cursor/skills/ to your repo so all team members benefit."
      ;;
    3)
      install_skills "$HOME/.codex/skills" "Codex skills"
      verify_installation "$HOME/.codex/skills"
      ;;
    4)
      read -rp "Enter target directory: " custom_dir
      install_skills "$custom_dir" "custom directory"
      verify_installation "$custom_dir"
      ;;
    *)
      print_error "Invalid choice. Run ./install.sh --help for options."
      exit 1
      ;;
  esac
}

# Main
print_header

case "${1:-}" in
  --cursor-global)
    install_skills "$HOME/.cursor/skills" "Cursor global skills"
    verify_installation "$HOME/.cursor/skills"
    ;;
  --cursor-project)
    install_skills ".cursor/skills" "project Cursor skills"
    verify_installation ".cursor/skills"
    echo ""
    print_info "Tip: Commit .cursor/skills/ to your repo so all team members benefit."
    ;;
  --codex)
    install_skills "$HOME/.codex/skills" "Codex skills"
    verify_installation "$HOME/.codex/skills"
    ;;
  --target)
    if [ -z "${2:-}" ]; then
      print_error "Missing target directory. Usage: ./install.sh --target /path/to/dir"
      exit 1
    fi
    install_skills "$2" "custom directory"
    verify_installation "$2"
    ;;
  --help|-h)
    show_usage
    ;;
  "")
    interactive_install
    ;;
  *)
    print_error "Unknown option: $1"
    show_usage
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}Done!${NC} Start a new conversation in your AI tool to activate the skills."
echo ""
