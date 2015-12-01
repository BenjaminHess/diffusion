#!/bin/bash
##INDEX=var-test-cbp
##INDEX=var-test

read -p "Create Index ${1} on host ${2}? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ##create an index with an analyzer "myindex"
    curl -X PUT ${2}/${1} -d @index_settings.json
fi
