# README #
This readme is written to enable the user to deploy the front end development environment and familiarize them with the document structure.

# For questions or concerns about this the census data search front end please contact Allen Wight - wight_allen@bah.com  


### What is this repository for? ###

* Diffusion - Information retrieval repository built on NoSQL, HDFS, and Lucene.
* Version 0.1
* [Learn Markdown](https://bitbucket.org/tutorials/markdowndemo)

### How do I get set up? ###

The following steps are to laid out to ensure all required dependencies are present. To begin one must have node.js installed. Visiting the link below provides installation procedures:

* http://nodejs.org/ 


After a successful installation of node and npm one must install bower:

* https://github.com/bower/bower


From this folder or wherever the bower.json in located, run the command below from the cli: 

* bower install


You are now ready to run the webpage.  This can either be done with apache tomcat or if you have grunt installed.


To run grunt(with npm already present) run:

* npm install -g grunt


Then the following command to run tasks specified in the grunt.js file, which include a webserver:

* grunt serve

* !!!!!!!!!!!!!!!!! *

An important note, be mindful of the modifiedBowerComponents folder, for the project to work completely these files must be included or the modifications must be made to bower components downloaded.  The running list of modifications is as follows below

* !!!!!!!!!!!!!!!!! *

* line 4112,4113 - relating to the template/popover/popover.html module - ng-bind changed to ng-bind-html to allow for html tooltip injection

### Odd Notes on Document Structure  ###
All code excluding dependencies are contained in the app folder. 

* all custom css is stored in the styles folder
* all js including directives, controllers, factories and services are contained in the scripts folder
* all map shape files are contained in the data folder
* all html is contained in the views folder, html snippets, those elements reused throughout the page are contained in the view\templates
* routing and angular module management occurs in scripts\app.js

In most a controller matches every view and a directive matches each template.  The apiinterface.js service is the priamry file through which the front end interfaces with the RESTFUL api.

Dependencies in index.html are managed automatically by bower. 

* if the elasticsearch resource is not located at http://localhost:9200/ modify line 14 of  app/scripts/controllers/download.js to reflect the correct base