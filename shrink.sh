#!/bin/bash
cd resources

mkdir CB1200A11
cd CB1200A11
split -l 200000 ../CB1200A11.dat
rm ../CB1200A11.dat
cd ..

mkdir MD-Data-Elasticsearch
cd MD-Data-Elasticsearch
split -l 200000 ../MD-Data-Elasticsearch.txt
rm .. MD-Data-Elasticsearch.txt
cd ..

mkdir VA-Data-Elasticsearch
cd VA-Data-Elasticsearch
split -l 200000 ../VA-Data-Elasticsearch.txt
rm ../VA-Data-Elasticsearch.txt
cd ..

cd ACS_FullData
mkdir Data_1418143265949
cd Data_1418143265949
split -l 200000 ../Data_1418143265949.txt
rm ../Data_1418143265949.txt
cd ..
