### This is the mapping file for ACS data
### Run this in Sense or within a CURL command
## curl -XPUT 'localhost:9200/var/_mapping/ACS-Details' -d ' //end the json object with ending '

PUT var/_mapping/ACS-Details 
{
    "ACS-Details": {
            "properties": {
               "NAME": {
                  "type": "string",
                  "analyzer": "standard"
               },
               "URL": {
                  "type": "string",
                  "index": "not_analyzed"
               },
               "accumuloId": {
                  "type": "string"
               },
               "concept": {
                  "type": "string",
                  "analyzer": "standard",
                  "fields": {
                     "ngrams": {
                        "type": "string",
                        "analyzer": "ngram_analyzer"
                     },
                     "raw": {
                        "type": "string",
                        "index": "not_analyzed"
                     },
                     "shingles": {
                        "type": "string",
                        "analyzer": "shingle_analyzer"
                     }
                  }
               },
               "county": {
                  "type": "integer"
               },
               "label": {
                  "type": "string",
                  "analyzer": "standard",
                  "fields": {
                     "ngrams": {
                        "type": "string",
                        "analyzer": "ngram_analyzer"
                     },
                     "raw": {
                        "type": "string",
                        "index": "not_analyzed"
                     },
                     "shingles": {
                        "type": "string",
                        "analyzer": "shingle_analyzer"
                     }
                  }
               },
               "predicateType": {
                  "type": "string",
                  "index": "no"
               },
               "required": {
                  "type": "boolean",
                  "index": "no"
               },
               "state": {
                  "type": "integer"
               },
               "value": {
                  "type": "string",
                  "index": "not_analyzed"
               }
            }
         }
}