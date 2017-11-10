#!/bin/bash

# Settings > Tools > Terminal
# set Shell Path to:
# /bin/bash --init-file ./terminal-init-idea.sh -i

source ~/.bashrc
alias r="node examples/r.js"

### r completion - begin. generated by omelette.js ###
if type compdef &>/dev/null; then
  _r_completion() {
    compadd -- `radical-console --compzsh --compgen "${CURRENT}" "${words[CURRENT-1]}" "${BUFFER}"`
  }
  compdef _r_completion radical-console
elif type complete &>/dev/null; then
  _r_completion() {
    COMPREPLY=( $(compgen -W '$(radical-console --compbash --compgen "${COMP_CWORD}" "${COMP_WORDS[COMP_CWORD-1]}" "${COMP_LINE}")' -- "${COMP_WORDS[COMP_CWORD]}") )
  }
  complete -F _r_completion r
  complete -F _r_completion radical-console
fi
### r completion - end ###