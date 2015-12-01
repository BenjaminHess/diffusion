package com.bah.diffusion.dataingest

import org.apache.accumulo.core.client.AccumuloException
import org.apache.accumulo.core.client.AccumuloSecurityException
import org.apache.accumulo.core.client.TableNotFoundException
import org.apache.accumulo.core.client.BatchWriter
import org.apache.accumulo.core.client.BatchWriterConfig
import org.apache.accumulo.core.client.Connector
import org.apache.accumulo.core.client.Instance
import org.apache.accumulo.core.client.ZooKeeperInstance
import org.apache.accumulo.core.client.security.tokens.PasswordToken
import org.apache.accumulo.core.data.Mutation
import org.apache.commons.configuration.Configuration
import java.util.concurrent.TimeUnit
import scala.io.Source

object ACSIngest {
  val MAX_MEM_DEFAULT = 10000000L
  val MAX_LATENCY_DEFAULT = 1000L
  val MAX_WRITE_THREADS_DEFAULT = 20

  var inst:Instance = null
  var eventWriter:BatchWriter = null
  val config = new BatchWriterConfig()
  config.setMaxMemory(MAX_MEM_DEFAULT)
  config.setMaxLatency(MAX_LATENCY_DEFAULT, TimeUnit.MILLISECONDS)
  config.setMaxWriteThreads(MAX_WRITE_THREADS_DEFAULT)
  var conn:Connector = null
  
  def configure(user:String,userPassword:String,auths:String,instanceName:String, zooKeepers:String) {
    val inst  = new ZooKeeperInstance(instanceName, zooKeepers)
    try {
      conn = inst.getConnector(user, new PasswordToken(userPassword))
     } catch {
       case accEx : AccumuloException => println("Accumulo Exception: " + accEx.getMessage) 
       case security : AccumuloSecurityException => println("Failed to authenticate: " + security.getMessage )
    }
  }
  
  //NAME:Baldwin County-Alabama,B06010_050E:1920,B07007PR_027M:null,state:01,county:003
  def ingest(fileNames:List[String],tableName:String) {
    try{
      eventWriter = conn.createBatchWriter(tableName, config)
    } catch {
      case e : TableNotFoundException => println("Table not found: " + tableName )
    }
    
    
    fileNames.foreach(fileName => {
      Source.fromFile(fileName).getLines.foreach(line => {
        val map = line.split(",").map(x => {
          val parts = x.split(":")
          parts(0) -> parts(1) 
        }).toMap
        
        val state_county = map.get("state").get + "_" + map.get("county").get
        
        map.keySet.foreach(key => {
          if(!key.equals("NAME") && !key.equals("state") && !key.equals("county")){
            val mutation: Mutation = new Mutation(key + "_" + state_county)
            mutation.put("2013","",map.get(key).get)
            eventWriter.addMutation(mutation)
          }
        })
      })
    })
    eventWriter.close()
  }
}
