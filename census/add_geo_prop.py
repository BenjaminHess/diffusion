#!/usr/bin/python

import sys
import json
import marshal

if len(sys.argv) < 3:
   print "usage: %s <file name> <index name> [<geodict path>]" % sys.argv[0]
   sys.exit(1)

fn=sys.argv[1]

#load geo dict
geo_dict={}

fdn='geodict.pkl'
if len(sys.argv) > 3:
    fdn = sys.argv[3] + "/geodict.pkl"

with open(fdn, 'rb') as fd:
   geo_dict = marshal.load(fd)


def lookup(geoid):
    if not geoid:
        return None

    realid = geoid
    geo_prop = geo_dict.get(realid)     # geoID as given
    if geo_prop:
        return geo_prop

    g = geoid.split(".")
    if len(g) == 1:
        realid = "geo.en.2012.%s" % ( g[-1] )
    else:
        realid = "geo.en.%s.%s" % ( g[-2], g[-1] )    # with "geo." prepended
    geo_prop = geo_dict.get(realid)
    if geo_prop:
        return geo_prop

    realid = "geo.en.2012.%s" % g[-1]   # with "geo." prepended and 2012 in place of 2013
    geo_prop = geo_dict.get(realid)
    if geo_prop:
        return geo_prop

    id = g[-1]
    if id[:3] == "310" or id[:3] == "314" or id[:3] == "330":
        return lookup("geo.en.2012.%sM1%s" % (id[:3], id[5:]) ) \
               or lookup("geo.en.2012.%sM2%s" % (id[:3], id[5:]) )
    if id[:3] == "335" or id[:3] == "350" or id[:3] == "355":
        return lookup("geo.en.2012.%sM1%s" % (id[:3], id[5:]) )
    if id[:3] == "400":
        return lookup("geo.en.2012.400C1%s" % id[5:])
    if id[:3] == "500":
        return lookup("geo.en.2012.50013%s" % id[5:])

    return None

## Setup for indexer lines
bulkFlag = False

bulkIndexer = '{{ "index" : {{ "_index" : "{0}", "_type" : "metadata", "_id" : "{1}" }} }}'

with fn == "-" and sys.stdin or open(fn, "r") as fp:

   for line in fp:

      # skip blank lines
      if not line.strip():
         continue

      try:
         j = json.loads(line)
      except:
         sys.stderr.write("JSON parse failed on '%s'\n" % line.strip())

      # skip bulk-load command lines (output as is)
      if "index" in j or "update" in j:
         bulkFlag = True
         pass

      else:
         #Place the bulk data indexer line if needed
         if not bulkFlag:
             uuid = j.get("uuid")
             print bulkIndexer.format(sys.argv[2],uuid)

         # it's a data line
         geoid = j.get("geoID")
         geo_prop = lookup(geoid)

         if geo_prop:
            geo_prop = "{" + geo_prop + "}"
            pj = json.loads(geo_prop)
            for k,v in pj.iteritems():
               j[k] = v
         else:
            sys.stderr.write("geoID '%s' not in dict\n" % geoid)

      print json.dumps(j)


sys.exit(0)
