package com.bah.diffusion.testutils

import java.io.File
import java.util.concurrent.TimeUnit
import scala.collection.mutable.HashMap
import scala.io.Source
import org.apache.accumulo.core.client.BatchWriter
import org.apache.accumulo.core.client.BatchWriterConfig
import org.apache.accumulo.core.client.Connector
import org.apache.accumulo.core.client.Instance
import org.apache.accumulo.core.client.MutationsRejectedException
import org.apache.accumulo.core.client.Scanner
import org.apache.accumulo.core.client.ZooKeeperInstance
import org.apache.accumulo.core.data.Mutation
import org.apache.accumulo.core.security.Authorizations
import org.apache.accumulo.core.security.ColumnVisibility
import org.apache.log4j.Level
import org.apache.log4j.Logger
import org.apache.accumulo.minicluster.MiniAccumuloCluster
import org.apache.accumulo.minicluster.MiniAccumuloConfig
import com.google.common.io.Files
import scala.collection.JavaConversions.asScalaIterator

class AccumuloTestServer(zooKeeperPort: Int = 0) {
  Logger.getLogger("org.apache.zookeeper").setLevel(Level.FATAL)
  Logger.getLogger("org.apache.hadoop.hbase.zookeeper").setLevel(Level.FATAL)
  Logger.getLogger("org.apache.hadoop.hbase.client").setLevel(Level.FATAL)

  val temporaryFolder: File = Files.createTempDir()

  val miniClusterConfig = new MiniAccumuloConfig(temporaryFolder, AccumuloTestServer.DEFAULT_PASSWORD)
  miniClusterConfig.setNumTservers(1)
  miniClusterConfig.setZooKeeperPort(zooKeeperPort)
  val miniCluster = new MiniAccumuloCluster(miniClusterConfig)
  miniCluster.start()
  var connector = miniCluster.getConnector("root", AccumuloTestServer.DEFAULT_PASSWORD)
  var auths = new Authorizations(AccumuloTestServer.DEFAULT_AUTHS)
  connector.securityOperations().changeUserAuthorizations("root", auths)
  val instance = new ZooKeeperInstance(miniCluster.getInstanceName, miniCluster.getZooKeepers)
  waitForStartup(System.getProperty("max-wait-time-for-accumulo-init", "60").toInt)

  def shutDown() {
    miniCluster.stop()
    temporaryFolder.delete()
  }

  def getInstance(): Instance = {
    instance
  }

  def getRootConnector(): Connector = {
    connector
  }

  def addAuth(value: String) {
    var list = List[String]()
    auths.toString().split(",").foreach(a => list ::= a)
    list ::= value

    auths = new Authorizations(list: _*)
    connector.securityOperations().changeUserAuthorizations("root", auths)
  }

  def getSetAuths(): Authorizations = {
    auths
  }

  def createTable(tableName: String) {
    if (!getRootConnector().tableOperations().tableIdMap().containsKey(tableName)) {
      getRootConnector().tableOperations().create(tableName)
    }
  }

  def loadFile(tableName: String, fileLocation: String) {
    val source = Source.fromURL(getClass.getResource(fileLocation))
    if (!getRootConnector().tableOperations().tableIdMap().containsKey(tableName)) {
      getRootConnector().tableOperations().create(tableName)
    }

    val batchConfig: BatchWriterConfig = new BatchWriterConfig()
    batchConfig.setMaxWriteThreads(1)
    batchConfig.setMaxLatency(1, TimeUnit.SECONDS)
    batchConfig.setMaxMemory(10240)

    val batchWriter: BatchWriter = getRootConnector().createBatchWriter(tableName, batchConfig)

    val groups = source.getLines().toList.map(x => x.split("\t")).filter(x => x.length == 5).groupBy(x => x(0))
    groups.foreach(x =>
      {
        val mutation: Mutation = new Mutation(x._2(0)(0))
        x._2.foreach(line => mutation.put(line(1), line(2), new ColumnVisibility(line(3)), line(4)))
        batchWriter.addMutation(mutation)
      })
    batchWriter.close()
  }

  def loadFiles(files: List[String], tableName: String) {
    files.foreach(x => loadFile(tableName, x.toString()))
  }


  def getDefaultStormSettings(existing: Option[HashMap[String, String]] = None): HashMap[String, String] = {
    val props = existing.getOrElse(new HashMap[String, String])
    if (miniCluster != null) {
      props.put("TEMP_TEST_INSTANCENAME", miniCluster.getInstanceName())
      props.put("TEMP_TEST_ZOOSERVERS", miniCluster.getZooKeepers())
    }
    props.put("TEMP_TEST_USER", "root")
    props.put("TEMP_TEST_KEY", AccumuloTestServer.DEFAULT_PASSWORD)
    props.put("TEMP_TEST_MAXMEM", "100")
    props.put("TEMP_TEST_MAXLATENCY", "100")
    props.put("TEMP_TEST_MAXWRTIETHREADS", "1")
    props
  }

  def waitForStartup(maxNumSecondsToWaitForStartup: Int) {
    val config = new BatchWriterConfig
    config.setMaxLatency(1000, TimeUnit.MILLISECONDS)
    config.setMaxMemory(1024)
    config.setMaxWriteThreads(1)
    createTable("StartupTable")
    var writer = connector.createBatchWriter("StartupTable", config)
    var accumuloInitialized = false
    val startTime = System.currentTimeMillis()
    val endTime = startTime + 1000 * maxNumSecondsToWaitForStartup
    while (endTime > System.currentTimeMillis() && !accumuloInitialized) {
      try {
        val mutation = new Mutation("testRow")
        mutation.put("testCF", "testCQ", System.currentTimeMillis().toString)
        writer.addMutation(mutation)
        writer.flush()
        accumuloInitialized = true
      } catch {
        case e: MutationsRejectedException => {
          Thread.sleep(1000)
        }
      }
    }

    if (accumuloInitialized) {
      println("Waited " + (System.currentTimeMillis() - startTime) + " milliseconds for Accumulo to successfully start.")
      connector.tableOperations().delete("StartupTable")
    } else {
      println("Accumulo MiniCluster could not be initialized within " + maxNumSecondsToWaitForStartup + " seconds")
      throw new IllegalStateException("Accumulo MiniCluster could not be successfully initialized")
    }
  }
}

object AccumuloTestServer {
  val DEFAULT_AUTHS = "Test"
  val DEFAULT_PASSWORD = "testing"
  val DEFAULT_TABLE = "testTable"

  def createAndStartMiniCluster(): AccumuloTestServer = {
    return createAndStartMiniCluster(0)
  }

  def createAndStartMiniCluster(zooKeeperPort: Int): AccumuloTestServer = {
    val accTestServer = new AccumuloTestServer(zooKeeperPort)
    accTestServer
  }

  def printData(scanner: Scanner) {
    scanner.iterator().foreach(kv => {
      println(kv.getKey().getRow() + "\t"
        + kv.getKey().getColumnFamily() + "\t"
        + kv.getKey().getColumnQualifier() + "\t"
        + kv.getKey().getColumnVisibility() + "\t"
        + kv.getValue().toString())
    })
  }
}
