#!/bin/bash

ES_HOST=localhost:9200
##ES_HOST=54.208.66.27

#rm -f Segment-${1}*
#split -l 50000 ${1} Segment-${1}

for FILE in ./Segment-${1}*
    do
       echo $FILE
       curl -XPUT ${ES_HOST}/_bulk --data-binary @${FILE}
    done
