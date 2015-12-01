#!/bin/bash

ES_HOST=localhost:9200
##ES_HOST=54.208.66.27

rm -f Segment-${1}*
gunzip -c ${1}.gz | ./gsplit -l 50000 --filter="gzip >\$FILE.gz" - Segment-${1}
#split -l 50000 ${1} Segment-${1}

for FILE in ./Segment-${1}*
    do
       echo $FILE
       gunzip $FILE
       curl -XPUT ${ES_HOST}/_bulk --data-binary @${FILE/.gz}
       rm -f ${FILE/.gz}
    done

