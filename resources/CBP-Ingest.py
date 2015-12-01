import csv
import json
from elasticsearch import Elasticsearch
from collections import defaultdict

##es = Elasticsearch()
es = Elasticsearch("10.128.104.106:9200")


debug = False
var_index='dataset-cbp';var_type='metadata';cbp_filename='CB1200A11.dat'
api_key='bb0c5dca9cf22a7d836cfb97c1c447f1b4b614fd'

##Debug variables and additional debug output
if debug:
    print 'DEBUG MODE'
    var_index='dataset-cbp-test'
    cbp_filename='sample-CB1200A11.dat'

##NAICS and County files
naics_csv='2-digit_2012_NAICS.csv'
countyfile_dc='st11_dc_cou.csv'
countyfile_md='st24_md_cou.csv'
countyfile_va='st51_va_cou.csv'

##Starting ingest - expect var index is already created
def startingest():
    if es.indices.exists(index=var_index):
        es.indices.put_settings(index=var_index, body='index.refresh_interval=-1')
    return
    
## Turn refresh rate back on    
def complete():
    es.indices.put_settings(index=var_index, body='index.refresh_interval=5s')
    es.indices.refresh(index=var_index)
    return 

##CSV to JSON Function
def csvToJson( inFile , delim):
    out = None;
    with open( inFile, 'rU') as csvFile:
        #Note this reads the first line as the keys we can add specific keys with:
        #csv.DictReader( csvFile, fieldnames=<LIST HERE>, restkey=None, restval=None, )
        csvDict = csv.DictReader( csvFile, delimiter=delim, dialect='excel', restkey=None, restval=None)
        out = [obj for obj in csvDict]
	return out;

##CSV to JSON Function
def csvFieldsToJson( inFile , fields, delim):
    out = None;
    with open( inFile, 'rU') as csvFile:
        #Note this reads the first line as the keys we can add specific keys with:
        csvDict = csv.DictReader( csvFile, fieldnames=fields, restkey=None, restval=None, )
        #csvDict = csv.DictReader( csvFile, delimiter=delim, dialect='excel', restkey=None, restval=None)
        out = [obj for obj in csvDict]
	return out;

##Geomapping from geo codes to named entity
def loadgeo(countydata, statename):
    ccs={}
    for row in countydata:
        ccs[row['CC']] = row['COUNTYNAME']
        #ST,STC,CC,COUNTYNAME
    ccs['name']=statename
    return ccs

##Build Json Item for elasticsearch
def buildItem(doc, conceptName, docValue, topic):
    item = {}
    item['accumuloId'] = doc['NAICS2012'] + '_' + doc['ST'] + '_' + doc['COUNTY']
    item['label']=doc['NAICS2012_TTL'];item['concept']=conceptName
    item['state']=doc['ST'];item['county']=doc['COUNTY']
    item['NAME']= geomap[doc['ST']][doc['COUNTY']] + ", " + geomap[doc['ST']]['name']
    item['URL']="http://api.census.gov/data/2012/cbp?get=ESTAB,EMP,PAYANN,PAYQTR1,NAICS2012,NAICS2012_TTL&in=state:%s&for=county:%s&NAICS2012=%s&key=%s" % (doc['ST'], doc['COUNTY'],doc['NAICS2012'], api_key)
    item['value']= doc[docValue] 
    item['topic']= topic
    return item    

##Load CBP file    
json_out = csvToJson(cbp_filename, '|')

#NAICS code mapping
naics = csvToJson(naics_csv, ',')
naics_code={}
for row in naics:
    naics_code[row['2012 NAICS US   Code']] = row['2012 NAICS US Title']

#Geo Mapping
geomap={}
##county field sequence
fieldnames = ['ST','STC','CC','COUNTYNAME','na']
mdcounty = csvFieldsToJson(countyfile_md, fieldnames, ',')
vacounty = csvFieldsToJson(countyfile_va, fieldnames,',')
dccounty = csvFieldsToJson(countyfile_dc, fieldnames,',')
geomap['24']=loadgeo(mdcounty,'Maryland')
geomap['24']['000']='';geomap['24']['999']=''
geomap['51']=loadgeo(vacounty, 'Virginia')
geomap['51']['000']='';geomap['51']['999']=''
geomap['11']=loadgeo(dccounty, 'Washington D.C.')
geomap['11']['000']='';geomap['11']['999']=''
geomap['00']={}
geomap['00']['name']='United States'
geomap['00']['000']=''

##Topic Mapping
topic='Business'

##Main routine    
startingest()

for doc in json_out:
    if doc['ST'] in geomap:
        if debug:
            print geomap[doc['ST']][doc['COUNTY']] + ", " + geomap[doc['ST']]['name']
        
        json_item_1 = json.dumps(buildItem(doc, 'Total Establishments','ESTAB', topic))
        json_item_2 = json.dumps(buildItem(doc,'Total Employees', 'EMP', topic))
        json_item_3 = json.dumps(buildItem(doc,'Total Annual Payroll', 'PAYANN', topic))
        
        ##json_item = json.dumps(item)
        if debug:
            print json_item_1
        res_1 = es.index(index=var_index, doc_type=var_type,  body=json_item_1)
        if res_1['created']==False:
            print 'Failed to ingest:' + res_1
        
        res_2 = es.index(index=var_index, doc_type=var_type,  body=json_item_2)
        if res_2['created']==False:
            print 'Failed to ingest:' + res_2
        
        res_3 = es.index(index=var_index, doc_type=var_type,  body=json_item_3)
        if res_3['created']==False:
            print 'Failed to ingest:' + res_3
        
##Refresh final index
complete()
print "Complete CBP Ingest"

