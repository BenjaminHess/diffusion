#!/bin/bash
##Run full routine
#set -x

if [ $# -ne 3 ]; then
  echo "Usage: `basename $0` <filename.zip> <index name> <path to geodict.pkl>"
  exit $E_BADARGS
fi

FILE_NAME=$1
INDEX_NAME=$2
GEODICT_PATH=$3

ES_HOST=localhost:9200
##ES_HOST=10.128.104.106:9200
##ES_HOST=54.208.66.27

read -p "Run Ingest Routine for Census datasets? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then

    ## Delete all existing Indexes
    read -p "Delete existing Index for Census datasets? " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -X DELETE ${ES_HOST}/${INDEX_NAME}
    fi

    read -p "Create Index for Census datasets? " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ##Create template files for all new indexes
        source ./Variable-Index-Template.sh ${ES_HOST}
        ##Create new index settings for specific indexes
        source ./Variable-Index-Settings.sh ${2} ${ES_HOST}
    
    fi

    read -p "Create Bulk Index file from ${FILE_NAME} for the index named: ${INDEX_NAME}? " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ##Run bulk data create file
        #gunzip -c ${FILE_NAME} | python add_geo_prop.py - ${INDEX_NAME} ${GEODICT_PATH} | gzip -c >temp_file.gz
        unzip -p ${FILE_NAME} | python add_geo_prop.py - ${INDEX_NAME} ${GEODICT_PATH} | gzip -c >temp_file.gz
                
        ##Split bulk data file and ingest segments
        source ./IngestSegments.sh temp_file
        
    fi
    
    echo "Full Ingest Complete"
fi


