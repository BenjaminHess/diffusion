import elasticsearch
import json
import sys


def PrintAggregations(q):
    if "aggregations" in q:
        for b in q["aggregations"]["outer"]["buckets"]:
            if "innermost" in b:
                for b2 in b["innermost"]["buckets"]:
                    print "    %s/%s (%d/%d)" % ( b["key"], b2["key"], b["doc_count"], b2["doc_count"] )
            else:
                print "    %s (%d)" % ( b["key"], b["doc_count"] )


# host
host = "localhost"
endpoint = "http://%s:9200/" % host

# initialize ES connector
es = elasticsearch.Elasticsearch(endpoint)


# index names
acs_index_name = "dataset-acs-*"
#acs_index_name = "dataset-acs-2012-county"
cbp_index_name = "dataset-cbp-*"


# total number of docs
print "TOTALS:"

nd = es.indices.stats(index=acs_index_name)
print "ACS:", nd["_all"]["primaries"]["docs"]["count"], "documents"

nd = es.indices.stats(index=cbp_index_name)
print "CBP:", nd["_all"]["primaries"]["docs"]["count"], "documents"

print


# process query files
for filename in sys.argv[1:]:
    f = open(filename, "r")

    query = json.load(f)

    q = es.search(index=acs_index_name, body=query, size=0, request_timeout=60)
    if int(q["hits"]["total"]) > 0:
        print "Query: %s (%s) ... %s hits" % ( filename, "ACS", q["hits"]["total"] )
        PrintAggregations(q)

    q = es.search(index=cbp_index_name, body=query, size=0, request_timeout=60)
    if int(q["hits"]["total"]) > 0:
        print "Query: %s (%s) ... %s hits" % ( filename, "CBP", q["hits"]["total"] )
        PrintAggregations(q)

    f.close()
