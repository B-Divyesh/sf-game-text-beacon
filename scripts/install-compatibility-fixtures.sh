#!/usr/bin/env sh
# Open-source windowed games used only by the five-title compatibility trial.
set -eu

if [ -x /usr/games/openttd ] &&
  [ -x /usr/games/neverball ] &&
  [ -x /usr/games/gnome-sudoku ] &&
  [ -x /usr/games/pingus ] &&
  [ -x /usr/games/gnome-mines ]; then
  echo "Five-title compatibility fixtures are already installed."
  exit 0
fi

if [ "$(id -u)" -eq 0 ]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y openttd neverball gnome-sudoku pingus gnome-mines
else
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y openttd neverball gnome-sudoku pingus gnome-mines
fi
