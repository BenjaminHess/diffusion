import json
import marshal

debug = True

var_index='dataset-cbp';var_type='metadata';acs_filename='CB1200A11.dat'
fdn='geodict.pkl'

##Debug variables and additional debug output
if debug:
    print 'DEBUG MODE'
    var_index='dataset-cbp-test'
    acs_filename='sample_CACSSF3Y2013.txt'
	fdn = 'sample-geodict.pkl'
	
#load geo dict
geo_dict={}

with open(fdn, 'rb') as fd:
    geo_dict = marshal.load(fd)
    
	
geoid_fq=""
cnt=0
	
print "Complete CBP Ingest"