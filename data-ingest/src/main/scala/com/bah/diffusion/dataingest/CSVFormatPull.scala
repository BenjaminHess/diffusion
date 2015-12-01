package com.bah.diffusion.dataingest

import org.json.simple.JSONObject
import org.json.simple.parser.JSONParser
import org.json.simple.parser.ParseException
import scala.collection.JavaConversions._
import com.sksamuel.elastic4s.ElasticClient
import com.sksamuel.elastic4s.ElasticDsl._
import org.json4s._
import org.json4s.native.JsonMethods._
import org.json4s.JsonDSL._
import org.json4s._
import org.json4s.native.JsonMethods._
import scala.util.parsing.json.JSONArray
import scala.collection.mutable.HashMap
import scala.collection.immutable.HashMap
import scala.collection.immutable.Set
import scala.collection.mutable.HashSet
import scala.collection.immutable.Seq
import java.util.ArrayList
import scala.collection.mutable.ListBuffer
import java.io.PrintWriter
import java.io.File
import org.apache.commons.math.util.ContinuedFraction
import org.parboiled2._

import collection.mutable.ListBuffer

object CSVFormatPull {

  def main(args:Array[String]){
    //EsPull.fetch(Array("./../resources/ACS_variables.json","24"))
    CSVFormatPull.fetch(args)
  }
  
  val api_key = "bb0c5dca9cf22a7d836cfb97c1c447f1b4b614fd"
  //def bulkControl = "{\"index\":{\"_index\":\"dataset-acs\",\"_type\":\"metadata\"}}"
  val topicFile = "./../resources/people.topic.mapping.csv"
  val topicVals = ListBuffer[String]()
  
  /*
   * Var Index Search method
   */
  def varSearch() {

    val client = ElasticClient.remote("localhost", 9300)
    val resp1 = client.sync.execute {
      search in "var" query "test" limit 10
    }

    println(resp1)
  }  
  
  /*
   * Read CSV file for the topic file mapping
   */
  def readCSV(){
    lazy val input: ParserInput = io.Source.fromFile(topicFile).mkString
    val headerPresent = false
    //CsvParser cp = new CsvParser()
    val result = CsvParser.apply(input)
    
    println( result match {
      case Left(x) => "You have an error" + x.msg 
      case Right(x)  =>  topicMap(x.records )
          
    })
    
    //println("Complete csv parser" +  result.toString())
  }
  
  /*
   * Performs a mapping of the dimension to a topic
   */
  def topicMap(records: Seq[CsvParser.Record]): String = {
    
    records.foreach( record => {
       topicVals.append(record.fields(2))
     }
     )
     "Successful read: " + topicVals.length
  }
  
  /*
   * Fetch from API, index into ES
   */
  def fetch(args: Array[String]) {
    println("Launching Script")

    //Load topic map
    readCSV()
    
    val parser: JSONParser = new JSONParser()
    val rawVariableJSON = scala.io.Source.fromFile(args(0)).mkString
    val variableJSON = parser.parse(rawVariableJSON).asInstanceOf[JSONObject]
    val variables = variableJSON.get("variables").asInstanceOf[JSONObject]
    val sb = new StringBuilder
    val chunks = variables.keySet.toList.grouped(60)

    var metaMap = new scala.collection.mutable.HashMap[String, scala.collection.mutable.HashMap[String, String]]
    //Holds json string for Elasticsearch
    var csvArray = new ListBuffer[String]

    //Break the variable list into chunks of 60, and perform the loop
    chunks.foreach(list => {
      for(x <- list if !x.toString.endsWith("M")){
        val varJson = variables.get(x).asInstanceOf[JSONObject]
        if (varJson.containsKey("predicateType")
          && varJson.containsKey("concept")
          && varJson.containsKey("label")) {
          sb.append(x.toString()).append(",")
          metaMap.put(x.toString, scala.collection.mutable.HashMap(
            "concept" -> varJson.get("concept").toString,
            "label" -> varJson.get("label").toString))
        }
      }

      //Pull the data from census API from the variables place holder list
      sb.deleteCharAt(sb.length - 1)
      //Not sure if this is needed
      Thread sleep 50
      val result = getResultFromCensus(sb,args(1))
      sb.clear()

      //Process the rows of the returned data and place them into a Elasticsearch Bulk Index 
      val chuckResult = parse(result)
      val headArray = chuckResult.children.head
      val dataList = chuckResult.children.drop(1) //First row is NAME

      dataList.foreach(list => {
        val data = list.asInstanceOf[JArray]
        for (i <- 1 to headArray.children.length - 3 if (data(i).toOption != None)) {
          val metaOpt = metaMap.get(headArray(i).values.toString)
          
          metaOpt match {
            case None => print("No key with that name!")
            case Some(meta) => csvArray.append(myFunc(headArray(i).values.toString, meta, data, i))
          }
        } //End for headArray loop
      }) //End dataList foreach
    }) //End Chunks

    //Write to file if data is present
    val outputFile = "Data_" + System.currentTimeMillis() + ".csv"
    if (csvArray.length > 0) {
      val writer = new PrintWriter(new File(outputFile))
      csvArray.foreach(j => writer.write(j + "\n"))
      writer.close()
    }

    println("Metadata File created: " + outputFile)

  }

  /**
   * Format URL for Census API
   */
  private def getResultFromCensus(sb: StringBuilder, state: String): String = {
    
    val VARIABLES_PLACE_HOLDER = sb.toString()
    var url = f"http://api.census.gov/data/2013/acs1?get=NAME,$VARIABLES_PLACE_HOLDER%s&for=county:*&in=state:$state%s&key=$api_key%s"
    println(url)
    val result = scala.io.Source.fromURL(url).mkString
    result
  }
  
  def splitList(s:String): String = {
    val arrayString = s.split("\\s")
    //println(arrayString.getClass().toString())
    return arrayString.head
  }
  
  /**
   * Private method to create json object
   */
  def myFunc(key: String, meta: scala.collection.mutable.HashMap[String, String], data: JArray, position:Int): String = {

    val state = data(data.children.length - 2).values.toString
    val county = data(data.children.length - 1).values.toString
    val concept = meta.get("concept").getOrElse("concept")
    
    val tempConceptSet = concept.split("\\s").toSet
    val conceptSet = tempConceptSet.map(_.toLowerCase())
    
    val sl = topicVals.map(x => splitList(x))
    val tempTopicSet = sl.toSet 
    val lowerTopicSet = tempTopicSet.map(_.toLowerCase())
    val isPerson = conceptSet.intersect(lowerTopicSet)
    val topic = if (isPerson.isEmpty) "Housing" else "People"
    //println(topic + " " + concept)
    
    val item_url=f"http://api.census.gov/data/2013/acs1?get=$key%s&for=county:$county%s&in=state:$state%s&key=$api_key%s" 
    /*
    val json =
      ("accumuloId" -> f"$key%s_$state%s_$county%s") ~
        ("NAME" -> data(0).values.toString) ~
        ("label" -> meta.get("label").getOrElse("Label Blank")) ~
        ("concept" ->  concept ) ~
        ("county" -> county) ~
        ("state" -> state) ~
        ("URL" -> item_url) ~
        ("value" -> data(position)) ~ 
        ("topic" -> topic)

    compact(render(json))
    */
    
     f"$key%s_$state%s_$county%s" + "|" + 
    			data(0).values.toString + "|" + //Location Name
    			meta.get("label").getOrElse("Label Blank") + "|" +
         concept + "|" +
        county + "|" +
        state + "|" +
         item_url + "|" +
         data(position).values.toString + "|" +
         topic
    
  }

}