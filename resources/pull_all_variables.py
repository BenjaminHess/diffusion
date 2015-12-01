##This file downloads 9 variable files from the Census API zips them.
import json
import urllib2
import zipfile

##Downloads the variable file
def download_routine( var_url, var_filename ):
    zf = zipfile.ZipFile(var_filename + ".zip", "w", zipfile.ZIP_DEFLATED)
    var_response = urllib2.urlopen(var_url)
    zf.writestr(var_filename +'.json', var_response.read(), zipfile.ZIP_DEFLATED)
    return

##Main routine    
url='http://api.census.gov/data.json'
response = urllib2.urlopen(url)
json_result = json.loads(response.read())

##Subset datasets from Census data.json list(48 potential)
census_ids_datasets={'2012ewks', '2012nonemp', '2012acs3', '2012popproj/births',
                      '2012acs3profile', 'BDSFirms', 'pubschlfin2012' , '2012popproj/deaths',
                      'CBP2012', '2010sf1'}

#Loop over subset link
for item in json_result:
    if item['identifier'] in census_ids_datasets:
        print item['c_variablesLink']
        download_routine(item['c_variablesLink'], item['identifier'].replace("/", "_"))

print 'Zipped variable files complete.'
