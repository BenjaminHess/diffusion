#!/bin/bash
read -p "Create Template for dataset on host ${1}? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ##create an index with an analyzer "myindex"
    curl -XPUT ${1}/_template/dataset_template -d @dataset_template.json
fi

