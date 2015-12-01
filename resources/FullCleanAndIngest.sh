#!/bin/bash
##Run full routine
set -x

CBP=dataset-cbp
ACS=dataset-acs
ACS_S=dataset-acs-shard

##VA=VA-Data-Elasticsearch.txt
VA=Data_ACS1_VA.txt
##MD=MD-Data-Elasticsearch.txt
MD=Data_ACS1_MD.txt

ES_HOST=localhost:9200
##ES_HOST=10.128.104.106:9200
##ES_HOST=54.208.66.27

read -p "Run Full Ingest Routine for Census datasets? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then

    read -p "Delete existing Index for Census datasets? " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -X DELETE ${ES_HOST}/${CBP}
        curl -X DELETE ${ES_HOST}/${ACS}
        curl -X DELETE ${ES_HOST}/${ACS_S}
    fi

    source ./Variable-Index-Template.sh ${ES_HOST}
    source ./Variable-Index-Settings.sh ${CBP} ${ES_HOST}
    source ./Variable-Index-Settings.sh ${ACS} ${ES_HOST}
    source ./Variable-Index-Settings.sh ${ACS_S} ${ES_HOST}
    source ./IngestSegments.sh VA
    source ./IngestSegments.sh MD
    
    #python CBP-Ingest.py
    
fi


