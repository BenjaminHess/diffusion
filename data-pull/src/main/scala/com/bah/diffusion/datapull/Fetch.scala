//#!/bin/sh
//cp=./cluster-management-3-SNAPSHOT-jar-with-dependencies.jar
//cp=$cp:./log4j.properties
//echo $cp
//exec scala -cp $cp -Dlog4j.configuration=file:log4j.properties $0 $@
//!#

//import scala.io.Source
package com.bah.diffusion.datapull

import org.json.simple.JSONObject
import org.json.simple.parser.JSONParser
import org.json.simple.parser.ParseException
import scala.collection.JavaConversions._
import java.io._
import org.json4s._
import org.json4s.JsonDSL._
import org.json4s.jackson.JsonMethods._
import scala.io.Source
  
object Fetch {
	def fetch(args: Array[String]) {

    val parser: JSONParser = new JSONParser()
		val rawVariableJSON = scala.io.Source.fromFile(args(0)).mkString
		val variableJSON = parser.parse(rawVariableJSON).asInstanceOf[JSONObject]
		val variables = variableJSON.get("variables").asInstanceOf[JSONObject]
    val writer = new PrintWriter(new File("Data_" + System.currentTimeMillis() + ".txt" ))
    
    val prevPassedVars = Source.fromFile("passedVars.txt").mkString.split(",").toList
    
    val passedVars = new PrintWriter(new File("passedVars.txt" ))
    passedVars.write(prevPassedVars.mkString(","))
    
    val sbData = new StringBuilder
    val sbVariables = new StringBuilder
    val chunks = variables.keySet.toList.grouped(60)
    var stop = false
    chunks.foreach(list => {
      if(stop){
        writer.close()
        passedVars.close()
        return
      }
      list.foreach(x => {
        if(!prevPassedVars.contains(x)){
          val varJson = variables.get(x).asInstanceOf[JSONObject]
          if(varJson.containsKey("predicateType") 
            && varJson.containsKey("concept")
            && varJson.containsKey("label")){
              sbVariables.append(x.toString()).append(",")
          }
        }
      })
      if(sbVariables.size != 0){
        sbVariables.deleteCharAt(sbVariables.length - 1)
        try {
          var url = "http://api.census.gov/data/2013/acs1?key=bb0c5dca9cf22a7d836cfb97c1c447f1b4b614fd&get=NAME,VARIABLES_PLACE_HOLDER&for=county:*"
          url = url.replaceAll("VARIABLES_PLACE_HOLDER", sbVariables.toString())
          val result = scala.io.Source.fromURL(url).mkString
          val lines = result.replaceAll("\\[","")
                        .replaceAll("\\]","")
                        .replaceAll("\"","")
                        .replaceAll("\"","").split("\n")
          val headers = lines(0).split(",").toList
          
          lines.drop(1).foreach(line => {
            val parts = line.split(",").toList
            val name = parts.take(2)
            sbData.append(headers(0)).append(":").append(name(0).trim()).append("-").append(name(1).trim()).append(",")
            val combo = headers.drop(1).zip(parts.drop(2))
            combo.foreach(zipped => sbData.append(zipped._1).append(":").append(zipped._2).append(","))
            sbData.deleteCharAt(sbData.length-1).append("\n")
          })
          writer.append(sbData.toString())
          sbData.clear()
          passedVars.append(sbVariables.toString() + ",")
          sbVariables.clear()
          } catch {
            case e:java.io.IOException => {
              stop = true
              println(e.getMessage)
            }
          }
        }
    })

    writer.close()
    passedVars.close()
    //println("Failed variables: " + sbFailedVariables.toString)
	}
}