##Place the following command into your favorite shell
## Make sure Elasticsearch is running at localhost, or update localhost to ES server location
##Update the Data_ Timestamped .txt file to the one you are ingesting.
##Verify that item index is empty --> {"index":{"_index":"item","_type":"item_entity"}}

curl -XPUT localhost:9200/_bulk --data-binary @Data_1418066569669.txt